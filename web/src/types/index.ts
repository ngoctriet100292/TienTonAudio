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
  categories: (string | Category)[];
}

export interface AudioTimelineMarker {
  title: string;
  start_seconds: number;
}

export interface Chapter {
  id: string;
  story_id: string;
  chapter_number: number;
  title: string;
  content?: string;
  content_text?: string;
  content_url?: string;
  is_premium: boolean;
  duration_seconds: number;
  listen_count: number;
  narrator_id?: string;
  narrator_name?: string;
  timeline_markers?: AudioTimelineMarker[];
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
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
  tier: 'vo-dao' | 'tu-tien' | 'tien-gioi';
  tier_name: string;
  ability: string;
  privilege: string;
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
  timeline_markers?: AudioTimelineMarker[];
  raw_timestamps?: string;
}

export interface SubscriptionPlan {
  checkout_available?: boolean;
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

export interface Playlist {
  id: string;
  user_id?: string;
  name: string;
  is_public: boolean;
  total_items: number;
  created_at: string;
  updated_at: string;
}

export interface PlaylistItemDetail {
  playlist_id: string;
  chapter_id: string;
  position: number;
  added_at: string;
  chapter_title: string;
  chapter_number: number;
  duration_seconds: number;
  listen_count?: number;
  is_premium?: boolean;
  story_id: string;
  story_title: string;
  cover_image_url?: string;
}

export interface PlaylistDetail {
  playlist: Playlist;
  items: PlaylistItemDetail[];
}

export interface CreatePlaylistReq {
  name: string;
  is_public?: boolean;
}

export interface CreateReportReq {
  target_type: 'chapter' | 'comment' | 'story';
  target_id: string;
  reason: string;
  description?: string;
}

export interface FollowedAuthor {
  id: string;
  name: string;
  bio?: string;
  avatar_url?: string;
  created_at: string;
}

export interface FollowedNarrator {
  id: string;
  name: string;
  bio?: string;
  avatar_url?: string;
  created_at: string;
}

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';
export interface ChapterComment {
  id: string;
  user_id?: string;
  username: string;
  avatar_url?: string;
  chapter_id?: string;
  parent_id?: string;
  content: string;
  audio_timestamp_seconds?: number;
  cultivation_realm?: string;
  reply_count: number;
  total_reactions: number;
  reactions: Record<string, number>;
  user_reaction?: ReactionType | null;
  created_at: string;
}
export interface CommentReactionResponse {
  action: string;
  reaction_type?: ReactionType;
  total_reactions: number;
  reactions: Record<string, number>;
}
export interface PlaybackSpeed { value: number; label: string; description: string }
export interface PlaybackSpeedsResponse { default_speed: number; speeds: PlaybackSpeed[] }
export interface SignedStreamResponse {
  chapter_id: string;
  quality: string;
  stream_url: string;
  expires_at: string;
  playback_speed: number;
  available_speeds: PlaybackSpeed[];
}
export interface ChapterAudioFile { id: string; chapter_id: string; quality: string; audio_url?: string }
export interface StoryRealmsResponse { story_id: string; story_name: string; realms: string }
export interface TwoFactorSetupResponse { secret: string; qr_code_url: string }
export interface TokenResponse { access_token: string; refresh_token: string; expires_at: string; token_type: string }
export interface AuthenticatedResponse { user: User; tokens: TokenResponse }
export type LoginResponse = (AuthenticatedResponse & { mfa_required: false }) | { mfa_required: true; mfa_token: string };

export type OAuthLoginResponse = LoginResponse & { redirect_path?: string } | { verification_required: true; email: string; redirect_path?: string };
export type OAuthProvider = 'google' | 'facebook' | 'apple';
