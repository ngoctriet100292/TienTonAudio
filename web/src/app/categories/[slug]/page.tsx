import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, Headphones, Star, Sparkles, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { Story } from '@/types';
import { StoryStatusBadge } from '@/components/story-status-badge';
import { FavoriteButton } from '@/components/favorite-button';

interface Props {
  params: Promise<{ slug: string }>;
}

const CATEGORY_MAP: Record<string, { name: string; icon: string; desc: string }> = {
  'tien-hiep': {
    name: 'Tiên Hiệp',
    icon: '⚔️',
    desc: 'Tu chân luyện khí, tầm tiên vấn đạo, nghịch thiên cải mệnh, ngự kiếm phi hành.',
  },
  'huyen-huyen': {
    name: 'Huyền Huyễn',
    icon: '🔮',
    desc: 'Thế giới kỳ ảo dị giới, đấu khí ma pháp, linh hồn lực, thần thú dị bảo.',
  },
  'trung-sinh': {
    name: 'Trùng Sinh',
    icon: '⚡',
    desc: 'Sống lại một kiếp, mang theo ký ức kiếp trước chuyển mình trở thành bá chủ.',
  },
  'kiem-hiep': {
    name: 'Kiếm Hiệp',
    icon: '🗡️',
    desc: 'Giang hồ sóng gió, ân oán tình thù, hiệp khách hiệp nghĩa, chưởng môn danh phái.',
  },
  'do-thi': {
    name: 'Đô Thị Tu Tiên',
    icon: '🏙️',
    desc: 'Tiên tôn trùng sinh nơi đô thị phồn hoa, trang bức đả kiểm, bảo vệ mỹ nhân.',
  },
  'khoa-huyen': {
    name: 'Khoa Huyễn',
    icon: '🚀',
    desc: 'Công nghệ tương lai, cơ giáp không gian, phi thuyền vũ trụ, biến dị gen.',
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = CATEGORY_MAP[slug];
  const name = cat ? cat.name : slug.replace(/-/g, ' ').toUpperCase();
  return {
    title: `Truyện Audio ${name} - Nghe Online Chất Lượng Cao 320kbps`,
    description: `Danh sách truyện audio ${name} hay nhất, giọng đọc MC diễn cảm, cập nhật mới liên tục.`,
  };
}

export default async function CategoryDetailPage({ params }: Props) {
  const { slug } = await params;
  const categoryInfo = CATEGORY_MAP[slug] || {
    name: slug.replace(/-/g, ' ').toUpperCase(),
    icon: '📜',
    desc: 'Danh sách các bộ truyện audio đặc sắc thuộc thể loại này.',
  };

  // Lấy danh sách truyện từ API
  const allStories = await api.getStories(1, 30);
  
  // Lọc theo thể loại
  const filteredStories = allStories.filter((s) => {
    if (!s.categories || !Array.isArray(s.categories)) return true;
    return s.categories.some((c: any) => {
      const cName = typeof c === 'string' ? c.toLowerCase() : (c?.name || '').toLowerCase();
      const targetName = categoryInfo.name.toLowerCase();
      return cName.includes(targetName) || targetName.includes(cName);
    });
  });

  const stories = filteredStories.length > 0 ? filteredStories : allStories;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 space-y-8 pb-16">
      {/* Header Thể Loại */}
      <div className="border-b border-white/10 pb-6">
        <Link
          href="/categories"
          className="text-xs text-amber-400 hover:underline mb-3 inline-flex items-center gap-1.5 font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại danh mục thể loại</span>
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-3xl p-2.5 rounded-2xl bg-slate-800 border border-white/10">
            {categoryInfo.icon}
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Thể Loại: <span className="text-[#ffd166]">{categoryInfo.name}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {categoryInfo.desc}
            </p>
          </div>
        </div>
      </div>

      {stories.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl bg-slate-900/20 space-y-3">
          <Sparkles className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-slate-300 text-sm font-semibold">Chưa có tác phẩm nào trong thể loại này</p>
          <Link
            href="/categories"
            className="inline-block mt-3 text-xs font-bold text-amber-400 hover:underline"
          >
            Khám phá thể loại khác
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {stories.map((story) => (
            <Link
              key={story.id}
              href={`/stories/${story.slug}`}
              className="group relative flex flex-col glass-card rounded-2xl overflow-hidden p-3"
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-slate-800">
                {story.cover_image_url && (
                  <img
                    src={story.cover_image_url}
                    alt={story.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}

                {/* Status Badge */}
                <div className="absolute top-2 right-2">
                  <StoryStatusBadge status={story.status} size="sm" />
                </div>

                {/* Nút Yêu Thích Nhanh */}
                <div className="absolute bottom-2 left-2 z-10">
                  <FavoriteButton storyId={story.id} variant="icon" />
                </div>

                {/* Rating Badge */}
                <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/80 backdrop-blur-sm px-2 py-0.5 text-[11px] font-bold text-amber-400">
                  <Star className="h-3 w-3 fill-current text-amber-400" />
                  {story.rating_avg.toFixed(1)}
                </div>
              </div>

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
          ))}
        </div>
      )}
    </div>
  );
}
