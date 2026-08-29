package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type AIClient interface {
	GenerateText(ctx context.Context, systemPrompt, userPrompt string) (string, error)
}

type aiClient struct {
	provider   string
	apiKey     string
	modelName  string
	httpClient *http.Client
}

func NewAIClient(provider, apiKey, modelName string) AIClient {
	if apiKey == "" || provider == "mock" {
		return &mockAIClient{}
	}

	return &aiClient{
		provider:  strings.ToLower(provider),
		apiKey:    apiKey,
		modelName: modelName,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (c *aiClient) GenerateText(ctx context.Context, systemPrompt, userPrompt string) (string, error) {
	switch c.provider {
	case "gemini":
		return c.generateGemini(ctx, systemPrompt, userPrompt)
	case "openai":
		return c.generateOpenAI(ctx, "https://api.openai.com/v1/chat/completions", systemPrompt, userPrompt)
	case "deepseek":
		return c.generateOpenAI(ctx, "https://api.deepseek.com/v1/chat/completions", systemPrompt, userPrompt)
	default:
		return c.generateGemini(ctx, systemPrompt, userPrompt)
	}
}

// Gemini API REST Implementation
func (c *aiClient) generateGemini(ctx context.Context, systemPrompt, userPrompt string) (string, error) {
	model := c.modelName
	if model == "" {
		model = "gemini-1.5-flash"
	}

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, c.apiKey)

	promptText := fmt.Sprintf("%s\n\nUser Request: %s", systemPrompt, userPrompt)

	reqBody := map[string]any{
		"contents": []map[string]any{
			{
				"parts": []map[string]string{
					{"text": promptText},
				},
			},
		},
	}

	jsonBytes, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonBytes))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("gemini api call failed: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("gemini error (%d): %s", resp.StatusCode, string(bodyBytes))
	}

	var geminiResp struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}

	if err := json.Unmarshal(bodyBytes, &geminiResp); err != nil {
		return "", fmt.Errorf("failed to parse gemini response: %w", err)
	}

	if len(geminiResp.Candidates) > 0 && len(geminiResp.Candidates[0].Content.Parts) > 0 {
		return geminiResp.Candidates[0].Content.Parts[0].Text, nil
	}

	return "", fmt.Errorf("empty candidates returned by gemini")
}

// OpenAI / DeepSeek Compatible Chat Completion API
func (c *aiClient) generateOpenAI(ctx context.Context, endpointURL, systemPrompt, userPrompt string) (string, error) {
	model := c.modelName
	if model == "" {
		model = "gpt-3.5-turbo"
		if c.provider == "deepseek" {
			model = "deepseek-chat"
		}
	}

	reqBody := map[string]any{
		"model": model,
		"messages": []map[string]string{
			{"role": "system", "content": systemPrompt},
			{"role": "user", "content": userPrompt},
		},
	}

	jsonBytes, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", endpointURL, bytes.NewBuffer(jsonBytes))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("ai api call failed: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("ai provider error (%d): %s", resp.StatusCode, string(bodyBytes))
	}

	var openAIResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.Unmarshal(bodyBytes, &openAIResp); err != nil {
		return "", fmt.Errorf("failed to parse ai response: %w", err)
	}

	if len(openAIResp.Choices) > 0 {
		return openAIResp.Choices[0].Message.Content, nil
	}

	return "", fmt.Errorf("empty choices returned by ai provider")
}

// MOCK AI CLIENT (Dành cho dev / test khi chưa cấu hình API Key)
type mockAIClient struct{}

func (m *mockAIClient) GenerateText(ctx context.Context, systemPrompt, userPrompt string) (string, error) {
	promptLower := strings.ToLower(userPrompt)

	if strings.Contains(promptLower, "vợ") || strings.Contains(promptLower, "harem") || strings.Contains(promptLower, "nữ chính") {
		return "🔮 **Phân tích Đạo Hữu AI (Hậu cung & Vợ Nam chính)**:\n\n1. **Liễu Như Nguyệt**: Thần nữ Băng Sương Điện, thê tử chính thức.\n2. **Tô Tiểu Manh**: Sư muội đồng môn, thanh mai trúc mã.\n3. **Cố Lăng Sương**: Ma Tôn Ma Giới, kết duyên sau biến cố Sinh Tử Cốc.\n\n👉 Nam chính có tổng cộng **3 thê tử** đồng hành qua các đại kiếp!", nil
	}

	if strings.Contains(promptLower, "cảnh giới") || strings.Contains(promptLower, "tu vi") || strings.Contains(promptLower, "realm") {
		return "☯️ **Hệ thống Cảnh Giới Tu Luyện trong Truyện**:\n\n1. **Luyện Khí Kỳ** (Tầng 1 - 9)\n2. **Trúc Cơ Kỳ** (Sơ - Trung - Hậu kỳ)\n3. **Kim Đan Kỳ** (Nhất phẩm -> Cửu phẩm Kim Đan)\n4. **Nguyên Anh Kỳ** (Đại năng một phương)\n5. **Hóa Thần Kỳ** (Xé rách hư không, chuẩn bị phi thăng Tiên Giới)\n6. **Độ Kiếp Chân Tiên** (Cảnh giới đỉnh phong)", nil
	}

	return fmt.Sprintf("🤖 **Đạo Hữu AI Trả Lời**: Chào Đạo Hữu! Về câu hỏi *\"%s\"*: Đây là bộ truyện đỉnh cao với cốt truyện ly kỳ, nhân vật chính sát phạt quyết đoán và hành trình tu tiên nghịch thiên!", userPrompt), nil
}
