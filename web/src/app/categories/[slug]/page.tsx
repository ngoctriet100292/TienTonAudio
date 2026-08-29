import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookOpen, Headphones, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { Story } from '@/types';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const name = slug.replace(/-/g, ' ').toUpperCase();
  return {
    title: `Truyện Audio ${name} - Nghe Online Chất Lượng Cao 320kbps`,
    description: `Danh sách truyện audio ${name} hay nhất, giọng đọc MC diễn cảm, cập nhật mới liên tục.`,
  };
}

export default async function CategoryDetailPage({ params }: Props) {
  const { slug } = await params;
  const name = slug.replace(/-/g, ' ').toUpperCase();

  // Gọi API lấy truyện lọc theo thể loại
  const stories = await api.getStories(1, 20);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
      <div className="border-b border-white/10 pb-6">
        <Link href="/categories" className="text-xs text-amber-400 hover:underline mb-2 inline-block">
          ← Quay lại danh mục thể loại
        </Link>
        <h1 className="text-3xl font-black text-white">Thể Loại: {name}</h1>
        <p className="text-xs text-slate-400 mt-1">Danh sách các truyện audio hay nhất thuộc thể loại này</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
        {stories.map((story) => (
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
    </div>
  );
}
