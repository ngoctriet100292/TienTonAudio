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

  // Mock chapter content hoặc fetch từ Go API
  const chapter = {
    id: chapterId,
    story_id: 'story-1',
    chapter_number: 1,
    title: `Chương 1: Sơn Thôn Thiếu Niên`,
    content_text: `Nhị Lăng Tử nắm chặt góc áo thô sơ, đôi mắt to tròn nhìn chăm chú vào vách đá phía xa. Gió núi rít gào từng cơn qua khe đá, mang theo cái lạnh cắt da cắt thịt của mùa đông chốn thâm sơn cùng cốc.

Hắn vốn chỉ là một thiếu niên bình thường ở một thôn làng hẻo lánh dưới chân núi Thất Huyền. Nhà nghèo nhiều miệng ăn, vì miếng cơm manh áo mà cha mẹ gửi gắm hắn vào Thất Huyền Môn thử vận may tham gia khảo hạch nhập môn.

Nếu trúng tuyển thành ngoại môn đệ tử, mỗi tháng không những có bạc gửi về nhà, mà trong thôn làng cũng coi như có chỗ dựa oai phong.

Thế nhưng con đường tiên lộ nào có dễ dàng như thế...`,
    is_premium: false,
    duration_seconds: 1240,
    listen_count: 8900,
    narrator_name: 'MC Hải Triều',
    created_at: '2026-01-01',
  };

  const story = {
    id: 'story-1',
    title: 'Phàm Nhân Tu Tiên',
    slug: slug,
    status: 'completed' as const,
    view_count: 125000,
    total_chapters: 1395,
    rating_avg: 4.9,
    rating_count: 1400,
    favorite_count: 900,
    categories: ['Tiên Hiệp'],
  };

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
