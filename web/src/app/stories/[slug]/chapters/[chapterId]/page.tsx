
import { serializeJsonLd } from '@/lib/json-ld';
import { api } from '@/lib/api';
import { resolveChapterRoute } from '@/lib/chapter-route';
import { cache } from 'react';
import { notFound } from 'next/navigation';
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

const getChapterRoute = cache((slug: string, selector: string) => resolveChapterRoute(api, slug, selector));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, chapterId } = await params;
  const data = await getChapterRoute(slug, chapterId);
  if (!data) return { title: 'Không tìm thấy chương', robots: { index: false } };
  const { story, chapter } = data;
  const chapterTitle = chapter.title;
  const storyTitle = story.title;
  const title = `${chapterTitle} - ${storyTitle} Audio & Truyện Chữ Chuẩn 320kbps | Tiên Tôn Audio`;
  const description = `Nghe audio và đọc ${chapterTitle} truyện ${storyTitle} của tác giả ${story.author_name || 'Đang cập nhật'}. Chất lượng âm thanh chuẩn phòng thu 320kbps.`;

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

  const data = await getChapterRoute(slug, chapterId);
  if (!data) notFound();
  const { story, chapter, chapters } = data;
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
