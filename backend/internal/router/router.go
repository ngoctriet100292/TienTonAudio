package router

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"

	"github.com/IREAKING/tientonaudio/backend/config"
	"github.com/IREAKING/tientonaudio/backend/db"
	"github.com/IREAKING/tientonaudio/backend/docs"
	"github.com/IREAKING/tientonaudio/backend/internal/handler"
	"github.com/IREAKING/tientonaudio/backend/internal/middleware"
	"github.com/IREAKING/tientonaudio/backend/pkg/auth"
	"github.com/IREAKING/tientonaudio/backend/pkg/cache"
)

type RouterOptions struct {
	Config              *config.Config
	JWTService          *auth.JWTService
	DBService           *db.Service
	CacheService        cache.CacheService
	AuthHandler         *handler.AuthHandler
	UserHandler         *handler.UserHandler
	StoryHandler        *handler.StoryHandler
	ChapterHandler      *handler.ChapterHandler
	CommentHandler      *handler.CommentHandler
	PaymentHandler      *handler.PaymentHandler
	AdminHandler        *handler.AdminHandler
	AIHandler           *handler.AIHandler
	PlaylistHandler     *handler.PlaylistHandler
	NotificationHandler *handler.NotificationHandler
	ReportHandler       *handler.ReportHandler
	PartnerHandler      *handler.PartnerHandler
	CommunityHandler    *handler.CommunityHandler
}

const swaggerUIHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>TienTonAudio API Documentation - Swagger UI</title>
  <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
  <link rel="icon" type="image/png" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/favicon-32x32.png" sizes="32x32" />
  <style>
    html { box-sizing: border-box; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin:0; background: #0f172a; color: #f8fafc; }
    .swagger-ui .topbar { background-color: #1e293b; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js" charset="UTF-8"> </script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js" charset="UTF-8"> </script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        url: "/swagger/doc.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>`

// noDirFileSystem bọc http.FileSystem để ngăn chặn directory listing (chống lộ cấu trúc thư mục)
type noDirFileSystem struct {
	fs http.FileSystem
}

func (ndfs noDirFileSystem) Open(name string) (http.File, error) {
	f, err := ndfs.fs.Open(name)
	if err != nil {
		return nil, err
	}
	stat, err := f.Stat()
	if err != nil {
		_ = f.Close()
		return nil, err
	}
	if stat.IsDir() {
		_ = f.Close()
		return nil, os.ErrNotExist
	}
	return f, nil
}

type publicStorageFileSystem struct{ fs http.FileSystem }

func (fs publicStorageFileSystem) Open(name string) (http.File, error) {
	key := strings.TrimPrefix(name, "/")
	if !strings.HasPrefix(key, "stories/covers/") && !strings.HasPrefix(key, "covers/") && !strings.HasPrefix(key, "avatars/") {
		return nil, os.ErrNotExist
	}
	return (noDirFileSystem{fs: fs.fs}).Open(name)
}

func NewRouter(opts RouterOptions) http.Handler {
	r := chi.NewRouter()

	// 1. Phục hồi panic, lấy Real IP client và ghi log
	r.Use(middleware.TrustedProxyMiddleware(opts.Config.TrustedProxyCIDRs))
	r.Use(chiMiddleware.Recoverer)
	r.Use(middleware.LoggerMiddleware)

	// 2. CORS Middleware chuẩn hóa (Vary: Origin, chỉ cho phép origin hợp lệ, từ chối preflight lạ)
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Vary", "Origin")
			origin := r.Header.Get("Origin")
			allowed := false

			if origin != "" {
				for _, o := range opts.Config.CORSAllowedOrigins {
					if o == "*" || strings.EqualFold(o, origin) {
						allowed = true
						break
					}
				}
				// Tự động cho phép localhost & 127.0.0.1 trên mọi cổng
				if opts.Config.Environment != "production" && !allowed && (strings.HasPrefix(origin, "http://localhost:") || strings.HasPrefix(origin, "http://127.0.0.1:") || origin == "http://localhost" || origin == "http://127.0.0.1") {
					allowed = true
				}

				if allowed {
					w.Header().Set("Access-Control-Allow-Origin", origin)
					w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
					w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Webhook-Secret, X-Signature, Accept, X-Requested-With, Origin")
					w.Header().Set("Access-Control-Allow-Credentials", "true")
					w.Header().Set("Access-Control-Max-Age", "86400")
				} else if r.Method == http.MethodOptions {
					w.WriteHeader(http.StatusForbidden)
					return
				}
			}

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		})
	})

	// 3. Phân tầng Rate Limiters (Global, Auth, AI)
	globalLimiter := middleware.NewRateLimiter(opts.Config.RateLimitRequestsPerMinute, opts.CacheService, "global")
	authLimiter := middleware.NewRateLimiter(10, opts.CacheService, "auth")
	aiLimiter := middleware.NewRateLimiter(15, opts.CacheService, "ai")

	r.Use(globalLimiter.Middleware)

	// 4. Liveness Probe (/health)
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"status": "ok",
			"env":    opts.Config.Environment,
		})
	})

	// 5. Readiness Probe (/readyz): Ping trực tiếp Database Pool và Redis
	r.Get("/readyz", func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		defer cancel()

		status := map[string]any{
			"status":   "ready",
			"database": "connected",
			"cache":    "active",
		}

		w.Header().Set("Content-Type", "application/json")
		if opts.DBService != nil {
			if err := opts.DBService.Ping(ctx); err != nil {
				status["status"] = "degraded"
				status["database"] = "disconnected: " + err.Error()
				w.WriteHeader(http.StatusServiceUnavailable)
				_ = json.NewEncoder(w).Encode(status)
				return
			}
		} else {
			status["status"] = "degraded"
			status["database"] = "uninitialized"
			w.WriteHeader(http.StatusServiceUnavailable)
			_ = json.NewEncoder(w).Encode(status)
			return
		}

		if opts.CacheService != nil {
			if err := opts.CacheService.Ping(ctx); err != nil {
				status["cache"] = "disconnected: " + err.Error()
			}
		}

		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(status)
	})

	// 6. Swagger UI Routes (Nhúng trực tiếp từ go:embed, không phụ thuộc filesystem)
	r.Get("/swagger/doc.json", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write(docs.SwaggerJSON)
	})

	r.Get("/swagger", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/swagger/index.html", http.StatusMovedPermanently)
	})

	r.Get("/swagger/index.html", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write([]byte(swaggerUIHTML))
	})

	// 7. Phục vụ file tĩnh có bảo mật (chặn directory listing)
	r.Handle("/uploads/*", http.StripPrefix("/uploads/", http.FileServer(publicStorageFileSystem{fs: http.Dir("./uploads")})))

	// 8. REST API v1
	r.Route("/api/v1", func(r chi.Router) {
		// Auth (Được áp dụng Auth Rate Limiter cho các endpoint nhạy cảm)
		r.Route("/auth", func(r chi.Router) {
			r.With(authLimiter.Middleware).Post("/register", opts.AuthHandler.Register)
			r.Get("/verify-email", opts.AuthHandler.VerifyEmail)
			r.Post("/verify-email", opts.AuthHandler.VerifyEmail)
			r.With(authLimiter.Middleware).Post("/resend-verification", opts.AuthHandler.ResendVerification)
			r.With(authLimiter.Middleware).Post("/login", opts.AuthHandler.Login)
			r.With(authLimiter.Middleware).Post("/social", opts.AuthHandler.SocialLogin)
			r.With(authLimiter.Middleware).Post("/2fa/verify", opts.AuthHandler.VerifyTwoFactorLogin)
			r.With(authLimiter.Middleware).Post("/forgot-password", opts.AuthHandler.ForgotPassword)
			r.With(authLimiter.Middleware).Post("/reset-password", opts.AuthHandler.ResetPassword)
			r.Post("/refresh", opts.AuthHandler.RefreshToken)
			r.Post("/logout", opts.AuthHandler.Logout)

			// 2FA Management (Protected: requires authentication)
			r.Group(func(r chi.Router) {
				r.Use(middleware.AuthMiddleware(opts.JWTService))
				r.Post("/2fa/setup", opts.AuthHandler.SetupTwoFactor)
				r.Post("/2fa/enable", opts.AuthHandler.EnableTwoFactor)
				r.Post("/2fa/disable", opts.AuthHandler.DisableTwoFactor)
			})
		})

		// Cultivation Realms (Public)
		r.Get("/cultivation/realms", opts.UserHandler.GetAllCultivationRealms)

		// Users (Protected)
		r.Group(func(r chi.Router) {
			r.Use(middleware.AuthMiddleware(opts.JWTService))
			r.Route("/users", func(r chi.Router) {
				r.Get("/me", opts.UserHandler.GetMe)
				r.Get("/cultivation", opts.UserHandler.GetCultivation)
				r.Put("/me", opts.UserHandler.UpdateProfile)
				r.Post("/avatar", opts.UserHandler.UploadAvatar)
				r.Put("/password", opts.UserHandler.UpdatePassword)
				r.Get("/history", opts.StoryHandler.GetListeningHistory)
				r.Get("/favorites", opts.StoryHandler.GetUserFavorites)
				r.Get("/following-authors", opts.StoryHandler.GetFollowedAuthors)
				r.Get("/following-narrators", opts.StoryHandler.GetFollowedNarrators)
			})
		})

		// Stories
		r.Route("/stories", func(r chi.Router) {
			r.Get("/", opts.StoryHandler.ListStories)
			r.Get("/top-views", opts.StoryHandler.ListTopViewedStories)
			r.Get("/search", opts.StoryHandler.SearchStories)
			r.Get("/filter", opts.StoryHandler.AdvancedSearch)
			r.Get("/categories", opts.StoryHandler.ListCategories)
			r.Get("/{id}/related", opts.StoryHandler.GetRelatedStories)
			r.Get("/{slug}", opts.StoryHandler.GetStoryBySlug)
			r.Get("/{storyId}/chapters", opts.ChapterHandler.ListChaptersByStory)

			r.Group(func(r chi.Router) {
				r.Use(middleware.AuthMiddleware(opts.JWTService))
				r.With(middleware.RequireAdmin).Post("/", opts.StoryHandler.CreateStory)
				r.With(middleware.RequireAdmin).Put("/{id}", opts.StoryHandler.UpdateStory)
				r.With(middleware.RequireAdmin).Delete("/{id}", opts.StoryHandler.DeleteStory)
				r.Post("/{id}/favorite", opts.StoryHandler.ToggleFavorite)
				r.Get("/{id}/favorite", opts.StoryHandler.CheckFavoriteStatus)
			})
		})

		// Authors & Narrators follow
		r.Route("/authors", func(r chi.Router) {
			r.Group(func(r chi.Router) {
				r.Use(middleware.AuthMiddleware(opts.JWTService))
				r.Post("/{id}/follow", opts.StoryHandler.ToggleFollowAuthor)
			})
		})

		r.Route("/narrators", func(r chi.Router) {
			r.Group(func(r chi.Router) {
				r.Use(middleware.AuthMiddleware(opts.JWTService))
				r.Post("/{id}/follow", opts.StoryHandler.ToggleFollowNarrator)
			})
		})

		// Playlists
		r.Route("/playlists", func(r chi.Router) {
			r.With(middleware.OptionalAuthMiddleware(opts.JWTService)).Get("/{id}", opts.PlaylistHandler.GetPlaylistDetail)

			r.Group(func(r chi.Router) {
				r.Use(middleware.AuthMiddleware(opts.JWTService))
				r.Get("/", opts.PlaylistHandler.GetUserPlaylists)
				r.Post("/", opts.PlaylistHandler.CreatePlaylist)
				r.Put("/{id}", opts.PlaylistHandler.UpdatePlaylist)
				r.Delete("/{id}", opts.PlaylistHandler.DeletePlaylist)
				r.Post("/{id}/items", opts.PlaylistHandler.AddPlaylistItem)
				r.Delete("/{id}/items/{chapterId}", opts.PlaylistHandler.RemovePlaylistItem)
			})
		})

		// Chapters & Audio Streaming
		r.Route("/chapters", func(r chi.Router) {
			r.Get("/playback-speeds", opts.ChapterHandler.GetPlaybackSpeeds)
			r.With(middleware.OptionalAuthMiddleware(opts.JWTService)).Get("/{id}", opts.ChapterHandler.GetChapterByID)
			r.Get("/{id}/media", opts.ChapterHandler.ServeMedia)
			r.With(middleware.OptionalAuthMiddleware(opts.JWTService)).Get("/{id}/stream", opts.ChapterHandler.GetSignedStreamURL)
			r.With(middleware.OptionalAuthMiddleware(opts.JWTService)).Get("/{id}/comments", opts.CommentHandler.GetChapterComments)

			r.Group(func(r chi.Router) {
				r.Use(middleware.AuthMiddleware(opts.JWTService))
				r.With(middleware.RequireAdmin).Post("/", opts.ChapterHandler.CreateChapter)
				r.With(middleware.RequireAdmin).Post("/bulk", opts.ChapterHandler.BulkCreateChapters)
				r.With(middleware.RequireAdmin).Post("/{id}/audio", opts.ChapterHandler.AddAudioFile)
				r.Post("/{id}/comments", opts.CommentHandler.CreateComment)
				r.Post("/progress", opts.StoryHandler.SaveListeningProgress)
			})
		})

		// Comments & Reactions
		r.Route("/comments", func(r chi.Router) {
			r.With(middleware.OptionalAuthMiddleware(opts.JWTService)).Get("/{id}/replies", opts.CommentHandler.GetCommentReplies)

			r.Group(func(r chi.Router) {
				r.Use(middleware.AuthMiddleware(opts.JWTService))
				r.Post("/{id}/reply", opts.CommentHandler.ReplyComment)
				r.Post("/{id}/reactions", opts.CommentHandler.ReactToComment)
				r.Delete("/{id}", opts.CommentHandler.DeleteComment)
			})
		})

		// Notifications
		r.Route("/notifications", func(r chi.Router) {
			r.Use(middleware.AuthMiddleware(opts.JWTService))
			r.Get("/", opts.NotificationHandler.GetUserNotifications)
			r.Get("/unread-count", opts.NotificationHandler.GetUnreadCount)
			r.Put("/read-all", opts.NotificationHandler.MarkAllAsRead)
			r.Put("/{id}/read", opts.NotificationHandler.MarkAsRead)
		})

		// Reports (Báo lỗi & vi phạm)
		r.Route("/reports", func(r chi.Router) {
			r.Group(func(r chi.Router) {
				r.Use(middleware.AuthMiddleware(opts.JWTService))
				r.Post("/", opts.ReportHandler.CreateReport)
			})
		})

		// Payments & Subscriptions
		r.Route("/payments", func(r chi.Router) {
			r.Get("/plans", opts.PaymentHandler.ListSubscriptionPlans)
			r.Post("/webhook", opts.PaymentHandler.WebhookCallback)
			r.With(middleware.AuthMiddleware(opts.JWTService)).Get("/{id}/status", opts.PaymentHandler.GetPaymentStatus)
			r.Post("/{id}/confirm-auto", opts.PaymentHandler.AutoConfirmPayment)

			r.Group(func(r chi.Router) {
				r.Use(middleware.AuthMiddleware(opts.JWTService))
				r.Post("/create", opts.PaymentHandler.CreatePayment)
				r.Get("/my-subscription", opts.PaymentHandler.GetUserActiveSubscription)
				r.Get("/history", opts.PaymentHandler.ListUserPayments)
			})
		})

		// AI Đạo Hữu Assistant
		r.Route("/ai", func(r chi.Router) {
			r.Get("/stories/{id}/realms", opts.AIHandler.GetStoryRealms)
			r.Get("/stories/{id}/summary", opts.AIHandler.GetStorySummary)

			// Vấn đáp AI yêu cầu đăng nhập và có hạn ngạch rate limit riêng
			r.Group(func(r chi.Router) {
				r.Use(aiLimiter.Middleware)
				r.Use(middleware.AuthMiddleware(opts.JWTService))
				r.Post("/chat", opts.AIHandler.Chat)
			})
		})

		// Partner / Sáng Tác Studio (Protected: Auth + RequirePartnerOrAdmin)
		r.Route("/partner", func(r chi.Router) {
			r.Use(middleware.AuthMiddleware(opts.JWTService))

			// Cho phép user đăng ký làm đối tác
			r.Post("/become-partner", opts.PartnerHandler.BecomePartner)

			// Khu vực quản lý tác phẩm & audio
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequirePartnerOrAdmin)

				r.Get("/stats", opts.PartnerHandler.GetPartnerStats)
				r.Get("/stories", opts.PartnerHandler.ListPartnerStories)
				r.Post("/stories", opts.PartnerHandler.CreatePartnerStory)
				r.Put("/stories/{id}", opts.PartnerHandler.UpdatePartnerStory)
				r.Delete("/stories/{id}", opts.PartnerHandler.DeletePartnerStory)
				r.Get("/stories/{id}/chapters", opts.PartnerHandler.ListStoryChapters)
				r.Post("/stories/{id}/chapters", opts.PartnerHandler.CreateStoryChapter)
				r.Post("/chapters/{id}/audio", opts.PartnerHandler.AttachChapterAudio)
				r.Delete("/chapters/{id}", opts.PartnerHandler.DeleteStoryChapter)
				r.Post("/upload-cover", opts.PartnerHandler.UploadCoverImage)
				r.Post("/upload-audio", opts.PartnerHandler.UploadAudio)
			})
		})

		// Mạng Xã Hội Tiên Hiệp: Luận Đạo Các (Community Feed)
		r.Route("/community", func(r chi.Router) {
			r.Get("/posts", opts.CommunityHandler.ListPosts)
			r.Get("/posts/{id}", opts.CommunityHandler.GetPostByID)
			r.Get("/posts/{id}/comments", opts.CommunityHandler.ListComments)

			r.Group(func(r chi.Router) {
				r.Use(middleware.AuthMiddleware(opts.JWTService))
				r.Post("/posts", opts.CommunityHandler.CreatePost)
				r.Delete("/posts/{id}", opts.CommunityHandler.DeletePost)
				r.Post("/posts/{id}/like", opts.CommunityHandler.ToggleLike)
				r.Post("/posts/{id}/comments", opts.CommunityHandler.CreateComment)
			})
		})

		// Admin Portal (Protected: Auth + RequireAdmin)
		r.Route("/admin", func(r chi.Router) {
			r.Use(middleware.AuthMiddleware(opts.JWTService))
			r.Use(middleware.RequireAdmin)

			r.Get("/stats", opts.AdminHandler.GetDashboardStats)
			r.Get("/users", opts.AdminHandler.ListUsers)
			r.Put("/users/{id}/role", opts.AdminHandler.UpdateUserRole)
			r.Post("/authors", opts.AdminHandler.CreateAuthor)
			r.Get("/authors", opts.AdminHandler.ListAuthors)
			r.Post("/narrators", opts.AdminHandler.CreateNarrator)
			r.Get("/narrators", opts.AdminHandler.ListNarrators)
			r.Get("/reports", opts.ReportHandler.ListReports)
			r.Get("/reports/{id}", opts.ReportHandler.GetReportByID)
			r.Put("/reports/{id}/status", opts.ReportHandler.UpdateReportStatus)
		})

		// Static Storage File Server (cho local dev & media storage, chặn directory listing)
		r.Handle("/storage/*", http.StripPrefix("/api/v1/storage", http.FileServer(publicStorageFileSystem{fs: http.Dir("./storage")})))
	})

	return r
}
