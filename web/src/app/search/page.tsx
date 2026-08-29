import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Search, Star, Headphones, BookOpen } from 'lucide-react';
import { api } from '@/lib/api';
import { Story } from '@/types';

export const metadata: Metadata = {
  title: 'Tìm Kiếm Truyện Tiên Hiệp Audio',
  description: 'Tìm kiếm hàng ngàn bộ truyện audio tiên hiệp, huyền huyễn, kiếm hiệp theo tên truyện, tác giả hoặc giọng đọc MC.',
};

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = q || '';

  const results = query ? await api.searchStories(query) : await api.getStories(1, 12);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
      <div className="border-b border-white/10 pb-6">
        <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
          <Search className="w-4 h-4 text-amber-400" />
          Kính Lúp Tìm Kiếm
        </div>
        <h1 className="text-3xl font-black text-white">
          {query ? `Kết quả tìm kiếm cho: "${query}"` : 'Khám Phá Toàn Bộ Kho Truyện'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Tìm thấy {results.length} tác phẩm phù hợp
        </p>
      </div>

      {results.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl">
          <p className="text-slate-400 text-sm">Không tìm thấy tác phẩm nào phù hợp với từ khóa trên.</p>
          <Link href="/" className="inline-block mt-4 text-xs font-bold text-amber-400 hover:underline">
            Quay lại trang chủ
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {results.map((story) => (
            <Link
              key={story.id}
              href={`/stories/${story.slug}`}
              className="group flex flex-col glass-card rounded-2xl overflow-hidden p-3"
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-slate-800">
                {story.cover_image_url && (
                  <img
                    src={story.cover_image_url}
                    alt={story.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                  />
                )}
                <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/80 backdrop-blur-sm px-2 py-0.5 text-[11px] font-bold text-amber-400">
                  <Star className="h-3 w-3 fill-current" />
                  {story.rating_avg.toFixed(1)}
                </div>
              </div>

              <div className="pt-3 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white line-clamp-2 group-hover:text-amber-400 transition-colors">
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
