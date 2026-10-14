package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
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
	ChapterNumber   float64                 `json:"chapter_number" validate:"required"`
	Title           string                  `json:"title" validate:"required"`
	Content         *string                 `json:"content,omitempty"`
	ContentURL      *string                 `json:"content_url,omitempty"`
	IsPremium       bool                    `json:"is_premium"`
	AudioURL        *string                 `json:"audio_url,omitempty"`
	DurationSeconds int32                   `json:"duration_seconds"`
	TimelineMarkers []domain.TimelineMarker `json:"timeline_markers,omitempty"`
	RawTimestamps   *string                 `json:"raw_timestamps,omitempty"`
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

	// Tự động phân tích mốc thời gian YouTube nếu gửi dạng văn bản raw_timestamps
	if len(req.TimelineMarkers) == 0 && req.RawTimestamps != nil && *req.RawTimestamps != "" {
		req.TimelineMarkers = utils.ParseYouTubeTimestamps(*req.RawTimestamps)
	}

	createdCh, err := h.chapterService.CreateChapter(r.Context(), domain.CreateChapterReq{
		StoryID:         storyID,
		ChapterNumber:   req.ChapterNumber,
		Title:           req.Title,
		Content:         req.Content,
		ContentURL:      req.ContentURL,
		IsPremium:       &req.IsPremium,
		DurationSeconds: &req.DurationSeconds,
		TimelineMarkers: req.TimelineMarkers,
	})
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	// Nếu có audio URL, thêm vào chapter_audio_files với chất lượng chuẩn 320k
	if req.AudioURL != nil && *req.AudioURL != "" {
		af, err := h.chapterService.AddChapterAudioFile(r.Context(), createdCh.ID, "320k", *req.AudioURL, nil, true)
		if err != nil {
			slog.Error("failed to add chapter audio file", "error", err, "chapter_id", createdCh.ID, "audio_url", *req.AudioURL)
		} else {
			slog.Info("successfully saved chapter audio file", "chapter_id", createdCh.ID, "af_id", af.ID, "audio_url", af.AudioURL)
		}
	}

	// Cập nhật lại tổng số tập trong bảng stories
	_, _ = h.pool.Exec(r.Context(), "UPDATE stories SET total_chapters = (SELECT COUNT(*) FROM chapters WHERE story_id = $1), updated_at = CURRENT_TIMESTAMP WHERE id = $1", storyID)

	utils.JSONWithMessage(w, http.StatusCreated, "Thêm tập mới thành công!", createdCh)
}

type AttachChapterAudioReq struct {
	AudioURL        string `json:"audio_url" validate:"required"`
	Quality         string `json:"quality"`
	DurationSeconds int32  `json:"duration_seconds"`
}

// AttachChapterAudio gắn hoặc cập nhật file audio cho một chương đã tồn tại
func (h *PartnerHandler) AttachChapterAudio(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	chapterIDStr := chi.URLParam(r, "id")
	chapterID, err := uuid.Parse(chapterIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid chapter ID")
		return
	}

	var req AttachChapterAudioReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.AudioURL == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Audio URL không được để trống")
		return
	}

	// Kiểm tra quyền sở hữu chapter
	if !claims.HasRole("admin") {
		var ownerID *uuid.UUID
		err := h.pool.QueryRow(r.Context(), "SELECT s.created_by FROM chapters c JOIN stories s ON c.story_id = s.id WHERE c.id = $1", chapterID).Scan(&ownerID)
		if err != nil || ownerID == nil || *ownerID != claims.UserID {
			utils.ErrorResponse(w, http.StatusForbidden, "Bạn không có quyền cập nhật chương này")
			return
		}
	}

	quality := req.Quality
	if quality == "" {
		quality = "320k"
	}

	af, err := h.chapterService.AddChapterAudioFile(r.Context(), chapterID, quality, req.AudioURL, nil, true)
	if err != nil {
		slog.Error("failed to attach audio file to chapter", "error", err, "chapter_id", chapterID)
		utils.ErrorResponse(w, http.StatusInternalServerError, "Không thể gắn file audio: "+err.Error())
		return
	}

	if req.DurationSeconds > 0 {
		_, _ = h.pool.Exec(r.Context(), "UPDATE chapters SET duration_seconds = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", req.DurationSeconds, chapterID)
	}

	slog.Info("successfully attached audio to chapter", "chapter_id", chapterID, "audio_url", req.AudioURL)
	utils.JSONWithMessage(w, http.StatusOK, "Gắn file audio vào chương thành công!", af)
}

// DeleteStoryChapter xóa một chương
func (h *PartnerHandler) DeleteStoryChapter(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	chapterIDStr := chi.URLParam(r, "id")
	chapterID, err := uuid.Parse(chapterIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid chapter ID")
		return
	}

	var storyID uuid.UUID
	var ownerID *uuid.UUID
	err = h.pool.QueryRow(r.Context(), "SELECT c.story_id, s.created_by FROM chapters c JOIN stories s ON c.story_id = s.id WHERE c.id = $1", chapterID).Scan(&storyID, &ownerID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Chương không tồn tại")
		return
	}

	if !claims.HasRole("admin") && (ownerID == nil || *ownerID != claims.UserID) {
		utils.ErrorResponse(w, http.StatusForbidden, "Bạn không có quyền xóa chương này")
		return
	}

	_, err = h.pool.Exec(r.Context(), "DELETE FROM chapters WHERE id = $1", chapterID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Không thể xóa chương: "+err.Error())
		return
	}

	// Cập nhật lại total_chapters
	_, _ = h.pool.Exec(r.Context(), "UPDATE stories SET total_chapters = (SELECT COUNT(*) FROM chapters WHERE story_id = $1), updated_at = CURRENT_TIMESTAMP WHERE id = $1", storyID)

	utils.JSONWithMessage(w, http.StatusOK, "Đã xóa chương thành công", nil)
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

// UploadAudio upload file audio lên Cloudflare R2 (hỗ trợ file dung lượng lớn 1.5GB - 5GB qua Multipart stream)
func (h *PartnerHandler) UploadAudio(w http.ResponseWriter, r *http.Request) {
	mr, err := r.MultipartReader()
	if err != nil {
		slog.Error("failed to get multipart reader for audio upload", "error", err)
		utils.ErrorResponse(w, http.StatusBadRequest, "Không thể đọc dữ liệu tải lên: "+err.Error())
		return
	}

	var audioURL string
	var uploadedKey string
	foundAudio := false

	for {
		part, err := mr.NextPart()
		if err == io.EOF {
			break
		}
		if err != nil {
			slog.Error("error reading multipart part", "error", err)
			utils.ErrorResponse(w, http.StatusBadRequest, "Lỗi đọc phần tải lên: "+err.Error())
			return
		}

		if part.FormName() == "audio" {
			foundAudio = true
			filename := part.FileName()
			ext := strings.ToLower(filepath.Ext(filename))
			if ext != ".mp3" && ext != ".m4a" && ext != ".wav" && ext != ".aac" && ext != ".ogg" {
				part.Close()
				utils.ErrorResponse(w, http.StatusBadRequest, "Định dạng audio không hỗ trợ. Vui lòng chọn .mp3, .m4a, .aac hoặc .wav")
				return
			}

			// Ghi stream ra file tạm để giải phóng RAM tối đa khi upload các tệp 1.5GB - 5GB
			tempFile, err := os.CreateTemp("", "tienton-audio-*"+ext)
			if err != nil {
				part.Close()
				slog.Error("failed to create temp file for audio upload", "error", err)
				utils.ErrorResponse(w, http.StatusInternalServerError, "Lỗi tạo file tạm lưu audio")
				return
			}
			tempFilePath := tempFile.Name()
			defer os.Remove(tempFilePath)
			defer tempFile.Close()

			// Stream trực tiếp từ socket mạng ra đĩa bằng buffer nhỏ
			writtenBytes, err := io.Copy(tempFile, part)
			part.Close()
			if err != nil {
				slog.Error("failed to stream audio to temp file", "error", err)
				utils.ErrorResponse(w, http.StatusInternalServerError, "Lỗi đọc truyền tải file audio: "+err.Error())
				return
			}

			slog.Info("successfully streamed large audio to temp file", "bytes", writtenBytes, "filename", filename)

			// Đặt lại offset file về 0 trước khi tải lên storage
			if _, err := tempFile.Seek(0, io.SeekStart); err != nil {
				slog.Error("failed to seek temp file", "error", err)
				utils.ErrorResponse(w, http.StatusInternalServerError, "Lỗi đọc file audio tạm")
				return
			}

			key := fmt.Sprintf("stories/audio/%s_%d%s", uuid.New().String(), time.Now().Unix(), ext)
			uploadedKey = key
			contentType := part.Header.Get("Content-Type")
			if contentType == "" || contentType == "application/octet-stream" {
				switch ext {
				case ".mp3":
					contentType = "audio/mpeg"
				case ".m4a":
					contentType = "audio/mp4"
				case ".wav":
					contentType = "audio/wav"
				case ".aac":
					contentType = "audio/aac"
				default:
					contentType = "audio/mpeg"
				}
			}

			audioURL, err = h.storageService.UploadFile(r.Context(), key, tempFile, contentType)
			if err != nil || audioURL == "" {
				slog.Error("failed to upload audio to Cloudflare R2", "error", err, "key", key)
				msg := "Không thể tải audio lên Cloudflare R2"
				if err != nil {
					msg += ": " + err.Error()
				}
				utils.ErrorResponse(w, http.StatusInternalServerError, msg)
				return
			}

			break
		}
		part.Close()
	}

	if !foundAudio {
		utils.ErrorResponse(w, http.StatusBadRequest, "Thiếu trường file 'audio'")
		return
	}

	slog.Info("successfully uploaded audio to storage", "key", uploadedKey, "url", audioURL)
	utils.JSONWithMessage(w, http.StatusOK, "Tải file audio lên Cloudflare R2 thành công", map[string]string{
		"url": audioURL,
	})
}
