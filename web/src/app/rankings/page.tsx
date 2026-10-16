
import { CatalogueState } from '@/components/catalogue-state';
import { FavoriteButton } from '@/components/favorite-button';
import { MediaImage } from '@/components/media-image';
import { StoryStatusBadge } from '@/components/story-status-badge';
import { api } from '@/lib/api';
import { Story } from '@/types';
import { BookOpen, Crown, Headphones, Star } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Bảng Vàng Tu Tiên - Top Truyện Audio Hot Nhất',
  description: 'Bảng xếp hạng những bộ truyện audio tiên hiệp, huyền huyễn có lượt nghe và đánh giá cao nhất trên Tiên Tôn Audio.',
};

export const revalidate = 30;

export default async function RankingsPage() {
  let stories: Story[] = [];
  let unavailable = false;
  try { stories = await api.getTopViewStories(20); } catch { unavailable = true; }

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

      {stories.length === 0 && <CatalogueState unavailable={unavailable} />}
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
                className={`flex h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-xl text-sm sm:text-base shadow-md ${index < 3 ? rankBadges[index] : 'bg-slate-800 text-slate-300 font-bold'
                  }`}
              >
                #{index + 1}
              </div>

              {/* Bìa truyện */}
              <div className="h-16 w-12 sm:h-20 sm:w-16 flex-shrink-0 overflow-hidden rounded-xl bg-slate-800">
                {story.cover_image_url && (
                  <MediaImage src={story.cover_image_url} alt={story.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                )}
              </div>

              {/* Thông tin */}
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                  {story.title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-slate-400">Tác giả: {story.author_name}</p>
                  <StoryStatusBadge status={story.status} size="sm" />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(story.categories || []).map((c, i: number) => {
                    const name = typeof c === 'string' ? c : c?.name || '';
                    return (
                      <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {name}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Thông số lượt nghe, đánh giá & nút Yêu thích */}
            <div className="flex items-center gap-4 sm:gap-8 text-xs text-slate-400">
              <div className="hidden sm:block text-right">
                <div className="flex items-center justify-end gap-1 font-bold text-white">
                  <Headphones className="w-3.5 h-3.5 text-amber-400" />
                  {(story.view_count / 1000).toFixed(1)}k
                </div>
                <span className="text-[11px] text-slate-500">Lượt nghe</span>
              </div>

              <div className="hidden sm:block text-right">
                <div className="flex items-center justify-end gap-1 font-bold text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {story.rating_avg.toFixed(1)}
                </div>
                <span className="text-[11px] text-slate-500">({story.rating_count} vote)</span>
              </div>

              <div className="hidden sm:block text-right">
                <div className="flex items-center justify-end gap-1 font-bold text-white">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  {story.total_chapters}
                </div>
                <span className="text-[11px] text-slate-500">Tập</span>
              </div>

              <div className="flex-shrink-0 z-10">
                <FavoriteButton storyId={story.id} variant="icon" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
