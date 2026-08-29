import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Crown, Headphones, Star, BookOpen, Flame } from 'lucide-react';
import { api } from '@/lib/api';
import { Story } from '@/types';

export const metadata: Metadata = {
  title: 'Bảng Vàng Tiên Vương - Top Truyện Audio Nghe Nhiều Nhất',
  description: 'Bảng xếp hạng truyện tiên hiệp audio, huyền huyễn có lượt nghe và đánh giá cao nhất trên Tiên Tôn Audio.',
};

export default async function RankingsPage() {
  const topStories = await api.getTopViewStories(20);

  // Dữ liệu mẫu dự phòng nếu backend chưa có dữ liệu
  const stories: Story[] = topStories.length > 0 ? topStories : [
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
      categories: ['Tiên Hiệp', 'Tu Chân'],
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
      categories: ['Huyền Huyễn'],
    },
    {
      id: 'story-3',
      title: 'Tiên Nghịch (Audio Bản Chuẩn)',
      slug: 'tien-nghich',
      author_name: 'Nhĩ Căn',
      cover_image_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
      status: 'completed',
      view_count: 85200,
      total_chapters: 2088,
      rating_avg: 4.9,
      rating_count: 1100,
      favorite_count: 640,
      categories: ['Tiên Hiệp'],
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
      categories: ['Huyền Huyễn'],
    },
  ];

  const rankBadges = [
    'bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black',
    'bg-gradient-to-r from-slate-200 to-slate-400 text-black font-black',
    'bg-gradient-to-r from-orange-400 to-amber-700 text-white font-black',
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
      {/* Header */}
      <div className="border-b border-white/10 pb-6">
        <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
          <Crown className="w-4 h-4 text-amber-400" />
          Kim Bảng Phong Thần
        </div>
        <h1 className="text-3xl font-black text-white">Bảng Vàng Tiên Vương</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Xếp hạng những bộ truyện audio tiên hiệp được cộng đồng Đạo Hữu tu luyện và lắng nghe nhiều nhất.
        </p>
      </div>

      {/* Danh sách bảng vàng */}
      <div className="space-y-3">
        {stories.map((story, index) => (
          <Link
            key={story.id}
            href={`/stories/${story.slug}`}
            className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-amber-500/40 hover:bg-slate-850 transition-all group"
          >
            <div className="flex items-center gap-4 sm:gap-6">
              {/* Thứ hạng */}
              <div
                className={`flex h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-xl text-sm sm:text-base shadow-md ${
                  index < 3 ? rankBadges[index] : 'bg-slate-800 text-slate-300 font-bold'
                }`}
              >
                #{index + 1}
              </div>

              {/* Bìa truyện */}
              <div className="h-16 w-12 sm:h-20 sm:w-16 flex-shrink-0 overflow-hidden rounded-xl bg-slate-800">
                {story.cover_image_url && (
                  <img src={story.cover_image_url} alt={story.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                )}
              </div>

              {/* Thông tin */}
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                  {story.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Tác giả: {story.author_name}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {story.categories.map((c) => (
                    <span key={c} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Thông số lượt nghe & đánh giá */}
            <div className="hidden sm:flex items-center gap-8 text-xs text-slate-400">
              <div className="text-right">
                <div className="flex items-center justify-end gap-1 font-bold text-white">
                  <Headphones className="w-3.5 h-3.5 text-amber-400" />
                  {(story.view_count / 1000).toFixed(1)}k
                </div>
                <span className="text-[10px] text-slate-500">Lượt nghe</span>
              </div>

              <div className="text-right">
                <div className="flex items-center justify-end gap-1 font-bold text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {story.rating_avg.toFixed(1)}
                </div>
                <span className="text-[10px] text-slate-500">({story.rating_count} vote)</span>
              </div>

              <div className="text-right">
                <div className="flex items-center justify-end gap-1 font-bold text-white">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  {story.total_chapters}
                </div>
                <span className="text-[10px] text-slate-500">Tập</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
