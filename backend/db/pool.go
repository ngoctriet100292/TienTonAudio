package db

import (
	"context"
	_ "embed"
	"fmt"
	"log/slog"
	"time"

	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed migrations/schema.sql
var schemaSQL string

//go:embed migrations/20261014_cultivation_catalogue.sql
var cultivationSeedSQL string

type Service struct {
	repo db.Querier
	pool *pgxpool.Pool
}

func NewService(ctx context.Context, connString string, maxConns, minConns int32) (*Service, error) {
	config, err := pgxpool.ParseConfig(connString)
	if err != nil {
		return nil, err
	}

	// Tinh chỉnh pool settings theo config
	if maxConns > 0 {
		config.MaxConns = maxConns
	} else {
		config.MaxConns = 30
	}
	if minConns > 0 {
		config.MinConns = minConns
	} else {
		config.MinConns = 5
	}
	config.MaxConnLifetime = 1 * time.Hour
	config.MaxConnIdleTime = 15 * time.Minute

	// Tương thích với Supabase Transaction Pooler (PgBouncer cổng 6543):
	// Tắt prepared statement cache để tránh xung đột SQLSTATE 42P05
	config.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, err
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}

	return &Service{
		repo: db.New(pool),
		pool: pool,
	}, nil
}

func (s *Service) Repo() db.Querier {
	return s.repo
}

func (s *Service) Pool() *pgxpool.Pool {
	return s.pool
}

func (s *Service) Ping(ctx context.Context) error {
	if s.pool == nil {
		return fmt.Errorf("database pool is not initialized")
	}
	return s.pool.Ping(ctx)
}

func (s *Service) Close() {
	if s.pool != nil {
		s.pool.Close()
	}
}

// AutoMigrate tự động khởi tạo toàn bộ bảng, khóa, chỉ mục và triggers nếu database chưa có
func (s *Service) AutoMigrate(ctx context.Context) error {
	slog.Info("checking database schema and running auto-migration...")
	if _, err := s.pool.Exec(ctx, schemaSQL); err != nil {
		return fmt.Errorf("auto-migration failed: %w", err)
	}

	if _, err := s.pool.Exec(ctx, cultivationSeedSQL); err != nil {
		return fmt.Errorf("cultivation seed failed: %w", err)
	}

	// Đảm bảo constraint quality hỗ trợ cả 320k và 320kbps
	fixQualitySQL := `
		DO $$
		BEGIN
			ALTER TABLE chapter_audio_files DROP CONSTRAINT IF EXISTS chapter_audio_files_quality_check;
			ALTER TABLE chapter_audio_files ADD CONSTRAINT chapter_audio_files_quality_check
				CHECK (quality IN ('64k', '128k', '320k', '320kbps', '128kbps', '64kbps', 'hls'));
		EXCEPTION
			WHEN OTHERS THEN NULL;
		END $$;
	`
	_, _ = s.pool.Exec(ctx, fixQualitySQL)

	slog.Info("database schema migration completed successfully")
	return nil
}
