import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Flame, Sparkles, Compass, ArrowRight } from 'lucide-react';
import { CultivationInteractiveView } from '@/components/cultivation-view';

export const metadata: Metadata = {
  title: 'Hệ Thống 17 Cảnh Giới Tu Tiên & Bí Quyết Tăng Tu Vi | Tiên Tôn Audio',
  description: 'Tìm hiểu lộ trình 17 Cảnh Giới Tu Tiên từ Luyện Khí, Trúc Cơ, Nguyên Anh đến Tiên Đế chí tôn. Hướng dẫn tích lũy tu vi qua thời gian nghe audio và đặc quyền Hội Viên VIP.',
  keywords: [
    'cảnh giới tu tiên',
    'hệ thống tu luyện',
    'luyện khí trúc cơ nguyên anh',
    'tiên tôn audio',
    'tăng tu vi nghe truyện',
    'tiên hiệp audio',
  ],
  openGraph: {
    title: 'Hệ Thống 17 Cảnh Giới Tu Tiên | Tiên Tôn Audio',
    description: 'Từ phàm nhân Luyện Khí đến chúa tể Tiên Đế chí tôn. Khám phá lộ trình tu vi và các phương pháp đột phá cảnh giới.',
    type: 'website',
    url: 'https://tientonaudio.com/cultivation',
  },
};

export default function CultivationPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Hệ Thống 17 Cảnh Giới Tu Tiên Tại Tiên Tôn Audio',
    description: 'Chi tiết 17 tầng cảnh giới tu chân và bí kíp tăng điểm tu vi qua thính âm tụ khí và đan dược VIP.',
    author: {
      '@type': 'Organization',
      name: 'Tiên Tôn Audio',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Tiên Tôn Audio',
      logo: {
        '@type': 'ImageObject',
        url: 'https://tientonaudio.com/logo.png',
      },
    },
  };

  return (
    <main className="min-h-screen py-8">
      {/* Script SEO JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-400 font-medium">
          <Link href="/" className="hover:text-[#ffd166] flex items-center gap-1">
            <Compass className="w-3.5 h-3.5" /> Trang Chủ
          </Link>
          <span>/</span>
          <span className="text-amber-400 font-bold flex items-center gap-1">
            <Flame className="w-3.5 h-3.5" /> Cảnh Giới Tu Tiên
          </span>
        </nav>

        {/* Hero Title Section */}
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-b from-[#162035]/80 via-[#0d1424]/90 to-[#070a12] p-8 sm:p-14 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-[#ffd166]" />
              Thiên Đạo Luân Hồi • Vạn Cổ Quy Nhất
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white">
              Hệ Thống 17 Cảnh Giới <span className="bg-gradient-to-r from-[#ffd166] via-[#ffb703] to-amber-500 bg-clip-text text-transparent">Tu Tiên</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
              Từ một phàm nhân Luyện Khí sơ nhập, từng bước nghe truyện audio tích lũy linh khí, ngưng kết Nguyên Anh, phi thăng Tiên Giới, chấn nhiếp Tiên Vương, đăng đỉnh Tiên Đế chí tôn muôn đời bất diệt.
            </p>
          </div>
        </div>

        {/* Interactive View & Details */}
        <CultivationInteractiveView />

        {/* Bottom Banner CTA */}
        <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-[#ffb703]/10 to-transparent p-8 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-2 text-center sm:text-left max-w-xl">
            <h3 className="text-2xl font-black text-white">Khởi Đầu Hành Trình Tu Tiên Hôm Nay</h3>
            <p className="text-xs sm:text-sm text-slate-300">
              Chọn ngay bộ truyện yêu thích, đeo tai nghe và để linh khí từng câu chữ thẩm thấu vào tâm trí bạn.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs sm:text-sm shadow-xl shadow-amber-500/25 hover:scale-105 transition-all flex items-center gap-2"
            >
              Nghe Truyện Ngay <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
