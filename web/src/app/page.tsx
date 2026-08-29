import React from 'react';
import Link from 'next/link';
import { Play, Star, Headphones, Sparkles, Flame, BookOpen, Crown, ChevronRight, MessageSquare } from 'lucide-react';
import { Story } from '@/types';

// Mock data hoặc server fetch từ Go backend
const MOCK_TOP_STORIES: Story[] = [
  {
    id: 'story-1',
    title: 'Phàm Nhân Tu Tiên Chi Tiên Giới Thiên',
    slug: 'pham-nhan-tu-tien',
    author_name: 'Vong Ngữ',
    cover_image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    status: 'completed',
    view_count: 125400,
    total_chapters: 1395,
    rating_avg: 4.9,
    rating_count: 1420,
    favorite_count: 980,
    categories: ['Tiên Hiệp', 'Tu Chân', 'Cổ Điển'],
  },
  {
    id: 'story-2',
    title: 'Võ Luyện Đỉnh Phong',
    slug: 'vo-luyen-dinh-phong',
    author_name: 'Mạc Mặc',
    cover_image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    status: 'completed',
    view_count: 98700,
    total_chapters: 6009,
    rating_avg: 4.8,
    rating_count: 930,
    favorite_count: 750,
    categories: ['Huyền Huyễn', 'Nhiệt Huyết'],
  },
  {
    id: 'story-3',
    title: 'Tiên Nghịch (Bản Chuẩn Audio)',
    slug: 'tien-nghich',
    author_name: 'Nhĩ Căn',
    cover_image_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    status: 'completed',
    view_count: 85200,
    total_chapters: 2088,
    rating_avg: 4.9,
    rating_count: 1100,
    favorite_count: 640,
    categories: ['Tiên Hiệp', 'Nghịch Thiên'],
  },
  {
    id: 'story-4',
    title: 'Đấu Phá Thương Khung',
    slug: 'dau-pha-thuong-khung',
    author_name: 'Thiên Tằm Thổ Đậu',
    cover_image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    status: 'completed',
    view_count: 74100,
    total_chapters: 1641,
    rating_avg: 4.7,
    rating_count: 820,
    favorite_count: 530,
    categories: ['Huyền Huyễn', 'Dị Giới'],
  },
];

const CATEGORIES = [
  { name: 'Tất Cả', icon: '✨', count: 120 },
  { name: 'Tiên Hiệp', icon: '⚔️', count: 48 },
  { name: 'Huyền Huyễn', icon: '🔮', count: 35 },
  { name: 'Trùng Sinh', icon: '⚡', count: 19 },
  { name: 'Kiếm Hiệp', icon: '🗡️', count: 14 },
  { name: 'Đô Thị Tu Tiên', icon: '🏙️', count: 12 },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16 pt-8">
      {/* 1. Hero Spotlight Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-r from-[#141b2b] via-[#0f172a] to-[#0a0f1d] p-8 sm:p-12 shadow-2xl shadow-amber-500/10">
        <div className="absolute -right-16 -bottom-16 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-400">
            <Sparkles className="h-3.5 w-3.5" />
            TIÊN TÔN AUDIO STUDIO 320KBPS
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Thưởng Thức <span className="gold-text">Tuyệt Phẩm Audio</span> Tiên Hiệp Đỉnh Cao
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Hàng ngàn chương truyện tiên hiệp, huyền huyễn chất lượng phòng thu 320kbps. Nghe audio mượt mà trên mọi thiết bị và đàm đạo cốt truyện cùng trợ lý AI Đạo Hữu.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/stories/pham-nhan-tu-tien"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] px-6 py-3 text-sm font-black text-black shadow-lg shadow-amber-500/30 hover:scale-105 active:scale-95 transition-all"
            >
              <Play className="h-4 w-4 fill-current" />
              Nghe Tác Phẩm Nổi Bật
            </Link>
            <Link
              href="/categories"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors backdrop-blur-md"
            >
              <BookOpen className="h-4 w-4" />
              Xem Toàn Bộ Thể Loại
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Category Filter Pills */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" />
            Khám Phá Theo Thể Loại
          </h2>
          <Link href="/categories" className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-semibold">
            Xem tất cả <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat, idx) => (
            <button
              key={cat.name}
              className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-2xl border text-xs font-semibold transition-all ${
                idx === 0
                  ? 'bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black border-transparent shadow-md shadow-amber-500/20'
                  : 'bg-slate-900/60 border-white/10 text-slate-300 hover:border-amber-500/40 hover:text-white'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${idx === 0 ? 'bg-black/20 text-black' : 'bg-slate-800 text-slate-400'}`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 3. Bảng Vàng Tiên Vương (Top Views Leaderboard) */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <Crown className="w-6 h-6 text-[#ffd166]" />
              Bảng Vàng Tiên Vương
            </h2>
            <p className="text-xs text-slate-400 mt-1">Các tác phẩm có lượng Đạo Hữu lắng nghe đông đảo nhất tuần</p>
          </div>
          <Link href="/rankings" className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-semibold">
            Bảng Xếp Hạng Đầy Đủ <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {MOCK_TOP_STORIES.map((story, index) => {
            const rankBadges = [
              'bg-gradient-to-r from-amber-300 to-amber-500 text-black', // #1
              'bg-gradient-to-r from-slate-200 to-slate-400 text-black', // #2
              'bg-gradient-to-r from-orange-400 to-amber-700 text-white', // #3
            ];

            return (
              <Link
                key={story.id}
                href={`/stories/${story.slug}`}
                className="group relative flex flex-col glass-card rounded-2xl overflow-hidden p-3"
              >
                {/* Ảnh bìa & Huy hiệu thứ hạng */}
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-slate-800">
                  <img
                    src={story.cover_image_url}
                    alt={story.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Rank Badge */}
                  <div className={`absolute top-2 left-2 px-2.5 py-0.5 rounded-lg text-xs font-black shadow-lg ${index < 3 ? rankBadges[index] : 'bg-black/80 text-white'}`}>
                    #{index + 1}
                  </div>

                  {/* Rating Badge */}
                  <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/80 backdrop-blur-sm px-2 py-0.5 text-[11px] font-bold text-amber-400">
                    <Star className="h-3 w-3 fill-current text-amber-400" />
                    {story.rating_avg.toFixed(1)}
                  </div>
                </div>

                {/* Tiêu đề & Tác giả */}
                <div className="pt-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white line-clamp-2 group-hover:text-amber-400 transition-colors leading-snug">
                      {story.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">{story.author_name}</p>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5 pt-2">
                    <span className="flex items-center gap-1">
                      <Headphones className="w-3 h-3 text-amber-400" />
                      {(story.view_count / 1000).toFixed(1)}k
                    </span>
                    <span>{story.total_chapters} tập</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 4. AI Đạo Hữu Banner */}
      <section className="rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900/80 p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-xl">
        <div className="space-y-3 max-w-xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 uppercase tracking-widest">
            <Sparkles className="w-4 h-4" />
            Trợ Lý AI Đạo Hữu
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Quên Cốt Truyện? <span className="text-indigo-400">Đã Có AI Giải Đáp!</span>
          </h2>
          <p className="text-sm text-slate-300">
            Hỏi đáp chi tiết diễn biến, tóm tắt cảnh giới tu vi, đếm số lượng hồng nhan tri kỷ của nhân vật chính trong tích tắc.
          </p>
        </div>

        <button className="flex-shrink-0 inline-flex items-center gap-2 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold px-6 py-3.5 shadow-lg shadow-indigo-500/25 transition-colors">
          <MessageSquare className="w-4 h-4" />
          Đàm Đạo Với AI Đạo Hữu
        </button>
      </section>
    </div>
  );
}
