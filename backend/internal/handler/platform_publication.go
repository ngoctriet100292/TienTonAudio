package handler

import (
	"context"
	"encoding/json"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func (h *PlatformHandler) Publications(w http.ResponseWriter, r *http.Request) {
	user, admin := platformUser(r)
	h.page(w, r, `SELECT s.id,s.title,s.slug,s.publication_status,s.review_reason,s.created_by,s.updated_at,u.username AS owner_name,
 (SELECT count(*) FROM chapters c WHERE c.story_id=s.id) AS chapter_count
 FROM stories s LEFT JOIN users u ON u.id=s.created_by WHERE ($2 OR s.created_by=$1) AND ($3='' OR s.title ILIKE '%'||$3||'%') AND ($4='' OR s.publication_status=$4) ORDER BY s.updated_at DESC,s.id`, user, admin, strings.TrimSpace(r.URL.Query().Get("q")), r.URL.Query().Get("status"))
}
func (h *PlatformHandler) StoryPublication(w http.ResponseWriter, r *http.Request) {
	user, admin := platformUser(r)
	id, err := platformID(r)
	if err != nil {
		utils.ErrorResponse(w, 400, "Truyện không hợp lệ")
		return
	}
	var body struct {
		Status string `json:"status"`
		Reason string `json:"reason"`
	}
	if !platformBody(w, r, &body) {
		return
	}
	if body.Status != "draft" && body.Status != "pending" && body.Status != "published" {
		utils.ErrorResponse(w, 400, "Trạng thái không hợp lệ")
		return
	}
	if body.Status == "published" && !admin {
		utils.ErrorResponse(w, 403, "Chỉ quản trị viên được xuất bản")
		return
	}
	tx, err := h.begin(r.Context())
	if err != nil {
		platformError(w)
		return
	}
	defer tx.Rollback(context.Background())
	var old string
	var owner *uuid.UUID
	if err = tx.QueryRow(r.Context(), `SELECT publication_status,created_by FROM stories WHERE id=$1 AND ($3 OR created_by=$2) FOR UPDATE`, id, user, admin).Scan(&old, &owner); err != nil {
		utils.ErrorResponse(w, 404, "Không tìm thấy truyện")
		return
	}
	if !reviewReason(w, admin, old, body.Status, &body.Reason) {
		return
	}

	if old == "published" && !admin {
		utils.ErrorResponse(w, 409, "Truyện đã xuất bản; liên hệ quản trị để thay đổi trạng thái")
		return
	}
	if _, err = tx.Exec(r.Context(), `UPDATE stories SET publication_status=$2,review_reason=CASE WHEN $2='draft' THEN $3 ELSE '' END,updated_at=CURRENT_TIMESTAMP WHERE id=$1`, id, body.Status, body.Reason); err != nil {
		platformError(w)
		return
	}
	if body.Status == "published" && old != "published" {
		if _, err = tx.Exec(r.Context(), `WITH fresh AS (INSERT INTO chapter_announcements(chapter_id) SELECT id FROM chapters WHERE story_id=$1 AND publication_status='published' ON CONFLICT DO NOTHING RETURNING chapter_id)
 INSERT INTO notifications(user_id,title,message,type,reference_id,reference_type)
 SELECT f.user_id,left('Chương mới: '||s.title,255),c.title,'new_chapter',c.id,'chapter' FROM fresh JOIN chapters c ON c.id=fresh.chapter_id JOIN stories s ON s.id=c.story_id JOIN story_follows f ON f.story_id=s.id`, id); err != nil {
			platformError(w)
			return
		}
	}

	if admin {
		if _, err = tx.Exec(r.Context(), `INSERT INTO admin_change_log(admin_id,action)VALUES($1,$2)`, user, "Duyệt truyện "+id.String()+": "+body.Status); err != nil {
			platformError(w)
			return
		}
	}
	if admin && old != body.Status && owner != nil && *owner != user {
		if _, err = tx.Exec(r.Context(), `INSERT INTO notifications(user_id,title,message,type,reference_id,reference_type)VALUES($1,'Cập nhật duyệt xuất bản',$2,'publication_review',$3,'studio_story')`, *owner, reviewMessage(body.Status, body.Reason), id); err != nil {
			platformError(w)
			return
		}
	}

	if tx.Commit(r.Context()) != nil {
		platformError(w)
		return
	}
	utils.JSON(w, 200, map[string]bool{"saved": true})
}
func (h *PlatformHandler) ChapterPublication(w http.ResponseWriter, r *http.Request) {
	user, admin := platformUser(r)
	id, err := platformID(r)
	if err != nil {
		utils.ErrorResponse(w, 400, "Chương không hợp lệ")
		return
	}
	var body struct {
		Status      string     `json:"status"`
		Reason      string     `json:"reason"`
		ScheduledAt *time.Time `json:"scheduled_at"`
	}
	if !platformBody(w, r, &body) {
		return
	}
	if body.Status != "draft" && body.Status != "pending" && body.Status != "published" && body.Status != "scheduled" {
		utils.ErrorResponse(w, 400, "Trạng thái không hợp lệ")
		return
	}
	if (body.Status == "published" || body.Status == "scheduled") && !admin {
		utils.ErrorResponse(w, 403, "Chỉ quản trị viên được duyệt xuất bản")
		return
	}
	if body.Status == "scheduled" && (body.ScheduledAt == nil || !body.ScheduledAt.After(time.Now())) {
		utils.ErrorResponse(w, 400, "Lịch xuất bản phải ở tương lai")
		return
	}
	if body.Status != "scheduled" {
		body.ScheduledAt = nil
	}
	tx, err := h.begin(r.Context())
	if err != nil {
		platformError(w)
		return
	}
	defer tx.Rollback(context.Background())
	var old, storyStatus string
	var owner *uuid.UUID
	if err = tx.QueryRow(r.Context(), `SELECT c.publication_status,s.publication_status,s.created_by FROM chapters c JOIN stories s ON s.id=c.story_id WHERE c.id=$1 AND ($3 OR s.created_by=$2) FOR UPDATE OF s,c`, id, user, admin).Scan(&old, &storyStatus, &owner); err != nil {
		utils.ErrorResponse(w, 404, "Không tìm thấy chương")
		return
	}
	if !reviewReason(w, admin, old, body.Status, &body.Reason) {
		return
	}

	if !admin && (old == "published" || old == "scheduled") {
		utils.ErrorResponse(w, 409, "Chương đã được duyệt; liên hệ quản trị để sửa trạng thái")
		return
	}
	if (body.Status == "published" || body.Status == "scheduled") && storyStatus != "published" {
		utils.ErrorResponse(w, 409, "Cần duyệt xuất bản truyện trước")
		return
	}
	if _, err = tx.Exec(r.Context(), `UPDATE chapters SET publication_status=$2,scheduled_at=$3,review_reason=CASE WHEN $2='draft' THEN $4 ELSE '' END,updated_at=CURRENT_TIMESTAMP WHERE id=$1`, id, body.Status, body.ScheduledAt, body.Reason); err != nil {
		platformError(w)
		return
	}
	if admin {
		if _, err = tx.Exec(r.Context(), `INSERT INTO admin_change_log(admin_id,action)VALUES($1,$2)`, user, "Duyệt chương "+id.String()+": "+body.Status); err != nil {
			platformError(w)
			return
		}
	}
	if admin && old != body.Status && owner != nil && *owner != user {
		if _, err = tx.Exec(r.Context(), `INSERT INTO notifications(user_id,title,message,type,reference_id,reference_type)VALUES($1,'Cập nhật duyệt xuất bản',$2,'publication_review',$3,'studio_chapter')`, *owner, reviewMessage(body.Status, body.Reason), id); err != nil {
			platformError(w)
			return
		}
	}

	if tx.Commit(r.Context()) != nil {
		platformError(w)
		return
	}
	utils.JSON(w, 200, map[string]bool{"saved": true})
}
func (h *PlatformHandler) DraftChapter(w http.ResponseWriter, r *http.Request) {
	user, admin := platformUser(r)
	id, err := platformID(r)
	if err != nil {
		utils.ErrorResponse(w, 400, "Chương không hợp lệ")
		return
	}
	d, err := h.draft(r.Context(), h.pool, id, user, admin)
	if err == pgx.ErrNoRows {
		utils.ErrorResponse(w, 404, "Không tìm thấy chương")
		return
	}
	if err != nil {
		utils.ErrorResponse(w, 503, "Không đọc được nội dung bản thảo từ storage; vui lòng thử lại")
		return
	}
	w.Header().Set("Cache-Control", "private, no-store")
	utils.JSON(w, 200, d)
}
func (h *PlatformHandler) BulkDraftChapters(w http.ResponseWriter, r *http.Request) {
	user, admin := platformUser(r)
	id, err := platformID(r)
	if err != nil {
		utils.ErrorResponse(w, 400, "Truyện không hợp lệ")
		return
	}
	var body struct {
		Chapters []struct {
			Number    float64 `json:"chapter_number"`
			Title     string  `json:"title"`
			Content   string  `json:"content"`
			IsPremium bool    `json:"is_premium"`
		} `json:"chapters"`
	}
	if !platformBody(w, r, &body) {
		return
	}
	if len(body.Chapters) < 1 || len(body.Chapters) > 500 {
		utils.ErrorResponse(w, 400, "Mỗi lần nhập từ 1 đến 500 chương")
		return
	}
	seen := map[float64]bool{}
	for _, c := range body.Chapters {
		if math.IsNaN(c.Number) || math.IsInf(c.Number, 0) || math.Abs(c.Number*10-math.Round(c.Number*10)) > 0.000001 || c.Number <= 0 || c.Number > 99999 || seen[c.Number] || len([]rune(strings.TrimSpace(c.Title))) < 1 || len([]rune(c.Title)) > 255 || len(c.Content) > 500000 {
			utils.ErrorResponse(w, 400, "Số chương, tiêu đề hoặc nội dung không hợp lệ")
			return
		}
		seen[c.Number] = true
	}
	tx, err := h.begin(r.Context())
	if err != nil {
		platformError(w)
		return
	}
	defer tx.Rollback(context.Background())
	var story uuid.UUID
	if err = tx.QueryRow(r.Context(), `SELECT id FROM stories WHERE id=$1 AND ($3 OR created_by=$2)FOR UPDATE`, id, user, admin).Scan(&story); err != nil {
		utils.ErrorResponse(w, 404, "Không tìm thấy truyện")
		return
	}
	payload, err := json.Marshal(body.Chapters)
	if err != nil {
		platformError(w)
		return
	}
	if _, err = tx.Exec(r.Context(), `INSERT INTO chapters(story_id,chapter_number,title,content,is_premium,publication_status)
 SELECT $1,c.chapter_number,btrim(c.title),c.content,c.is_premium,'draft'
 FROM jsonb_to_recordset($2::jsonb)AS c(chapter_number numeric,title text,content text,is_premium boolean)`, id, string(payload)); err != nil {
		utils.ErrorResponse(w, 409, "Số chương bị trùng hoặc dữ liệu không hợp lệ; toàn bộ lần nhập chưa được lưu")
		return
	}

	if tx.Commit(r.Context()) != nil {
		platformError(w)
		return
	}
	utils.JSON(w, 201, map[string]int{"created": len(body.Chapters)})
}
func (h *PlatformHandler) Analytics(w http.ResponseWriter, r *http.Request) {
	user, admin := platformUser(r)
	h.page(w, r, `SELECT s.id,s.title,s.slug,s.view_count,s.rating_avg,s.rating_count,
 (SELECT COUNT(*) FROM chapters c WHERE c.story_id=s.id) AS chapters,
 (SELECT COUNT(DISTINCT h.user_id) FROM listening_history h WHERE h.story_id=s.id) AS listeners,
 (SELECT COUNT(*) FROM listening_history h WHERE h.story_id=s.id AND h.is_completed) AS completed_plays,
 COALESCE((SELECT SUM(e.minutes)FROM listening_reward_events e JOIN chapters c ON c.id=e.chapter_id WHERE c.story_id=s.id),0)AS recorded_minutes,
 COALESCE((SELECT jsonb_agg(t) FROM(SELECT c.id,c.title,c.chapter_number,c.listen_count FROM chapters c WHERE c.story_id=s.id ORDER BY c.listen_count DESC NULLS LAST,c.chapter_number LIMIT 5)t),'[]'::jsonb)AS top_chapters
 FROM stories s WHERE $2 OR s.created_by=$1 ORDER BY s.view_count DESC NULLS LAST,s.id`, user, admin)
}
