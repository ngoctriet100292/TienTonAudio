package config

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	TrustedProxyCIDRs          []string      `json:"trusted_proxy_cidrs"`
	ServerAddress              string        `json:"server_address"`
	Environment                string        `json:"environment"`
	DatabaseURL                string        `json:"database_url"`
	DBMaxConns                 int32         `json:"db_max_conns"`
	DBMinConns                 int32         `json:"db_min_conns"`
	RedisURL                   string        `json:"redis_url"`
	JWTSecretKey               string        `json:"jwt_secret_key"`
	AccessTokenDuration        time.Duration `json:"access_token_duration"`
	RefreshTokenDuration       time.Duration `json:"refresh_token_duration"`
	R2AccountID                string        `json:"r2_account_id"`
	R2AccessKeyID              string        `json:"r2_access_key_id"`
	R2AccessKeySecret          string        `json:"r2_access_key_secret"`
	R2BucketName               string        `json:"r2_bucket_name"`
	R2PublicURL                string        `json:"r2_public_url"`
	CORSAllowedOrigins         []string      `json:"cors_allowed_origins"`
	RateLimitRequestsPerMinute int           `json:"rate_limit_requests_per_minute"`
	AIProvider                 string        `json:"ai_provider"`
	AIAPIKey                   string        `json:"ai_api_key"`
	AIModelName                string        `json:"ai_model_name"`
	SMTPHost                   string        `json:"smtp_host"`
	SMTPPort                   int           `json:"smtp_port"`
	SMTPUsername               string        `json:"smtp_username"`
	SMTPPassword               string        `json:"smtp_password"`
	SMTPFromEmail              string        `json:"smtp_from_email"`
	AppBaseURL                 string        `json:"app_base_url"`
	PaymentWebhookSecret       string        `json:"payment_webhook_secret"`
}

// LoadConfig reads configuration from app.env file (if present) and environment variables.
func LoadConfig(path string) (*Config, error) {
	// Try loading .env / app.env file if exists
	envFile := "app.env"
	if path != "" {
		envFile = path
	}
	_ = loadEnvFile(envFile)

	accessDuration, _ := time.ParseDuration(getEnv("ACCESS_TOKEN_DURATION", "15m"))
	if accessDuration == 0 {
		accessDuration = 15 * time.Minute
	}

	refreshDuration, _ := time.ParseDuration(getEnv("REFRESH_TOKEN_DURATION", "168h"))
	if refreshDuration == 0 {
		refreshDuration = 7 * 24 * time.Hour
	}

	maxConns, _ := strconv.Atoi(getEnv("DB_MAX_CONNS", "20"))
	minConns, _ := strconv.Atoi(getEnv("DB_MIN_CONNS", "5"))
	rateLimit, _ := strconv.Atoi(getEnv("RATE_LIMIT_REQUESTS_PER_MINUTE", "300"))

	originsStr := getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8080")
	origins := strings.Split(originsStr, ",")
	for i := range origins {
		origins[i] = strings.TrimSpace(origins[i])
	}

	smtpPort, _ := strconv.Atoi(getEnv("SMTP_PORT", "587"))

	cfg := &Config{
		TrustedProxyCIDRs:          strings.FieldsFunc(getEnv("TRUSTED_PROXY_CIDRS", ""), func(r rune) bool { return r == ',' }),
		ServerAddress:              getEnv("SERVER_ADDRESS", "0.0.0.0:8080"),
		Environment:                getEnv("ENVIRONMENT", "development"),
		DatabaseURL:                getEnv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/tientonaudio?sslmode=disable"),
		DBMaxConns:                 int32(maxConns),
		DBMinConns:                 int32(minConns),
		RedisURL:                   getEnv("REDIS_URL", "redis://localhost:6379/0"),
		JWTSecretKey:               getEnv("JWT_SECRET_KEY", "your-super-secret-jwt-key-change-this-in-production-must-be-long"),
		AccessTokenDuration:        accessDuration,
		RefreshTokenDuration:       refreshDuration,
		R2AccountID:                getEnv("R2_ACCOUNT_ID", ""),
		R2AccessKeyID:              getEnv("R2_ACCESS_KEY_ID", ""),
		R2AccessKeySecret:          getEnv("R2_ACCESS_KEY_SECRET", ""),
		R2BucketName:               getEnv("R2_BUCKET_NAME", "tientonaudio"),
		R2PublicURL:                getEnv("R2_PUBLIC_URL", "http://localhost:8080/static"),
		CORSAllowedOrigins:         origins,
		RateLimitRequestsPerMinute: rateLimit,
		AIProvider:                 getEnv("AI_PROVIDER", "gemini"), // 'gemini', 'deepseek', 'openai', 'mock'
		AIAPIKey:                   getEnv("AI_API_KEY", ""),
		AIModelName:                getEnv("AI_MODEL_NAME", "gemini-1.5-flash"),
		SMTPHost:                   getEnv("SMTP_HOST", ""),
		SMTPPort:                   smtpPort,
		SMTPUsername:               getEnv("SMTP_USERNAME", ""),
		SMTPPassword:               getEnv("SMTP_PASSWORD", ""),
		SMTPFromEmail:              getEnv("SMTP_FROM_EMAIL", "noreply@tientonaudio.com"),
		AppBaseURL:                 getEnv("APP_BASE_URL", "http://localhost:8080"),
		PaymentWebhookSecret:       getEnv("PAYMENT_WEBHOOK_SECRET", ""),
	}

	if cfg.Environment == "production" {
		for name, secret := range map[string]string{"JWT_SECRET_KEY": cfg.JWTSecretKey, "PAYMENT_WEBHOOK_SECRET": cfg.PaymentWebhookSecret} {
			if len(secret) < 32 || strings.Contains(secret, "change") || strings.Contains(secret, "your-") {
				return nil, fmt.Errorf("%s must be configured with a strong production secret", name)
			}
		}
	}
	return cfg, nil
}

func getEnv(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok && val != "" {
		return val
	}
	return fallback
}

func loadEnvFile(filename string) error {
	file, err := os.Open(filename)
	if err != nil {
		return err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			val := strings.TrimSpace(parts[1])
			if _, exists := os.LookupEnv(key); !exists {
				_ = os.Setenv(key, val)
			}
		}
	}
	return scanner.Err()
}
