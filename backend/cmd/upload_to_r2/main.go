package main

import (
	"context"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/IREAKING/tientonaudio/backend/config"
	"github.com/IREAKING/tientonaudio/backend/pkg/storage"
)

func main() {
	var (
		modeFlag        = flag.String("mode", "all", "Chế độ: 'all', 'text', 'audio', hoặc 'check'")
		audioDirFlag    = flag.String("audio-dir", "", "Đường dẫn thư mục chứa các file .mp3 trên máy")
		storyIDFlag     = flag.String("story-id", "", "Chỉ định Story ID (UUID) nếu chỉ muốn tải lên cho 1 truyện")
		cleanDBFlag     = flag.Bool("clean-db", true, "Đặt content = NULL trong DB sau khi tải text lên R2 để tiết kiệm dung lượng DB")
		sampleAudioFlag = flag.Bool("sample-audio", false, "Tải audio mẫu lên R2 cho các chương chưa có file âm thanh")
	)
	flag.Parse()

	log.Println("==================================================================")
	log.Println("⚡ TIÊN TÔN AUDIO - CÔNG CỤ TẢI NỘI DUNG & AUDIO LÊN CLOUDFLARE R2")
	log.Println("==================================================================")

	cfg, err := config.LoadConfig("app.env")
	if err != nil {
		log.Fatalf("❌ Không thể đọc file cấu hình app.env: %v", err)
	}

	// 1. Kiểm tra cấu hình Cloudflare R2
	isPlaceholder := strings.Contains(cfg.R2AccountID, "your-cloudflare") ||
		strings.Contains(cfg.R2AccessKeyID, "your-r2") ||
		cfg.R2AccountID == "" || cfg.R2AccessKeyID == "" || cfg.R2AccessKeySecret == ""

	if isPlaceholder {
		log.Println("⚠️  [CẢNH BÁO] Cấu hình Cloudflare R2 trong file backend/app.env hiện đang là giá trị mặc định / placeholder:")
		log.Printf("    - R2_ACCOUNT_ID: %s\n", cfg.R2AccountID)
		log.Printf("    - R2_ACCESS_KEY_ID: %s\n", cfg.R2AccessKeyID)
		log.Printf("    - R2_BUCKET_NAME: %s\n", cfg.R2BucketName)
		log.Printf("    - R2_PUBLIC_URL: %s\n", cfg.R2PublicURL)
		log.Println("\n📌 ĐỂ TẢI LÊN CLOUDFLARE R2 THỰC TẾ, BẠN CẦN CẬP NHẬT 5 DÒNG NÀY TRONG backend/app.env:")
		log.Println("    1. R2_ACCOUNT_ID: Cloudflare Dashboard -> Account ID (chuỗi 32 ký tự)")
		log.Println("    2. R2_ACCESS_KEY_ID: R2 Overview -> Manage R2 API Tokens -> Tạo API Token với quyền Object Read & Write")
		log.Println("    3. R2_ACCESS_KEY_SECRET: Secret Access Key từ API Token vừa tạo")
		log.Println("    4. R2_BUCKET_NAME: Tên bucket R2 của bạn (vd: tientonaudio)")
		log.Println("    5. R2_PUBLIC_URL: Domain công khai của bucket (vd: https://pub-xxx.r2.dev hoặc custom domain)")
		log.Println("\n👉 Nếu tiếp tục ở chế độ hiện tại, file sẽ được lưu vào thư mục local disk ./storage")
		if *modeFlag == "check" {
			return
		}
	} else {
		log.Println("✅ Đã tìm thấy thông tin xác thực Cloudflare R2 trong app.env!")
		log.Printf("   - Bucket: %s | Public URL: %s\n", cfg.R2BucketName, cfg.R2PublicURL)
	}

	if *modeFlag == "check" {
		log.Println("✅ Kiểm tra cấu hình hoàn tất!")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()

	// 2. Kết nối PostgreSQL Supabase
	dbPool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("❌ Lỗi kết nối Supabase Database: %v", err)
	}
	defer dbPool.Close()

	if err := dbPool.Ping(ctx); err != nil {
		log.Fatalf("❌ Ping Supabase thất bại: %v", err)
	}
	log.Println("✅ Kết nối Database Supabase thành công!")

	// 3. Khởi tạo Storage Service
	storageSvc, err := storage.NewR2Storage(
		cfg.R2AccountID,
		cfg.R2AccessKeyID,
		cfg.R2AccessKeySecret,
		cfg.R2BucketName,
		cfg.R2PublicURL,
	)
	if err != nil {
		log.Fatalf("❌ Lỗi khởi tạo Cloudflare R2 Storage: %v", err)
	}

	// 4. Xử lý Tải Truyện Chữ (Text)
	if *modeFlag == "all" || *modeFlag == "text" {
		log.Println("\n------------------------------------------------------------------")
		log.Println("📚 BẮT ĐẦU TẢI TOÀN BỘ NỘI DUNG TRUYỆN CHỮ LÊN CLOUDFLARE R2")
		log.Println("------------------------------------------------------------------")
		uploadTextChapters(ctx, dbPool, storageSvc, *storyIDFlag, *cleanDBFlag)
	}

	// 5. Xử lý Tải File MP3 (Audio)
	if *modeFlag == "all" || *modeFlag == "audio" {
		log.Println("\n------------------------------------------------------------------")
		log.Println("🎙️ BẮT ĐẦU TẢI FILE ÂM THANH MP3 LÊN CLOUDFLARE R2")
		log.Println("------------------------------------------------------------------")
		uploadAudioFiles(ctx, dbPool, storageSvc, *audioDirFlag, *storyIDFlag, *sampleAudioFlag)
	}

	log.Println("\n==================================================================")
	log.Println("🎉 QUÁ TRÌNH TẢI DỮ LIỆU LÊN R2 ĐÃ HOÀN TẤT!")
	log.Println("==================================================================")
}

// uploadTextChapters tìm các chương truyện và tải lên Cloudflare R2
func uploadTextChapters(ctx context.Context, dbPool *pgxpool.Pool, storageSvc storage.StorageService, filterStoryID string, cleanDB bool) {
	query := `
		SELECT id, story_id, chapter_number, title, content, content_url 
		FROM chapters 
		WHERE 1=1
	`
	args := []any{}
	if filterStoryID != "" {
		storyUUID, err := uuid.Parse(filterStoryID)
		if err == nil {
			args = append(args, storyUUID)
			query += fmt.Sprintf(" AND story_id = $%d", len(args))
		}
	}
	query += " ORDER BY story_id, chapter_number ASC"

	rows, err := dbPool.Query(ctx, query, args...)
	if err != nil {
		log.Printf("❌ Lỗi truy vấn danh sách chương: %v", err)
		return
	}
	defer rows.Close()

	type chapterItem struct {
		id            uuid.UUID
		storyID       uuid.UUID
		chapterNumber float64
		title         string
		content       *string
		contentURL    *string
	}

	var chapters []chapterItem
	for rows.Next() {
		var item chapterItem
		if err := rows.Scan(&item.id, &item.storyID, &item.chapterNumber, &item.title, &item.content, &item.contentURL); err != nil {
			continue
		}
		chapters = append(chapters, item)
	}

	total := len(chapters)
	log.Printf("==> Đang kiểm tra %d chương trong cơ sở dữ liệu...", total)

	uploaded := 0
	skipped := 0
	failed := 0

	for i, ch := range chapters {
		key := fmt.Sprintf("stories/%s/chapters/%.1f.txt", ch.storyID.String(), ch.chapterNumber)

		// Lấy nội dung text: hoặc từ cột content, hoặc từ local file storage/stories/<story_id>/chapters/<num>.txt
		var textContent string
		if ch.content != nil && *ch.content != "" {
			textContent = *ch.content
		} else {
			// Thử đọc từ local storage folder
			localPath := filepath.Join("storage", key)
			if b, err := os.ReadFile(localPath); err == nil {
				textContent = string(b)
			}
		}

		if textContent == "" {
			skipped++
			continue
		}

		// Upload lên R2
		publicURL, err := storageSvc.UploadText(ctx, key, textContent)
		if err != nil {
			log.Printf("[%d/%d] ❌ Lỗi upload R2 cho chương %s (Tập %.1f): %v", i+1, total, ch.title, ch.chapterNumber, err)
			failed++
			continue
		}

		// Cập nhật database
		var dbErr error
		if cleanDB {
			_, dbErr = dbPool.Exec(ctx, `
				UPDATE chapters 
				SET content_url = $1, content = NULL, updated_at = CURRENT_TIMESTAMP 
				WHERE id = $2
			`, publicURL, ch.id)
		} else {
			_, dbErr = dbPool.Exec(ctx, `
				UPDATE chapters 
				SET content_url = $1, updated_at = CURRENT_TIMESTAMP 
				WHERE id = $2
			`, publicURL, ch.id)
		}

		if dbErr != nil {
			log.Printf("[%d/%d] ⚠️ Lỗi cập nhật content_url vào DB: %v", i+1, total, dbErr)
			failed++
			continue
		}

		uploaded++
		if uploaded%25 == 0 || uploaded == total {
			log.Printf("[%d/%d] ✅ Đã tải lên R2: Tập %.1f (%s) -> %s", i+1, total, ch.chapterNumber, ch.title, publicURL)
		}
	}

	log.Printf("==> Kết quả tải truyện chữ: %d thành công, %d bỏ qua (đã có/không có nội dung), %d lỗi.\n", uploaded, skipped, failed)
}

// uploadAudioFiles tải các file âm thanh MP3 lên Cloudflare R2
func uploadAudioFiles(ctx context.Context, dbPool *pgxpool.Pool, storageSvc storage.StorageService, audioDir string, filterStoryID string, sampleAudio bool) {
	// 1. Nếu người dùng chỉ định thư mục chứa file MP3
	if audioDir != "" {
		info, err := os.Stat(audioDir)
		if err != nil || !info.IsDir() {
			log.Printf("❌ Thư mục audio không hợp lệ: %s (%v)", audioDir, err)
			return
		}

		files, err := os.ReadDir(audioDir)
		if err != nil {
			log.Printf("❌ Không thể đọc thư mục %s: %v", audioDir, err)
			return
		}

		log.Printf("==> Đang quét thư mục '%s' để tìm các file audio (.mp3, .m4a, .wav)...", audioDir)
		var audioFiles []string
		for _, f := range files {
			if f.IsDir() {
				continue
			}
			ext := strings.ToLower(filepath.Ext(f.Name()))
			if ext == ".mp3" || ext == ".m4a" || ext == ".wav" || ext == ".aac" {
				audioFiles = append(audioFiles, filepath.Join(audioDir, f.Name()))
			}
		}

		if len(audioFiles) == 0 {
			log.Printf("⚠️ Không tìm thấy file audio nào trong '%s'", audioDir)
		} else {
			log.Printf("==> Tìm thấy %d file audio. Đang chuẩn bị tải lên R2...", len(audioFiles))

			for i, filePath := range audioFiles {
				fileName := filepath.Base(filePath)
				ext := filepath.Ext(fileName)
				f, err := os.Open(filePath)
				if err != nil {
					log.Printf("[%d/%d] ❌ Lỗi mở file %s: %v", i+1, len(audioFiles), fileName, err)
					continue
				}

				fInfo, _ := f.Stat()
				fileSize := fInfo.Size()

				key := fmt.Sprintf("stories/audio/%s_%d%s", strings.TrimSuffix(fileName, ext), time.Now().Unix(), ext)
				publicURL, err := storageSvc.UploadFile(ctx, key, f, "audio/mpeg")
				_ = f.Close()

				if err != nil {
					log.Printf("[%d/%d] ❌ Lỗi tải file %s lên R2: %v", i+1, len(audioFiles), fileName, err)
					continue
				}

				log.Printf("[%d/%d] ✅ Tải MP3 thành công: %s -> %s (%d KB)", i+1, len(audioFiles), fileName, publicURL, fileSize/1024)

				// Thử match với chapter number nếu tên file có dạng "1.mp3" hoặc "1.0.mp3"
				baseNoExt := strings.TrimSuffix(fileName, ext)
				if chNum, err := strconv.ParseFloat(baseNoExt, 64); err == nil {
					var chID uuid.UUID
					q := "SELECT id FROM chapters WHERE chapter_number = $1"
					args := []any{chNum}
					if filterStoryID != "" {
						if storyUUID, err := uuid.Parse(filterStoryID); err == nil {
							q += " AND story_id = $2"
							args = append(args, storyUUID)
						}
					}
					q += " LIMIT 1"

					if err := dbPool.QueryRow(ctx, q, args...).Scan(&chID); err == nil {
						_, _ = dbPool.Exec(ctx, `
							INSERT INTO chapter_audio_files (chapter_id, quality, audio_url, file_size_bytes, is_primary)
							VALUES ($1, '320k', $2, $3, TRUE)
							ON CONFLICT (chapter_id, quality) 
							DO UPDATE SET audio_url = EXCLUDED.audio_url, file_size_bytes = EXCLUDED.file_size_bytes
						`, chID, publicURL, fileSize)
						log.Printf("    🔗 Đã liên kết Audio với Tập %.1f (ID: %s)", chNum, chID.String())
					}
				}
			}
		}
	}

	// 2. Chế độ sample-audio: Tải mẫu MP3 lên R2 cho các chương chưa có audio
	if sampleAudio {
		log.Println("==> Đang kiểm tra các chương chưa có audio trên R2...")
		rows, err := dbPool.Query(ctx, `
			SELECT c.id, c.story_id, c.chapter_number, c.title
			FROM chapters c
			LEFT JOIN chapter_audio_files a ON c.id = a.chapter_id AND a.is_primary = TRUE
			WHERE a.id IS NULL OR a.audio_url NOT LIKE '%r2%'
			LIMIT 5
		`)
		if err != nil {
			log.Printf("❌ Lỗi kiểm tra chapters: %v", err)
			return
		}
		defer rows.Close()

		type needAudioItem struct {
			id            uuid.UUID
			storyID       uuid.UUID
			chapterNumber float64
			title         string
		}
		var list []needAudioItem
		for rows.Next() {
			var it needAudioItem
			if err := rows.Scan(&it.id, &it.storyID, &it.chapterNumber, &it.title); err == nil {
				list = append(list, it)
			}
		}

		if len(list) == 0 {
			log.Println("✅ Tất cả các chương đã có audio trên R2!")
			return
		}

		sampleSourceURL := "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
		log.Printf("==> Đang tải sample audio từ %s để upload lên R2 cho %d chương...", sampleSourceURL, len(list))

		resp, err := http.Get(sampleSourceURL)
		if err != nil {
			log.Printf("❌ Lỗi tải sample audio: %v", err)
			return
		}
		defer resp.Body.Close()

		audioData, err := io.ReadAll(resp.Body)
		if err != nil {
			log.Printf("❌ Lỗi đọc sample audio: %v", err)
			return
		}

		for _, item := range list {
			key := fmt.Sprintf("stories/%s/audio/%.1f.mp3", item.storyID.String(), item.chapterNumber)
			publicURL, err := storageSvc.UploadFile(ctx, key, strings.NewReader(string(audioData)), "audio/mpeg")
			if err != nil {
				log.Printf("❌ Lỗi upload R2 cho tập %.1f: %v", item.chapterNumber, err)
				continue
			}

			_, _ = dbPool.Exec(ctx, `
				INSERT INTO chapter_audio_files (chapter_id, quality, audio_url, file_size_bytes, is_primary)
				VALUES ($1, '320k', $2, $3, TRUE)
				ON CONFLICT DO NOTHING
			`, item.id, publicURL, len(audioData))

			log.Printf("✅ Đã tạo audio R2 cho Tập %.1f (%s): %s", item.chapterNumber, item.title, publicURL)
		}
	}
}
