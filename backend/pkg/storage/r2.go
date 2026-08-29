package storage

import (
	"context"
	"fmt"
	"time"
)

type StorageService interface {
	GetPresignedUploadURL(ctx context.Context, key string, contentType string, ttl time.Duration) (string, error)
	GetPublicURL(key string) string
}

type r2Storage struct {
	accountID string
	bucket    string
	publicURL string
}

func NewR2Storage(accountID, bucket, publicURL string) StorageService {
	return &r2Storage{
		accountID: accountID,
		bucket:    bucket,
		publicURL: publicURL,
	}
}

func (s *r2Storage) GetPresignedUploadURL(ctx context.Context, key string, contentType string, ttl time.Duration) (string, error) {
	// In production: use AWS S3 SDK v2 configured with R2 endpoint to sign URL
	return fmt.Sprintf("%s/upload/%s?expires_in=%d", s.publicURL, key, int(ttl.Seconds())), nil
}

func (s *r2Storage) GetPublicURL(key string) string {
	return fmt.Sprintf("%s/%s", s.publicURL, key)
}