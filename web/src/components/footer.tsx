import React from 'react';
import Link from 'next/link';
import { Headphones, ShieldCheck, Sparkles, Heart, Flame, PenTool } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#070a11] text-slate-400 text-xs mt-24">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Cột giới thiệu */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#ffd166] to-[#ffb703]">
                <Headphones className="h-4 w-4 text-black" />
              </div>
              <span className="text-base font-black text-white">TIÊN TÔN AUDIO</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Trang nghe truyện audio và đọc tiểu thuyết tiên hiệp, huyền huyễn, kiếm hiệp chuẩn âm thanh 320kbps với trợ lý AI Đạo Hữu.
            </p>
          </div>

          {/* Cột Thể Loại SEO */}
          <div>
            <h3 className="font-bold text-white uppercase tracking-wider mb-3 text-sm">Thể Loại Hot</h3>
            <ul className="space-y-2">
              <li><Link href="/categories/tien-hiep" className="hover:text-[#ffb703]">Truyện Tiên Hiệp</Link></li>
              <li><Link href="/categories/huyen-huyen" className="hover:text-[#ffb703]">Truyện Huyền Huyễn</Link></li>
              <li><Link href="/categories/trung-sinh" className="hover:text-[#ffb703]">Truyện Trùng Sinh</Link></li>
              <li><Link href="/categories/kiem-hiep" className="hover:text-[#ffb703]">Truyện Kiếm Hiệp</Link></li>
              <li><Link href="/categories/do-thi" className="hover:text-[#ffb703]">Truyện Đô Thị</Link></li>
            </ul>
          </div>

          {/* Cột Tác Phẩm Kinh Điển */}
          <div>
            <h3 className="font-bold text-white uppercase tracking-wider mb-3 text-sm">Bảng Vàng Audio</h3>
            <ul className="space-y-2">
              <li><Link href="/stories/pham-nhan-tu-tien" className="hover:text-[#ffb703]">Phàm Nhân Tu Tiên Audio</Link></li>
              <li><Link href="/stories/vo-luyen-dinh-phong" className="hover:text-[#ffb703]">Võ Luyện Đỉnh Phong Audio</Link></li>
              <li><Link href="/stories/tien-nghich" className="hover:text-[#ffb703]">Tiên Nghịch Audio</Link></li>
              <li><Link href="/stories/dau-pha-thuong-khung" className="hover:text-[#ffb703]">Đấu Phá Thương Khung</Link></li>
            </ul>
          </div>

          {/* Cột Bản Quyền & Điều Khoản */}
          <div>
            <h3 className="font-bold text-white uppercase tracking-wider mb-3 text-sm">Dịch Vụ & Pháp Lý</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Chính sách bản quyền DMCA</li>
              <li className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-amber-400" /> <Link href="/vip" className="hover:text-[#ffb703]">Gói Hội Viên VIP Tiên Tôn</Link></li>
              <li className="flex items-center gap-1.5"><PenTool className="w-3.5 h-3.5 text-amber-400" /> <Link href="/studio" className="hover:text-[#ffb703]">Kênh Đối Tác Sáng Tác</Link></li>
              <li className="flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-amber-400" /> <Link href="/cultivation" className="hover:text-[#ffb703]">17 Cảnh Giới Tu Tiên</Link></li>
              <li><Link href="/terms" className="hover:text-[#ffb703]">Điều khoản dịch vụ</Link></li>
              <li><Link href="/contact" className="hover:text-[#ffb703]">Liên hệ quảng cáo / hợp tác</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between text-slate-500">
          <p>© {new Date().getFullYear()} TienTonAudio. Bản quyền thuộc về Đạo Hữu IREAKING.</p>
          <p className="flex items-center gap-1 mt-2 sm:mt-0">
            Được xây dựng với <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> cho cộng đồng Tiên Hiệp.
          </p>
        </div>
      </div>
    </footer>
  );
}
