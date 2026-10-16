package handler

import (
	"context"
	"encoding/json"
	"errors"
	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
	"github.com/jackc/pgx/v5"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/IREAKING/tientonaudio/backend/pkg/auth"
	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type PlatformHandler struct{ pool db.DBTX }

func NewPlatformHandler(pool db.DBTX) *PlatformHandler { return &PlatformHandler{pool: pool} }
func (h *PlatformHandler) begin(ctx context.Context) (pgx.Tx, error) {
	if db, ok := h.pool.(interface {
		Begin(context.Context) (pgx.Tx, error)
	}); ok {
		return db.Begin(ctx)
	}
	return nil, errors.New("database does not support transactions")
}
func platformUser(r *http.Request) (uuid.UUID, bool) {
	c, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		return uuid.Nil, false
	}
	return c.UserID, c.Role == "admin"
}
func platformID(r *http.Request) (uuid.UUID, error) { return uuid.Parse(chi.URLParam(r, "id")) }
func platformBody(w http.ResponseWriter, r *http.Request, value any) bool {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8<<20))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(value); err != nil {
		utils.ErrorResponse(w, 400, "Dữ liệu không hợp lệ")
		return false
	}
	if decoder.Decode(&struct{}{}) != io.EOF {
		utils.ErrorResponse(w, 400, "Dữ liệu không hợp lệ")
		return false
	}
	return true
}
func platformError(w http.ResponseWriter) {
	utils.ErrorResponse(w, 500, "Không thực hiện được thao tác; vui lòng thử lại")
}
func (h *PlatformHandler) rows(w http.ResponseWriter, r *http.Request, query string, args ...any) {
	var data json.RawMessage
	if err := h.pool.QueryRow(r.Context(), "SELECT COALESCE(jsonb_agg(to_jsonb(result)), '[]'::jsonb) FROM ("+query+") result", args...).Scan(&data); err != nil {
		platformError(w)
		return
	}
	w.Header().Set("Cache-Control", "private, no-store")
	utils.JSON(w, 200, data)
}
func (h *PlatformHandler) owner(ctx context.Context, storyID, userID uuid.UUID, admin bool) bool {
	var ok bool
	err := h.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM stories WHERE id=$1 AND ($3 OR created_by=$2))`, storyID, userID, admin).Scan(&ok)
	return err == nil && ok
}
func (h *PlatformHandler) ContinueListening(w http.ResponseWriter, r *http.Request) {
	user, _ := platformUser(r)
	h.rows(w, r, `SELECT DISTINCT ON (recent.updated_at,recent.story_id) recent.story_id, s.slug AS story_slug,s.title AS story_title,s.cover_image_url,
 COALESCE(next.id,c.id) AS chapter_id,COALESCE(next.title,c.title) AS chapter_title,COALESCE(next.chapter_number,c.chapter_number) AS chapter_number,
 CASE WHEN next.id IS NOT NULL THEN 0 ELSE recent.last_position_seconds END AS position_seconds,
 COALESCE(next.duration_seconds,c.duration_seconds) AS duration_seconds,recent.playback_speed,recent.updated_at
 FROM (SELECT DISTINCT ON(story_id) * FROM listening_history WHERE user_id=$1 ORDER BY story_id,updated_at DESC) recent
 JOIN stories s ON s.id=recent.story_id AND s.publication_status='published'
 JOIN chapters c ON c.id=recent.chapter_id AND c.story_id=s.id AND c.publication_status='published'
 LEFT JOIN LATERAL(SELECT id,title,chapter_number,duration_seconds FROM chapters WHERE story_id=s.id AND chapter_number>c.chapter_number AND publication_status='published' AND COALESCE(recent.is_completed,FALSE) ORDER BY chapter_number LIMIT 1)next ON TRUE
 ORDER BY recent.updated_at DESC,recent.story_id LIMIT 12`, user)
}
func (h *PlatformHandler) FollowStory(w http.ResponseWriter, r *http.Request) {
	user, _ := platformUser(r)
	id, err := platformID(r)
	if err != nil {
		utils.ErrorResponse(w, 400, "Truyện không hợp lệ")
		return
	}
	if r.Method == http.MethodGet {
		var following bool
		if err = h.pool.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM story_follows WHERE user_id=$1 AND story_id=$2)`, user, id).Scan(&following); err != nil {
			platformError(w)
			return
		}
		utils.JSON(w, 200, map[string]bool{"following": following})
		return
	}
	if r.Method == http.MethodDelete {
		_, err = h.pool.Exec(r.Context(), `DELETE FROM story_follows WHERE user_id=$1 AND story_id=$2`, user, id)
	} else {
		var found bool
		err = h.pool.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM stories WHERE id=$1 AND publication_status='published')`, id).Scan(&found)
		if err != nil {
			platformError(w)
			return
		}
		if !found {
			utils.ErrorResponse(w, 404, "Không tìm thấy truyện")
			return
		}
		_, err = h.pool.Exec(r.Context(), `INSERT INTO story_follows(user_id,story_id)VALUES($1,$2)ON CONFLICT DO NOTHING`, user, id)
	}
	if err != nil {
		platformError(w)
		return
	}
	utils.JSON(w, 200, map[string]bool{"following": r.Method != http.MethodDelete})
}
func (h *PlatformHandler) FollowedStories(w http.ResponseWriter, r *http.Request) {
	user, _ := platformUser(r)
	h.rows(w, r, `SELECT s.id,s.title,s.slug,s.cover_image_url,s.total_chapters,s.updated_at FROM story_follows f JOIN stories s ON s.id=f.story_id WHERE f.user_id=$1 AND s.publication_status='published' ORDER BY s.updated_at DESC LIMIT 100`, user)
}
func (h *PlatformHandler) Reviews(w http.ResponseWriter, r *http.Request) {
	id, err := platformID(r)
	if err != nil {
		utils.ErrorResponse(w, 400, "Truyện không hợp lệ")
		return
	}
	if r.Method == http.MethodGet {
		h.rows(w, r, `SELECT v.id,v.user_id,u.username,v.rating,v.content,v.created_at FROM reviews v JOIN users u ON u.id=v.user_id AND u.deleted_at IS NULL JOIN stories s ON s.id=v.story_id AND s.publication_status='published' WHERE v.story_id=$1 ORDER BY v.created_at DESC LIMIT 100`, id)
		return
	}
	user, _ := platformUser(r)
	var body struct {
		Rating  int    `json:"rating"`
		Content string `json:"content"`
	}
	if r.Method != http.MethodDelete && (!platformBody(w, r, &body)) {
		return
	}
	body.Content = strings.TrimSpace(body.Content)
	if r.Method != http.MethodDelete && (body.Rating < 1 || body.Rating > 5 || len([]rune(body.Content)) > 4000) {
		utils.ErrorResponse(w, 400, "Điểm đánh giá phải từ 1 đến 5; nội dung tối đa 4.000 ký tự")
		return
	}
	tx, err := h.begin(r.Context())
	if err != nil {
		platformError(w)
		return
	}
	defer tx.Rollback(context.Background())
	var story uuid.UUID
	if err = tx.QueryRow(r.Context(), `SELECT id FROM stories WHERE id=$1 AND publication_status='published' FOR UPDATE`, id).Scan(&story); err != nil {
		utils.ErrorResponse(w, 404, "Không tìm thấy truyện")
		return
	}
	if r.Method == http.MethodDelete {
		_, err = tx.Exec(r.Context(), `DELETE FROM reviews WHERE user_id=$1 AND story_id=$2`, user, id)
	} else {
		_, err = tx.Exec(r.Context(), `INSERT INTO reviews(user_id,story_id,rating,content)VALUES($1,$2,$3,$4)ON CONFLICT(user_id,story_id) DO UPDATE SET rating=EXCLUDED.rating,content=EXCLUDED.content,created_at=CURRENT_TIMESTAMP`, user, id, body.Rating, body.Content)
	}
	if err != nil || tx.Commit(r.Context()) != nil {
		platformError(w)
		return
	}
	utils.JSON(w, 200, map[string]bool{"saved": true})
}
func (h *PlatformHandler) Search(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	sort := q.Get("sort")
	if sort != "rating" && sort != "chapters" {
		sort = "views"
	}
	minCh, minDur := 0, 0
	var parseErr error
	if v := q.Get("min_chapters"); v != "" {
		minCh, parseErr = strconv.Atoi(v)
	}
	if parseErr == nil {
		if v := q.Get("min_minutes"); v != "" {
			minDur, parseErr = strconv.Atoi(v)
		}
	}
	if parseErr != nil {
		utils.ErrorResponse(w, 400, "Bộ lọc không hợp lệ")
		return
	}
	if minCh < 0 || minDur < 0 || minCh > 100000 || minDur > 1000000 {
		utils.ErrorResponse(w, 400, "Bộ lọc không hợp lệ")
		return
	}
	h.rows(w, r, `SELECT s.id,s.title,s.slug,s.cover_image_url,s.status,s.view_count,s.total_chapters,s.rating_avg,s.rating_count,a.name AS author_name,
 COALESCE((SELECT SUM(c.duration_seconds) FROM chapters c WHERE c.story_id=s.id AND c.publication_status='published'),0) AS duration_seconds
 FROM stories s LEFT JOIN authors a ON a.id=s.author_id WHERE s.publication_status='published'
 AND ($1='' OR s.title ILIKE '%'||$1||'%' OR a.name ILIKE '%'||$1||'%') AND ($2='' OR s.status=$2) AND COALESCE(s.total_chapters,0)>=$3
 AND ($4='' OR EXISTS(SELECT 1 FROM chapters c JOIN narrators n ON n.id=c.narrator_id WHERE c.story_id=s.id AND c.publication_status='published' AND n.name ILIKE '%'||$4||'%'))
 AND ($5=0 OR COALESCE((SELECT SUM(duration_seconds) FROM chapters WHERE story_id=s.id AND publication_status='published'),0)>=$5::bigint*60)
 ORDER BY CASE WHEN $6='rating' THEN s.rating_avg END DESC NULLS LAST,CASE WHEN $6='chapters' THEN s.total_chapters END DESC NULLS LAST,s.view_count DESC NULLS LAST,s.id LIMIT 100`, strings.TrimSpace(q.Get("q")), q.Get("status"), minCh, strings.TrimSpace(q.Get("narrator")), minDur, sort)
}
func SchedulePublications(ctx context.Context, pool db.DBTX) error {
	_, err := pool.Exec(ctx, `UPDATE chapters c SET publication_status='published',updated_at=CURRENT_TIMESTAMP FROM stories s WHERE c.story_id=s.id AND s.publication_status='published' AND c.publication_status='scheduled' AND c.scheduled_at<=CURRENT_TIMESTAMP`)
	return err
}

func (h *PlatformHandler) PublicChapter(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			utils.ErrorResponse(w, 404, "Không tìm thấy chương")
			return
		}
		var visible bool
		if err = h.pool.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM chapters c JOIN stories s ON s.id=c.story_id WHERE c.id=$1 AND c.publication_status='published' AND s.publication_status='published')`, id).Scan(&visible); err != nil {
			platformError(w)
			return
		}
		if !visible {
			utils.ErrorResponse(w, 404, "Không tìm thấy chương")
			return
		}
		next.ServeHTTP(w, r)
	})
}
func (h *PlatformHandler) PublicStory(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		value := chi.URLParam(r, "slug")
		if value == "" {
			value = chi.URLParam(r, "storyId")
		}
		var visible bool
		if err := h.pool.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM stories WHERE (slug=$1 OR id::text=$1) AND publication_status='published')`, value).Scan(&visible); err != nil {
			platformError(w)
			return
		}
		if !visible {
			utils.ErrorResponse(w, 404, "Không tìm thấy truyện")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (h *PlatformHandler) LinkedAccounts(w http.ResponseWriter, r *http.Request) {
	user, _ := platformUser(r)
	if r.Method == http.MethodGet {
		h.rows(w, r, `SELECT provider,email,created_at FROM oauth_accounts WHERE user_id=$1 ORDER BY provider`, user)
		return
	}
	provider := chi.URLParam(r, "provider")
	if provider != "google" && provider != "facebook" && provider != "apple" {
		utils.ErrorResponse(w, 400, "Nhà cung cấp không hợp lệ")
		return
	}
	tx, err := h.begin(r.Context())
	if err != nil {
		platformError(w)
		return
	}
	defer tx.Rollback(context.Background())
	var password *string
	if err = tx.QueryRow(r.Context(), `SELECT password_hash FROM users WHERE id=$1 AND deleted_at IS NULL FOR UPDATE`, user).Scan(&password); err != nil {
		utils.ErrorResponse(w, 401, "Tài khoản không khả dụng")
		return
	}
	var others int
	if err = tx.QueryRow(r.Context(), `SELECT COUNT(*)FROM oauth_accounts WHERE user_id=$1 AND provider<>$2`, user, provider).Scan(&others); err != nil {
		platformError(w)
		return
	}
	if (password == nil || *password == "") && others == 0 {
		utils.ErrorResponse(w, 409, "Cần có mật khẩu hoặc liên kết khác trước khi gỡ cách đăng nhập cuối cùng")
		return
	}
	if _, err = tx.Exec(r.Context(), `DELETE FROM oauth_accounts WHERE user_id=$1 AND provider=$2`, user, provider); err != nil {
		platformError(w)
		return
	}
	if tx.Commit(r.Context()) != nil {
		platformError(w)
		return
	}
	utils.JSON(w, 200, map[string]bool{"unlinked": true})
}

// ChapterProgress only returns the authenticated listener's position for public chapters.
func (h *PlatformHandler) ChapterProgress(w http.ResponseWriter, r *http.Request) {
	id, err := platformID(r)
	if err != nil {
		utils.ErrorResponse(w, 400, "Chương không hợp lệ")
		return
	}
	user, _ := platformUser(r)
	var data json.RawMessage
	err = h.pool.QueryRow(r.Context(), `SELECT COALESCE((SELECT jsonb_build_object('position_seconds',h.last_position_seconds,'is_completed',h.is_completed,'playback_speed',h.playback_speed) FROM listening_history h JOIN chapters c ON c.id=h.chapter_id JOIN stories s ON s.id=c.story_id WHERE h.user_id=$1 AND h.chapter_id=$2 AND c.publication_status='published' AND s.publication_status='published'),'{}'::jsonb)`, user, id).Scan(&data)
	if err != nil {
		platformError(w)
		return
	}
	w.Header().Set("Cache-Control", "private, no-store")
	utils.JSON(w, 200, data)
}

func (h *PlatformHandler) ChapterLocation(w http.ResponseWriter, r *http.Request) {
	id, err := platformID(r)
	if err != nil {
		utils.ErrorResponse(w, 400, "Chương không hợp lệ")
		return
	}
	var slug string
	if err = h.pool.QueryRow(r.Context(), `SELECT s.slug FROM chapters c JOIN stories s ON s.id=c.story_id WHERE c.id=$1 AND c.publication_status='published' AND s.publication_status='published'`, id).Scan(&slug); err != nil {
		utils.ErrorResponse(w, 404, "Không tìm thấy chương")
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	utils.JSON(w, 200, map[string]string{"story_slug": slug, "chapter_id": id.String()})
}
