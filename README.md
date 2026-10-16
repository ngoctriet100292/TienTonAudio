# Tiên Tôn Audio

Nền tảng nghe truyện audio và đọc truyện chữ, gồm API Go, web Next.js và ứng dụng Flutter. Hướng phát triển hiện tại tập trung vào **backend và web**; mobile được giữ trong repository để phát triển sau.

Web dùng giao diện tối với màu vàng chủ đạo, font Be Vietnam Pro/Lora, hiệu ứng chuyển trang và bố cục thích ứng với điện thoại.

## Mục lục

- [Tính năng](#tính-năng)
- [Công nghệ và cấu trúc](#công-nghệ-và-cấu-trúc)
- [Chạy ở máy cá nhân](#chạy-ở-máy-cá-nhân)
- [Cấu hình dịch vụ](#cấu-hình-dịch-vụ)
- [Dữ liệu và migration](#dữ-liệu-và-migration)
- [Các khu vực trên web](#các-khu-vực-trên-web)
- [API](#api)
- [Kiểm thử và build](#kiểm-thử-và-build)
- [Docker và triển khai](#docker-và-triển-khai)

## Tính năng

### Người nghe

- Tìm truyện theo tên/tác giả, trạng thái, giọng đọc, số chương và thời lượng tối thiểu; sắp xếp theo lượt xem, đánh giá hoặc số chương.
- Đọc nội dung chữ, nghe audio, thay đổi tốc độ, hẹn giờ dừng và chuyển chương.
- Đồng bộ tiến độ theo tài khoản để tiếp tục nghe trên thiết bị khác; khách có phiên nghe lưu trên thiết bị.
- Quản lý thư viện, danh sách phát và truyện yêu thích; theo dõi truyện, tác giả và giọng đọc.
- Nhận thông báo trong ứng dụng khi truyện đang theo dõi có chương mới được xuất bản.
- Bình luận, trả lời, thả biểu cảm và đánh giá truyện từ 1 đến 5 sao.
- Tích lũy EXP, lên cảnh giới, hoàn thành nhiệm vụ và nhận thưởng thành tựu.
- Gửi yêu cầu hỗ trợ, đính kèm đơn thanh toán của mình và trao đổi với quản trị.
- Trang trợ lý AI khi đã cấu hình nhà cung cấp và API key.

### Tài khoản

- Đăng ký, đăng nhập, xác thực email và đặt lại mật khẩu qua SMTP.
- Web dùng cookie HttpOnly; production bật Secure và tiền tố `__Host-`, kèm kiểm tra Origin/CSRF cho thao tác ghi. Access/refresh token không được lưu trong localStorage hoặc trả về JSON cho trình duyệt.
- Xoay vòng refresh token trong giao dịch: lưu token mới thất bại sẽ hoàn tác việc thu hồi token cũ. Các tab web phối hợp bằng Web Locks; đăng xuất được xếp sau yêu cầu làm mới phiên đang chạy.
- API cho ứng dụng native tiếp tục hỗ trợ Bearer token. TOTP và mã dự phòng vẫn dùng cho bước xác thực thứ hai.
- Đăng nhập Google/Facebook/Apple qua Goth; nhà cung cấp chưa cấu hình được vô hiệu hóa trên web.
- Liên kết OAuth vào tài khoản đang đăng nhập có email đã xác thực. Email trùng không tự gộp tài khoản; không cho gỡ phương thức đăng nhập cuối cùng khi chưa có cách thay thế.

### Studio và quản trị

- Đối tác tạo truyện, chương và gắn audio; nội dung mới ở trạng thái nháp.
- Nhập tối đa 500 chương nháp/lần từ tệp JSON, tối đa 8 MB. Lỗi hoặc trùng số chương sẽ hủy toàn bộ lần nhập.
- Biên tập chương nháp, xem trước nội dung chữ, tự lưu sau 1,2 giây ngừng nhập và lưu ngay. Phiên bản bản thảo ngăn ghi đè từ tab khác; khi xung đột, bản đang soạn được giữ và có thể tải về.
- Quản trị ghi lý do khi trả bài về nháp; tác giả nhận thông báo trong ứng dụng về kết quả duyệt.
- Gửi duyệt, xem bản thảo, xuất bản hoặc lên lịch. Chỉ quản trị được duyệt và đặt lịch; lịch được kiểm tra mỗi phút khi API chạy.
- Thống kê theo tác phẩm: lượt xem, số tài khoản nghe, lượt hoàn tất, phút nghe hợp lệ và chương được nghe nhiều.
- Quản trị người dùng, báo cáo, yêu cầu hỗ trợ, danh sách cảnh giới và gói hội viên.
- Danh mục cảnh giới có kiểm tra phiên bản để tránh ghi đè chỉnh sửa của người khác; thay đổi ngưỡng giữ nguyên EXP của người dùng.

### VIP và thanh toán

- Gói mặc định: **Kết Đan (30 ngày)** — 49.000đ; **Nguyên Anh (90 ngày)** — 129.000đ; **Tiên Vương (365 ngày)** — 449.000đ.
- Hội viên được truy cập chương VIP khi gói còn hạn, EXP nghe x2 và thưởng 50 EXP/ngày của gói khi thanh toán được xác nhận.
- Tên, giá và thời hạn đơn được giữ theo lúc tạo đơn; sửa hoặc ngừng bán gói không thay đổi điều kiện của đơn đã có.
- Checkout hiện hỗ trợ tạo thông tin chuyển khoản VietQR và tiếp nhận webhook từ adapter đối soát tin cậy. **Checkout mặc định tắt**; chưa có tích hợp hoàn chỉnh MoMo/VNPay/ZaloPay/Stripe.

## Công nghệ và cấu trúc

| Thành phần | Công nghệ |
| --- | --- |
| Backend | Go **1.26.5**, Chi, pgx, sqlc |
| Web | Next.js **16.3.8**, React **19.2.8**, TypeScript, Tailwind CSS 4 |
| Dữ liệu | PostgreSQL; Neon là lựa chọn DB cho môi trường triển khai |
| Cache | Redis; có bộ nhớ đệm trong tiến trình khi Redis không khả dụng |
| File | Cloudflare R2 qua API tương thích S3; lưu local phục vụ phát triển |
| Xác thực | JWT, TOTP, Goth, SMTP |
| Đóng gói và CI | Docker Compose, GitHub Actions |
| Mobile | Flutter; xem [mobile/README.md](mobile/README.md) |

```text
TienTonAudio/
├── backend/
│   ├── cmd/                 # server, migrate, seed, check_services, upload_to_r2
│   ├── config/              # Đọc cấu hình app.env và biến môi trường
│   ├── db/
│   │   ├── migrations/      # Schema và SQL cập nhật dữ liệu/cấu trúc
│   │   ├── query/           # Truy vấn nguồn cho sqlc
│   │   └── sqlc/            # Mã Go được sinh từ SQL
│   ├── internal/            # domain, handler, middleware, repository, service, router
│   ├── pkg/                 # auth, oauth, email, storage, cache, ...
│   └── app.env.example
├── web/
│   ├── src/app/             # Trang web theo App Router
│   ├── src/components/      # Thành phần giao diện
│   ├── src/context/         # Phiên đăng nhập, audio và danh mục cảnh giới
│   ├── src/lib/             # API client và tiện ích
│   └── tests/               # Kiểm thử web
├── mobile/                  # Ứng dụng Flutter
├── scripts/                 # Công cụ hỗ trợ danh mục
├── .github/workflows/ci.yml
├── docker-compose.yml
└── Makefile
```

## Chạy ở máy cá nhân

### 1. Chuẩn bị

Cài Go theo `backend/go.mod`, Node.js **22** và npm. Dùng Docker Compose nếu muốn chạy PostgreSQL/Redis local; dùng Neon thì không cần PostgreSQL local.

```bash
git clone https://github.com/ngoctriet100292/TienTonAudio.git
cd TienTonAudio
cp backend/app.env.example backend/app.env
```

Sửa `backend/app.env`, ít nhất là `DATABASE_URL` và `JWT_SECRET_KEY`. File cấu hình backend nằm tại **`backend/app.env`** khi chạy lệnh trong thư mục backend. Biến môi trường của tiến trình có ưu tiên cao hơn file.

Nếu dùng dịch vụ local:

```bash
docker compose up -d postgres redis
```

Thiết lập tương ứng trong `backend/app.env`:

```dotenv
DATABASE_URL=postgresql://postgres:password@localhost:5432/tientonaudio?sslmode=disable
REDIS_URL=redis://localhost:6379/0
APP_BASE_URL=http://localhost:3000
OAUTH_PUBLIC_URL=http://localhost:8080
CORS_ALLOWED_ORIGINS=http://localhost:3000
PAYMENT_CHECKOUT_ENABLED=false
```

### 2. Chạy API

```bash
cd backend
go mod download
go run ./cmd/migrate
go run ./cmd/server
```

API tự áp dụng schema khi khởi động. Migration tạo cấu trúc và danh mục mặc định; không tự nhập kho truyện/audio thật.

### 3. Chạy web

Mở terminal khác tại thư mục dự án:

```bash
cd web
npm ci
npm run dev
```

Web mặc định gọi `http://localhost:8080/api/v1`. Khi cần thay đổi, tạo `web/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
API_INTERNAL_ORIGIN=http://localhost:8080
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`NEXT_PUBLIC_API_URL` là địa chỉ trình duyệt truy cập. `API_INTERNAL_ORIGIN` dành cho Next.js phía máy chủ, không gồm `/api/v1`. `NEXT_PUBLIC_*` được đưa vào mã phía trình duyệt khi build; không đặt secret trong nhóm biến này.

| Dịch vụ | Địa chỉ mặc định |
| --- | --- |
| Web | http://localhost:3000 |
| API | http://localhost:8080/api/v1 |
| Swagger UI | http://localhost:8080/swagger/index.html |
| Liveness | http://localhost:8080/health |
| Readiness | http://localhost:8080/readyz |

## Cấu hình dịch vụ

Toàn bộ mẫu cấu hình nằm trong [backend/app.env.example](backend/app.env.example). Giữ thông tin thật trong file được Git bỏ qua hoặc secret của môi trường triển khai.

### PostgreSQL / Neon

Đặt `DATABASE_URL` bằng connection string của Neon, giữ cấu hình TLS trong URL. Backend hỗ trợ kết nối qua pooler và tắt prepared statement cache để tương thích transaction pooling. Điều chỉnh `DB_MAX_CONNS`/`DB_MIN_CONNS` theo giới hạn kết nối của môi trường.

Kiểm tra kết nối và schema mà không chạy migration:

```bash
cd backend
go run ./cmd/migrate -check
```

### Redis

`REDIS_URL` phải có scheme, ví dụ `redis://localhost:6379/0` hoặc `rediss://...` khi dùng TLS. Khi Redis lỗi, API chuyển sang cache trong tiến trình; cache này không dùng chung giữa nhiều instance. Dữ liệu tiến độ và thưởng nghe vẫn được lưu trong PostgreSQL.

### Kiểm tra cấu hình và kết nối

```bash
cd backend
# Chỉ kiểm tra cấu hình, không kết nối dịch vụ
go run ./cmd/check_services
# Ping PostgreSQL/Redis, kiểm tra SMTP và HEAD bucket R2
go run ./cmd/check_services -network
```

Lệnh không in credential, không gửi email và không ghi dữ liệu. HEAD bucket chỉ xác nhận khả năng kết nối/quyền truy cập; không chứng minh bucket đã private hoặc audio phát được.

### Cloudflare R2

Cấu hình `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_ACCESS_KEY_SECRET`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`.

Audio/text cần nằm trong bucket private. API kiểm tra quyền và cung cấp URL phát có thời hạn; một URL công khai đã tồn tại ở R2 không thể được bảo vệ chỉ bằng kiểm tra quyền ở API. Ảnh bìa/avatar cần đường phục vụ công khai phù hợp, như bucket ảnh riêng hoặc proxy chỉ cho phép đường dẫn ảnh.

Khi dùng local, chỉ ảnh bìa/avatar được phục vụ công khai qua storage; text và audio đi qua API có kiểm soát quyền. Có công cụ `backend/cmd/upload_to_r2`; xem các tùy chọn bằng `go run ./cmd/upload_to_r2 -help` trước khi chuyển dữ liệu. Công cụ này có thể cập nhật DB và dọn nội dung text sau upload.

### Gmail / SMTP

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-account@gmail.com
SMTP_PASSWORD=your-gmail-app-password
SMTP_FROM_EMAIL=your-account@gmail.com
APP_BASE_URL=http://localhost:3000
```

Dùng mật khẩu ứng dụng Gmail với tài khoản đã bật xác minh hai bước. Hỗ trợ STARTTLS và TLS trực tiếp cổng 465. Email chưa cấu hình hoặc gửi lỗi sẽ được báo lỗi; không có chế độ giả lập báo gửi thành công hay ghi token vào log.

Kiểm tra kết nối và đăng nhập SMTP, không gửi thư:

```bash
cd backend
go run ./cmd/check_email
```

Link xác thực dẫn tới trang `/verify-email`; người dùng nhấn xác nhận. Token có hạn 24 giờ, lưu dạng băm và chỉ dùng một lần.

### Google, Facebook, Apple qua Goth

Đặt `APP_BASE_URL` là URL web và `OAUTH_PUBLIC_URL` là origin backend công khai. Production dùng HTTPS và khai báo đúng origin web trong `CORS_ALLOWED_ORIGINS`.

| Nhà cung cấp | Biến môi trường | Callback đăng ký với nhà cung cấp |
| --- | --- | --- |
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `{OAUTH_PUBLIC_URL}/api/v1/auth/oauth/google/callback` |
| Facebook | `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET` | `{OAUTH_PUBLIC_URL}/api/v1/auth/oauth/facebook/callback` |
| Apple | `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY_FILE` | `{OAUTH_PUBLIC_URL}/api/v1/auth/oauth/apple/callback` |

Apple dùng Services ID và khóa `.p8`; cần domain HTTPS thực để thử callback. Khóa chỉ nằm ở backend, ngoài repository. Facebook cần quyền email và cấu hình ứng dụng phù hợp với người dùng được phép đăng nhập.

Phiên OAuth dùng state/cookie gắn trình duyệt, có hạn và dùng một lần. Phiên ứng dụng được tạo qua POST exchange, không đặt JWT trên URL. Google/Apple chỉ xác thực email khi provider xác nhận; tài khoản Facebook mới phải xác thực email bằng thư của ứng dụng. Tài khoản bật 2FA vẫn phải hoàn tất bước xác thực thứ hai.

### Phiên đăng nhập web

`SESSION_COOKIE_SAME_SITE=lax` dành cho web/API cùng site. Nếu triển khai ở hai site khác nhau, dùng `none` và HTTPS; cần tính tới chính sách cookie bên thứ ba của trình duyệt. Ưu tiên domain web/API cùng site.

Web gửi `credentials: include`. Trước thao tác ghi, client lấy token bằng `GET /api/v1/auth/csrf`, sau đó gửi `X-CSRF-Token` cùng `X-Session-Mode: cookie`. Backend kiểm tra Origin và cookie CSRF. Với request cùng origin không có Origin, backend kiểm tra metadata `Sec-Fetch-Site` và origin API đã cấu hình. Phản hồi gắn phiên có `Cache-Control: private, no-store` hoặc `no-store`.

Login, 2FA và OAuth exchange trả `cookie_session: true` khi tạo phiên web; JWT được đặt bằng Set-Cookie. Phiên localStorage của phiên bản web cũ bị xóa khi cập nhật và người dùng cần đăng nhập lại. Ứng dụng native không gửi header browser vẫn nhận cặp token theo hợp đồng Bearer hiện có.

### Thanh toán

Chỉ bật `PAYMENT_CHECKOUT_ENABLED=true` sau khi có adapter đối soát và đã cấu hình:

- `PAYMENT_BANK_CODE`, `PAYMENT_BANK_NAME`, `PAYMENT_BANK_ACCOUNT`, `PAYMENT_ACCOUNT_NAME`.
- `PAYMENT_WEBHOOK_SECRET` riêng, tối thiểu 32 ký tự.

Adapter gửi `payment_id`, `transaction_id`, `status` (`completed` hoặc `failed`) và `amount` là số nguyên VND. API xác minh `X-Webhook-Secret` hoặc HMAC-SHA256 qua `X-Signature`, đối chiếu số tiền và chống xử lý lặp. Mã chuyển khoản là `TT ` cộng UUID đơn dạng 32 ký tự hex viết hoa.

Web đọc `checkout_available` từ API. Chưa sẵn sàng thanh toán thì bảng giá vẫn hiển thị và nút mua bị tắt. Client không có quyền tự xác nhận đơn; endpoint `confirm-auto` cũ trả HTTP 410.

### Trợ lý AI

Cấu hình `AI_PROVIDER`, `AI_API_KEY` và `AI_MODEL_NAME` ở backend theo nhà cung cấp đang sử dụng. Trang `/ai` gọi API của ứng dụng; API key chỉ được giữ ở máy chủ.

## Dữ liệu và migration

PostgreSQL lưu người dùng, truyện/chương, tiến độ nghe, theo dõi, đánh giá, cảnh giới, gói hội viên, đơn thanh toán, hỗ trợ và phần thưởng. R2 lưu file. Local storage của trình duyệt lưu phiên nghe theo tài khoản và dấu hiệu thay đổi phiên không nhạy cảm. Thông tin xác thực web nằm trong cookie HttpOnly.

### Schema

```bash
cd backend
# Áp dụng schema và seed danh mục mặc định
go run ./cmd/migrate

# Áp dụng riêng phần cấu trúc/chức năng nền tảng mới
go run ./cmd/migrate -file db/migrations/20261016_platform_features.sql
go run ./cmd/migrate -file db/migrations/20261016_sessions_editor.sql
```

Các file SQL trong `db/migrations/` được áp dụng bằng công cụ Go của dự án; không phải toàn bộ đều theo quy ước cặp `up/down` của golang-migrate. Xem nội dung từng migration trước khi chạy: một số file cập nhật tên gói hoặc ngưỡng cảnh giới theo phiên bản, trong khi schema khởi tạo giữ chỉnh sửa đã có của danh mục.

### Cảnh giới và EXP

- Danh sách mặc định có **34 cảnh giới**, chia thành Võ Đạo, Tu Tiên và Tiên Giới; các tầng võ giả đứng trước Luyện Khí. Tiên Quân–Tiên Đế thuộc Tiên Giới.
- Danh mục thực tế nằm trong `cultivation_realms`; JSON trong mã nguồn dùng làm dữ liệu khởi tạo. API nạp danh mục từ DB và làm mới định kỳ.
- Cảnh giới tính theo EXP. Tên gói VIP không tự đặt cảnh giới của tài khoản.
- Thành tựu: nghe 15 phút/ngày (+15 EXP), một giờ (+50), mười giờ (+200), bảy ngày có nghe (+300). Ngày tính theo `Asia/Ho_Chi_Minh`; bảy ngày không bắt buộc liên tiếp.
- Phút nghe hợp lệ dựa trên các lần thưởng nghe được máy chủ ghi nhận từ lúc triển khai tính năng. Mỗi mốc chỉ nhận thưởng một lần theo kỳ; vị trí do client gửi không trực tiếp cấp thành tựu.

### Nhập nội dung

Tạo tác phẩm trong Studio, nhập chương nháp, gắn audio rồi gửi duyệt. Ví dụ tệp JSON cho nhập hàng loạt:

```json
[
  {
    "chapter_number": 1,
    "title": "Khởi đầu",
    "content": "Nội dung chương…",
    "is_premium": false
  }
]
```

Chương chưa xuất bản được ẩn khỏi API công khai và luồng phát. Đối tác sửa truyện hoặc thay audio sẽ đưa nội dung về nháp để duyệt lại. Chương cũ không được gửi thông báo hồi tố khi áp dụng migration.

`cmd/seed` là công cụ nhập dữ liệu có thao tác DB/R2, không phải điều kiện bắt buộc để khởi động ứng dụng. Đọc mã và chọn đúng môi trường trước khi chạy.

## Các khu vực trên web

| Đường dẫn | Chức năng / quyền |
| --- | --- |
| `/`, `/search`, `/categories`, `/rankings` | Khám phá và tìm truyện |
| `/stories/[slug]` | Chi tiết truyện, theo dõi, đánh giá, danh sách chương |
| `/stories/[slug]/chapters/[chapterId]` | Đọc/nghe chương đã xuất bản |
| `/account` | Nghe tiếp, truyện theo dõi, thành tựu, liên kết OAuth |
| `/library`, `/settings` | Thư viện và cài đặt tài khoản |
| `/support` | Yêu cầu hỗ trợ của tài khoản; tối đa 5 yêu cầu mới/24 giờ |
| `/vip` | Gói hội viên và trạng thái checkout |
| `/cultivation` | Danh mục cảnh giới từ DB |
| `/studio` | Quản lý truyện và audio của đối tác |
| `/studio/publications` | Soạn nháp, tự lưu, xem trước, nhập nhiều chương và gửi duyệt |
| `/studio/analytics` | Thống kê tác phẩm của mình; admin xem được toàn bộ |
| `/admin` | Quản trị người dùng, báo cáo và thống kê |
| `/admin/catalogue` | Quản trị cảnh giới và gói hội viên |
| `/admin/moderation` | Duyệt nội dung, trả về nháp và lên lịch |
| `/admin/support` | Phản hồi, đóng/mở yêu cầu hỗ trợ |
| `/about`, `/policies`, `/privacy`, `/terms`, `/copyright`, `/contact` | Trang giới thiệu và thông tin |

Các khu vực riêng được kiểm tra quyền ở backend. Studio dành cho `partner`, `creator`, `narrator`, `admin`; đối tác chỉ quản lý tác phẩm thuộc mình. Yêu cầu hỗ trợ và đơn thanh toán được kiểm tra quyền sở hữu.

### Phân trang

Tìm kiếm, đánh giá, truyện theo dõi, tác phẩm Studio, chương Studio, thống kê và hỗ trợ nhận `page` (từ 1), `limit` (1–100, mặc định 20). Kết quả có dạng:

```json
{"items": [], "total": 0, "page": 1, "limit": 20, "total_pages": 1}
```

Số lượng và dữ liệu trang được đọc trong cùng một snapshot SQL. Đổi bộ lọc trên web đưa về trang đầu. Tin nhắn hỗ trợ hiển thị tin mới nhất ở trang 1; chọn trang sau để đọc tin cũ hơn.

## API

API có tiền tố `/api/v1`. Swagger UI tại `/swagger/index.html`; định nghĩa route thực tế nằm trong [backend/internal/router/router.go](backend/internal/router/router.go). Swagger hiện có thể chưa liệt kê đủ các endpoint nền tảng mới.

| Nhóm | Endpoint tiêu biểu |
| --- | --- |
| Tài khoản | `/auth/register`, `/auth/login`, `/auth/verify-email`, `/auth/refresh`, `/auth/logout` |
| OAuth | `/auth/oauth/providers`, `/auth/oauth/{provider}`, `/auth/oauth/{provider}/callback`, `/auth/oauth/exchange` |
| Liên kết OAuth | `POST /auth/oauth/{provider}/link`, `GET /users/oauth/accounts`, `DELETE /users/oauth/{provider}` |
| Danh mục | `/stories`, `/stories/{slug}`, `/catalogue/search`, `/cultivation/realms` |
| CSRF | `GET /auth/csrf` |
| Audio | `/chapters/{id}`, `/chapters/{id}/stream`, `POST /chapters/progress` |
| Nghe tiếp | `/users/continue-listening`, `/users/chapters/{id}/progress` |
| Theo dõi / đánh giá | `/stories/{id}/follow`, `/stories/{id}/reviews` |
| Thành tựu | `/users/achievements`, `POST /users/achievements/{key}/claim` |
| Hỗ trợ | `/support/tickets`, `/support/tickets/{id}/messages` |
| Studio | `/partner/publications`, `/partner/analytics`, `/partner/stories/{id}/bulk-drafts` |
| Biên tập nháp | `GET/PUT /partner/chapters/{id}/draft` (PUT cần `version`) |
| Chương Studio | `GET /partner/stories/{id}/publication-chapters` |
| Duyệt xuất bản | `PUT /partner/stories/{id}/publication`, `PUT /partner/chapters/{id}/publication` |
| Danh mục quản trị | `/admin/cultivation/realms`, `/admin/subscription-plans` |
| Hội viên | `/payments/plans`, `/payments/create`, `/payments/webhook` |

## Kiểm thử và build

### Backend

```bash
cd backend
go test -race ./...
go vet ./...
go build -o bin/tientonaudio ./cmd/server
```

Nếu sửa truy vấn trong `db/query/`, chạy `sqlc generate` tại `backend/` và commit cả mã được sinh trong `db/sqlc/`.

Kiểm thử tích hợp Neon là tùy chọn, đọc cấu hình `backend/app.env` và dùng schema tạm được hoàn tác/dọn sau kiểm thử:

```bash
cd backend
TIENTON_NEON_INTEGRATION=1 go test ./internal/handler ./internal/repository -run TestNeon -v
```

### Web

```bash
cd web
npm ci
npm test
npm run lint
npm run build
```

Để build sitemap và dữ liệu trang đầy đủ, chạy API trước và đặt đúng `API_INTERNAL_ORIGIN`.

GitHub Actions trong [.github/workflows/ci.yml](.github/workflows/ci.yml) chạy kiểm thử race/vet backend và test/lint/build web trên push `main` hoặc pull request. CI dùng PostgreSQL/Redis tạm, không dùng Neon hay secret triển khai. Kiểm thử tích hợp Neon không được bật mặc định.

### Kiểm thử trình duyệt với dữ liệu cô lập

Bộ kiểm thử dùng API fixture trong bộ nhớ, không kết nối DB, Gmail hay R2. Chạy API trong thư mục `backend`:

```bash
go run ./internal/handler/testdata/browser
```

Trong thư mục `web`, build riêng cho API fixture và chạy cổng 3107:

```bash
API_INTERNAL_ORIGIN=http://localhost:8091 NEXT_PUBLIC_API_URL=http://localhost:8091/api/v1 npm run build
npm run start -- --port 3107
```

Mở Chrome với profile tạm riêng, chế độ headless và cổng remote debugging 9462. Ví dụ trên macOS:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --remote-debugging-address=127.0.0.1 --remote-debugging-port=9462 --user-data-dir=/tmp/tienton-cookie-browser about:blank
```

Sau đó chạy `npm run test:browser-session` trong `web`. Bộ kiểm thử kiểm tra cookie HttpOnly, CSRF, refresh/logout, phân trang, tự lưu, xung đột phiên bản, lý do trả bài và bố cục 1440/390 px; ảnh kiểm tra được ghi vào `/tmp/tienton-cookie-*.png`. Dừng các tiến trình thử nghiệm và build lại với URL API triển khai trước khi chạy bản thực tế.

## Docker và triển khai

```bash
# Từ thư mục gốc; đã tạo backend/app.env
docker compose up -d --build
```

Trong `backend/app.env`, dùng hostname `postgres`/`redis` thay cho `localhost` nếu kết nối các dịch vụ trong Compose. Có thể dùng Neon cho `DATABASE_URL` thay PostgreSQL container. Web trong Docker dùng đầu ra Next.js standalone; `API_INTERNAL_ORIGIN` mặc định là `http://backend:8080`.

Địa chỉ `NEXT_PUBLIC_API_URL` phải truy cập được từ trình duyệt và cần được đặt đúng lúc build. Compose cung cấp API nội bộ khi chạy; bước build image có thể chưa truy cập được API để tạo dữ liệu sitemap, nên cần kiểm tra sitemap sau khi triển khai.

Trước khi mở dịch vụ công khai:

- Cấu hình HTTPS, domain web/API, CORS và callback OAuth tương ứng.
- Đặt `ENVIRONMENT=production`; `JWT_SECRET_KEY` và `PAYMENT_WEBHOOK_SECRET` phải riêng biệt, tối thiểu 32 ký tự và không dùng giá trị mẫu. Backend hiện kiểm tra cả hai secret khi chạy production.
- Cấu hình SMTP, Redis dùng chung giữa các instance, quyền bucket R2 và chính sách sao lưu PostgreSQL.
- Chỉ khai báo mạng reverse proxy thực tế trong `TRUSTED_PROXY_CIDRS`.
- Bật checkout sau khi adapter đối soát đã được cấu hình và kiểm thử.
- Nhập nội dung được phép sử dụng, kiểm tra phát audio thật, phân quyền VIP và lịch xuất bản trên môi trường triển khai.

File môi trường thật, khóa Apple `.p8`, file upload, dữ liệu local và thư mục build được loại trừ khỏi Git/Docker build context theo cấu hình của từng phần dự án.
