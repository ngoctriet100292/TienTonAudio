package storage

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/url"
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
	GetPresignedReadURL(ctx context.Context, keyOrURL string, ttl time.Duration) (string, error)
	OpenLocalFile(keyOrURL string) (*os.File, error)
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
	cleanKey, err := s.objectKey(key)
	if err != nil {
		return "", err
	}
	if s.client == nil {
		root, err := os.OpenRoot(s.localDir)
		if err != nil {
			return "", err
		}
		defer root.Close()
		if err := root.MkdirAll(filepath.Dir(cleanKey), 0755); err != nil {
			return "", err
		}
		f, err := root.OpenFile(cleanKey, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0644)
		if err != nil {
			return "", err
		}
		defer f.Close()
		if _, err := io.Copy(f, body); err != nil {
			return "", err
		}
		return s.GetPublicURL(cleanKey), nil
	}

	putInput := &s3.PutObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(cleanKey),
		Body:   body,
	}
	if f, ok := body.(*os.File); ok {
		if stat, err := f.Stat(); err == nil {
			putInput.ContentLength = aws.Int64(stat.Size())
		}
	}
	if contentType != "" {
		putInput.ContentType = aws.String(contentType)
	}

	_, err = s.client.PutObject(ctx, putInput)
	if err != nil {
		return "", fmt.Errorf("failed to upload to Cloudflare R2: %w", err)
	}

	return s.GetPublicURL(cleanKey), nil
}

func (s *r2Storage) UploadText(ctx context.Context, key string, text string) (string, error) {
	return s.UploadFile(ctx, key, strings.NewReader(text), "text/plain; charset=utf-8")
}

// Resolve only keys and URLs belonging to this storage; never fetch arbitrary URLs.
func (s *r2Storage) objectKey(keyOrURL string) (string, error) {
	key := keyOrURL
	if strings.Contains(key, "://") {
		u, err := url.Parse(key)
		base, baseErr := url.Parse(s.publicURL)
		if err != nil || baseErr != nil || base.Host == "" || u.Scheme != base.Scheme || u.Host != base.Host || u.User != nil || u.RawQuery != "" || u.Fragment != "" {
			return "", errors.New("URL is outside configured storage")
		}
		prefix := strings.TrimRight(base.Path, "/") + "/"
		if !strings.HasPrefix(u.Path, prefix) {
			return "", errors.New("URL is outside configured storage")
		}
		key = strings.TrimPrefix(u.Path, prefix)
	} else if strings.HasPrefix(key, "/api/v1/storage/") {
		key = strings.TrimPrefix(key, "/api/v1/storage/")
	} else if strings.HasPrefix(key, "/") {
		return "", errors.New("absolute storage path is forbidden")
	}
	if key == "" || strings.ContainsAny(key, "\\\x00?#") {
		return "", errors.New("invalid storage key")
	}
	for _, part := range strings.Split(key, "/") {
		if part == ".." || part == "." || part == "" {
			return "", errors.New("invalid storage key")
		}
	}
	return key, nil
}

func (s *r2Storage) OpenLocalFile(keyOrURL string) (*os.File, error) {
	key, err := s.objectKey(keyOrURL)
	if err != nil {
		return nil, err
	}
	root, err := os.OpenRoot(s.localDir)
	if err != nil {
		return nil, err
	}
	defer root.Close()
	return root.Open(key)
}

func readText(body io.Reader) (string, error) {
	const maxTextBytes = 4 << 20
	data, err := io.ReadAll(io.LimitReader(body, maxTextBytes+1))
	if err != nil {
		return "", err
	}
	if len(data) > maxTextBytes {
		return "", errors.New("chapter text exceeds storage limit")
	}
	return string(data), nil
}

func (s *r2Storage) GetFileContent(ctx context.Context, keyOrURL string) (string, error) {
	key, err := s.objectKey(keyOrURL)
	if err != nil {
		return "", err
	}
	if s.client == nil {
		f, err := s.OpenLocalFile(key)
		if err != nil {
			return "", err
		}
		defer f.Close()
		return readText(f)
	}
	out, err := s.client.GetObject(ctx, &s3.GetObjectInput{Bucket: aws.String(s.bucket), Key: aws.String(key)})
	if err != nil {
		return "", err
	}
	defer out.Body.Close()
	return readText(out.Body)
}

// Empty URL indicates local storage, served only through the signed chapter endpoint.
func (s *r2Storage) GetPresignedReadURL(ctx context.Context, keyOrURL string, ttl time.Duration) (string, error) {
	key, err := s.objectKey(keyOrURL)
	if err != nil {
		return "", err
	}
	if s.client == nil {
		return "", nil
	}
	result, err := s3.NewPresignClient(s.client).PresignGetObject(ctx, &s3.GetObjectInput{Bucket: aws.String(s.bucket), Key: aws.String(key)}, s3.WithPresignExpires(ttl))
	if err != nil {
		return "", err
	}
	return result.URL, nil
}

func (s *r2Storage) DeleteFile(ctx context.Context, key string) error {
	cleanKey, err := s.objectKey(key)
	if err != nil {
		return err
	}
	if s.client == nil {
		root, err := os.OpenRoot(s.localDir)
		if err != nil {
			return err
		}
		defer root.Close()
		return root.Remove(cleanKey)
	}

	_, err = s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(cleanKey),
	})
	return err
}

func (s *r2Storage) GetPresignedUploadURL(ctx context.Context, key string, contentType string, ttl time.Duration) (string, error) {
	cleanKey, err := s.objectKey(key)
	if err != nil {
		return "", err
	}
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
