
import { serializeJsonLd } from '@/lib/json-ld';
import { api } from '@/lib/api';
import { Chapter } from '@/types';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import ChapterReaderClient from './chapter-reader-client';

interface Props {
  params: Promise<{ slug: string; chapterId: string }>;
}

function formatIsoDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return 'PT0S';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  let res = 'PT';
  if (h > 0) res += `${h}H`;
  if (m > 0) res += `${m}M`;
  if (s > 0 || (h === 0 && m === 0)) res += `${s}S`;
  return res;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, chapterId } = await params;
  const story = await api.getStoryBySlug(slug);
  let chapterTitle = `Chương ${chapterId}`;
  const storyTitle = story?.title || slug.replace(/-/g, ' ').toUpperCase();

  try {
    const ch = await api.getChapter(chapterId);
    if (ch) {
      chapterTitle = ch.title;
    }
  } catch { }

  const title = `${chapterTitle} - ${storyTitle} Audio & Truyện Chữ Chuẩn 320kbps | Tiên Tôn Audio`;
  const description = `Nghe audio và đọc ${chapterTitle} truyện ${storyTitle} của tác giả ${story?.author_name || 'Đang cập nhật'}. Chất lượng âm thanh chuẩn phòng thu 320kbps.`;

  return {
    title,
    description,
    keywords: [
      storyTitle,
      chapterTitle,
      `${storyTitle} audio`,
      `${chapterTitle} audio`,
      `nghe truyen ${storyTitle}`,
    ],
    openGraph: {
      title,
      description,
      type: 'article',
      images: story?.cover_image_url ? [{ url: story.cover_image_url }] : [],
    },
  };
}

export default async function ChapterPage({ params }: Props) {
  const { slug, chapterId } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tientonaudio.com';

  let story = await api.getStoryBySlug(slug);
  let chapters: Chapter[] = [];
  if (story) {
    chapters = await api.getStoryChapters(story.id, 1, 1000);
  }

  let chapter = await api.getChapter(chapterId);

  // Nếu không tìm thấy theo ID, có thể chapterId là số thứ tự chương (VD: /chapters/1)
  if (story && !chapter && chapters.length > 0) {
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
      content: `Nội dung chương đang được cập nhật...`,
      content_text: `Nội dung chương đang được cập nhật...`,
      is_premium: false,
      duration_seconds: 0,
      listen_count: 0,
      narrator_name: 'Hệ Thống',
      created_at: new Date().toISOString(),
    };
  } else {
    chapter.content_text = chapter.content || chapter.content_text || '';
  }

  // Google Schema: AudioObject + BreadcrumbList
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AudioObject',
        '@id': `${siteUrl}/stories/${story.slug}/chapters/${chapter.id}#audio`,
        name: `${chapter.title} - ${story.title}`,
        description: `Nghe audio ${chapter.title} tác phẩm ${story.title} chuẩn studio 320kbps.`,
        duration: formatIsoDuration(chapter.duration_seconds || 0),
        encodingFormat: 'audio/mpeg',
        contentUrl: `${process.env.NEXT_PUBLIC_API_URL || 'https://tientonaudio.com/api/v1'}/chapters/${chapter.id}/stream`,
        uploadDate: chapter.created_at || new Date().toISOString(),
        author: {
          '@type': 'Person',
          name: story.author_name || 'Tiên Tôn',
        },
        readBy: {
          '@type': 'Person',
          name: chapter.narrator_name || 'MC Diễn Đọc Tiên Tôn',
        },
        inLanguage: 'vi',
        isPartOf: {
          '@type': 'Audiobook',
          name: story.title,
          url: `${siteUrl}/stories/${story.slug}`,
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Trang Chủ',
            item: siteUrl,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: story.title,
            item: `${siteUrl}/stories/${story.slug}`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: chapter.title,
            item: `${siteUrl}/stories/${story.slug}/chapters/${chapter.id}`,
          },
        ],
      },
    ],
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-6 space-y-8 pb-16">
      {/* Google AudioObject & Breadcrumb JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between text-xs text-slate-400 border-b border-white/10 pb-4">
        <Link href={`/stories/${slug}`} className="hover:text-amber-400 flex items-center gap-1.5 font-semibold">
          <ArrowLeft className="w-3.5 h-3.5" />
          {story.title}
        </Link>
        <span className="font-mono text-amber-400 font-bold">{chapter.title}</span>
      </div>

      {/* Reader Client with Theme Customizer & Audio Connect */}
      <ChapterReaderClient story={story} chapter={chapter} chapters={chapters} />
    </div>
  );
}
