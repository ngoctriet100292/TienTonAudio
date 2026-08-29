import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Star, Headphones, BookOpen, Crown, Share2, Heart, Play } from 'lucide-react';
import { Story, Chapter } from '@/types';
import ChapterListClient from './chapter-list-client';

interface Props {
  params: Promise<{ slug: string }>;
}

// Giả lập dữ liệu truyện (Khi chạy thật sẽ fetch từ Golang API backend)
async function getStory(slug: string): Promise<{ story: Story; chapters: Chapter[] } | null> {
  const story: Story = {
    id: 'story-pham-nhan',
    title: 'Phàm Nhân Tu Tiên Chi Tiên Giới Thiên',
    slug: slug,
    author_name: 'Vong Ngữ',
    description: 'Hàn Lập sau khi phi thăng Tiên Giới bị mất đi ký ức và tu vi, lưu lạc đến Linh Hoàn Giới. Từ một phàm nhân bắt đầu lại con đường tu tiên đầy chông gai, nghịch thiên cải mệnh, vén màn bí mật của Tiên Giới...',
    cover_image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
    status: 'completed',
    view_count: 125400,
    total_chapters: 1395,
    rating_avg: 4.9,
    rating_count: 1420,
    favorite_count: 980,
    categories: ['Tiên Hiệp', 'Tu Chân', 'Cổ Điển'],
  };

  const chapters: Chapter[] = [
    {
      id: 'ch-1',
      story_id: story.id,
      chapter_number: 1,
      title: 'Chương 1: Linh Hoàn Giới Tỉnh Lại',
      is_premium: false,
      duration_seconds: 1420,
      listen_count: 15420,
      narrator_name: 'MC Hải Triều',
      created_at: '2026-01-01',
    },
    {
      id: 'ch-2',
      story_id: story.id,
      chapter_number: 2,
      title: 'Chương 2: Khôi Phục Ký Ức',
      is_premium: false,
      duration_seconds: 1350,
      listen_count: 12800,
      narrator_name: 'MC Hải Triều',
      created_at: '2026-01-02',
    },
    {
      id: 'ch-3',
      story_id: story.id,
      chapter_number: 3,
      title: 'Chương 3: Tiên Phủ Thần Bí',
      is_premium: true,
      duration_seconds: 1580,
      listen_count: 9600,
      narrator_name: 'MC Hải Triều',
      created_at: '2026-01-03',
    },
  ];

  return { story, chapters };
}

// 1. Dynamic SEO Metadata cho từng bộ truyện trên Google
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getStory(slug);
  if (!data) return { title: 'Không tìm thấy truyện' };

  const { story } = data;
  const title = `Nghe Truyện ${story.title} Audio Full 320kbps - Tác giả ${story.author_name}`;
  const description = `Nghe audio ${story.title} chất lượng cao 320kbps, giọng đọc truyền cảm. ${story.description?.slice(0, 160)}...`;

  return {
    title,
    description,
    keywords: [
      story.title,
      `${story.title} audio`,
      `nghe audio ${story.title}`,
      `tác giả ${story.author_name}`,
      ...story.categories,
    ],
    openGraph: {
      title,
      description,
      type: 'article',
      images: story.cover_image_url ? [{ url: story.cover_image_url }] : [],
    },
  };
}

export default async function StoryDetailPage({ params }: Props) {
  const { slug } = await params;
  const data = await getStory(slug);

  if (!data) notFound();

  const { story, chapters } = data;

  // JSON-LD Schema cho Google Audiobook & Book Rich Snippet
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Audiobook',
    name: story.title,
    author: {
      '@type': 'Person',
      name: story.author_name,
    },
    description: story.description,
    image: story.cover_image_url,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: story.rating_avg,
      reviewCount: story.rating_count,
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 space-y-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header Truyện */}
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Ảnh bìa */}
        <div className="w-full md:w-64 flex-shrink-0 aspect-[3/4] rounded-2xl overflow-hidden border border-amber-500/30 bg-slate-800 shadow-2xl shadow-amber-500/10">
          <img src={story.cover_image_url} alt={story.title} className="w-full h-full object-cover" />
        </div>

        {/* Thông tin tác phẩm */}
        <div className="flex-1 space-y-5">
          <div className="flex flex-wrap gap-2">
            {story.categories.map((c) => (
              <span key={c} className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
                {c}
              </span>
            ))}
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight">
            {story.title}
          </h1>

          <p className="text-sm font-semibold text-amber-400">
            ✍️ Tác giả: {story.author_name}
          </p>

          {/* Hộp thông số */}
          <div className="flex items-center gap-6 py-3 px-5 rounded-2xl bg-slate-900/80 border border-white/10 w-fit text-xs">
            <div className="flex items-center gap-1.5">
              <Headphones className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-white">{(story.view_count / 1000).toFixed(1)}k</span> Lượt nghe
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-400 fill-current" />
              <span className="font-bold text-white">{story.rating_avg}</span> ({story.rating_count})
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-white">{story.total_chapters}</span> Chương
            </div>
          </div>

          {/* Tóm tắt */}
          <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
            {story.description}
          </p>
        </div>
      </div>

      {/* Danh sách chương có khả năng bấm phát trực tiếp */}
      <div className="space-y-4 pt-6 border-t border-white/10">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-400" />
          Danh Sách Tập Audio ({chapters.length})
        </h2>

        <ChapterListClient story={story} chapters={chapters} />
      </div>
    </div>
  );
}
