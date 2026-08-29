import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Compass,
  Headphones,
  Sparkles,
  Flame,
  Bot,
  ShieldCheck,
  Zap,
  Users,
  Award,
  BookOpen,
  ArrowRight,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Về Chúng Tôi - Sứ Mệnh Tiên Tôn Audio | Nền Tảng Audiobook Tiên Hiệp Hàng Đầu',
  description: 'Khám phá Tiên Tôn Audio - Nền tảng nghe truyện audio và đọc truyện tiên hiệp, kiếm hiệp chuẩn âm thanh 320kbps với hệ thống 17 Cảnh Giới Tu Tiên và trợ lý AI Đạo Hữu.',
  openGraph: {
    title: 'Về Chúng Tôi - Tiên Tôn Audio',
    description: 'Nền tảng nghe truyện audio tiên hiệp kết hợp gamification tu chân và trí tuệ nhân tạo AI Đạo Hữu.',
    type: 'website',
    url: 'https://tientonaudio.com/about',
  },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-400 font-medium">
          <Link href="/" className="hover:text-[#ffd166] flex items-center gap-1">
            <Compass className="w-3.5 h-3.5" /> Trang Chủ
          </Link>
          <span>/</span>
          <span className="text-amber-400 font-bold">Về Chúng Tôi</span>
        </nav>

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-b from-[#162035]/80 via-[#0d1424]/90 to-[#070a12] p-8 sm:p-14 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-[#ffd166]" />
              Tiên Đạo Vô Nhai • Âm Vang Bất Tuyệt
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white">
              Tái Định Nghĩa Trải Nghiệm <br />
              <span className="bg-gradient-to-r from-[#ffd166] via-[#ffb703] to-amber-500 bg-clip-text text-transparent">
                Audiobook Tiên Hiệp
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
              Tiên Tôn Audio được khai mở với tâm huyết mang lại một thánh địa nghe và đọc truyện tiên hiệp, huyền huyễn, kiếm hiệp đỉnh cao, nơi từng thanh âm đều chứa đựng linh khí thiên địa.
            </p>
          </div>
        </div>

        {/* Tôn Chỉ & Sứ Mệnh */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-8 space-y-4 hover:border-amber-500/40 transition-all">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Headphones className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-white">Âm Thanh Đỉnh Cao</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tất cả các tập truyện audio đều được truyền phát với công nghệ mã hóa tiên tiến 320kbps, bảo đảm độ sắc nét của giọng đọc MC truyền cảm, không tạp âm, tùy chỉnh tốc độ phát mượt mà từ 0.5x đến 2.0x.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-8 space-y-4 hover:border-amber-500/40 transition-all">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/30">
              <Flame className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-white">17 Cảnh Giới Tu Tiên</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Hệ thống gamification tu chân độc quyền: Mỗi phút Đạo Hữu thưởng thức truyện là một khoảnh khắc kinh mạch hấp thu linh khí, từ phàm nhân Luyện Khí từng bước thăng hoa đến Tiên Đế chí tôn.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-8 space-y-4 hover:border-amber-500/40 transition-all">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-white">AI Đạo Hữu Trí Tuệ</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Trợ lý trí tuệ nhân tạo chuyên sâu về thế giới tiên hiệp, sẵn sàng đàm đạo cốt truyện, tóm tắt diễn biến, phân tích hệ thống công pháp và giải mã bí ẩn trong các tác phẩm kinh điển.
            </p>
          </div>
        </div>

        {/* Các Con Số Ấn Tượng */}
        <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#0e1626] via-[#111c33] to-[#0e1626] p-8 sm:p-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-black text-amber-400 font-mono">100.000+</p>
              <p className="text-xs text-slate-400">Giờ Audio Phát Sóng</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono">17</p>
              <p className="text-xs text-slate-400">Cảnh Giới Tu Tiên</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-black text-sky-400 font-mono">320kbps</p>
              <p className="text-xs text-slate-400">Chất Lượng Âm Thanh</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-black text-purple-400 font-mono">24/7</p>
              <p className="text-xs text-slate-400">Đàm Đạo Với AI Đạo Hữu</p>
            </div>
          </div>
        </div>

        {/* Cam Kết & Pháp Lý */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-8 sm:p-10 space-y-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <h3 className="text-2xl font-black text-white">Cam Kết Của Tiên Tôn Audio</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300 leading-relaxed">
            <p>
              Chúng tôi luôn tôn trọng bản quyền sở hữu trí tuệ của các tác giả, dịch giả và đơn vị xuất bản. Nền tảng hoạt động tuân thủ nghiêm ngặt theo chính sách DMCA và pháp luật hiện hành, sẵn sàng tiếp nhận và phản hồi nhanh chóng mọi yêu cầu từ các bên liên quan.
            </p>
            <p>
              Đồng thời, trải nghiệm của người nghe luôn là ưu tiên hàng đầu. Nền tảng cam kết duy trì tốc độ phát mượt mà, lưu trữ đám mây phân tán tốc độ cao, hỗ trợ đa nền tảng từ máy tính đến điện thoại thông minh.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-[#ffb703]/10 to-transparent p-8 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-2 text-center sm:text-left max-w-xl">
            <h3 className="text-2xl font-black text-white">Gia Nhập Cộng Đồng Đạo Hữu</h3>
            <p className="text-xs sm:text-sm text-slate-300">
              Khám phá ngay hàng ngàn bộ truyện audio đặc sắc và bắt đầu hành trình tu luyện cảnh giới của riêng bạn.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs sm:text-sm shadow-xl shadow-amber-500/25 hover:scale-105 transition-all flex items-center gap-2"
            >
              Khám Phá Truyện <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
