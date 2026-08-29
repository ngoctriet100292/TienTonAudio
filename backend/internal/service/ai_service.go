package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/internal/repository"
	"github.com/IREAKING/tientonaudio/backend/pkg/ai"
)

type AIService interface {
	ChatWithAI(ctx context.Context, req domain.AIChatReq) (*domain.AIChatResp, error)
	GetStoryRealms(ctx context.Context, storyID uuid.UUID) (*domain.StoryRealmsResp, error)
	GetStorySummary(ctx context.Context, storyID uuid.UUID) (*domain.StorySummaryResp, error)
}

type aiService struct {
	aiClient  ai.AIClient
	storyRepo repository.StoryRepository
}

func NewAIService(aiClient ai.AIClient, storyRepo repository.StoryRepository) AIService {
	return &aiService{
		aiClient:  aiClient,
		storyRepo: storyRepo,
	}
}

func (s *aiService) ChatWithAI(ctx context.Context, req domain.AIChatReq) (*domain.AIChatResp, error) {
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

	return &domain.StoryRealmsResp{
		StoryID:   story.ID,
		StoryName: story.Title,
		Realms:    realms,
	}, nil
}

func (s *aiService) GetStorySummary(ctx context.Context, storyID uuid.UUID) (*domain.StorySummaryResp, error) {
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

	return &domain.StorySummaryResp{
		StoryID:   story.ID,
		StoryName: story.Title,
		Summary:   summary,
	}, nil
}
