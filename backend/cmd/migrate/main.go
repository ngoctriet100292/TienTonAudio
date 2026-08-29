package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/IREAKING/tientonaudio/backend/config"
	"github.com/IREAKING/tientonaudio/backend/db"
)

func main() {
	cfg, err := config.LoadConfig("app.env")
	if err != nil {
		log.Fatalf("❌ Lỗi đọc cấu hình app.env: %v", err)
	}

	fmt.Printf("==> Đang kết nối tới Database...\n")
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	dbService, err := db.NewService(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("❌ Không thể kết nối tới Database: %v\n(Vui lòng kiểm tra DATABASE_URL và password trong file app.env)", err)
	}
	defer dbService.Close()

	fmt.Println("==> Đang tự động chạy migration lên Supabase (Tạo 14 bảng, indexes, extensions, triggers)...")
	migrateCtx, migrateCancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer migrateCancel()

	if err := dbService.AutoMigrate(migrateCtx); err != nil {
		log.Fatalf("❌ Migration thất bại: %v", err)
	}

	fmt.Println("🎉 [THÀNH CÔNG] Toàn bộ cơ sở dữ liệu đã được khởi tạo hoàn tất trên Supabase!")
}
