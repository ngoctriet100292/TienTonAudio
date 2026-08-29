package db

import (
	"context"
	_ "embed"
	"fmt"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
)

//go:embed migrations/schema.sql
var schemaSQL string

type Service struct {
	repo db.Querier
	pool *pgxpool.Pool
}

func NewService(ctx context.Context, connString string) (*Service, error) {
	config, err := pgxpool.ParseConfig(connString)
	if err != nil {
		return nil, err
	}

	// Tinh chỉnh pool settings
	config.MaxConns = 30
	config.MinConns = 5
	config.MaxConnLifetime = 1 * time.Hour
	config.MaxConnIdleTime = 15 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, err
	}

	if err := pool.Ping(ctx); err != nil {
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
	slog.Info("database schema migration completed successfully")
	return nil
}
