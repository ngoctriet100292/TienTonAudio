package handler

import (
	"context"
	"net/http"
	"strings"

	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
	"github.com/google/uuid"
)

func (h *PlatformHandler) Tickets(w http.ResponseWriter, r *http.Request) {
	user, admin := platformUser(r)
	if r.Method == http.MethodGet {
		h.page(w, r, `SELECT t.id,t.subject,t.category,t.payment_id,t.status,t.created_at,t.updated_at,u.username FROM support_tickets t JOIN users u ON u.id=t.user_id WHERE ($2 OR t.user_id=$1) AND ($3='' OR t.status=$3) ORDER BY t.updated_at DESC,t.id DESC`, user, admin, r.URL.Query().Get("status"))
		return
	}
	var body struct {
		Subject   string     `json:"subject"`
		Category  string     `json:"category"`
		Content   string     `json:"content"`
		PaymentID *uuid.UUID `json:"payment_id"`
	}
	if !platformBody(w, r, &body) {
		return
	}
	body.Subject = strings.TrimSpace(body.Subject)
	body.Content = strings.TrimSpace(body.Content)
	validCategory := body.Category == "usage" || body.Category == "payment" || body.Category == "copyright" || body.Category == "bug" || body.Category == "other"
	if !validCategory || len([]rune(body.Subject)) < 3 || len([]rune(body.Subject)) > 200 || len([]rune(body.Content)) < 10 || len([]rune(body.Content)) > 4000 {
		utils.ErrorResponse(w, 400, "Tiêu đề 3–200 ký tự; nội dung 10–4.000 ký tự; chọn loại hỗ trợ hợp lệ")
		return
	}
	tx, err := h.begin(r.Context())
	if err != nil {
		platformError(w)
		return
	}
	defer tx.Rollback(context.Background())
	var lock uuid.UUID
	if err = tx.QueryRow(r.Context(), `SELECT id FROM users WHERE id=$1 AND deleted_at IS NULL FOR UPDATE`, user).Scan(&lock); err != nil {
		utils.ErrorResponse(w, 401, "Tài khoản không khả dụng")
		return
	}
	var count int
	if err = tx.QueryRow(r.Context(), `SELECT count(*) FROM support_tickets WHERE user_id=$1 AND created_at>CURRENT_TIMESTAMP-INTERVAL '1 day'`, user).Scan(&count); err != nil {
		platformError(w)
		return
	}
	if count >= 5 {
		utils.ErrorResponse(w, 429, "Bạn đã gửi 5 yêu cầu trong 24 giờ; vui lòng trao đổi trong yêu cầu đang có")
		return
	}
	if body.PaymentID != nil {
		var owns bool
		if err = tx.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM payments WHERE id=$1 AND user_id=$2)`, *body.PaymentID, user).Scan(&owns); err != nil {
			platformError(w)
			return
		}
		if !owns {
			utils.ErrorResponse(w, 400, "Mã đơn không thuộc tài khoản của bạn")
			return
		}
	}
	var id uuid.UUID
	err = tx.QueryRow(r.Context(), `INSERT INTO support_tickets(user_id,subject,category,payment_id)VALUES($1,$2,$3,$4)RETURNING id`, user, body.Subject, body.Category, body.PaymentID).Scan(&id)
	if err != nil {
		platformError(w)
		return
	}
	if _, err = tx.Exec(r.Context(), `INSERT INTO support_messages(ticket_id,sender_id,content)VALUES($1,$2,$3)`, id, user, body.Content); err != nil {
		platformError(w)
		return
	}
	if tx.Commit(r.Context()) != nil {
		platformError(w)
		return
	}
	utils.JSON(w, 201, map[string]any{"id": id})
}
func (h *PlatformHandler) TicketMessages(w http.ResponseWriter, r *http.Request) {
	user, admin := platformUser(r)
	id, err := platformID(r)
	if err != nil {
		utils.ErrorResponse(w, 400, "Yêu cầu không hợp lệ")
		return
	}
	var permitted bool
	if err = h.pool.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM support_tickets WHERE id=$1 AND ($3 OR user_id=$2))`, id, user, admin).Scan(&permitted); err != nil {
		platformError(w)
		return
	}
	if !permitted {
		utils.ErrorResponse(w, 404, "Không tìm thấy yêu cầu")
		return
	}
	if r.Method == http.MethodGet {
		h.page(w, r, `SELECT m.id,m.content,m.created_at,u.username,u.role,u.id AS sender_id FROM support_messages m JOIN users u ON u.id=m.sender_id WHERE m.ticket_id=$1 ORDER BY m.created_at DESC,m.id DESC`, id)
		return
	}
	var body struct {
		Content string `json:"content"`
		Status  string `json:"status"`
	}
	if !platformBody(w, r, &body) {
		return
	}
	body.Content = strings.TrimSpace(body.Content)
	if len([]rune(body.Content)) < 1 || len([]rune(body.Content)) > 4000 || (body.Status != "" && (!admin || (body.Status != "open" && body.Status != "in_progress" && body.Status != "resolved"))) {
		utils.ErrorResponse(w, 400, "Nội dung hoặc trạng thái không hợp lệ")
		return
	}
	tx, err := h.begin(r.Context())
	if err != nil {
		platformError(w)
		return
	}
	defer tx.Rollback(context.Background())
	var status string
	if err = tx.QueryRow(r.Context(), `SELECT status FROM support_tickets WHERE id=$1 AND ($3 OR user_id=$2) FOR UPDATE`, id, user, admin).Scan(&status); err != nil {
		utils.ErrorResponse(w, 404, "Không tìm thấy yêu cầu")
		return
	}
	if !admin && status == "resolved" {
		utils.ErrorResponse(w, 409, "Yêu cầu đã đóng; hãy gửi yêu cầu mới nếu cần hỗ trợ thêm")
		return
	}
	if _, err = tx.Exec(r.Context(), `INSERT INTO support_messages(ticket_id,sender_id,content)VALUES($1,$2,$3)`, id, user, body.Content); err != nil {
		platformError(w)
		return
	}
	if body.Status != "" {
		status = body.Status
	}
	if _, err = tx.Exec(r.Context(), `UPDATE support_tickets SET status=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$1`, id, status); err != nil {
		platformError(w)
		return
	}
	if tx.Commit(r.Context()) != nil {
		platformError(w)
		return
	}
	utils.JSON(w, 200, map[string]bool{"sent": true})
}
