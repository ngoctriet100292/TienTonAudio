import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Star, Headphones, BookOpen, Crown, Share2, Heart, Play } from 'lucide-react';
import { Story, Chapter } from '@/types';
import ChapterListClient from './chapter-list-client';
import { StoryStatusBadge } from '@/components/story-status-badge';
import { StoryActions } from '@/components/story-actions';
import { ChapterComments } from '@/components/chapter-comments';
import { FollowButton } from '@/components/follow-button';
import { api } from '@/lib/api';

interface Props {
  params: Promise<{ slug: string }>;
}

const MOCK_STORY: Story = {
  id: 'story-pham-nhan',
  title: 'Phàm Nhân Tu Tiên Chi Tiên Giới Thiên',
  slug: 'pham-nhan-tu-tien',
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

const MOCK_CHAPTERS: Chapter[] = [
  {
    id: 'ch-1',
    story_id: 'story-pham-nhan',
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
    story_id: 'story-pham-nhan',
    chapter_number: 2,
    title: 'Chương 2: Khôi Phục Ký Ức',
    is_premium: false,
    duration_seconds: 1350,
    listen_count: 12800,
    narrator_name: 'MC Hải Triều',
    created_at: '2026-01-02',
  },
];

async function getStory(slug: string): Promise<{ story: Story; chapters: Chapter[] } | null> {
  try {
    const story = await api.getStoryBySlug(slug);
    if (story) {
      const rawChapters = await api.getStoryChapters(story.id, 1, 1000);
      const chapters: Chapter[] = rawChapters.map((c: any) => ({
        id: c.id,
        story_id: c.story_id || story.id,
        chapter_number: c.chapter_number,
        title: c.title,
        content: c.content,
        content_text: c.content || c.content_text,
        is_premium: c.is_premium || false,
        duration_seconds: c.duration_seconds || 0,
        listen_count: c.listen_count || 0,
        narrator_name: c.narrator_name || 'Hệ Thống',
        created_at: c.created_at || new Date().toISOString(),
      }));

      // Chuẩn hóa categories dạng string[]
      const normalizedCats: string[] = (story.categories || []).map((cat: any) =>
        typeof cat === 'string' ? cat : (cat?.name || '')
      ).filter(Boolean);

      story.categories = normalizedCats.length > 0 ? normalizedCats : ['Tiên Hiệp'];
      if (!story.cover_image_url) {
        story.cover_image_url = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80';
      }

      return { story, chapters };
    }
  } catch (err) {
    console.error('Error fetching story from API:', err);
  }

  // Fallback dự phòng
  if (slug === 'pham-nhan-tu-tien' || slug === 'story-pham-nhan') {
    return { story: MOCK_STORY, chapters: MOCK_CHAPTERS };
  }

  return null;
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
      `tác giả ${story.author_name || 'Đang cập nhật'}`,
      ...((story.categories || []).map((c: any) => (typeof c === 'string' ? c : c?.name || '')).filter(Boolean)),
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tientonaudio.com';

  // JSON-LD Schema cho Google Audiobook & BreadcrumbList Rich Snippet
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Audiobook',
        '@id': `${siteUrl}/stories/${story.slug}#audiobook`,
        name: story.title,
        url: `${siteUrl}/stories/${story.slug}`,
        author: {
          '@type': 'Person',
          name: story.author_name || 'Tiên Tôn',
        },
        readBy: {
          '@type': 'Person',
          name: chapters[0]?.narrator_name || 'MC Diễn Đọc Tiên Tôn',
        },
        description: story.description,
        image: story.cover_image_url,
        inLanguage: 'vi',
        genre: (story.categories || []).join(', '),
        publisher: {
          '@type': 'Organization',
          name: 'Tiên Tôn Audio',
          url: siteUrl,
        },
        aggregateRating: story.rating_count > 0 ? {
          '@type': 'AggregateRating',
          ratingValue: story.rating_avg || 5.0,
          reviewCount: story.rating_count || 1,
          bestRating: 5,
          worstRating: 1,
        } : undefined,
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
            name: story.categories?.[0] || 'Truyện Audio',
            item: `${siteUrl}/categories/${story.categories?.[0] ? 'tien-hiep' : ''}`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: story.title,
            item: `${siteUrl}/stories/${story.slug}`,
          },
        ],
      },
    ],
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
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Trạng thái truyện: Hoàn thành, Tạm ngưng, Còn tiếp */}
            <StoryStatusBadge status={story.status} size="md" />

            {(story.categories || []).map((c: any, i: number) => {
              const name = typeof c === 'string' ? c : c?.name || '';
              return (
                <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
                  {name}
                </span>
              );
            })}
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight">
            {story.title}
          </h1>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-amber-400">
              ✍️ Tác giả: {story.author_name || 'Tiên Tôn'}
            </span>
            {story.author_id && (
              <FollowButton
                targetType="author"
                targetId={story.author_id}
                targetName={story.author_name || 'Tác giả'}
                variant="compact"
              />
            )}
            {chapters[0]?.narrator_name && (
              <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                <span className="text-xs text-slate-300">
                  🎙️ Giọng đọc: <strong className="text-white">{chapters[0].narrator_name}</strong>
                </span>
                {chapters[0]?.narrator_id && (
                  <FollowButton
                    targetType="narrator"
                    targetId={chapters[0].narrator_id}
                    targetName={chapters[0].narrator_name}
                    variant="compact"
                  />
                )}
              </div>
            )}
          </div>

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

          {/* Cụm nút tác vụ chính: Đọc truyện chữ & Nghe Audio */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {chapters.length > 0 && (
              <Link
                href={`/stories/${story.slug}/chapters/${chapters[0].id}`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-sm shadow-lg shadow-amber-500/25 hover:scale-105 active:scale-95 transition-all"
              >
                <BookOpen className="w-4.5 h-4.5" />
                ĐỌC TRUYỆN CHỮ (TẬP 1)
              </Link>
            )}
            {chapters.length > 0 && (
              <Link
                href={`/stories/${story.slug}/chapters/${chapters[0].id}`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 font-bold text-sm transition-colors"
              >
                <Headphones className="w-4.5 h-4.5" />
                Nghe Audio Tập 1
              </Link>
            )}
            <StoryActions
              storyId={story.id}
              storyTitle={story.title}
              favoriteCount={story.favorite_count || 0}
              firstChapterId={chapters.length > 0 ? chapters[0].id : undefined}
            />
          </div>
        </div>
      </div>

      {/* Danh sách chương: Đọc chữ hoặc nghe Audio */}
      <div className="space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            Danh Sách Chương ({chapters.length})
          </h2>
          <span className="text-xs text-slate-400">
            Nhấp vào tên chương để đọc chữ • Bấm nút nghe để phát audio
          </span>
        </div>

        <ChapterListClient story={story} chapters={chapters} />
      </div>

      {/* Đàm đạo & đánh giá tác phẩm */}
      {chapters.length > 0 && (
        <ChapterComments
          chapterId={chapters[0].id}
          chapterTitle={`Đàm Đạo & Nhận Xét: ${story.title}`}
        />
      )}
    </div>
  );
}
