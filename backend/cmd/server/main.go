package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/IREAKING/tientonaudio/backend/config"
	"github.com/IREAKING/tientonaudio/backend/db"
	"github.com/IREAKING/tientonaudio/backend/internal/handler"
	"github.com/IREAKING/tientonaudio/backend/internal/repository"
	"github.com/IREAKING/tientonaudio/backend/internal/router"
	"github.com/IREAKING/tientonaudio/backend/internal/service"
	"github.com/IREAKING/tientonaudio/backend/pkg/ai"
	"github.com/IREAKING/tientonaudio/backend/pkg/auth"
	"github.com/IREAKING/tientonaudio/backend/pkg/cache"
	"github.com/IREAKING/tientonaudio/backend/pkg/email"
	"github.com/IREAKING/tientonaudio/backend/pkg/storage"
)

// @title TienTonAudio REST API
// @version 1.0
// @description High Performance Audio & Novel Streaming Platform API for TienTonAudio.
// @termsOfService http://tientonaudio.com/terms/

// @contact.name TienTonAudio Support
// @contact.url http://tientonaudio.com/support
// @contact.email support@tientonaudio.com

// @license.name MIT
// @license.url https://opensource.org/licenses/MIT

// @host localhost:8080
// @BasePath /api/v1

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and JWT token.

func main() {
	// 1. Load configuration
	cfg, err := config.LoadConfig("")
	if err != nil {
		slog.Error("failed to load configuration", "error", err)
		os.Exit(1)
	}
	slog.Info("configuration loaded", "env", cfg.Environment, "addr", cfg.ServerAddress)

	// 2. Initialize Database Pool (Fail-fast if database connection cannot be established)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	dbService, err := db.NewService(ctx, cfg.DatabaseURL, cfg.DBMaxConns, cfg.DBMinConns)
	if err != nil {
		slog.Error("fatal: could not connect to PostgreSQL database pool", "error", err)
		os.Exit(1)
	}
	defer dbService.Close()
	slog.Info("successfully connected to PostgreSQL database")

	// Tự động kiểm tra và chạy migration schema lên database nếu chưa có bảng
	migrateCtx, migrateCancel := context.WithTimeout(context.Background(), 30*time.Second)
	if err := dbService.AutoMigrate(migrateCtx); err != nil {
		slog.Error("failed to auto-migrate database schema", "error", err)
	}
	migrateCancel()

	realmCtx, realmCancel := context.WithTimeout(context.Background(), 15*time.Second)
	err = repository.RefreshCultivationRealms(realmCtx, dbService.Pool())
	realmCancel()
	if err != nil {
		slog.Error("could not load cultivation catalogue from database", "error", err)
		os.Exit(1)
	}
	realmRefreshCtx, stopRealmRefresh := context.WithCancel(context.Background())
	defer stopRealmRefresh()
	go func() {
		ticker := time.NewTicker(time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-realmRefreshCtx.Done():
				return
			case <-ticker.C:
				refreshCtx, stop := context.WithTimeout(realmRefreshCtx, 10*time.Second)
				err := repository.RefreshCultivationRealms(refreshCtx, dbService.Pool())
				if scheduleErr := handler.SchedulePublications(refreshCtx, dbService.Pool()); scheduleErr != nil {
					slog.Error("scheduled publication failed")
				}
				stop()
				if err != nil {
					slog.Error("could not refresh cultivation catalogue; retaining last valid snapshot", "error", err)
				}
			}
		}
	}()

	querier := dbService.Repo()

	// 2.1 Initialize Smart Cache (Redis with in-memory fallback)
	cacheSvc := cache.NewSmartCache(context.Background(), cfg.RedisURL)
	defer cacheSvc.Close()

	// 3. Initialize Auth, Email & AI Clients
	jwtService := auth.NewJWTService(cfg.JWTSecretKey, "tientonaudio", cfg.AccessTokenDuration, cfg.RefreshTokenDuration)
	aiClient := ai.NewAIClient(cfg.AIProvider, cfg.AIAPIKey, cfg.AIModelName)
	emailService := email.NewEmailService(email.Config{
		Host:       cfg.SMTPHost,
		Port:       cfg.SMTPPort,
		Username:   cfg.SMTPUsername,
		Password:   cfg.SMTPPassword,
		FromEmail:  cfg.SMTPFromEmail,
		AppBaseURL: cfg.AppBaseURL,
	})

	// 4. Initialize Repositories
	userRepo := repository.NewUserRepository(querier)
	storyRepo := repository.NewStoryRepository(querier, dbService.Pool())
	chapterRepo := repository.NewChapterRepository(querier)
	paymentRepo := repository.NewPaymentRepository(querier, dbService.Pool())
	adminRepo := repository.NewAdminRepository(querier)
	playlistRepo := repository.NewPlaylistRepository(querier)
	notificationRepo := repository.NewNotificationRepository(querier)
	reportRepo := repository.NewReportRepository(querier)

	streamSigner := auth.NewStreamSigner(cfg.JWTSecretKey)

	// 5. Initialize Services
	storageSvc, err := storage.NewR2Storage(
		cfg.R2AccountID,
		cfg.R2AccessKeyID,
		cfg.R2AccessKeySecret,
		cfg.R2BucketName,
		cfg.R2PublicURL,
	)
	if err != nil {
		slog.Warn("could not initialize Cloudflare R2 storage, fallback to local uploads", "error", err)
	}

	authSvc := service.NewAuthService(userRepo, jwtService, emailService)
	notificationSvc := service.NewNotificationService(notificationRepo)
	reportSvc := service.NewReportService(reportRepo)
	storySvc := service.NewStoryService(storyRepo, userRepo, paymentRepo, cacheSvc)
	commentSvc := service.NewCommentService(storyRepo, notificationRepo)
	aiSvc := service.NewAIService(aiClient, storyRepo, cacheSvc)
	chapterSvc := service.NewChapterService(chapterRepo, paymentRepo, streamSigner, storageSvc)
	paymentSvc := service.NewPaymentService(paymentRepo, userRepo, notificationRepo, service.PaymentSettings{Enabled: cfg.PaymentCheckoutEnabled, BankCode: cfg.PaymentBankCode, BankName: cfg.PaymentBankName, BankAccount: cfg.PaymentBankAccount, AccountName: cfg.PaymentAccountName, WebhookSecret: cfg.PaymentWebhookSecret})
	adminSvc := service.NewAdminService(adminRepo)
	playlistSvc := service.NewPlaylistService(playlistRepo)

	// 6. Initialize Handlers
	authHandler := handler.NewAuthHandler(authSvc, cfg.AppBaseURL)
	oauthHandler, err := handler.NewOAuthHandler(cfg, repository.NewOAuthRepository(dbService.Pool()), authSvc)
	if err != nil {
		slog.Error("invalid OAuth configuration", "error", err)
		os.Exit(1)
	}
	go func() {
		ticker := time.NewTicker(10 * time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-realmRefreshCtx.Done():
				return
			case <-ticker.C:
				ctx, cancel := context.WithTimeout(realmRefreshCtx, 10*time.Second)
				if err := repository.CleanupOAuthSessions(ctx, dbService.Pool()); err != nil {
					slog.Error("OAuth cleanup failed")
				}
				cancel()
			}
		}
	}()
	userHandler := handler.NewUserHandler(authSvc, storageSvc)
	storyHandler := handler.NewStoryHandler(storySvc)
	chapterHandler := handler.NewChapterHandler(chapterSvc)
	commentHandler := handler.NewCommentHandler(commentSvc)
	paymentHandler := handler.NewPaymentHandler(paymentSvc, cfg.PaymentWebhookSecret)
	adminHandler := handler.NewAdminHandler(adminSvc)
	aiHandler := handler.NewAIHandler(aiSvc)
	playlistHandler := handler.NewPlaylistHandler(playlistSvc)
	notificationHandler := handler.NewNotificationHandler(notificationSvc)
	reportHandler := handler.NewReportHandler(reportSvc)
	partnerHandler := handler.NewPartnerHandler(dbService.Pool(), storageSvc, storySvc, chapterSvc)

	communityRepo := repository.NewCommunityRepository(dbService.Pool())
	var communitySvc service.CommunityService
	if communityRepo != nil {
		communitySvc = service.NewCommunityService(communityRepo, userRepo)
	}
	communityHandler := handler.NewCommunityHandler(communitySvc)

	// 7. Setup Router
	r := router.NewRouter(router.RouterOptions{
		Config:              cfg,
		JWTService:          jwtService,
		DBService:           dbService,
		CacheService:        cacheSvc,
		AuthHandler:         authHandler,
		PlatformHandler:     handler.NewPlatformHandler(dbService.Pool()),
		OAuthHandler:        oauthHandler,
		UserHandler:         userHandler,
		StoryHandler:        storyHandler,
		ChapterHandler:      chapterHandler,
		CommentHandler:      commentHandler,
		PaymentHandler:      paymentHandler,
		AdminHandler:        adminHandler,
		AIHandler:           aiHandler,
		PlaylistHandler:     playlistHandler,
		NotificationHandler: notificationHandler,
		ReportHandler:       reportHandler,
		PartnerHandler:      partnerHandler,
		CommunityHandler:    communityHandler,
	})

	// 8. Start HTTP Server with Graceful Shutdown (Hỗ trợ upload file audio lớn)
	server := &http.Server{
		Addr:              cfg.ServerAddress,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       10 * time.Minute,
		WriteTimeout:      10 * time.Minute,
		IdleTimeout:       120 * time.Second,
	}

	serverCtx, serverStopCtx := context.WithCancel(context.Background())

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sig
		slog.Info("shutting down HTTP server...")

		shutdownCtx, shutdownCancel := context.WithTimeout(serverCtx, 10*time.Second)
		defer shutdownCancel()

		if err := server.Shutdown(shutdownCtx); err != nil {
			slog.Error("HTTP server shutdown error", "error", err)
		}
		serverStopCtx()
	}()

	slog.Info(fmt.Sprintf("🚀 TienTonAudio Server listening on %s", cfg.ServerAddress))
	slog.Info(fmt.Sprintf("📖 Swagger UI Docs available at http://localhost:8080/swagger/index.html"))
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		slog.Error("HTTP server failed to listen", "error", err)
		os.Exit(1)
	}

	<-serverCtx.Done()
	slog.Info("server exited gracefully")
}
