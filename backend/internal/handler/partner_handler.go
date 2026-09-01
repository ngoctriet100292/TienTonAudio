package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/internal/service"
	"github.com/IREAKING/tientonaudio/backend/pkg/auth"
	"github.com/IREAKING/tientonaudio/backend/pkg/storage"
	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
)

type PartnerHandler struct {
	pool           *pgxpool.Pool
	storageService storage.StorageService
	storyService   service.StoryService
	chapterService service.ChapterService
}

func NewPartnerHandler(
	pool *pgxpool.Pool,
	storageService storage.StorageService,
	storyService service.StoryService,
	chapterService service.ChapterService,
) *PartnerHandler {
	return &PartnerHandler{
		pool:           pool,
		storageService: storageService,
		storyService:   storyService,
		chapterService: chapterService,
	}
}

// BecomePartner đăng ký / kích hoạt quyền Đối Tác Sáng Tác
func (h *PartnerHandler) BecomePartner(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	role := "partner"
	_, err := h.pool.Exec(r.Context(), "UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", role, claims.UserID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, fmt.Sprintf("Không thể cập nhật quyền đối tác: %v", err))
		return
	}

	utils.JSONWithMessage(w, http.StatusOK, "Chúc mừng Đạo Hữu đã gia nhập Tiên Tôn Sáng Tác Đường!", map[string]any{
		"user_id": claims.UserID,
		"role":    role,
	})
}

// GetPartnerStats lấy thống kê tổng quan của đối tác
func (h *PartnerHandler) GetPartnerStats(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var totalStories int64
	var totalChapters int64
	var totalViews int64
	var totalListens int64

	isAdmin := claims.HasRole("admin")

	var err error
	if isAdmin {
		_ = h.pool.QueryRow(r.Context(), "SELECT COUNT(*) FROM stories").Scan(&totalStories)
		_ = h.pool.QueryRow(r.Context(), "SELECT COUNT(*) FROM chapters").Scan(&totalChapters)
		_ = h.pool.QueryRow(r.Context(), "SELECT COALESCE(SUM(view_count), 0) FROM stories").Scan(&totalViews)
		_ = h.pool.QueryRow(r.Context(), "SELECT COALESCE(SUM(listen_count), 0) FROM chapters").Scan(&totalListens)
	} else {
		_ = h.pool.QueryRow(r.Context(), "SELECT COUNT(*) FROM stories WHERE created_by = $1", claims.UserID).Scan(&totalStories)
		_ = h.pool.QueryRow(r.Context(), "SELECT COUNT(c.id) FROM chapters c JOIN stories s ON c.story_id = s.id WHERE s.created_by = $1", claims.UserID).Scan(&totalChapters)
		_ = h.pool.QueryRow(r.Context(), "SELECT COALESCE(SUM(view_count), 0) FROM stories WHERE created_by = $1", claims.UserID).Scan(&totalViews)
		_ = h.pool.QueryRow(r.Context(), "SELECT COALESCE(SUM(c.listen_count), 0) FROM chapters c JOIN stories s ON c.story_id = s.id WHERE s.created_by = $1", claims.UserID).Scan(&totalListens)
	}

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, map[string]any{
		"total_stories":  totalStories,
		"total_chapters": totalChapters,
		"total_views":    totalViews,
		"total_listens":  totalListens,
		"is_admin":       isAdmin,
	})
}

type PartnerStoryItem struct {
	ID            uuid.UUID `json:"id"`
	Title         string    `json:"title"`
	Slug          string    `json:"slug"`
	Description   *string   `json:"description,omitempty"`
	CoverImageURL *string   `json:"cover_image_url,omitempty"`
	Status        string    `json:"status"`
	ViewCount     int64     `json:"view_count"`
	TotalChapters int32     `json:"total_chapters"`
	RatingAvg     float64   `json:"rating_avg"`
	RatingCount   int32     `json:"rating_count"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// ListPartnerStories lấy danh sách truyện của đối tác
func (h *PartnerHandler) ListPartnerStories(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	isAdmin := claims.HasRole("admin")

	var rowsQuery string
	var args []any

	if isAdmin {
		rowsQuery = `
			SELECT id, title, slug, description, cover_image_url, status, view_count, total_chapters, rating_avg, rating_count, created_at, updated_at
			FROM stories
			ORDER BY updated_at DESC LIMIT 50`
	} else {
		rowsQuery = `
			SELECT id, title, slug, description, cover_image_url, status, view_count, total_chapters, rating_avg, rating_count, created_at, updated_at
			FROM stories
			WHERE created_by = $1
			ORDER BY updated_at DESC LIMIT 50`
		args = append(args, claims.UserID)
	}

	rows, err := h.pool.Query(r.Context(), rowsQuery, args...)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	items := make([]PartnerStoryItem, 0)
	for rows.Next() {
		var item PartnerStoryItem
		var ratingAvgStr string
		err := rows.Scan(
			&item.ID,
			&item.Title,
			&item.Slug,
			&item.Description,
			&item.CoverImageURL,
			&item.Status,
			&item.ViewCount,
			&item.TotalChapters,
			&ratingAvgStr,
			&item.RatingCount,
			&item.CreatedAt,
			&item.UpdatedAt,
		)
		if err == nil {
			if f, err := strconv.ParseFloat(ratingAvgStr, 64); err == nil {
				item.RatingAvg = f
			}
			items = append(items, item)
		}
	}

	utils.JSON(w, http.StatusOK, items)
}

type CreatePartnerStoryReq struct {
	Title         string  `json:"title" validate:"required"`
	Slug          string  `json:"slug"`
	Description   *string `json:"description,omitempty"`
	CoverImageURL *string `json:"cover_image_url,omitempty"`
	Status        string  `json:"status"`
	Categories    []int32 `json:"categories,omitempty"`
}

// CreatePartnerStory đăng truyện mới
func (h *PartnerHandler) CreatePartnerStory(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req CreatePartnerStoryReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Title == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Tên truyện không được để trống")
		return
	}

	slug := req.Slug
	if slug == "" {
		slug = utils.ToSlug(req.Title)
	}

	status := req.Status
	if status == "" {
		status = "ongoing"
	}

	var createdID uuid.UUID
	insertQuery := `
		INSERT INTO stories (title, slug, description, cover_image_url, status, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		RETURNING id`
	err := h.pool.QueryRow(r.Context(), insertQuery, req.Title, slug, req.Description, req.CoverImageURL, status, claims.UserID).Scan(&createdID)
	if err != nil {
		// Thử đổi slug nếu trùng
		slug = fmt.Sprintf("%s-%d", slug, time.Now().Unix())
		err = h.pool.QueryRow(r.Context(), insertQuery, req.Title, slug, req.Description, req.CoverImageURL, status, claims.UserID).Scan(&createdID)
		if err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, fmt.Sprintf("Không thể tạo truyện: %v", err))
			return
		}
	}

	// Gán thể loại nếu có
	for _, catID := range req.Categories {
		_, _ = h.pool.Exec(r.Context(), "INSERT INTO story_categories (story_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", createdID, catID)
	}

	utils.JSONWithMessage(w, http.StatusCreated, "Đăng tác phẩm thành công!", map[string]any{
		"id":   createdID,
		"slug": slug,
	})
}

// UpdatePartnerStory cập nhật thông tin truyện
func (h *PartnerHandler) UpdatePartnerStory(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	storyIDStr := chi.URLParam(r, "id")
	storyID, err := uuid.Parse(storyIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid story ID")
		return
	}

	// Kiểm tra quyền sở hữu
	if !claims.HasRole("admin") {
		var ownerID *uuid.UUID
		err := h.pool.QueryRow(r.Context(), "SELECT created_by FROM stories WHERE id = $1", storyID).Scan(&ownerID)
		if err != nil || ownerID == nil || *ownerID != claims.UserID {
			utils.ErrorResponse(w, http.StatusForbidden, "Bạn không có quyền chỉnh sửa tác phẩm này")
			return
		}
	}

	var req CreatePartnerStoryReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	updateQuery := `
		UPDATE stories
		SET title = COALESCE(NULLIF($1, ''), title),
		    description = COALESCE($2, description),
		    cover_image_url = COALESCE($3, cover_image_url),
		    status = COALESCE(NULLIF($4, ''), status),
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $5`
	_, err = h.pool.Exec(r.Context(), updateQuery, req.Title, req.Description, req.CoverImageURL, req.Status, storyID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusOK, "Cập nhật tác phẩm thành công", nil)
}

// DeletePartnerStory xóa tác phẩm
func (h *PartnerHandler) DeletePartnerStory(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	storyIDStr := chi.URLParam(r, "id")
	storyID, err := uuid.Parse(storyIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid story ID")
		return
	}

	if !claims.HasRole("admin") {
		var ownerID *uuid.UUID
		err := h.pool.QueryRow(r.Context(), "SELECT created_by FROM stories WHERE id = $1", storyID).Scan(&ownerID)
		if err != nil || ownerID == nil || *ownerID != claims.UserID {
			utils.ErrorResponse(w, http.StatusForbidden, "Bạn không có quyền xóa tác phẩm này")
			return
		}
	}

	_, err = h.pool.Exec(r.Context(), "DELETE FROM stories WHERE id = $1", storyID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusOK, "Đã xóa tác phẩm thành công", nil)
}

// ListStoryChapters danh sách chương của truyện
func (h *PartnerHandler) ListStoryChapters(w http.ResponseWriter, r *http.Request) {
	storyIDStr := chi.URLParam(r, "id")
	storyID, err := uuid.Parse(storyIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid story ID")
		return
	}

	chapters, err := h.chapterService.ListChaptersByStory(r.Context(), storyID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, chapters)
}

type CreatePartnerChapterReq struct {
	ChapterNumber   float64 `json:"chapter_number" validate:"required"`
	Title           string  `json:"title" validate:"required"`
	Content         *string `json:"content,omitempty"`
	ContentURL      *string `json:"content_url,omitempty"`
	IsPremium       bool    `json:"is_premium"`
	AudioURL        *string `json:"audio_url,omitempty"`
	DurationSeconds int32   `json:"duration_seconds"`
}

// CreateStoryChapter thêm chương mới kèm audio & text
func (h *PartnerHandler) CreateStoryChapter(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	storyIDStr := chi.URLParam(r, "id")
	storyID, err := uuid.Parse(storyIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid story ID")
		return
	}

	// Kiểm tra quyền
	if !claims.HasRole("admin") {
		var ownerID *uuid.UUID
		err := h.pool.QueryRow(r.Context(), "SELECT created_by FROM stories WHERE id = $1", storyID).Scan(&ownerID)
		if err != nil || ownerID == nil || *ownerID != claims.UserID {
			utils.ErrorResponse(w, http.StatusForbidden, "Bạn không có quyền thêm tập cho tác phẩm này")
			return
		}
	}

	var req CreatePartnerChapterReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	createdCh, err := h.chapterService.CreateChapter(r.Context(), domain.CreateChapterReq{
		StoryID:         storyID,
		ChapterNumber:   req.ChapterNumber,
		Title:           req.Title,
		Content:         req.Content,
		ContentURL:      req.ContentURL,
		IsPremium:       &req.IsPremium,
		DurationSeconds: &req.DurationSeconds,
	})
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	// Nếu có audio URL, thêm vào chapter_audio_files
	if req.AudioURL != nil && *req.AudioURL != "" {
		_, _ = h.chapterService.AddChapterAudioFile(r.Context(), createdCh.ID, "320kbps", *req.AudioURL, nil, true)
	}

	// Cập nhật lại tổng số tập trong bảng stories
	_, _ = h.pool.Exec(r.Context(), "UPDATE stories SET total_chapters = (SELECT COUNT(*) FROM chapters WHERE story_id = $1), updated_at = CURRENT_TIMESTAMP WHERE id = $1", storyID)

	utils.JSONWithMessage(w, http.StatusCreated, "Thêm tập mới thành công!", createdCh)
}

// UploadCoverImage upload ảnh bìa truyện lên R2
func (h *PartnerHandler) UploadCoverImage(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(10 << 20) // 10MB
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "File ảnh quá lớn (tối đa 10MB)")
		return
	}

	file, header, err := r.FormFile("cover")
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Thiếu trường file 'cover'")
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Định dạng file không hỗ trợ. Vui lòng chọn .jpg, .png hoặc .webp")
		return
	}

	fileBytes, err := io.ReadAll(file)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Lỗi đọc file ảnh")
		return
	}

	key := fmt.Sprintf("stories/covers/%s_%d%s", uuid.New().String(), time.Now().Unix(), ext)
	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "image/jpeg"
	}

	coverURL, err := h.storageService.UploadFile(r.Context(), key, bytes.NewReader(fileBytes), contentType)
	if err != nil || coverURL == "" {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Không thể tải ảnh bìa lên Cloudflare R2")
		return
	}

	utils.JSONWithMessage(w, http.StatusOK, "Tải ảnh bìa thành công", map[string]string{
		"url": coverURL,
	})
}

// UploadAudio upload file audio lên R2
func (h *PartnerHandler) UploadAudio(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(100 << 20) // 100MB
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "File audio quá lớn (tối đa 100MB)")
		return
	}

	file, header, err := r.FormFile("audio")
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Thiếu trường file 'audio'")
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext != ".mp3" && ext != ".m4a" && ext != ".wav" && ext != ".aac" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Định dạng audio không hỗ trợ. Vui lòng chọn .mp3, .m4a hoặc .wav")
		return
	}

	fileBytes, err := io.ReadAll(file)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Lỗi đọc file audio")
		return
	}

	key := fmt.Sprintf("stories/audio/%s_%d%s", uuid.New().String(), time.Now().Unix(), ext)
	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "audio/mpeg"
	}

	audioURL, err := h.storageService.UploadFile(r.Context(), key, bytes.NewReader(fileBytes), contentType)
	if err != nil || audioURL == "" {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Không thể tải audio lên Cloudflare R2")
		return
	}

	utils.JSONWithMessage(w, http.StatusOK, "Tải file audio lên Cloudflare R2 thành công", map[string]string{
		"url": audioURL,
	})
}
