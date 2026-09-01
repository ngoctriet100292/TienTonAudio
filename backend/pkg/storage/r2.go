package storage

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsConfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type StorageService interface {
	UploadFile(ctx context.Context, key string, body io.Reader, contentType string) (string, error)
	UploadText(ctx context.Context, key string, text string) (string, error)
	GetFileContent(ctx context.Context, keyOrURL string) (string, error)
	DeleteFile(ctx context.Context, key string) error
	GetPresignedUploadURL(ctx context.Context, key string, contentType string, ttl time.Duration) (string, error)
	GetPublicURL(key string) string
}

type r2Storage struct {
	client    *s3.Client
	accountID string
	bucket    string
	publicURL string
	localDir  string
}

func NewR2Storage(accountID, accessKeyID, accessKeySecret, bucket, publicURL string) (StorageService, error) {
	cleanPublicURL := strings.TrimRight(publicURL, "/")
	localDir := "./storage"

	// If no valid R2 credentials (or using placeholder), run in resilient local disk storage mode
	isPlaceholder := strings.Contains(accountID, "your-cloudflare") || strings.Contains(accessKeyID, "your-r2")
	if accountID == "" || accessKeyID == "" || accessKeySecret == "" || isPlaceholder {
		_ = os.MkdirAll(localDir, 0755)
		return &r2Storage{
			accountID: accountID,
			bucket:    bucket,
			publicURL: cleanPublicURL,
			localDir:  localDir,
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
		localDir:  localDir,
	}, nil
}

func (s *r2Storage) UploadFile(ctx context.Context, key string, body io.Reader, contentType string) (string, error) {
	cleanKey := strings.TrimPrefix(key, "/")

	// If R2 client is not initialized, save to local disk
	if s.client == nil {
		targetPath := filepath.Join(s.localDir, cleanKey)
		if err := os.MkdirAll(filepath.Dir(targetPath), 0755); err != nil {
			return "", fmt.Errorf("failed to create local storage dir: %w", err)
		}
		f, err := os.Create(targetPath)
		if err != nil {
			return "", fmt.Errorf("failed to create local file: %w", err)
		}
		defer f.Close()
		if _, err := io.Copy(f, body); err != nil {
			return "", fmt.Errorf("failed to write local file: %w", err)
		}
		return s.GetPublicURL(cleanKey), nil
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

func (s *r2Storage) UploadText(ctx context.Context, key string, text string) (string, error) {
	return s.UploadFile(ctx, key, strings.NewReader(text), "text/plain; charset=utf-8")
}

func (s *r2Storage) GetFileContent(ctx context.Context, keyOrURL string) (string, error) {
	cleanKey := strings.TrimPrefix(keyOrURL, "/")
	if strings.HasPrefix(cleanKey, s.publicURL) {
		cleanKey = strings.TrimPrefix(cleanKey, s.publicURL)
		cleanKey = strings.TrimPrefix(cleanKey, "/")
	}
	if strings.HasPrefix(cleanKey, "/api/v1/storage/") {
		cleanKey = strings.TrimPrefix(cleanKey, "/api/v1/storage/")
	}

	// 1. Check local disk first
	localPath := filepath.Join(s.localDir, cleanKey)
	if data, err := os.ReadFile(localPath); err == nil {
		return string(data), nil
	}

	// 2. Fetch from Cloudflare R2 if client exists
	if s.client != nil {
		out, err := s.client.GetObject(ctx, &s3.GetObjectInput{
			Bucket: aws.String(s.bucket),
			Key:    aws.String(cleanKey),
		})
		if err == nil && out.Body != nil {
			defer out.Body.Close()
			data, err := io.ReadAll(out.Body)
			if err == nil {
				return string(data), nil
			}
		}
	}

	// 3. Fallback via HTTP public URL
	publicURL := keyOrURL
	if !strings.HasPrefix(publicURL, "http://") && !strings.HasPrefix(publicURL, "https://") {
		publicURL = s.GetPublicURL(cleanKey)
	}

	if strings.HasPrefix(publicURL, "http://") || strings.HasPrefix(publicURL, "https://") {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, publicURL, nil)
		if err == nil {
			client := &http.Client{Timeout: 10 * time.Second}
			resp, err := client.Do(req)
			if err == nil && resp.StatusCode == http.StatusOK {
				defer resp.Body.Close()
				data, err := io.ReadAll(resp.Body)
				if err == nil {
					return string(data), nil
				}
			}
		}
	}

	return "", fmt.Errorf("file not found in storage: %s", keyOrURL)
}

func (s *r2Storage) DeleteFile(ctx context.Context, key string) error {
	cleanKey := strings.TrimPrefix(key, "/")

	// Local file
	localPath := filepath.Join(s.localDir, cleanKey)
	_ = os.Remove(localPath)

	if s.client == nil {
		return nil
	}
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(cleanKey),
	})
	return err
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
	return fmt.Sprintf("/api/v1/storage/%s", cleanKey), nil
}

func (s *r2Storage) GetPublicURL(key string) string {
	cleanKey := strings.TrimPrefix(key, "/")
	if s.client == nil || strings.Contains(s.publicURL, "pub-xxxxxxxx") || s.publicURL == "" {
		return fmt.Sprintf("/api/v1/storage/%s", cleanKey)
	}
	return fmt.Sprintf("%s/%s", s.publicURL, cleanKey)
}