package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/IREAKING/tientonaudio/backend/config"
	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/pkg/auth"
	"github.com/IREAKING/tientonaudio/backend/pkg/storage"
)

func main() {
	log.Println("==================================================================")
	log.Println("⚡ BẮT ĐẦU KHỞI TẠO SEED DATA THỰC TẾ CHO TIÊN TÔN AUDIO")
	log.Println("==================================================================")

	cfg, err := config.LoadConfig("app.env")
	if err != nil {
		log.Fatalf("❌ Lỗi đọc cấu hình app.env: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	// 1. Kết nối PostgreSQL
	dbPool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("❌ Lỗi kết nối database: %v", err)
	}
	defer dbPool.Close()

	if err := dbPool.Ping(ctx); err != nil {
		log.Fatalf("❌ Database ping thất bại: %v", err)
	}
	log.Println("✅ [1/7] Kết nối Supabase PostgreSQL thành công!")

	// 2. Khởi tạo Storage Service
	storageSvc, err := storage.NewR2Storage(
		cfg.R2AccountID,
		cfg.R2AccessKeyID,
		cfg.R2AccessKeySecret,
		cfg.R2BucketName,
		cfg.R2PublicURL,
	)
	if err != nil {
		log.Fatalf("❌ Lỗi khởi tạo Storage: %v", err)
	}

	// 3. Tạo Danh Mục (Categories)
	log.Println("⏳ [2/7] Khởi tạo Thể Loại Truyện...")
	categories := []struct {
		name string
		slug string
		desc string
	}{
		{"Tiên Hiệp", "tien-hiep", "Hành trình tu chân đắc đạo, tầm tiên vấn trường sinh."},
		{"Huyền Huyễn", "huyen-huyen", "Thế giới dị giới bao la, huyết mạch thần thú ma thần."},
		{"Kiếm Hiệp", "kiem-hiep", "Ân oán giang hồ, kiếm khí dọc ngang tam giới."},
		{"Đô Thị Tu Tiên", "do-thi-tu-tien", "Đại năng trùng sinh về chốn phàm trần náo nhiệt."},
		{"Hệ Thống", "he-thong", "Bàn tay vàng tối thượng, thăng cấp thần tốc."},
		{"Xuyên Không", "xuyen-khong", "Linh hồn xuyên qua dị giới chấn hưng tông môn."},
	}

	catMap := make(map[string]int)
	for _, c := range categories {
		var id int
		err := dbPool.QueryRow(ctx, `
			INSERT INTO categories (name, slug, description)
			VALUES ($1, $2, $3)
			ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
			RETURNING id
		`, c.name, c.slug, c.desc).Scan(&id)
		if err != nil {
			log.Printf("⚠️ Lỗi chèn category %s: %v", c.name, err)
			continue
		}
		catMap[c.slug] = id
	}
	log.Printf("✅ Đã chuẩn bị %d thể loại truyện", len(catMap))

	// 4. Tạo Tác Giả (Authors) & Người Đọc (Narrators)
	log.Println("⏳ [3/7] Khởi tạo Tác Giả & MC Diễn Đọc...")
	authors := []struct {
		name string
		slug string
		bio  string
	}{
		{"Thận Độc Hành", "than-doc-hanh", "Đại thần văn học mạng, ngòi bút biến ảo khôn lường với Mục Thần Ký, Trạch Nhật Phi Thăng."},
		{"Vong Ngữ", "vong-ngu", "Khai sơn tông sư thể loại Phàm Nhân Tu Tiên, ngòi bút chân thực, logic chặt chẽ."},
		{"Thần Đông", "than-dong", "Bút lực khoáng đạt, phong cách hố sâu vạn trượng với Già Thiên, Thế Giới Hoàn Mỹ."},
		{"Phong Thanh Dương", "phong-thanh-duong", "Tác giả của bộ truyện Vạn Cổ Đệ Nhất Thần vang danh thiên hạ."},
	}

	authorMap := make(map[string]int)
	for _, a := range authors {
		var id int
		err := dbPool.QueryRow(ctx, `
			INSERT INTO authors (name, slug, bio)
			VALUES ($1, $2, $3)
			ON CONFLICT (slug) DO UPDATE SET bio = EXCLUDED.bio
			RETURNING id
		`, a.name, a.slug, a.bio).Scan(&id)
		if err != nil {
			continue
		}
		authorMap[a.slug] = id
	}

	narrators := []struct {
		name string
		slug string
		desc string
	}{
		{"MC Hà Thu", "mc-ha-thu", "Giọng nữ truyền cảm, ấm áp, biến chuyển theo từng cung bậc cảm xúc nhân vật."},
		{"MC Trần Đạt", "mc-tran-dat", "Giọng nam trầm hùng tráng, đặc biệt phù hợp những phân cảnh đại chiến kinh thiên động địa."},
		{"MC Hùng Sơn", "mc-hung-son", "Giọng đọc kiếm hiệp kinh điển với hơn 10 năm kinh nghiệm diễn đọc tiểu thuyết."},
	}

	narratorMap := make(map[string]int)
	for _, n := range narrators {
		var id int
		err := dbPool.QueryRow(ctx, `
			INSERT INTO narrators (name, slug, description)
			VALUES ($1, $2, $3)
			ON CONFLICT (slug) DO UPDATE SET description = EXCLUDED.description
			RETURNING id
		`, n.name, n.slug, n.desc).Scan(&id)
		if err != nil {
			continue
		}
		narratorMap[n.slug] = id
	}

	// 5. Tạo Các Tài Khoản Mẫu (Users)
	log.Println("⏳ [4/7] Khởi tạo Tài Khoản Kiểm Thử (Admin, Creator, VIP, Tu Sĩ)...")
	pwdHash, _ := auth.HashPassword("12345678")
	users := []struct {
		username string
		email    string
		role     string
		realm    string
		exp      int64
	}{
		{"admin_tienton", "admin@tientonaudio.com", "admin", "Độ Kiếp Kỳ", 999999},
		{"tacgia_bachngoc", "tacgia@tientonaudio.com", "creator", "Nguyên Anh Kỳ", 88000},
		{"daohuuvip", "daohuuvip@tientonaudio.com", "user", "Kim Đan Kỳ", 25000},
		{"daohuutapsu", "daohuutapsu@tientonaudio.com", "user", "Luyện Khí Tầng 3", 850},
	}

	userMap := make(map[string]uuid.UUID)
	for _, u := range users {
		var id uuid.UUID
		err := dbPool.QueryRow(ctx, `
			INSERT INTO users (username, email, password_hash, role, cultivation_realm, cultivation_exp, is_email_verified)
			VALUES ($1, $2, $3, $4, $5, $6, TRUE)
			ON CONFLICT (email) DO UPDATE 
			SET role = EXCLUDED.role, cultivation_realm = EXCLUDED.cultivation_realm, cultivation_exp = EXCLUDED.cultivation_exp
			RETURNING id
		`, u.username, u.email, pwdHash, u.role, u.realm, u.exp).Scan(&id)
		if err != nil {
			log.Printf("⚠️ Lỗi tạo user %s: %v", u.username, err)
			continue
		}
		userMap[u.username] = id
	}

	// 6. Tạo Các Bộ Truyện Kinh Điển & Các Chương Kèm Mốc Thời Gian YouTube
	log.Println("⏳ [5/7] Khởi tạo Truyện & Chương Audio có Timeline YouTube Chapters...")

	sampleAudioURL := "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
	sampleAudioURL2 := "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"

	creatorID := userMap["tacgia_bachngoc"]

	type ChapterSeed struct {
		Number          float64
		Title           string
		Duration        int32
		IsVIP           bool
		ContentText     string
		AudioURL        string
		TimelineMarkers []domain.TimelineMarker
	}

	type StorySeed struct {
		Title       string
		Slug        string
		AuthorSlug  string
		CatSlugs    []string
		CoverURL    string
		Description string
		Views       int64
		Chapters    []ChapterSeed
	}

	storiesSeed := []StorySeed{
		{
			Title:      "Mục Thần Ký",
			Slug:       "muc-than-ky",
			AuthorSlug: "than-doc-hanh",
			CatSlugs:   []string{"tien-hiep", "huyen-huyen", "he-thong"},
			CoverURL:   "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop",
			Description: `Đại Khư chi dạ, thần ma xuất một.
Đứa trẻ Tần Mục bị thả trôi ven dòng sông ranh giới, được dân làng Tàn Lão vớt lên nuôi nấng. 
Ở đây có bà già lột da người làm y phục, có ông mù mắt sáng hơn cả thần linh, có gã thọt chạy nhanh hơn tia chớp, có người cụt tay chém rách hư không.
Thiếu niên từng bước bước ra khỏi bóng tối Đại Khư, dùng đao thần mở đường, dùng bá đạo nghịch chuyển càn khôn!`,
			Views: 185000,
			Chapters: []ChapterSeed{
				{
					Number:   1.0,
					Title:    "Chương 1: Làng Tàn Lão Bên Bờ Sông",
					Duration: 1800,
					IsVIP:    false,
					ContentText: `Mặt trời dần lặn xuống phía chân trời của Đại Khư.
Bầu trời đỏ rực như máu, báo hiệu bóng đêm kinh hoàng sắp bao trùm lấy toàn bộ vùng đất bị thần linh ruồng bỏ này.

Bên bờ sông cuồn cuộn sóng trào, một chiếc nôi bằng gỗ mun lặng lẽ trôi dạt vào bờ lau sậy. Trong nôi là một đứa bé sơ sinh, hai mắt sáng long lanh như sao trời, không hề cất tiếng khóc dù xung quanh gió lạnh rít từng hồi.

Một bàn tay gầy guộc đầy vết sẹo thò ra từ bụi cỏ, vớt lấy chiếc nôi.
"Lão già, nhìn xem chúng ta nhặt được cái gì này?"
Đó là Tư Bà Bà của làng Tàn Lão. Kể từ ngày đó, một truyền kỳ chấn động chư thiên vạn giới chính thức bắt đầu...`,
					AudioURL: sampleAudioURL,
					TimelineMarkers: []domain.TimelineMarker{
						{Title: "Mở đầu: Hoàng hôn trên Đại Khư", StartSeconds: 0},
						{Title: "Tư Bà Bà vớt đứa trẻ ven sông", StartSeconds: 420},
						{Title: "Đưa hài nhi về Làng Tàn Lão", StartSeconds: 880},
						{Title: "Thôn Trưởng đặt tên: Tần Mục", StartSeconds: 1400},
					},
				},
				{
					Number:   2.0,
					Title:    "Chương 2: Đêm Đen Đại Khư Hạ Xuống",
					Duration: 2100,
					IsVIP:    false,
					ContentText: `Bóng tối vừa chạm đất, khắp vùng Đại Khư lập tức rền vang những tiếng gầm thét kinh tâm động phách.
Những pho tượng đá cổ xưa quanh thôn bắt đầu phát ra ánh sáng vàng nhạt, tạo thành một lồng bảo hộ linh thiêng. Ngoài vòng sáng, những bóng đen khổng lồ với đôi mắt đỏ rực như lồng đèn đang điên cuồng cào xé hư không.

Tần Mục lúc này đã mười hai tuổi, ngồi xếp bằng trước tượng đá, tĩnh tâm lắng nghe tiếng gió.
Mù gia gia chống cây gậy trúc đi tới: "Mục nhi, dùng tâm mà nhìn, thế giới này không chỉ có màu sắc, mà còn có kiếm ý."`,
					AudioURL: sampleAudioURL2,
					TimelineMarkers: []domain.TimelineMarker{
						{Title: "Mở đầu: Tiếng gầm của Ma Thần", StartSeconds: 0},
						{Title: "Tượng đá tỏa kim quang hộ thôn", StartSeconds: 510},
						{Title: "Mù gia gia dạy Nhãn Thần Thông", StartSeconds: 1120},
						{Title: "Thiếu niên lần đầu xuất quyền", StartSeconds: 1750},
					},
				},
				{
					Number:   3.0,
					Title:    "Tập Đặc Biệt (2 Giờ): Trọn Bộ Đại Khư Xuất Thế & Thiếu Niên Rút Đao",
					Duration: 7200,
					IsVIP:    true,
					ContentText: `TẬP ĐẶC BIỆT THỜI LƯỢNG 2 TIẾNG DÀNH CHO CÁC VỊ ĐẠO HỮU.
Gộp trọn vẹn toàn bộ khúc dạo đầu hoành tráng nhất của Mục Thần Ký: từ lúc Tần Mục được tôi luyện thân thể, cho đến khoảnh khắc rút Thần Đao chém rách màn đêm hắc ám, một mình bước vào Thái Hoàng Thiên!

Độc giả có thể sử dụng Mục Lục Mốc Thời Gian (Timeline Chapters) trên thanh phát để chuyển nhanh đến từng phân đoạn cao trào.`,
					AudioURL: sampleAudioURL,
					TimelineMarkers: []domain.TimelineMarker{
						{Title: "Mở đầu: Bí mật Làng Tàn Lão", StartSeconds: 0},
						{Title: "Tư Bà Bà truyền Ma Đạo Chân Quyết", StartSeconds: 930},
						{Title: "Mù gia gia điểm nhãn Thông Thần", StartSeconds: 1965},
						{Title: "Câm thúc rèn Thần Đao ngàn năm", StartSeconds: 3250},
						{Title: "Đêm đen Đại Khư, Vạn Quỷ gào thét", StartSeconds: 4700},
						{Title: "Tần Mục rút Thần Đao trảm Ma Vương", StartSeconds: 5750},
						{Title: "Đại kết cục phần 1: Bước vào Thái Hoàng Thiên", StartSeconds: 6735},
					},
				},
			},
		},
		{
			Title:      "Phàm Nhân Tu Tiên",
			Slug:       "pham-nhan-tu-tien",
			AuthorSlug: "vong-ngu",
			CatSlugs:   []string{"tien-hiep", "kiem-hiep"},
			CoverURL:   "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop",
			Description: `Hàn Lập - một thiếu niên bình thường xuất thân bần hàn, cơ duyên xảo hợp gia nhập một môn phái giang hồ nhỏ bé.
Tư chất bình thường, linh căn thấp kém, nhưng bằng sự cẩn trọng, kiên nghị và chiếc bình nhỏ thần bí nhặt được, hắn từng bước dấn thân vào con đường tu tiên đầy máu và lửa, tranh đoạt từng tia sinh cơ giữa thiên địa!`,
			Views: 320000,
			Chapters: []ChapterSeed{
				{
					Number:   1.0,
					Title:    "Chương 1: Sơn Thôn Thiếu Niên",
					Duration: 1950,
					IsVIP:    false,
					ContentText: `Hàn Lập ngồi trên tảng đá lớn đầu thôn Thanh Ngưu, ngước nhìn rặng núi xa xa.
Nhà nghèo đông anh em, cuộc sống quanh năm thiếu đói. Khi nghe Tam thúc báo tin Thất Huyền Môn trên núi đang tuyển đệ tử, cha mẹ liền quyết định đưa hắn đi thử vận may.
Hắn không ngờ rằng, chuyến đi này chính là cánh cửa dẫn hắn bước vào một thế giới tu chân tàn khốc mà huy hoàng...`,
					AudioURL: sampleAudioURL,
					TimelineMarkers: []domain.TimelineMarker{
						{Title: "Mở đầu: Hoàn cảnh bần hàn thôn quê", StartSeconds: 0},
						{Title: "Tam thúc mang đến tin tức Thất Huyền Môn", StartSeconds: 540},
						{Title: "Lên đường đến Thất Huyền Môn", StartSeconds: 1200},
						{Title: "Gặp gỡ Mặc Đại Phu bí hiểm", StartSeconds: 1650},
					},
				},
				{
					Number:   2.0,
					Title:    "Chương 2: Chưởng Thiên Bình Xuất Thế",
					Duration: 2200,
					IsVIP:    false,
					ContentText: `Đêm khuya tại Thần Thủ Cốc, Hàn Lập vô tình đạp trúng một vật cứng chôn dưới lớp đất xốp.
Đó là một chiếc bình màu xanh lục nhỏ bằng nắm tay, xung quanh khắc đầy những hoa văn huyền ảo kỳ dị.
Khi ánh trăng rọi xuống, chiếc bình bắt đầu hút lấy linh khí thiên địa, ngưng tụ thành những giọt lục dịch thần kỳ có thể thúc chín linh dược ngàn năm trong nháy mắt!`,
					AudioURL: sampleAudioURL2,
					TimelineMarkers: []domain.TimelineMarker{
						{Title: "Mở đầu: Đêm khuya Thần Thủ Cốc", StartSeconds: 0},
						{Title: "Vô tình nhặt được tiểu lục bình", StartSeconds: 480},
						{Title: "Hiện tượng dị thường dưới ánh trăng", StartSeconds: 1150},
						{Title: "Bí mật giọt lục dịch thúc chín dược thảo", StartSeconds: 1720},
					},
				},
			},
		},
		{
			Title:      "Vạn Cổ Đệ Nhất Thần",
			Slug:       "van-co-de-nhat-than",
			AuthorSlug: "phong-thanh-duong",
			CatSlugs:   []string{"huyen-huyen", "he-thong"},
			CoverURL:   "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=800&auto=format&fit=crop",
			Description: `Lý Thiên Mệnh bị người hãm hại tước đoạt bạn sinh thú, rơi xuống vực sâu tuyệt vọng.
Nhưng tại nơi vạn kiếp bất phục, hắn kích hoạt Thập Phương Kỷ Nguyên Thần Kiếp, đồng thời ấp nở Cửu Đại Thái Cổ Hỗn Độn Cự Thú!
Từ đây, mang theo thần thú thái cổ quét ngang vạn giới,踏 vỡ cửu thiên!`,
			Views: 95000,
			Chapters: []ChapterSeed{
				{
					Number:   1.0,
					Title:    "Chương 1: Thái Cổ Hỗn Độn Cự Thú",
					Duration: 1850,
					IsVIP:    false,
					ContentText: `Huyết mạch bị phế, hôn thê phản bội, Lý Thiên Mệnh trở thành trò cười của toàn bộ Ly Hỏa Thành.
Ngay khoảnh khắc sinh tử, một quả trứng thần bí trong ngực bỗng nhiên nứt vỡ. Một con gà nhỏ toàn thân đen sì nhảy ra, ngạo nghễ quát:
"Bổn tọa là Huỳnh Hỏa, Vĩnh Hằng Hỗn Độn Lôi Hoàng! Kẻ nào dám ức hiếp sủng thần của ta?"`,
					AudioURL: sampleAudioURL,
					TimelineMarkers: []domain.TimelineMarker{
						{Title: "Mở đầu: Bi kịch phản bội tại Ly Hỏa Thành", StartSeconds: 0},
						{Title: "Trứng thần thức tỉnh trong lồng ngực", StartSeconds: 610},
						{Title: "Huỳnh Hỏa xuất thế chấn động", StartSeconds: 1250},
					},
				},
			},
		},
	}

	for _, s := range storiesSeed {
		authorID := authorMap[s.AuthorSlug]
		var storyID uuid.UUID

		err := dbPool.QueryRow(ctx, `
			INSERT INTO stories (title, slug, description, cover_image_url, author_id, created_by, view_count, rating_avg, status)
			VALUES ($1, $2, $3, $4, $5, $6, $7, 4.95, 'ongoing')
			ON CONFLICT (slug) DO UPDATE 
			SET title = EXCLUDED.title, description = EXCLUDED.description, cover_image_url = EXCLUDED.cover_image_url
			RETURNING id
		`, s.Title, s.Slug, s.Description, s.CoverURL, authorID, creatorID, s.Views).Scan(&storyID)
		if err != nil {
			log.Printf("⚠️ Lỗi chèn story %s: %v", s.Title, err)
			continue
		}

		// Gán Thể loại
		for _, catSlug := range s.CatSlugs {
			catID := catMap[catSlug]
			if catID > 0 {
				_, _ = dbPool.Exec(ctx, `
					INSERT INTO story_categories (story_id, category_id)
					VALUES ($1, $2)
					ON CONFLICT DO NOTHING
				`, storyID, catID)
			}
		}

		// Chèn Chapters
		for _, ch := range s.Chapters {
			// Upload nội dung text lên storage (cả local disk và R2)
			key := fmt.Sprintf("stories/%s/chapters/%.1f.txt", storyID.String(), ch.Number)
			contentURL, _ := storageSvc.UploadText(ctx, key, ch.ContentText)

			var timelineJSON []byte
			if len(ch.TimelineMarkers) > 0 {
				timelineJSON, _ = json.Marshal(ch.TimelineMarkers)
			} else {
				timelineJSON = []byte("[]")
			}

			narratorID := narratorMap["mc-tran-dat"]
			if ch.Number == 1.0 {
				narratorID = narratorMap["mc-ha-thu"]
			}

			var chID uuid.UUID
			err := dbPool.QueryRow(ctx, `
				INSERT INTO chapters (
					story_id, narrator_id, chapter_number, title, content, content_url,
					is_premium, duration_seconds, timeline_markers, listen_count
				) VALUES (
					$1, $2, $3, $4, NULL, $5, $6, $7, $8::jsonb, $9
				)
				ON CONFLICT (story_id, chapter_number) DO UPDATE
				SET title = EXCLUDED.title,
				    content = NULL,
				    content_url = EXCLUDED.content_url,
				    is_premium = EXCLUDED.is_premium,
				    duration_seconds = EXCLUDED.duration_seconds,
				    timeline_markers = EXCLUDED.timeline_markers
				RETURNING id
			`, storyID, narratorID, ch.Number, ch.Title, contentURL, ch.IsVIP, ch.Duration, string(timelineJSON), 1250+int64(ch.Number)*150).Scan(&chID)

			if err != nil {
				log.Printf("⚠️ Lỗi chèn chapter %.1f cho %s: %v", ch.Number, s.Title, err)
				continue
			}

			// Thêm audio stream file vào chapter_audio_files
			if ch.AudioURL != "" {
				fileSize := int64(ch.Duration) * 40000 // Giả lập kích thước file 320k
				_, _ = dbPool.Exec(ctx, `
					INSERT INTO chapter_audio_files (chapter_id, quality, audio_url, file_size_bytes, is_primary)
					VALUES ($1, '320k', $2, $3, TRUE)
					ON CONFLICT DO NOTHING
				`, chID, ch.AudioURL, fileSize)
			}
		}

		// Cập nhật total_chapters
		_, _ = dbPool.Exec(ctx, `
			UPDATE stories 
			SET total_chapters = (SELECT COUNT(*) FROM chapters WHERE story_id = $1)
			WHERE id = $1
		`, storyID)

		log.Printf("📖 Đã seed thành công truyện: %s (%d tập có timeline mốc thời gian)", s.Title, len(s.Chapters))
	}

	// 7. Seed Bài Viết & Bình Luận Mạng Xã Hội Đạo Hữu (Community Posts)
	log.Println("⏳ [6/7] Khởi tạo Bài Viết Mạng Xã Hội Đạo Hữu (/community)...")
	adminID := userMap["admin_tienton"]
	vipID := userMap["daohuuvip"]
	tapsuID := userMap["daohuutapsu"]

	posts := []struct {
		userID  uuid.UUID
		topic   string
		content string
		likes   int
	}{
		{
			userID:  adminID,
			topic:   "thong_bao",
			content: "🎉 CHÀO MỪNG CÁC VỊ ĐẠO HỮU ĐẾN VỚI TIÊN TÔN AUDIO! Hệ thống vừa cập nhật tính năng Âm Thanh Nền Tiên Hiệp (tiếng mưa rơi, gió rừng trúc) và Timeline Chapters (Mục lục mốc giờ giống YouTube cho audio dài). Chúc các đạo hữu tu đạo thuận buồm xuôi gió!",
			likes:   48,
		},
		{
			userID:  vipID,
			topic:   "luan_dao",
			content: "Vừa cày xong Tập Đặc Biệt 2 tiếng của Mục Thần Ký trên web! Quả thực tính năng mốc giờ YouTube tiện vô cùng, bấm phát nhảy ngay tới đoạn Tần Mục rút Thần Đao ở phút 01:35:50 nghe nổi cả da gà. Lại còn bật thêm tiếng mưa rơi róc rách lúc nửa đêm, phê không tả nổi!",
			likes:   32,
		},
		{
			userID:  creatorID,
			topic:   "sang_tac",
			content: "Bổn tọa vừa cập nhật thêm 2 tập mới cho Phàm Nhân Tu Tiên, có gắn sẵn mốc timeline từng cảnh chiến đấu. Đạo hữu nào nghe thử góp ý cho giọng đọc MC nhé!",
			likes:   19,
		},
		{
			userID:  tapsuID,
			topic:   "hoi_dap",
			content: "Các tiền bối cho tiểu đệ hỏi: Làm sao để đột phá từ Luyện Khí Kỳ lên Trúc Cơ Kỳ nhanh nhất vậy ạ? Nghe truyện mỗi ngày có được cộng thêm tu vi không?",
			likes:   14,
		},
	}

	for _, p := range posts {
		var postID uuid.UUID
		err := dbPool.QueryRow(ctx, `
			INSERT INTO community_posts (user_id, topic, content, like_count)
			VALUES ($1, $2, $3, $4)
			RETURNING id
		`, p.userID, p.topic, p.content, p.likes).Scan(&postID)
		if err != nil {
			continue
		}

		// Thêm bình luận tương tác
		if p.topic == "hoi_dap" {
			_, _ = dbPool.Exec(ctx, `
				INSERT INTO community_post_comments (post_id, user_id, content)
				VALUES ($1, $2, 'Cứ chăm chỉ điểm danh mỗi ngày và nghe trọn vẹn các chương audio là tu vi tự khắc tăng vọt nhé đạo hữu!')
			`, postID, vipID)
		}
	}

	// 8. Kích Hoạt Gói VIP Cho daohuuvip@tientonaudio.com
	log.Println("⏳ [7/7] Kích hoạt Hội Viên VIP & Linh Thạch cho tài khoản thử nghiệm...")
	_, _ = dbPool.Exec(ctx, `
		INSERT INTO user_subscriptions (user_id, plan_id, status, start_time, end_time)
		VALUES ($1, 2, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '365 days')
		ON CONFLICT DO NOTHING
	`, vipID)

	// Đảm bảo thư mục storage local tồn tại
	_ = os.MkdirAll(filepath.Join(".", "storage", "stories"), 0755)

	log.Println("==================================================================")
	log.Println("🎉 [HOÀN TẤT] TẤT CẢ DỮ LIỆU SEED ĐÃ ĐƯỢC NẠP THÀNH CÔNG VÀO HỆ THỐNG!")
	log.Println("==================================================================")
	log.Println("📌 THÔNG TIN TÀI KHOẢN ĐĂNG NHẬP THỬ NGHIỆM:")
	log.Println("   1. Quản Trị Viên: admin@tientonaudio.com  | Mật khẩu: 12345678 (Cảnh giới: Độ Kiếp Kỳ)")
	log.Println("   2. Tác Giả/MC:   tacgia@tientonaudio.com | Mật khẩu: 12345678 (Kênh Sáng Tác Studio)")
	log.Println("   3. Đạo Hữu VIP:  daohuuvip@tientonaudio.com | Mật khẩu: 12345678 (Đã kích hoạt VIP 1 năm)")
	log.Println("   4. Đạo Hữu Mới:  daohuutapsu@tientonaudio.com | Mật khẩu: 12345678 (Luyện Khí Tầng 3)")
	log.Println("==================================================================")
}
