package storage

import (
	"context"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsConfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type StorageService interface {
	UploadFile(ctx context.Context, key string, body io.Reader, contentType string) (string, error)
	GetPresignedUploadURL(ctx context.Context, key string, contentType string, ttl time.Duration) (string, error)
	GetPublicURL(key string) string
}

type r2Storage struct {
	client    *s3.Client
	accountID string
	bucket    string
	publicURL string
}

func NewR2Storage(accountID, accessKeyID, accessKeySecret, bucket, publicURL string) (StorageService, error) {
	cleanPublicURL := strings.TrimRight(publicURL, "/")

	if accountID == "" || accessKeyID == "" || accessKeySecret == "" {
		return &r2Storage{
			accountID: accountID,
			bucket:    bucket,
			publicURL: cleanPublicURL,
		}, nil
	}

	r2Endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID)

	cfg, err := awsConfig.LoadDefaultConfig(context.Background(),
		awsConfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKeyID, accessKeySecret, "")),
		awsConfig.WithRegion("auto"),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load R2 aws config: %w", err)
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(r2Endpoint)
	})

	return &r2Storage{
		client:    client,
		accountID: accountID,
		bucket:    bucket,
		publicURL: cleanPublicURL,
	}, nil
}

func (s *r2Storage) UploadFile(ctx context.Context, key string, body io.Reader, contentType string) (string, error) {
	cleanKey := strings.TrimPrefix(key, "/")

	if s.client == nil {
		return "", fmt.Errorf("R2 storage client is not initialized")
	}

	putInput := &s3.PutObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(cleanKey),
		Body:   body,
	}
	if contentType != "" {
		putInput.ContentType = aws.String(contentType)
	}

	_, err := s.client.PutObject(ctx, putInput)
	if err != nil {
		return "", fmt.Errorf("failed to upload to Cloudflare R2: %w", err)
	}

	return s.GetPublicURL(cleanKey), nil
}

func (s *r2Storage) GetPresignedUploadURL(ctx context.Context, key string, contentType string, ttl time.Duration) (string, error) {
	cleanKey := strings.TrimPrefix(key, "/")
	if s.client != nil {
		presignClient := s3.NewPresignClient(s.client)
		presignedReq, err := presignClient.PresignPutObject(ctx, &s3.PutObjectInput{
			Bucket:      aws.String(s.bucket),
			Key:         aws.String(cleanKey),
			ContentType: aws.String(contentType),
		}, s3.WithPresignExpires(ttl))
		if err == nil {
			return presignedReq.URL, nil
		}
	}
	return fmt.Sprintf("%s/upload/%s?expires_in=%d", s.publicURL, cleanKey, int(ttl.Seconds())), nil
}

func (s *r2Storage) GetPublicURL(key string) string {
	cleanKey := strings.TrimPrefix(key, "/")
	return fmt.Sprintf("%s/%s", s.publicURL, cleanKey)
}