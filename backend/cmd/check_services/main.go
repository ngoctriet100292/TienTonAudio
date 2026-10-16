// Read-only service diagnostics. Never prints URLs, credentials, object keys or sends email.
package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/IREAKING/tientonaudio/backend/config"
	"github.com/IREAKING/tientonaudio/backend/pkg/email"
	provider "github.com/IREAKING/tientonaudio/backend/pkg/oauth"
	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

func main() {
	file := flag.String("config", "app.env", "File cấu hình")
	network := flag.Bool("network", false, "Kiểm tra kết nối thực; không gửi email hoặc ghi dữ liệu")
	flag.Parse()
	cfg, err := config.LoadConfig(*file)
	if err != nil {
		fmt.Println("Cấu hình không hợp lệ; kiểm tra biến môi trường và yêu cầu production.")
		os.Exit(1)
	}
	show := func(name string, ok bool, detail string) {
		status := "CHƯA ĐẠT"
		if ok {
			status = "OK"
		}
		fmt.Printf("%s: %s — %s\n", name, status, detail)
	}
	_, pgErr := pgxpool.ParseConfig(cfg.DatabaseURL)
	show("PostgreSQL cấu hình", pgErr == nil, "Connection string hợp lệ khi có scheme và thông số phù hợp")
	ro, redisErr := redis.ParseURL(cfg.RedisURL)
	show("Redis cấu hình", redisErr == nil, "Cần URL redis:// hoặc rediss:// đầy đủ, gồm cổng và thông tin xác thực nếu có")
	smtp := cfg.SMTPHost != "" && cfg.SMTPUsername != "" && cfg.SMTPPassword != "" && cfg.SMTPFromEmail != ""
	show("SMTP cấu hình", smtp, "Cần host, tài khoản, mật khẩu ứng dụng và địa chỉ gửi")
	providers, oauthErr := provider.Providers(cfg)
	show("OAuth cấu hình", oauthErr == nil, "Callback origin và bộ khóa phải đầy đủ")
	for _, name := range []string{"google", "facebook", "apple"} {
		_, ok := providers[name]
		show("OAuth "+name, ok, "Chỉ khả dụng khi có cấu hình nhà cung cấp")
	}
	r2 := cfg.R2AccountID != "" && cfg.R2AccessKeyID != "" && cfg.R2AccessKeySecret != "" && !strings.Contains(cfg.R2AccountID, "your-")
	show("R2 cấu hình", r2, "Cần khóa và bucket; quyền public access phải kiểm tra riêng")
	show("Cookie production", cfg.Environment == "production" && strings.HasPrefix(cfg.AppBaseURL, "https://") && strings.HasPrefix(cfg.OAuthPublicURL, "https://"), "Production dùng HTTPS; local development có thể dùng HTTP")
	if !*network {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()
	db, err := pgxpool.New(ctx, cfg.DatabaseURL)
	pgOK := false
	if err == nil {
		probe, stop := context.WithTimeout(ctx, 5*time.Second)
		pgOK = db.Ping(probe) == nil
		stop()
		db.Close()
	}
	show("PostgreSQL kết nối", pgOK, "Chỉ kiểm tra ping, không thay đổi schema/dữ liệu")
	if redisErr == nil {
		client := redis.NewClient(ro)
		probe, stop := context.WithTimeout(ctx, 5*time.Second)
		ok := client.Ping(probe).Err() == nil
		stop()
		client.Close()
		show("Redis kết nối", ok, "Không ghi cache hoặc dữ liệu")
	}
	if smtp {
		err := email.CheckSMTP(email.Config{Host: cfg.SMTPHost, Port: cfg.SMTPPort, Username: cfg.SMTPUsername, Password: cfg.SMTPPassword})
		show("SMTP kết nối", err == nil, "Kiểm tra transport/đăng nhập; không gửi thư")
	}
	if r2 {
		probe, stop := context.WithTimeout(ctx, 8*time.Second)
		defer stop()
		a, e := awsconfig.LoadDefaultConfig(probe, awsconfig.WithRegion("auto"), awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(cfg.R2AccessKeyID, cfg.R2AccessKeySecret, "")))
		ok := false
		if e == nil {
			client := s3.NewFromConfig(a, func(o *s3.Options) {
				o.BaseEndpoint = aws.String("https://" + cfg.R2AccountID + ".r2.cloudflarestorage.com")
			})
			_, e = client.HeadBucket(probe, &s3.HeadBucketInput{Bucket: aws.String(cfg.R2BucketName)})
			ok = e == nil
		}
		show("R2 kết nối", ok, "Chỉ HEAD bucket; chưa xác minh public access hoặc phát audio thật")
	}
}
