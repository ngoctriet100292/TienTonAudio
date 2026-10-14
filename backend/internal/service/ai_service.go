package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/internal/repository"
	"github.com/IREAKING/tientonaudio/backend/pkg/ai"
	"github.com/IREAKING/tientonaudio/backend/pkg/auth"
	"github.com/IREAKING/tientonaudio/backend/pkg/cache"
)

type AIService interface {
	ChatWithAI(ctx context.Context, req domain.AIChatReq) (*domain.AIChatResp, error)
	GetStoryRealms(ctx context.Context, storyID uuid.UUID) (*domain.StoryRealmsResp, error)
	GetStorySummary(ctx context.Context, storyID uuid.UUID) (*domain.StorySummaryResp, error)
}

type aiService struct {
	aiClient  ai.AIClient
	storyRepo repository.StoryRepository
	cache     cache.CacheService
}

func NewAIService(aiClient ai.AIClient, storyRepo repository.StoryRepository, cacheSvc ...cache.CacheService) AIService {
	var c cache.CacheService
	if len(cacheSvc) > 0 {
		c = cacheSvc[0]
	}
	return &aiService{
		aiClient:  aiClient,
		storyRepo: storyRepo,
		cache:     c,
	}
}

func (s *aiService) ChatWithAI(ctx context.Context, req domain.AIChatReq) (*domain.AIChatResp, error) {
	// Kiểm tra quota hàng ngày theo user (nếu đã login và không phải VIP)
	if claims, ok := auth.GetClaimsFromContext(ctx); ok && s.cache != nil {
		if !claims.IsPremium {
			today := time.Now().Format("2006-01-02")
			quotaKey := fmt.Sprintf("ai:quota:%s:%s", claims.UserID.String(), today)
			valStr, _ := s.cache.Get(ctx, quotaKey)
			used, _ := strconv.Atoi(valStr)
			if used >= 30 {
				return nil, errors.New("Đạo Hữu đã dùng hết hạn mức 30 lượt vấn đáp AI hôm nay. Hãy nâng cấp VIP để đàm đạo không giới hạn!")
			}
			_ = s.cache.Set(ctx, quotaKey, used+1, 24*time.Hour)
		}
	}

	contextInfo := "Bạn là Trợ lý AI Đạo Hữu am hiểu sâu sắc về Tiên Hiệp, Huyền Huyễn, Ngôn Tình và Audiobooks."

	if req.StoryID != nil {
		story, err := s.storyRepo.GetStoryByID(ctx, *req.StoryID)
		if err == nil {
			desc := ""
			if story.Description != nil {
				desc = *story.Description
			}
			contextInfo += fmt.Sprintf("\nNgữ cảnh truyện hiện tại: Tên truyện: '%s'. Mô tả: '%s'.", story.Title, desc)
		}
	}

	systemPrompt := contextInfo + "\nHãy trả lời chi tiết, dí dỏm bằng phong cách Tiên Hiệp (dùng các từ như Đạo Hữu, Bổn Trợ Lý, Chân Lý, Tu Vi...)."

	answer, err := s.aiClient.GenerateText(ctx, systemPrompt, req.Prompt)
	if err != nil {
		return nil, fmt.Errorf("AI error: %w", err)
	}

	return &domain.AIChatResp{
		Question: req.Prompt,
		Answer:   answer,
		Provider: "TienTon AI Assistant",
	}, nil
}

func (s *aiService) GetStoryRealms(ctx context.Context, storyID uuid.UUID) (*domain.StoryRealmsResp, error) {
	cacheKey := fmt.Sprintf("ai:realms:%s", storyID.String())
	if s.cache != nil {
		if val, err := s.cache.Get(ctx, cacheKey); err == nil && val != "" {
			var cached domain.StoryRealmsResp
			if json.Unmarshal([]byte(val), &cached) == nil {
				return &cached, nil
			}
		}
	}

	story, err := s.storyRepo.GetStoryByID(ctx, storyID)
	if err != nil {
		return nil, fmt.Errorf("story not found: %w", err)
	}

	desc := ""
	if story.Description != nil {
		desc = *story.Description
	}

	systemPrompt := "Bạn là chuyên gia phân tích truyện Tiên Hiệp / Huyền Huyễn. Hãy phân tích và liệt kê chi tiết các Cảnh Giới Tu Luyện từ thấp đến cao trong truyện sau."
	userPrompt := fmt.Sprintf("Truyện: %s\nMô tả: %s\nHãy liệt kê các Cảnh Giới Tu Luyện trong bộ truyện này.", story.Title, desc)

	realms, err := s.aiClient.GenerateText(ctx, systemPrompt, userPrompt)
	if err != nil {
		return nil, fmt.Errorf("AI analysis error: %w", err)
	}

	resp := &domain.StoryRealmsResp{
		StoryID:   story.ID,
		StoryName: story.Title,
		Realms:    realms,
	}

	if s.cache != nil {
		_ = s.cache.Set(ctx, cacheKey, resp, 24*time.Hour)
	}

	return resp, nil
}

func (s *aiService) GetStorySummary(ctx context.Context, storyID uuid.UUID) (*domain.StorySummaryResp, error) {
	cacheKey := fmt.Sprintf("ai:summary:%s", storyID.String())
	if s.cache != nil {
		if val, err := s.cache.Get(ctx, cacheKey); err == nil && val != "" {
			var cached domain.StorySummaryResp
			if json.Unmarshal([]byte(val), &cached) == nil {
				return &cached, nil
			}
		}
	}

	story, err := s.storyRepo.GetStoryByID(ctx, storyID)
	if err != nil {
		return nil, fmt.Errorf("story not found: %w", err)
	}

	desc := ""
	if story.Description != nil {
		desc = *story.Description
	}

	systemPrompt := "Bạn là trợ lý đọc truyện AI. Hãy tóm tắt ngắn gọn cốt truyện, điểm nổi bật, và thông tin về các nhân vật chính (bao gồm thê tử/vợ của main nếu có)."
	userPrompt := fmt.Sprintf("Truyện: %s\nMô tả: %s\nHãy tóm tắt cốt truyện và các nhân vật/vợ của main.", story.Title, desc)

	summary, err := s.aiClient.GenerateText(ctx, systemPrompt, userPrompt)
	if err != nil {
		return nil, fmt.Errorf("AI summary error: %w", err)
	}

	resp := &domain.StorySummaryResp{
		StoryID:   story.ID,
		StoryName: story.Title,
		Summary:   summary,
	}

	if s.cache != nil {
		_ = s.cache.Set(ctx, cacheKey, resp, 24*time.Hour)
	}

	return resp, nil
}
