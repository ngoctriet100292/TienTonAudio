#!/usr/bin/env python3
"""
Tiên Tôn Audio - Bulk Chapter Importer
Công cụ tự động quét thư mục truyện chữ và nạp hàng loạt (Bulk Import) vào hệ thống.

Cách dùng:
    python3 scripts/import_chapters.py --folder "/duong/dan/thu/muc" --story-id "<UUID_TRUYEN>" --token "<JWT_TOKEN>"
"""

import os
import re
import sys
import json
import argparse
import urllib.request
import urllib.error

def parse_filename(filename):
    """
    Trích xuất số chương từ tên file:
    Ví dụ: '1_viet.txt' -> 1.0, '2_viet.txt' -> 2.0, 'chuong_10.5.txt' -> 10.5
    """
    # Khớp các mẫu dạng 1_viet.txt, chuong_1.txt, 1.txt, v.v.
    match = re.search(r'(\d+(?:\.\d+)?)', filename)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            return None
    return None

def read_chapter_file(file_path, chapter_num):
    """
    Đọc nội dung file text, trích xuất Tiêu Đề và Nội Dung chương.
    """
    for encoding in ['utf-8-sig', 'utf-8', 'utf-16', 'latin-1']:
        try:
            with open(file_path, 'r', encoding=encoding) as f:
                raw_text = f.read().strip()
                break
        except UnicodeDecodeError:
            continue
    else:
        print(f"⚠️  Không thể đọc file (lỗi encoding): {file_path}")
        return None, None

    if not raw_text:
        return None, None

    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    if not lines:
        return None, None

    first_line = lines[0]
    # Nếu dòng đầu tiên có chữ "Chương" hoặc "Hồi" hoặc ngắn (< 80 ký tự), dùng làm tiêu đề
    if re.search(r'^(chương|chuong|hồi|hoi|tập|tap)\s*\d+', first_line, re.IGNORECASE) or len(first_line) < 60:
        title = first_line
        content = "\n\n".join(lines[1:]) if len(lines) > 1 else raw_text
    else:
        int_num = int(chapter_num) if chapter_num.is_integer() else chapter_num
        title = f"Chương {int_num}"
        content = raw_text

    return title, content

def main():
    parser = argparse.ArgumentParser(description="Tự động nạp hàng trăm chương truyện chữ vào Tiên Tôn Audio")
    parser.add_argument("--folder", required=True, help="Đường dẫn đến thư mục chứa các file .txt")
    parser.add_argument("--story-id", required=True, help="UUID của truyện trong hệ thống")
    parser.add_argument("--api-url", default="http://localhost:8080/api/v1", help="Địa chỉ API backend (mặc định: http://localhost:8080/api/v1)")
    parser.add_argument("--token", default="", help="JWT Access Token của tài khoản Admin/Đăng truyện (nếu có)")
    parser.add_argument("--batch-size", type=int, default=50, help="Số chương nạp mỗi đợt request (mặc định: 50)")
    parser.add_argument("--dry-run", action="store_true", help="Chạy thử nghiệm kiểm tra file, không gửi lên server")

    args = parser.parse_args()

    if not os.path.isdir(args.folder):
        print(f"❌ Lỗi: Thư mục '{args.folder}' không tồn tại!")
        sys.exit(1)

    print(f"🔍 Đang quét thư mục: {args.folder} ...")
    files = [f for f in os.listdir(args.folder) if f.lower().endswith('.txt')]

    if not files:
        print(f"❌ Không tìm thấy file .txt nào trong thư mục '{args.folder}'!")
        sys.exit(1)

    # Ghép cặp (chapter_number, filename)
    parsed_files = []
    for f in files:
        num = parse_filename(f)
        if num is not None:
            parsed_files.append((num, f))
        else:
            print(f"⚠️  Bỏ qua file không nhận diện được số chương: {f}")

    # Sắp xếp tự nhiên theo số thứ tự chương (1, 2, 3... thay vì xếp chữ cái)
    parsed_files.sort(key=lambda x: x[0])

    total_chapters = len(parsed_files)
    print(f"✅ Tìm thấy {total_chapters} chương hợp lệ (từ chương {parsed_files[0][0]} đến chương {parsed_files[-1][0]}).")

    if args.dry_run:
        print("\n--- [DRY RUN: XEM TRƯỚC 5 CHƯƠNG ĐẦU TIÊN] ---")
        for num, fname in parsed_files[:5]:
            fpath = os.path.join(args.folder, fname)
            title, content = read_chapter_file(fpath, num)
            preview = (content[:120] + '...') if len(content) > 120 else content
            print(f"📘 Chương {num} | File: {fname} | Tiêu đề: '{title}'")
            print(f"   Trích đoạn: {preview}\n")
        print(f"💡 Dry-run hoàn tất! Bỏ cờ --dry-run để nạp chính thức lên server.")
        return

    # Chuẩn bị nạp theo từng Batch
    endpoint = f"{args.api_url.rstrip('/')}/chapters/bulk"
    headers = {"Content-Type": "application/json"}
    if args.token:
        headers["Authorization"] = f"Bearer {args.token}"

    total_success = 0
    total_failed = 0

    print(f"\n🚀 Bắt đầu nạp {total_chapters} chương vào truyện ID: {args.story_id} (Mỗi đợt: {args.batch_size} chương)...")

    for i in range(0, total_chapters, args.batch_size):
        batch = parsed_files[i : i + args.batch_size]
        chapters_payload = []

        for num, fname in batch:
            fpath = os.path.join(args.folder, fname)
            title, content = read_chapter_file(fpath, num)
            if not title or not content:
                continue

            chapters_payload.append({
                "story_id": args.story_id,
                "chapter_number": num,
                "title": title,
                "content": content,
                "duration_seconds": 0,
                "is_premium": False,
            })

        if not chapters_payload:
            continue

        body = json.dumps({
            "story_id": args.story_id,
            "chapters": chapters_payload
        }).encode('utf-8')

        req = urllib.request.Request(endpoint, data=body, headers=headers, method="POST")

        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                resp_json = json.loads(resp.read().decode('utf-8'))
                data = resp_json.get('data', {})
                succ = data.get('success_count', len(chapters_payload))
                fail = data.get('failed_count', 0)
                total_success += succ
                total_failed += fail

                # Hiển thị tiến trình
                done = min(i + len(batch), total_chapters)
                percent = (done / total_chapters) * 100
                bar_len = 30
                filled = int(bar_len * done // total_chapters)
                bar = '█' * filled + '-' * (bar_len - filled)
                print(f"\r[{bar}] {percent:5.1f}% | Đã nạp {done}/{total_chapters} chương...", end="", flush=True)

        except urllib.error.HTTPError as e:
            err_msg = e.read().decode('utf-8', errors='ignore')
            print(f"\n❌ Lỗi HTTP {e.code} ở đợt nạp từ {i+1} đến {i+len(batch)}: {err_msg}")
            total_failed += len(chapters_payload)
        except Exception as e:
            print(f"\n❌ Lỗi kết nối ở đợt nạp: {e}")
            total_failed += len(chapters_payload)

    print("\n\n" + "="*50)
    print(f"🎉 HOÀN TẤT NẠP TRUYỆN CHỮ!")
    print(f"   - Thành công: {total_success} chương")
    if total_failed > 0:
        print(f"   - Thất bại:   {total_failed} chương")
    print("="*50)

if __name__ == "__main__":
    main()
