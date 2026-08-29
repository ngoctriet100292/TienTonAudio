export interface Story {
  id: string;
  title: string;
  slug: string;
  description?: string;
  cover_image_url?: string;
  author_id?: string;
  author_name?: string;
  status: 'ongoing' | 'completed';
  view_count: number;
  total_chapters: number;
  rating_avg: number;
  rating_count: number;
  favorite_count: number;
  is_favorite?: boolean;
  categories: string[];
}

export interface Chapter {
  id: string;
  story_id: string;
  chapter_number: number;
  title: string;
  content_text?: string;
  is_premium: boolean;
  duration_seconds: number;
  listen_count: number;
  narrator_name?: string;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  story_count?: number;
}
