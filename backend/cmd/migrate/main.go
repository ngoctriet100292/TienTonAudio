package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net/url"
	"os"
	"time"

	"github.com/IREAKING/tientonaudio/backend/config"
	"github.com/IREAKING/tientonaudio/backend/db"
)

func main() {
	configFile := flag.String("config", "app.env", "Đường dẫn file cấu hình")
	checkOnly := flag.Bool("check", false, "Chỉ kiểm tra kết nối và schema, không ghi dữ liệu")
	migrationFile := flag.String("file", "", "Chỉ áp dụng file SQL được chỉ định")
	flag.Parse()
	cfg, err := config.LoadConfig(*configFile)
	if err != nil {
		log.Fatalf("❌ Lỗi đọc cấu hình app.env: %v", err)
	}

	endpoint, err := url.Parse(cfg.DatabaseURL)
	if err != nil {
		log.Fatal("DATABASE_URL không hợp lệ")
	}
	fmt.Printf("==> Database: %s%s\n", endpoint.Hostname(), endpoint.Path)
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	dbService, err := db.NewService(ctx, cfg.DatabaseURL, cfg.DBMaxConns, cfg.DBMinConns)
	if err != nil {
		log.Fatalf("❌ Không thể kết nối tới Database: %v\n(Vui lòng kiểm tra DATABASE_URL và password trong file app.env)", err)
	}
	defer dbService.Close()
	var database, schema string
	var tables int
	if err := dbService.Pool().QueryRow(ctx, `SELECT current_database(), current_schema(), (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = current_schema() AND table_type = 'BASE TABLE')`).Scan(&database, &schema, &tables); err != nil {
		log.Fatalf("Không thể kiểm tra schema: %v", err)
	}
	fmt.Printf("==> Kết nối thành công: database=%s, schema=%s, tables=%d\n", database, schema, tables)
	if *checkOnly {
		return
	}
	if *migrationFile != "" {
		sql, err := os.ReadFile(*migrationFile)
		if err != nil {
			log.Fatalf("Không thể đọc migration: %v", err)
		}
		if _, err := dbService.Pool().Exec(ctx, string(sql)); err != nil {
			log.Fatalf("Migration thất bại: %v", err)
		}
		fmt.Printf("[THÀNH CÔNG] Đã áp dụng migration: %s\n", *migrationFile)
		return
	}

	fmt.Println("==> Đang áp dụng schema PostgreSQL...")
	migrateCtx, migrateCancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer migrateCancel()

	if err := dbService.AutoMigrate(migrateCtx); err != nil {
		log.Fatalf("❌ Migration thất bại: %v", err)
	}

	fmt.Println("[THÀNH CÔNG] Schema PostgreSQL đã được cập nhật.")
}
