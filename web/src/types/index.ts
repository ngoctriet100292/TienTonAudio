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

export interface User {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  role: string;
  is_email_verified: boolean;
  two_factor_enabled: boolean;
  cultivation_realm?: string;
  cultivation_exp?: number;
  cultivation_level?: number;
  cultivation_color?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CultivationRealmInfo {
  level: number;
  name: string;
  min_exp: number;
  max_exp: number;
  description: string;
  color: string;
}

export interface UserCultivation {
  current_realm: string;
  level: number;
  current_exp: number;
  next_realm_exp: number;
  progress_pct: number;
  exp_multiplier: number;
  vip_status: string;
  color: string;
  description: string;
  all_realms: CultivationRealmInfo[];
}
