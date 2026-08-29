package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/IREAKING/tientonaudio/backend/pkg/storage"
)

type UploadService interface {
	GetPresignedUploadURL(ctx context.Context, fileType string, fileName string) (string, string, error)
}

type uploadService struct {
	storage storage.StorageService
}

func NewUploadService(storage storage.StorageService) UploadService {
	return &uploadService{storage: storage}
}

func (s *uploadService) GetPresignedUploadURL(ctx context.Context, fileType string, fileName string) (string, string, error) {
	key := fmt.Sprintf("%s/%s_%s", fileType, uuid.New().String(), fileName)
	uploadURL, err := s.storage.GetPresignedUploadURL(ctx, key, "audio/mpeg", 1*time.Hour)
	if err != nil {
		return "", "", err
	}
	publicURL := s.storage.GetPublicURL(key)
	return uploadURL, publicURL, nil
}