package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/IREAKING/tientonaudio/backend/config"
	"github.com/IREAKING/tientonaudio/backend/pkg/storage"
)

func main() {
	log.Println("=== BẮT ĐẦU CHUYỂN ĐỔI TOÀN BỘ NỘI DUNG TRUYỆN SANG CLOUDFLARE R2 STORAGE ===")

	cfg, err := config.LoadConfig("app.env")
	if err != nil {
		log.Fatalf("Không thể tải cấu hình app.env: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	// 1. Kết nối PostgreSQL Supabase
	dbPool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Lỗi kết nối database: %v", err)
	}
	defer dbPool.Close()

	if err := dbPool.Ping(ctx); err != nil {
		log.Fatalf("Database ping thất bại: %v", err)
	}
	log.Println("==> Kết nối Supabase PostgreSQL thành công!")

	// 2. Khởi tạo Storage Service
	storageSvc, err := storage.NewR2Storage(
		cfg.R2AccountID,
		cfg.R2AccessKeyID,
		cfg.R2AccessKeySecret,
		cfg.R2BucketName,
		cfg.R2PublicURL,
	)
	if err != nil {
		log.Fatalf("Lỗi khởi tạo Cloudflare R2 Storage: %v", err)
	}
	log.Println("==> Khởi tạo Cloudflare R2 Storage thành công!")

	// 3. Tìm tất cả các chương đang lưu text trong DB mà chưa có content_url
	rows, err := dbPool.Query(ctx, `
		SELECT id, story_id, chapter_number, title, content 
		FROM chapters 
		WHERE content IS NOT NULL AND content != '' AND (content_url IS NULL OR content_url = '')
		ORDER BY story_id, chapter_number ASC
	`)
	if err != nil {
		log.Fatalf("Lỗi truy vấn danh sách chương: %v", err)
	}
	defer rows.Close()

	type ChapterMigrationItem struct {
		ID            uuid.UUID
		StoryID       uuid.UUID
		ChapterNumber float64
		Title         string
		Content       string
	}

	var items []ChapterMigrationItem
	for rows.Next() {
		var item ChapterMigrationItem
		if err := rows.Scan(&item.ID, &item.StoryID, &item.ChapterNumber, &item.Title, &item.Content); err != nil {
			log.Printf("Lỗi đọc dòng: %v", err)
			continue
		}
		items = append(items, item)
	}

	total := len(items)
	log.Printf("==> Tìm thấy %d chương đang lưu trữ text trực tiếp trong Database cần chuyển đổi.", total)

	if total == 0 {
		log.Println("🎉 Tất cả các chương đã được lưu trữ trên Cloudflare R2 hoặc không có chương nào có nội dung text!")
		return
	}

	migratedCount := 0
	failedCount := 0

	for i, item := range items {
		key := fmt.Sprintf("stories/%s/chapters/%.1f.txt", item.StoryID.String(), item.ChapterNumber)

		// Upload text lên Cloudflare R2
		publicURL, err := storageSvc.UploadText(ctx, key, item.Content)
		if err != nil {
			log.Printf("[%d/%d] ❌ Lỗi upload R2 cho chương %s (Tập %.1f): %v", i+1, total, item.Title, item.ChapterNumber, err)
			failedCount++
			continue
		}

		// Cập nhật database: lưu content_url và set content = NULL (giải phóng dung lượng DB)
		_, err = dbPool.Exec(ctx, `
			UPDATE chapters 
			SET content_url = $1, content = NULL, updated_at = CURRENT_TIMESTAMP 
			WHERE id = $2
		`, publicURL, item.ID)
		if err != nil {
			log.Printf("[%d/%d] ❌ Lỗi cập nhật DB cho chương %s: %v", i+1, total, item.Title, err)
			failedCount++
			continue
		}

		migratedCount++
		log.Printf("[%d/%d] ✅ Chuyển đổi thành công: Tập %.1f (%s) -> %s", i+1, total, item.ChapterNumber, item.Title, publicURL)
	}

	log.Printf("\n=== HOÀN TẤT DI CHUYỂN DỮ LIỆU ===")
	log.Printf("Tổng số chương xử lý: %d", total)
	log.Printf("Thành công: %d", migratedCount)
	log.Printf("Thất bại: %d", failedCount)
	log.Println("🎉 Database đã được giải phóng toàn bộ dung lượng văn bản khổng lồ!")
}
