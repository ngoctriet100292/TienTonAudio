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
	dbSqlc "github.com/IREAKING/tientonaudio/backend/db/sqlc"
	"github.com/IREAKING/tientonaudio/backend/internal/handler"
	"github.com/IREAKING/tientonaudio/backend/internal/repository"
	"github.com/IREAKING/tientonaudio/backend/internal/router"
	"github.com/IREAKING/tientonaudio/backend/internal/service"
	"github.com/IREAKING/tientonaudio/backend/pkg/ai"
	"github.com/IREAKING/tientonaudio/backend/pkg/auth"
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

	// 2. Initialize Database Pool
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	dbService, err := db.NewService(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Warn("could not connect to PostgreSQL database pool", "error", err, "url", cfg.DatabaseURL)
	} else {
		defer dbService.Close()
		slog.Info("successfully connected to PostgreSQL database")

		// Tự động kiểm tra và chạy migration schema lên database nếu chưa có bảng
		migrateCtx, migrateCancel := context.WithTimeout(context.Background(), 30*time.Second)
		if err := dbService.AutoMigrate(migrateCtx); err != nil {
			slog.Error("failed to auto-migrate database schema", "error", err)
		}
		migrateCancel()
	}

	var querier dbSqlc.Querier
	if dbService != nil {
		querier = dbService.Repo()
	}

	// 3. Initialize Auth, Email & AI Clients
	jwtService := auth.NewJWTService(cfg.JWTSecretKey, "tientonaudio")
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
	var userRepo repository.UserRepository
	var storyRepo repository.StoryRepository
	var chapterRepo repository.ChapterRepository
	var paymentRepo repository.PaymentRepository
	var adminRepo repository.AdminRepository
	var playlistRepo repository.PlaylistRepository
	var notificationRepo repository.NotificationRepository
	var reportRepo repository.ReportRepository

	if querier != nil {
		userRepo = repository.NewUserRepository(querier)
		storyRepo = repository.NewStoryRepository(querier)
		chapterRepo = repository.NewChapterRepository(querier)
		paymentRepo = repository.NewPaymentRepository(querier)
		adminRepo = repository.NewAdminRepository(querier)
		playlistRepo = repository.NewPlaylistRepository(querier)
		notificationRepo = repository.NewNotificationRepository(querier)
		reportRepo = repository.NewReportRepository(querier)
	}

	streamSigner := auth.NewStreamSigner(cfg.JWTSecretKey)

	// 5. Initialize Services
	var authSvc service.AuthService
	var storySvc service.StoryService
	var chapterSvc service.ChapterService
	var commentSvc service.CommentService
	var paymentSvc service.PaymentService
	var adminSvc service.AdminService
	var aiSvc service.AIService
	var playlistSvc service.PlaylistService
	var notificationSvc service.NotificationService
	var reportSvc service.ReportService

	if userRepo != nil {
		authSvc = service.NewAuthService(userRepo, jwtService, emailService)
	}
	if notificationRepo != nil {
		notificationSvc = service.NewNotificationService(notificationRepo)
	}
	if reportRepo != nil {
		reportSvc = service.NewReportService(reportRepo)
	}
	if storyRepo != nil {
		storySvc = service.NewStoryService(storyRepo, userRepo, paymentRepo)
		commentSvc = service.NewCommentService(storyRepo, notificationRepo)
		aiSvc = service.NewAIService(aiClient, storyRepo)
	}
	if chapterRepo != nil {
		chapterSvc = service.NewChapterService(chapterRepo, paymentRepo, streamSigner)
	}
	if paymentRepo != nil {
		paymentSvc = service.NewPaymentService(paymentRepo, userRepo)
	}
	if adminRepo != nil {
		adminSvc = service.NewAdminService(adminRepo)
	}
	if playlistRepo != nil {
		playlistSvc = service.NewPlaylistService(playlistRepo)
	}

	// 5.1 Initialize Storage Service (Cloudflare R2)
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

	// 6. Initialize Handlers
	authHandler := handler.NewAuthHandler(authSvc)
	userHandler := handler.NewUserHandler(authSvc, storageSvc)
	storyHandler := handler.NewStoryHandler(storySvc)
	chapterHandler := handler.NewChapterHandler(chapterSvc)
	commentHandler := handler.NewCommentHandler(commentSvc)
	paymentHandler := handler.NewPaymentHandler(paymentSvc)
	adminHandler := handler.NewAdminHandler(adminSvc)
	aiHandler := handler.NewAIHandler(aiSvc)
	playlistHandler := handler.NewPlaylistHandler(playlistSvc)
	notificationHandler := handler.NewNotificationHandler(notificationSvc)
	reportHandler := handler.NewReportHandler(reportSvc)

	// 7. Setup Router
	r := router.NewRouter(router.RouterOptions{
		Config:              cfg,
		JWTService:          jwtService,
		AuthHandler:         authHandler,
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
	})

	// 8. Start HTTP Server with Graceful Shutdown
	server := &http.Server{
		Addr:         cfg.ServerAddress,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
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