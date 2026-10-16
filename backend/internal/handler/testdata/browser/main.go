// Isolated browser QA API: in-memory fixtures, loopback only, no DB/email/storage calls.
package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/IREAKING/tientonaudio/backend/config"
	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/internal/handler"
	"github.com/IREAKING/tientonaudio/backend/internal/middleware"
	"github.com/IREAKING/tientonaudio/backend/internal/service"
	"github.com/IREAKING/tientonaudio/backend/pkg/auth"
	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
	"github.com/google/uuid"
)

const uid = "10000000-0000-0000-0000-000000000001"
const sid = "20000000-0000-0000-0000-000000000001"
const cid = "30000000-0000-0000-0000-000000000001"
const tid = "40000000-0000-0000-0000-000000000001"

type mockAuth struct {
	service.AuthService
	mu        sync.Mutex
	jwt       *auth.JWTService
	tokens    map[string]bool
	refreshes int
}

func (s *mockAuth) issue() (*domain.TokenResp, error) {
	p, e := s.jwt.GenerateTokenPair(uuid.MustParse(uid), "qa@example.invalid", false, []string{"admin"}, nil)
	if e != nil {
		return nil, e
	}
	s.tokens[p.RefreshToken] = true
	return &domain.TokenResp{AccessToken: p.AccessToken, RefreshToken: p.RefreshToken, ExpiresAt: p.ExpiresAt, TokenType: "Bearer"}, nil
}
func (s *mockAuth) GetProfile(context.Context, uuid.UUID) (*domain.UserResp, error) {
	return &domain.UserResp{ID: uuid.MustParse(uid), Username: "Đạo hữu kiểm thử", Email: "qa@example.invalid", Role: "admin", IsEmailVerified: true}, nil
}
func (s *mockAuth) Login(ctx context.Context, r domain.LoginReq) (*domain.LoginResp, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if r.Email != "qa@example.invalid" || r.Password != "fixture-password" {
		return nil, errors.New("Thông tin đăng nhập không đúng")
	}
	tokens, e := s.issue()
	user, _ := s.GetProfile(ctx, uuid.Nil)
	return &domain.LoginResp{Tokens: tokens, User: user}, e
}
func (s *mockAuth) RefreshToken(_ context.Context, r domain.RefreshTokenReq) (*domain.TokenResp, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.refreshes++
	if !s.tokens[r.RefreshToken] {
		return nil, domain.ErrInvalidSession
	}
	delete(s.tokens, r.RefreshToken)
	return s.issue()
}
func (s *mockAuth) Logout(_ context.Context, r domain.LogoutReq) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.tokens, r.RefreshToken)
	return nil
}

type fixtures struct {
	mu                             sync.Mutex
	version                        int
	content, title, status, reason string
	saves                          int
	messages                       []map[string]any
}

func page(w http.ResponseWriter, r *http.Request, items []map[string]any) {
	p, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if p < 1 {
		p = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 {
		limit = 20
	}
	pages := (len(items) + limit - 1) / limit
	if pages < 1 {
		pages = 1
	}
	if p > pages {
		p = pages
	}
	start := (p - 1) * limit
	end := start + limit
	if end > len(items) {
		end = len(items)
	}
	utils.JSON(w, 200, map[string]any{"items": items[start:end], "page": p, "limit": limit, "total": len(items), "total_pages": pages})
}
func (f *fixtures) serve(w http.ResponseWriter, r *http.Request) {
	f.mu.Lock()
	defer f.mu.Unlock()
	p := strings.TrimPrefix(r.URL.Path, "/api/v1")
	switch {
	case p == "/users/continue-listening":
		utils.JSON(w, 200, []any{map[string]any{"story_id": sid, "story_slug": "qa-story", "story_title": "Tiên lộ trường sinh", "chapter_id": cid, "chapter_title": "Khởi đầu", "position_seconds": 420}})
	case p == "/users/followed-stories":
		page(w, r, []map[string]any{{"id": sid, "title": "Tiên lộ trường sinh", "slug": "qa-story"}})
	case p == "/users/achievements":
		utils.JSON(w, 200, []any{})
	case p == "/users/oauth/accounts":
		utils.JSON(w, 200, []any{})
	case p == "/notifications/unread-count":
		utils.JSON(w, 200, map[string]int{"unread_count": 0})
	case p == "/partner/publications":
		items := []map[string]any{}
		for i := 1; i <= 25; i++ {
			items = append(items, map[string]any{"id": fmt.Sprintf("20000000-0000-0000-0000-%012d", i), "title": fmt.Sprintf("Tiên lộ trường sinh %02d", i), "publication_status": "published"})
		}
		page(w, r, items)
	case p == "/partner/stories/"+sid+"/publication":
		utils.JSON(w, 200, map[string]any{"id": sid, "title": "Tiên lộ trường sinh", "publication_status": "published", "owner_name": "Đạo hữu kiểm thử", "review_reason": ""})
	case p == "/partner/stories/"+sid+"/publication-chapters":
		items := []map[string]any{}
		for i := 1; i <= 45; i++ {
			status, title, reason := "draft", fmt.Sprintf("Chương %d", i), ""
			if i == 1 {
				status, title, reason = f.status, f.title, f.reason
			}
			items = append(items, map[string]any{"id": fmt.Sprintf("30000000-0000-0000-0000-%012d", i), "chapter_number": i, "title": title, "publication_status": status, "review_reason": reason, "version": f.version})
		}
		page(w, r, items)
	case p == "/partner/chapters/"+cid+"/draft" && r.Method == "GET":
		utils.JSON(w, 200, map[string]any{"id": cid, "story_id": sid, "title": f.title, "content": f.content, "chapter_number": 1, "is_premium": false, "publication_status": f.status, "review_reason": f.reason, "version": f.version})
	case p == "/partner/chapters/"+cid+"/draft" && r.Method == "PUT":
		var b struct {
			Version        int `json:"version"`
			Content, Title string
		}
		json.NewDecoder(r.Body).Decode(&b)
		if b.Version != f.version {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(409)
			json.NewEncoder(w).Encode(map[string]string{"error": "Bản thảo đã thay đổi ở nơi khác. Nội dung đang soạn vẫn được giữ.", "code": "draft_conflict"})
			return
		}
		f.version++
		f.content = b.Content
		f.title = b.Title
		f.saves++
		utils.JSON(w, 200, map[string]any{"version": f.version, "saved": true})
	case p == "/partner/chapters/"+cid+"/publication":
		var b struct{ Status, Reason string }
		json.NewDecoder(r.Body).Decode(&b)
		if b.Status == "draft" && len(b.Reason) < 5 {
			utils.ErrorResponse(w, 400, "Cần lý do trả bài")
			return
		}
		f.version++
		f.status = b.Status
		f.reason = b.Reason
		utils.JSON(w, 200, map[string]bool{"saved": true})
	case p == "/partner/analytics":
		page(w, r, []map[string]any{{"id": sid, "title": "Tiên lộ trường sinh", "view_count": 100, "listeners": 20, "completed_plays": 10, "recorded_minutes": 60, "top_chapters": []any{}}})
	case p == "/support/tickets":
		page(w, r, []map[string]any{{"id": tid, "subject": "Cần hỗ trợ đồng bộ tiến độ nghe", "category": "usage", "status": "open", "username": "Đạo hữu kiểm thử"}})
	case p == "/support/tickets/"+tid+"/messages" && r.Method == "GET":
		page(w, r, f.messages)
	case p == "/support/tickets/"+tid+"/messages" && r.Method == "POST":
		var b struct{ Content string }
		json.NewDecoder(r.Body).Decode(&b)
		f.messages = append([]map[string]any{{"id": uuid.NewString(), "content": b.Content, "username": "Đạo hữu kiểm thử", "created_at": time.Now().Format(time.RFC3339)}}, f.messages...)
		utils.JSON(w, 200, map[string]bool{"sent": true})
	default:
		utils.JSON(w, 200, []any{})
	}
}
func main() {
	cfg := &config.Config{Environment: "test", AppBaseURL: "http://localhost:3107", OAuthPublicURL: "http://localhost:8091", CORSAllowedOrigins: []string{"http://localhost:3107"}, RefreshTokenDuration: 24 * time.Hour}
	sessions := auth.NewCookieSessions(cfg)
	jwt := auth.NewJWTService("isolated-browser-qa-fixture-secret-only", "qa", time.Hour, 24*time.Hour)
	svc := &mockAuth{jwt: jwt, tokens: map[string]bool{}}
	h := handler.NewAuthHandler(svc, cfg.AppBaseURL)
	h.SetCookieSessions(sessions)
	f := &fixtures{version: 1, title: "Khởi đầu", content: "Một hành trình mới bắt đầu.", status: "draft"}
	for i := 45; i >= 1; i-- {
		f.messages = append(f.messages, map[string]any{"id": fmt.Sprint(i), "content": fmt.Sprintf("Tin nhắn %02d", i), "username": "Đạo hữu kiểm thử", "created_at": time.Now().Format(time.RFC3339)})
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v1/auth/csrf", sessions.CSRF)
	mux.HandleFunc("POST /api/v1/auth/login", h.Login)
	mux.HandleFunc("POST /api/v1/auth/refresh", h.RefreshToken)
	mux.HandleFunc("POST /api/v1/auth/logout", h.Logout)
	mux.Handle("GET /api/v1/users/me", middleware.AuthMiddleware(jwt)(http.HandlerFunc(handler.NewUserHandler(svc, nil).GetMe)))
	mux.HandleFunc("GET /api/v1/auth/oauth/providers", func(w http.ResponseWriter, r *http.Request) {
		utils.JSON(w, 200, map[string]bool{"google": false, "facebook": false, "apple": false})
	})
	mux.HandleFunc("GET /api/v1/cultivation/realms", func(w http.ResponseWriter, r *http.Request) { utils.JSON(w, 200, domain.GetCultivationRealms()) })
	mux.HandleFunc("/__qa/stats", func(w http.ResponseWriter, r *http.Request) {
		svc.mu.Lock()
		defer svc.mu.Unlock()
		f.mu.Lock()
		defer f.mu.Unlock()
		json.NewEncoder(w).Encode(map[string]any{"refreshes": svc.refreshes, "saves": f.saves, "content": f.content, "version": f.version})
	})
	mux.HandleFunc("POST /__qa/reset", func(w http.ResponseWriter, r *http.Request) {
		f.mu.Lock()
		defer f.mu.Unlock()
		f.version = 1
		f.content = "Khởi đầu hành trình tu tiên."
		f.title = "Khởi đầu"
		f.status = "draft"
		f.reason = ""
		f.saves = 0
		w.WriteHeader(204)
	})
	mux.HandleFunc("POST /__qa/conflict", func(w http.ResponseWriter, r *http.Request) {
		f.mu.Lock()
		defer f.mu.Unlock()
		f.version++
		f.content = "Bản thảo mới từ tab khác."
		w.WriteHeader(204)
	})
	mux.Handle("/api/v1/", middleware.AuthMiddleware(jwt)(http.HandlerFunc(f.serve)))
	root := sessions.Middleware(mux)
	server := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3107")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type,X-Session-Mode,X-CSRF-Token")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
		if r.Method == "OPTIONS" {
			w.WriteHeader(204)
			return
		}
		root.ServeHTTP(w, r)
	})
	fmt.Println("Isolated QA API listening on 127.0.0.1:8091; fixtures only.")
	if err := http.ListenAndServe("127.0.0.1:8091", server); err != nil {
		panic(err)
	}
}
