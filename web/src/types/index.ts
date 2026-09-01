export type StoryStatus = 'ongoing' | 'completed' | 'paused' | 'dropped';

export interface Story {
  id: string;
  title: string;
  slug: string;
  description?: string;
  cover_image_url?: string;
  author_id?: string;
  author_name?: string;
  status: StoryStatus;
  status_label?: string;
  view_count: number;
  total_chapters: number;
  rating_avg: number;
  rating_count: number;
  favorite_count: number;
  is_favorite?: boolean;
  categories: any[];
}

export interface Chapter {
  id: string;
  story_id: string;
  chapter_number: number;
  title: string;
  content?: string;
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
  is_premium?: boolean;
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

export interface PaymentHistoryItem {
  id: string;
  user_id: string;
  plan_id?: number;
  plan_name?: string;
  duration_days?: number;
  amount: number;
  provider: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  transaction_id?: string;
  created_at: string;
  updated_at: string;
}

export interface FavoriteStoryItem {
  id: string;
  title: string;
  slug: string;
  cover_image_url: string;
  total_chapters: number;
  rating_avg: number;
  favorited_at: string;
}

export interface ListeningHistoryItem {
  chapter_id: string;
  story_id: string;
  last_position_seconds: number;
  playback_speed: number;
  is_completed: boolean;
  updated_at: string;
  chapter_title: string;
  chapter_number: number;
  duration_seconds: number;
  story_title: string;
  story_slug: string;
  cover_image_url: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'comment_reply' | 'new_chapter' | 'vip_expiring' | 'system';
  reference_id?: string;
  reference_type?: string;
  is_read: boolean;
  created_at: string;
}

export interface PartnerStats {
  total_stories: number;
  total_chapters: number;
  total_views: number;
  total_listens: number;
  is_admin: boolean;
}

export interface PartnerStoryItem {
  id: string;
  title: string;
  slug: string;
  description?: string;
  cover_image_url?: string;
  status: StoryStatus;
  view_count: number;
  total_chapters: number;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePartnerStoryReq {
  title: string;
  slug?: string;
  description?: string;
  cover_image_url?: string;
  status?: StoryStatus;
  categories?: number[];
}

export interface CreatePartnerChapterReq {
  chapter_number: number;
  title: string;
  content?: string;
  is_premium: boolean;
  audio_url?: string;
  duration_seconds: number;
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  price: number;
  duration_days: number;
  description?: string;
}

export interface CreatePaymentResp {
  payment_id: string;
  order_code: string;
  amount: number;
  provider: string;
  status: string;
  checkout_url: string;
  qr_code_url: string;
  bank_name: string;
  bank_account: string;
  account_name: string;
  transfer_content: string;
  expires_at: string;
}

export interface PaymentStatusResp {
  payment_id: string;
  status: string;
  plan_name: string;
  amount: number;
  is_completed: boolean;
  bonus_exp: number;
  cultivation_realm?: string;
  expires_at?: string;
}

export interface UserSubscription {
  id: string;
  plan_id: number;
  plan_name: string;
  started_at: string;
  expires_at: string;
  status: string;
}

export interface AdminStats {
  total_users: number;
  total_stories: number;
  total_chapters: number;
  total_story_views: number;
  total_chapter_listens: number;
  total_revenue: number;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface AdminReport {
  id: string;
  user_id: string;
  reporter_username?: string;
  target_type: string;
  target_id: string;
  reason: string;
  description?: string;
  status: 'pending' | 'resolved' | 'rejected';
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CommunityPost {
  id: string;
  user_id: string;
  story_id?: string;
  topic: string;
  content: string;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  author_name: string;
  author_avatar?: string;
  author_role: string;
  cultivation_realm: string;
  cultivation_level: number;
  cultivation_color: string;
  story_title?: string;
  story_slug?: string;
  story_cover_url?: string;
  is_liked: boolean;
}

export interface CreateCommunityPostReq {
  story_id?: string;
  topic?: string;
  content: string;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id?: string;
  content: string;
  created_at: string;
  author_name: string;
  author_avatar?: string;
  author_role: string;
  cultivation_realm: string;
  cultivation_level: number;
  cultivation_color: string;
}

