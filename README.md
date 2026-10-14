# 🎧 TienTonAudio — Nền Tảng Streaming Audio Truyện & Nghe Nhìn Tiên Hiệp

> **TienTonAudio** là hệ thống Backend dịch vụ Streaming Audio truyện tiên hiệp, kiếm hiệp và tiểu thuyết số hiện đại, hiệu năng cao, được thiết kế theo kiến trúc sạch (Clean Architecture), độ trễ thấp và sẵn sàng cho môi trường thương mại (Production-Ready).

---

## 📑 Mục lục
1. [Tính năng nổi bật](#-tính-năng-nổi-bật)
2. [Công nghệ sử dụng](#-công-nghệ-sử-dụng-tech-stack)
3. [Cấu trúc thư mục dự án](#-cấu-trúc-thư-mục-project-structure)
4. [Hướng dẫn cài đặt & Khởi chạy](#-hướng-dẫn-cài-đặt--khởi-chạy-quickstart)
5. [Cấu hình biến môi trường (Environment Variables)](#-cấu-hình-biến-môi-trường-environment-variables)
6. [Danh mục API & Swagger UI](#-danh-mục-api--swagger-ui)
7. [Kiểm thử & Biên dịch (Testing & Build)](#-kiểm-thử--biên-dịch-testing--build)

---

## 🌟 Tính năng nổi bật

### 1. 🔐 Bảo mật & Xác thực chuẩn Enterprise (Authentication & Security)
* **Xác thực Email**: Gửi token kích hoạt tài khoản qua email khi đăng ký mới.
* **Xác thực 2 yếu tố (2FA TOTP RFC 6238)**: Hỗ trợ bật/tắt 2FA tương thích Google Authenticator, Authy.
* **8 Mã dự phòng khẩn cấp (Backup Codes)**: Khôi phục tài khoản khi mất thiết bị 2FA (mỗi mã chỉ dùng 1 lần, lưu băm SHA-256 an toàn).
* **Quên & Đặt lại mật khẩu**: Quy trình cấp mã reset bảo mật 15 phút gửi qua email.
* **Refresh Token Rotation & Revocation**: Xoay vòng refresh token mỗi lần cấp mới, tự động phát hiện và thu hồi toàn bộ phiên đăng nhập nếu token cũ bị tái sử dụng trái phép.
* **Phân quyền người dùng (RBAC)**: Middleware phân quyền chặt chẽ giữa người dùng phổ thông, hội viên VIP và Admin.

### 2. 🎧 Quản lý Truyện & Trình phát Audio (Audio Streaming & Player)
* **Phát trực tuyến đa chất lượng**: Hỗ trợ nhiều bitrate (`64k`, `128k`, `320k`, `HLS`).
* **Dữ liệu dạng sóng (Waveform)**: Cung cấp mảng tần số âm thanh để vẽ biểu đồ sóng chuyển động trên giao diện Player.
* **Đồng bộ tiến độ nghe**: Tự động lưu và khôi phục mốc giây đang nghe dở trên mọi thiết bị.
* **Lịch sử nghe & Lượt xem**: Tự động cập nhật lượt nghe từng tập, tổng lượt xem của truyện và bảng xếp hạng Top Views.
* **Gợi ý truyện thông minh (Related Stories)**: Thuật toán đề xuất các bộ truyện tương tự dựa trên cùng thể loại hoặc cùng tác giả.

### 3. 🛡️ Bảo vệ bản quyền Audio (Signed Stream Tokens)
* **Chữ ký số HMAC-SHA256 có thời hạn**: Cấp link phát âm thanh gắn kèm token mật mã có hiệu lực 2 giờ.
* **Chống cào trộm dữ liệu CDN**: Không để lộ link file gốc trên Cloudflare R2 / AWS S3.
* **Kiểm soát đặc quyền VIP**: Tự động chặn truy cập trái phép đối với các chương truyện trả phí (`is_premium = true`).

### 4. 💬 Tương tác & Cộng đồng chuyên sâu (Community & Engagement)
* **Bình luận lồng nhau (Threaded/Nested Replies)**: Cho phép người nghe trả lời trực tiếp từng bình luận của nhau, hiển thị số lượt phản hồi.
* **Xóa bình luận an toàn (Soft Delete)**: Đánh dấu xóa nhưng vẫn giữ nguyên cấu trúc nhánh thảo luận cho các câu trả lời con.
* **Thả biểu cảm bình luận (Comment Reactions)**: Thả 6 loại cảm xúc (`like`, `love`, `haha`, `wow`, `sad`, `angry`) kèm cơ chế toggle (bấm lại để hủy, bấm biểu cảm khác để đổi).
* **Playlist cá nhân**: Tạo danh sách phát yêu thích, thêm/xóa/sắp xếp thứ tự các tập audio, hỗ trợ chế độ Công khai (Public) hoặc Riêng tư (Private).
* **Đánh giá & Xếp hạng**: Đánh giá 1 - 5 sao kèm nhận xét, tự động tính điểm trung bình bằng Database Trigger.
* **Theo dõi Tác giả & MC Giọng đọc**: Bấm "Theo dõi" để cập nhật thông tin tác giả và giọng đọc yêu thích.

### 5. 🔔 Thông báo & Hỗ trợ vận hành (Notifications & Reports)
* **Hệ thống Thông báo In-App**: Tự động gửi thông báo khi có người trả lời bình luận của bạn, hoặc khi truyện bạn theo dõi ra chương mới.
* **Badge đếm thông báo chưa đọc**: API đếm số lượng thông báo chưa đọc phục vụ hiển thị icon chuông trên app/web.
* **Báo lỗi Audio & Vi phạm**: Người nghe gửi ticket báo cáo (audio rè, mất tiếng, sai tập, bình luận thô tục).
* **Admin Portal**: Quản trị viên lọc và xử lý báo cáo (`pending`, `resolved`, `rejected`), xem thống kê doanh thu, quản lý danh sách người dùng.

### 6. 💎 Gói cước VIP & Thanh toán (Monetization & Subscriptions)
* Quản lý các gói hội viên: Miễn phí, VIP Tháng, VIP Năm.
* Tích hợp cơ chế Webhook kích hoạt tài khoản tự động từ cổng thanh toán (MoMo, VNPay, ZaloPay, Stripe).

### 7. 🤖 AI Trợ lý Đạo Hữu (AI Assistant)
* Tích hợp AI (Google Gemini / OpenAI):
  - Trò chuyện, giải đáp thắc mắc về cốt truyện và nhân vật.
  - Tự động bóc tách các tầng cảnh giới tu tiên trong truyện.
  - Tóm tắt cốt truyện nhanh gọn.

---

## 🛠 Công nghệ sử dụng (Tech Stack)

| Thành phần | Công nghệ / Thư viện |
| :--- | :--- |
| **Ngôn ngữ** | [Go (Golang)](https://golang.org/) 1.22+ |
| **Web Router** | [go-chi/chi/v5](https://github.com/go-chi/chi) (Router nhẹ, chuẩn RESTful, tương thích chuẩn `net/http`) |
| **Cơ sở dữ liệu** | [PostgreSQL](https://www.postgresql.org/) 15+ |
| **Database Tooling** | [sqlc](https://sqlc.dev/) (Sinh mã Go an toàn type-safe từ thuần SQL), [golang-migrate](https://github.com/golang-migrate/migrate) |
| **Bộ nhớ đệm (Cache)** | [Redis](https://redis.io/) 7+ |
| **Lưu trữ đám mây** | [Cloudflare R2](https://www.cloudflare.com/products/r2/) / AWS S3 (S3 Compatible API) |
| **Tài liệu API** | [Swagger / OpenAPI UI](https://swagger.io/) (Tích hợp sẵn giao diện trực quan tại `/swagger`) |
| **Đóng gói** | Docker & Docker Compose |

---

## 📁 Cấu trúc thư mục (Project Structure)

Dự án được tổ chức theo cấu trúc **Monorepo** gọn gàng, tách bạch độc lập giữa Backend và Mobile:

```text
TienTonAudio/
├── backend/                # 🌐 TOÀN BỘ BACKEND GO (API & Dịch vụ)
│   ├── cmd/
│   │   ├── server/         # Khởi chạy API Server chính (main.go)
│   │   └── migrate/        # Công cụ Auto-Migration Supabase/Postgres
│   ├── internal/           # Clean Architecture (domain, handler, repository, service, router)
│   ├── pkg/                # Thư viện dùng chung (auth 2FA, stream signer, ai, email, storage)
│   ├── db/                 # Migrations (schema.sql), queries SQL, sqlc
│   ├── config/             # Cấu hình app.env
│   ├── docs/               # Swagger API specs (/swagger)
│   ├── app.env             # File biến môi trường Database, JWT, R2
│   ├── Makefile            # Lệnh build, test, migrate riêng cho backend
│   └── Dockerfile          # Dockerfile đa tầng siêu nhẹ
│
├── mobile/                 # 📱 TOÀN BỘ MOBILE APP FLUTTER (iOS & Android)
│   ├── lib/
│   │   ├── core/           # Constants (endpoints), Theme tiên hiệp, ApiClient (Dio)
│   │   ├── data/           # Models (Story, Chapter, User) & AudioPlayerService
│   │   ├── providers/      # State Management (AuthProvider, StoryProvider)
│   │   ├── screens/        # Màn hình: Home, StoryDetail, Mini/Full Player, Login 2FA
│   │   └── main.dart       # Điểm khởi chạy Flutter
│   ├── test/               # Bộ kiểm thử Unit test của Mobile
│   └── pubspec.yaml        # Danh sách thư viện (just_audio, dio, provider, ...)
│
├── docker-compose.yml      # Khởi động PostgreSQL 16 & Redis 7
├── Makefile                # Makefile điều phối chung toàn bộ Monorepo
└── README.md               # Tài liệu hướng dẫn dự án
```

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy (Quickstart)

### 1. Yêu cầu môi trường
* **Go** phiên bản >= 1.22
* **Docker** & **Docker Compose**
* **Make** (tùy chọn nhưng khuyến nghị)

---

### 2. Khởi chạy nhanh bằng Docker Compose (Khuyến nghị)

Chỉ cần một lệnh duy nhất để khởi động toàn bộ hệ sinh thái (PostgreSQL, Redis và TienTonAudio Backend):

```bash
# 1. Clone repository
git clone https://github.com/your-username/TienTonAudio.git
cd TienTonAudio

# 2. Khởi động Docker containers
make docker-up
# Hoặc: docker compose up -d
```

Ứng dụng sẽ tự động chạy tại: `http://localhost:8080`  
Giao diện Swagger API Documentation: `http://localhost:8080/swagger`

---

### 3. Chạy thủ công trên môi trường Development cục bộ

#### Bước 1: Khởi động cơ sở dữ liệu (PostgreSQL & Redis)
Nếu bạn đã có sẵn Docker:
```bash
docker compose up -d postgres redis
```

#### Bước 2: Khởi tạo Schema Database
Chạy toàn bộ schema trong file `db/migrations/schema.sql`:
```bash
# Sử dụng psql hoặc bất kỳ công cụ quản lý DB nào (DBeaver, DataGrip):
psql -U postgres -h localhost -d tientonaudio -f db/migrations/schema.sql
```

#### Bước 3: Cấu hình biến môi trường
Kiểm tra file `app.env` ở thư mục gốc (xem hướng dẫn ở mục bên dưới).

#### Bước 4: Chạy Server
```bash
# Cài đặt dependencies
go mod download

# Chạy server
make run
# Hoặc: go run cmd/server/main.go
```

---

## ⚙️ Cấu hình biến môi trường (Environment Variables)

File cấu hình đặt tại `app.env` ở thư mục gốc của dự án:

```env
# Server
SERVER_ADDRESS=0.0.0.0:8080
ENVIRONMENT=development

# PostgreSQL
DATABASE_URL=postgresql://postgres:password@localhost:5432/tientonaudio?sslmode=disable
DB_MAX_CONNS=20
DB_MIN_CONNS=5

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT & Security
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this-in-production-must-be-long
ACCESS_TOKEN_DURATION=15m
REFRESH_TOKEN_DURATION=168h

# Cloudflare R2 / S3 (Lưu trữ Audio & Ảnh bìa)
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_ACCESS_KEY_SECRET=your-r2-secret-access-key
R2_BUCKET_NAME=tientonaudio
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxxxxxxxxxx.r2.dev

# Rate Limiting & CORS
RATE_LIMIT_REQUESTS_PER_MINUTE=60
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

# Email SMTP (Để trống SMTP_HOST sẽ tự động bật Mock Console Logger khi test)
SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=noreply@tientonaudio.com
APP_BASE_URL=http://localhost:8080

# AI Đạo Hữu (OpenAI hoặc Gemini)
AI_PROVIDER=gemini
AI_API_KEY=your-gemini-or-openai-api-key
AI_MODEL_NAME=gemini-1.5-flash
```

---

## 📖 Danh mục API & Swagger UI

Truy cập giao diện tương tác và kiểm thử API trực quan tại:
👉 **`http://localhost:8080/swagger`**

### Bảng tóm tắt các Endpoints chính:

| Nhóm chức năng | Method | Endpoint | Yêu cầu Auth | Ghi chú |
| :--- | :--- | :--- | :---: | :--- |
| **Xác thực** | `POST` | `/api/v1/auth/register` | ❌ | Đăng ký tài khoản (gửi email xác nhận) |
| | `GET` | `/api/v1/auth/verify-email?token=...` | ❌ | Kích hoạt tài khoản qua link email |
| | `POST` | `/api/v1/auth/login` | ❌ | Đăng nhập (hỗ trợ kiểm tra 2FA) |
| | `POST` | `/api/v1/auth/2fa/verify` | ❌ | Xác thực bước 2 bằng mã TOTP hoặc Backup code |
| | `POST` | `/api/v1/auth/2fa/enable` | ✅ | Bật 2FA & nhận 8 mã backup |
| | `POST` | `/api/v1/auth/2fa/disable` | ✅ | Tắt 2FA |
| | `POST` | `/api/v1/auth/forgot-password` | ❌ | Yêu cầu gửi email reset mật khẩu |
| | `POST` | `/api/v1/auth/reset-password` | ❌ | Đặt lại mật khẩu mới bằng token |
| | `POST` | `/api/v1/auth/refresh` | ❌ | Cấp mới Access Token bằng Refresh Token |
| | `POST` | `/api/v1/auth/logout` | ✅ | Đăng xuất & thu hồi Refresh Token |
| **Người dùng** | `GET` | `/api/v1/users/me` | ✅ | Xem thông tin cá nhân |
| | `PUT` | `/api/v1/users/me` | ✅ | Cập nhật thông tin |
| | `PUT` | `/api/v1/users/password` | ✅ | Đổi mật khẩu |
| | `GET` | `/api/v1/users/history` | ✅ | Lịch sử nghe truyện |
| | `GET` | `/api/v1/users/favorites` | ✅ | Danh sách truyện yêu thích |
| | `GET` | `/api/v1/users/following-authors` | ✅ | Danh sách tác giả đang theo dõi |
| | `GET` | `/api/v1/users/following-narrators`| ✅ | Danh sách MC đang theo dõi |
| **Truyện** | `GET` | `/api/v1/stories` | ❌ | Danh sách truyện (phân trang) |
| | `GET` | `/api/v1/stories/top-views` | ❌ | Bảng xếp hạng truyện xem nhiều nhất |
| | `GET` | `/api/v1/stories/search?q=...` | ❌ | Tìm kiếm theo tiêu đề |
| | `GET` | `/api/v1/stories/filter` | ❌ | Lọc nâng cao theo thể loại, tác giả, trạng thái |
| | `GET` | `/api/v1/stories/{id}/related` | ❌ | Gợi ý các bộ truyện tương tự |
| | `GET` | `/api/v1/stories/{slug}` | ❌ | Chi tiết truyện (tự động tăng view count) |
| | `POST` | `/api/v1/stories/{id}/favorite`| ✅ | Yêu thích / Bỏ yêu thích truyện (Toggle) |
| **Chương & Audio**| `GET` | `/api/v1/stories/{id}/chapters` | ❌ | Danh sách các tập của truyện |
| | `GET` | `/api/v1/chapters/{id}` | ❌ | Chi tiết chương (kèm dữ liệu waveform) |
| | `GET` | `/api/v1/chapters/{id}/stream` | Tùy chọn | Lấy Signed URL phát audio có thời hạn (Kiểm tra VIP) |
| | `POST` | `/api/v1/chapters/progress` | ✅ | Lưu vị trí giây đang nghe |
| **Bình luận** | `GET` | `/api/v1/chapters/{id}/comments`| Tùy chọn | Bình luận gốc (kèm số replies, biểu cảm) |
| | `POST` | `/api/v1/chapters/{id}/comments`| ✅ | Đăng bình luận chương |
| | `GET` | `/api/v1/comments/{id}/replies` | Tùy chọn | Danh sách câu trả lời của bình luận |
| | `POST` | `/api/v1/comments/{id}/reply` | ✅ | Trả lời bình luận (tự động gửi thông báo) |
| | `POST` | `/api/v1/comments/{id}/reactions`| ✅ | Thả biểu cảm (`like`, `love`, `haha`, ...) |
| | `DELETE`| `/api/v1/comments/{id}` | ✅ | Xóa bình luận (Soft delete) |
| **Playlist** | `GET` | `/api/v1/playlists` | ✅ | Danh sách playlist của tôi |
| | `POST` | `/api/v1/playlists` | ✅ | Tạo playlist mới |
| | `GET` | `/api/v1/playlists/{id}` | Tùy chọn | Chi tiết playlist & các tập bên trong |
| | `POST` | `/api/v1/playlists/{id}/items` | ✅ | Thêm tập audio vào playlist |
| | `DELETE`| `/api/v1/playlists/{id}/items/{chapterId}` | ✅ | Xóa tập audio khỏi playlist |
| **Thông báo** | `GET` | `/api/v1/notifications` | ✅ | Danh sách thông báo cá nhân |
| | `GET` | `/api/v1/notifications/unread-count`| ✅ | Đếm số lượng thông báo chưa đọc |
| | `PUT` | `/api/v1/notifications/{id}/read`| ✅ | Đánh dấu 1 thông báo là đã đọc |
| | `PUT` | `/api/v1/notifications/read-all`| ✅ | Đánh dấu tất cả thông báo là đã đọc |
| **Báo lỗi / Vi phạm**| `POST` | `/api/v1/reports` | ✅ | Báo lỗi audio hoặc bình luận vi phạm |
| | `GET` | `/api/v1/admin/reports` | Admin | Quản lý danh sách báo cáo |
| | `PUT` | `/api/v1/admin/reports/{id}/status`| Admin | Xử lý và đổi trạng thái báo cáo |
| **Theo dõi** | `POST` | `/api/v1/authors/{id}/follow` | ✅ | Theo dõi / Hủy theo dõi tác giả |
| | `POST` | `/api/v1/narrators/{id}/follow`| ✅ | Theo dõi / Hủy theo dõi giọng đọc |
| **Gói VIP** | `GET` | `/api/v1/payments/plans` | ❌ | Bảng giá các gói cước hội viên |
| | `POST` | `/api/v1/payments/create` | ✅ | Khởi tạo đơn thanh toán gói VIP |
| | `POST` | `/api/v1/payments/webhook` | ❌ | Nhận callback IPN tự động từ cổng thanh toán |
| **AI Đạo Hữu** | `POST` | `/api/v1/ai/chat` | ❌ | Trò chuyện với AI về truyện |
| | `GET` | `/api/v1/ai/stories/{id}/realms`| ❌ | Bóc tách hệ thống cảnh giới tu luyện |
| | `GET` | `/api/v1/ai/stories/{id}/summary`| ❌ | AI tóm tắt tác phẩm |

---

## 🧪 Kiểm thử & Biên dịch (Testing & Build)

### 1. Chạy Unit Tests
Hệ thống đi kèm bộ kiểm thử tự động toàn diện bao phủ toàn bộ luồng Auth, Security, Playlist, Comments, Reactions, Signed Stream và Notifications:

```bash
# Chạy toàn bộ tests
make test
# Hoặc: go test -v ./...
```

### 2. Sinh mã SQLC
Nếu bạn chỉnh sửa hoặc bổ sung các câu truy vấn trong thư mục `db/query/`:
```bash
make sqlc
# Hoặc: sqlc generate
```

### 3. Biên dịch Binary
Biên dịch ứng dụng thành file nhị phân độc lập siêu gọn:
```bash
make build
```
File thực thi đầu ra được lưu tại: `bin/tientonaudio`.

Chạy trực tiếp binary đã build:
```bash
./bin/tientonaudio
```

---

## 📄 Bản quyền (License)
Dự án được phân phối dưới giấy phép [MIT License](LICENSE).
Tác giả & Đội ngũ phát triển TienTonAudio © 2026.


## Cập nhật bảo mật và tích hợp

- Backend yêu cầu Go 1.26.5 theo `backend/go.mod`.
- Đăng nhập mạng xã hội đang tạm dừng cho đến khi có xác minh OAuth phía server. Dùng email/mật khẩu và 2FA hiện có.
- API ghi nội dung chung chỉ dành cho admin. Đối tác sử dụng `/api/v1/partner/...`, nơi quyền sở hữu được kiểm tra.
- `/payments/{id}/confirm-auto` trả HTTP 410. Client chỉ được kiểm tra trạng thái đơn của chính mình.
- Adapter thanh toán tin cậy gửi webhook đã đối soát với `payment_id`, `transaction_id`, `status` (`completed` hoặc `failed`) và `amount` là số nguyên VND. Webhook cần `X-Webhook-Secret` hoặc chữ ký HMAC-SHA256 qua `X-Signature`. Payload ngân hàng chưa có adapter sẽ trả HTTP 422. Không cấu hình secret sẽ trả HTTP 503.
- Với `ENVIRONMENT=production`, phải đặt `JWT_SECRET_KEY` và `PAYMENT_WEBHOOK_SECRET` riêng, ít nhất 32 ký tự, không dùng giá trị mẫu.
- Text và audio trong storage local không được phục vụ công khai. Audio local dùng link có chữ ký; R2 dùng presigned GET URL. Bucket chứa text/audio phải tắt truy cập công khai (`r2.dev` và domain công khai); mã nguồn không thể thu hồi URL đã công khai trên Cloudflare. Khi chuyển bucket sang private, cần phục vụ ảnh bìa/avatar qua bucket công khai riêng hoặc proxy chỉ cho phép các thư mục ảnh.
- Docker web dùng `API_INTERNAL_ORIGIN=http://backend:8080` cho gọi API từ server. `NEXT_PUBLIC_API_URL` là URL API mà trình duyệt truy cập được và phải đặt khi build image.

- Web: `cd web && npm test && npm run lint && npm run build` kiểm tra API client, TypeScript và build. Refresh token được xoay một lần cho các request đồng thời; lỗi kết nối tạm thời không xóa phiên. QR 2FA được tạo trong trình duyệt, không gửi secret tới dịch vụ QR bên ngoài.
- Rate limiter dùng bộ đếm nguyên tử với thời hạn cố định. `TRUSTED_PROXY_CIDRS` phải chỉ chứa IP/CIDR của proxy thực tế; mặc định bỏ qua header IP do client tự gửi.

- Web sử dụng Next.js 16.3.8. Sau cập nhật, `npm audit --omit=dev` không báo lỗ hổng; audit đầy đủ còn 5 cảnh báo trong chuỗi ESLint → fast-glob → micromatch → braces. `braces` chưa có bản vá theo https://github.com/advisories/GHSA-vfj7-8cjw-p6xm; không dùng `npm audit fix --force` để hạ eslint-config-next về nhánh 14.x.
