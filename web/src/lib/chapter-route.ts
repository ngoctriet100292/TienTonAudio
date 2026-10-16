import type { Chapter, Story } from '@/types';

type ChapterSource = {
  getStoryBySlug(slug: string): Promise<Story | null>;
  getStoryChapters(id: string, page?: number, limit?: number): Promise<Chapter[]>;
  getChapter(id: string): Promise<Chapter | null>;
};

export async function resolveChapterRoute(source: ChapterSource, slug: string, selector: string) {
  const story = await source.getStoryBySlug(slug);
  if (!story) return null;
  const chapters = await source.getStoryChapters(story.id, 1, 1000);
  const isUUID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(selector);
  const listed = chapters.find(chapter => chapter.id === selector || chapter.chapter_number.toString() === selector);
  const id = isUUID ? selector : listed?.id;
  if (!id) return null;
  const chapter = await source.getChapter(id);
  // The URL's story and fetched chapter must have the same authoritative owner.
  if (!chapter || chapter.story_id !== story.id) return null;
  return { story, chapter, chapters };
}
