import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, BookOpen, Headphones, Share2, MessageSquare, Star } from 'lucide-react';
import { api } from '@/lib/api';
import ChapterReaderClient from './chapter-reader-client';

interface Props {
  params: Promise<{ slug: string; chapterId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, chapterId } = await params;
  return {
    title: `Chương ${chapterId} - ${slug} | Tiên Tôn Audio`,
    description: `Đọc và nghe audio chương ${chapterId} của bộ truyện ${slug} chuẩn 320kbps.`,
  };
}

export default async function ChapterPage({ params }: Props) {
  const { slug, chapterId } = await params;

  let story = await api.getStoryBySlug(slug);
  let chapter = await api.getChapter(chapterId);

  // Nếu không tìm thấy theo ID, có thể chapterId là số thứ tự chương (VD: /chapters/1)
  if (story && !chapter) {
    const chapters = await api.getStoryChapters(story.id, 1, 1000);
    const found = chapters.find(
      (c) => c.id === chapterId || c.chapter_number.toString() === chapterId
    );
    if (found) {
      chapter = (await api.getChapter(found.id)) || found;
    }
  }

  // Fallback nếu offline hoặc dữ liệu mẫu
  if (!story) {
    story = {
      id: 'story-1',
      title: slug === 'pham-nhan-tu-tien' ? 'Phàm Nhân Tu Tiên' : slug,
      slug: slug,
      status: 'completed' as const,
      view_count: 125000,
      total_chapters: 1395,
      rating_avg: 4.9,
      rating_count: 1400,
      favorite_count: 900,
      categories: ['Tiên Hiệp'],
    };
  }

  if (!chapter) {
    chapter = {
      id: chapterId,
      story_id: story.id,
      chapter_number: 1,
      title: `Chương ${chapterId}`,
      content_text: `Nội dung chương đang được cập nhật...`,
      is_premium: false,
      duration_seconds: 0,
      listen_count: 0,
      narrator_name: 'Hệ Thống',
      created_at: new Date().toISOString(),
    };
  } else {
    // Đảm bảo content_text có dữ liệu
    chapter.content_text = chapter.content || chapter.content_text || '';
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-6 space-y-8">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between text-xs text-slate-400 border-b border-white/10 pb-4">
        <Link href={`/stories/${slug}`} className="hover:text-amber-400 flex items-center gap-1.5 font-semibold">
          <ArrowLeft className="w-3.5 h-3.5" />
          {story.title}
        </Link>
        <span className="font-mono text-amber-400">{chapter.title}</span>
      </div>

      {/* Reader Client with Theme Customizer & Audio Connect */}
      <ChapterReaderClient story={story} chapter={chapter} />
    </div>
  );
}
