package handler

import (
	"context"
	"encoding/json"
	"math"
	"net/http"
	"strings"

	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type chapterDraft struct {
	ID      uuid.UUID `json:"id"`
	StoryID uuid.UUID `json:"story_id"`
	Title   string    `json:"title"`
	Content string    `json:"content"`
	Number  float64   `json:"chapter_number"`
	Premium bool      `json:"is_premium"`
	Status  string    `json:"publication_status"`
	Reason  string    `json:"review_reason"`
	Version int64     `json:"version"`
}

func (h *PlatformHandler) draft(ctx context.Context, q interface {
	QueryRow(context.Context, string, ...any) pgx.Row
}, id, user uuid.UUID, admin bool) (chapterDraft, error) {
	var d chapterDraft
	var stored *string
	err := q.QueryRow(ctx, `SELECT c.id,c.story_id,c.title,COALESCE(c.content,''),c.content_url,c.chapter_number::float8,COALESCE(c.is_premium,FALSE),c.publication_status,c.review_reason,c.edit_version FROM chapters c JOIN stories s ON s.id=c.story_id WHERE c.id=$1 AND ($3 OR s.created_by=$2)`, id, user, admin).Scan(&d.ID, &d.StoryID, &d.Title, &d.Content, &stored, &d.Number, &d.Premium, &d.Status, &d.Reason, &d.Version)
	if err == nil && d.Content == "" && stored != nil && *stored != "" {
		if h.storage == nil {
			return d, errDraftStorage
		}
		d.Content, err = h.storage.GetFileContent(ctx, *stored)
	}
	return d, err
}

var errDraftStorage = &draftStorageError{}

type draftStorageError struct{}

func (*draftStorageError) Error() string { return "draft content is unavailable" }
func (h *PlatformHandler) EditDraft(w http.ResponseWriter, r *http.Request) {
	user, admin := platformUser(r)
	id, err := platformID(r)
	if err != nil {
		utils.ErrorResponse(w, 400, "Chương không hợp lệ")
		return
	}
	var body struct {
		Title   string  `json:"title"`
		Content string  `json:"content"`
		Number  float64 `json:"chapter_number"`
		Premium bool    `json:"is_premium"`
		Version int64   `json:"version"`
	}
	if !platformBody(w, r, &body) {
		return
	}
	body.Title = strings.TrimSpace(body.Title)
	if body.Version < 1 || body.Title == "" || len([]rune(body.Title)) > 255 || len(body.Content) > 4<<20 || math.IsNaN(body.Number) || math.IsInf(body.Number, 0) || body.Number <= 0 || body.Number > 99999 || math.Abs(body.Number*10-math.Round(body.Number*10)) > 0.000001 {
		utils.ErrorResponse(w, 400, "Tiêu đề, số chương hoặc nội dung không hợp lệ (tối đa 4 MB)")
		return
	}
	tx, err := h.begin(r.Context())
	if err != nil {
		platformError(w)
		return
	}
	defer tx.Rollback(context.Background())
	var status string
	var version int64
	err = tx.QueryRow(r.Context(), `SELECT c.publication_status,c.edit_version FROM chapters c JOIN stories s ON s.id=c.story_id WHERE c.id=$1 AND ($3 OR s.created_by=$2)FOR UPDATE OF s,c`, id, user, admin).Scan(&status, &version)
	if err != nil {
		utils.ErrorResponse(w, 404, "Không tìm thấy chương")
		return
	}
	if status != "draft" {
		draftProblem(w, "Chỉ sửa bản nháp; hãy rút bài hoặc trả về nháp trước khi sửa", "draft_not_editable")
		return
	}
	if version != body.Version {
		draftProblem(w, "Bản thảo đã thay đổi ở nơi khác. Tải bản mới trước khi tiếp tục; nội dung bạn đang soạn vẫn được giữ.", "draft_conflict")
		return
	}
	err = tx.QueryRow(r.Context(), `UPDATE chapters SET title=$2,content=$3,content_url=NULL,chapter_number=$4,is_premium=$5,updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING edit_version`, id, body.Title, body.Content, body.Number, body.Premium).Scan(&version)
	if err != nil {
		utils.ErrorResponse(w, 409, "Không lưu được bản thảo; hãy kiểm tra số chương có bị trùng")
		return
	}
	if admin {
		if _, err = tx.Exec(r.Context(), `INSERT INTO admin_change_log(admin_id,action)VALUES($1,$2)`, user, "Sửa bản nháp "+id.String()); err != nil {
			platformError(w)
			return
		}
	}
	if tx.Commit(r.Context()) != nil {
		platformError(w)
		return
	}
	w.Header().Set("Cache-Control", "private, no-store")
	utils.JSON(w, 200, map[string]any{"saved": true, "version": version})
}
func (h *PlatformHandler) PublicationStory(w http.ResponseWriter, r *http.Request) {
	user, admin := platformUser(r)
	id, err := platformID(r)
	if err != nil {
		utils.ErrorResponse(w, 400, "Truyện không hợp lệ")
		return
	}
	var data []byte
	err = h.pool.QueryRow(r.Context(), `SELECT jsonb_build_object('id',s.id,'title',s.title,'slug',s.slug,'publication_status',s.publication_status,'review_reason',s.review_reason,'owner_name',u.username)FROM stories s LEFT JOIN users u ON u.id=s.created_by WHERE s.id=$1 AND ($3 OR s.created_by=$2)`, id, user, admin).Scan(&data)
	if err != nil {
		utils.ErrorResponse(w, 404, "Không tìm thấy truyện")
		return
	}
	w.Header().Set("Cache-Control", "private, no-store")
	utils.JSON(w, 200, json.RawMessage(data))
}
func (h *PlatformHandler) PublicationChapters(w http.ResponseWriter, r *http.Request) {
	user, admin := platformUser(r)
	id, err := platformID(r)
	if err != nil {
		utils.ErrorResponse(w, 400, "Truyện không hợp lệ")
		return
	}
	if !h.owner(r.Context(), id, user, admin) {
		utils.ErrorResponse(w, 404, "Không tìm thấy truyện")
		return
	}
	h.page(w, r, `SELECT c.id,c.title,c.chapter_number,c.publication_status,c.scheduled_at,c.review_reason,c.edit_version AS version FROM chapters c WHERE c.story_id=$1 AND ($2='' OR c.title ILIKE '%'||$2||'%')AND($3='' OR c.publication_status=$3)ORDER BY c.chapter_number,c.id`, id, strings.TrimSpace(r.URL.Query().Get("q")), r.URL.Query().Get("status"))
}

func reviewReason(w http.ResponseWriter, admin bool, old, status string, reason *string) bool {
	*reason = strings.TrimSpace(*reason)
	if (!admin && *reason != "") || len([]rune(*reason)) > 2000 {
		utils.ErrorResponse(w, 400, "Lý do duyệt không hợp lệ (tối đa 2.000 ký tự)")
		return false
	}
	if admin && status == "draft" && old != "draft" && len([]rune(*reason)) < 5 {
		utils.ErrorResponse(w, 400, "Cần ghi lý do trả về nháp, ít nhất 5 ký tự")
		return false
	}
	return true
}
func reviewMessage(status, reason string) string {
	switch status {
	case "draft":
		return "Nội dung được trả về bản nháp. Lý do: " + reason
	case "published":
		return "Nội dung của bạn đã được duyệt và xuất bản."
	case "scheduled":
		return "Nội dung của bạn đã được duyệt và lên lịch xuất bản."
	default:
		return "Trạng thái duyệt nội dung của bạn đã được cập nhật."
	}
}

func draftProblem(w http.ResponseWriter, message, code string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(409)
	_ = json.NewEncoder(w).Encode(map[string]any{"success": false, "error": message, "code": code})
}
