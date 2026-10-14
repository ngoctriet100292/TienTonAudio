import type { AuthenticatedResponse, ChapterAudioFile, ChapterComment, CommentReactionResponse, LoginResponse, PlaybackSpeedsResponse, SignedStreamResponse, StoryRealmsResponse, TwoFactorSetupResponse } from '@/types';
import { AdminReport, AdminStats, AdminUser, Category, Chapter, CommunityComment, CommunityPost, CreateCommunityPostReq, CreatePartnerChapterReq, CreatePartnerStoryReq, CreatePaymentResp, CreatePlaylistReq, CreateReportReq, CultivationRealmInfo, FavoriteStoryItem, FollowedAuthor, FollowedNarrator, ListeningHistoryItem, NotificationItem, PartnerStats, PartnerStoryItem, PaymentHistoryItem, PaymentStatusResp, Playlist, PlaylistDetail, Story, SubscriptionPlan, User, UserCultivation, UserSubscription } from '@/types';
import { ApiError, getErrorMessage } from './errors';

const API_BASE_URL = (typeof window === 'undefined' ? process.env.API_INTERNAL_ORIGIN && `${process.env.API_INTERNAL_ORIGIN}/api/v1` : undefined) || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

type ListResponse<T> = T[] | { items?: T[]; data?: T[]; total?: number };
function toList<T>(response: ListResponse<T>): T[] {
  if (Array.isArray(response)) return response;
  return response.items || response.data || [];
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  }

  private refreshPromise: Promise<string | null> | null = null;

  private refreshToken(): Promise<string | null> {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = this.rotateRefreshToken().finally(() => { this.refreshPromise = null; });
    return this.refreshPromise;
  }

  private async rotateRefreshToken(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return null;
    const res = await fetch(`${this.baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) {
      if ((res.status === 401 || res.status === 403) && localStorage.getItem('refresh_token') === refreshToken) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_profile');
        window.dispatchEvent(new Event('tienton-session-change'));
        return null;
      }
      throw new ApiError('Không thể làm mới phiên đăng nhập. Vui lòng thử lại.', res.status);
    }
    const json = await res.json();
    const tokens = json.data || json;
    if (!tokens?.access_token || !tokens?.refresh_token) throw new ApiError('Phản hồi làm mới phiên không hợp lệ', 502);
    // A logout or new login while this request was pending must not resurrect the old session.
    if (localStorage.getItem('refresh_token') !== refreshToken) return this.getToken();
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
    return tokens.access_token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}, isRetry = false): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    const token = this.getToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (res.status === 401 && !isRetry && token && !endpoint.startsWith('/auth/')) {
      const currentToken = this.getToken();
      const newToken = currentToken && currentToken !== token ? currentToken : await this.refreshToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        return this.request<T>(endpoint, { ...options, headers }, true);
      }
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new ApiError(errorData.error || errorData.message || `Lỗi yêu cầu: ${res.status}`, res.status);
    }

    const data = await res.json();
    return data.data !== undefined ? data.data : data;
  }

  // ---- STORIES ----
  async getStories(page = 1, limit = 20): Promise<Story[]> {
    try {
      const res = await this.request<ListResponse<Story>>(`/stories?page=${page}&limit=${limit}`, {
        next: { revalidate: 30 },
      });
      return toList(res);
    } catch {
      return [];
    }
  }

  async getTopViewStories(limit = 10): Promise<Story[]> {
    try {
      const res = await this.request<ListResponse<Story>>(`/stories/top-views?limit=${limit}`, {
        next: { revalidate: 30 },
      });
      return toList(res);
    } catch {
      return [];
    }
  }

  async getStoryBySlug(slug: string): Promise<Story | null> {
    try {
      return await this.request<Story>(`/stories/${slug}`, {
        next: { revalidate: 30 },
      });
    } catch {
      return null;
    }
  }

  async getStoryChapters(storyId: string, page = 1, limit = 1000): Promise<Chapter[]> {
    try {
      const res = await this.request<ListResponse<Chapter>>(`/stories/${storyId}/chapters?page=${page}&limit=${limit}`, {
        next: { revalidate: 30 },
      });
      return toList(res);
    } catch {
      return [];
    }
  }

  async getRelatedStories(storyId: string, limit = 6): Promise<Story[]> {
    try {
      const res = await this.request<ListResponse<Story>>(`/stories/${storyId}/related?limit=${limit}`);
      return toList(res);
    } catch {
      return [];
    }
  }

  async searchStories(query: string): Promise<Story[]> {
    try {
      const res = await this.request<ListResponse<Story>>(`/stories/search?q=${encodeURIComponent(query)}`);
      return toList(res);
    } catch {
      return [];
    }
  }

  async filterStories(params: {
    category_id?: number;
    status?: string;
    sort_by?: string;
    page?: number;
    limit?: number;
  }): Promise<Story[]> {
    try {
      const q = new URLSearchParams();
      if (params.category_id) q.set('category_id', params.category_id.toString());
      if (params.status) q.set('status', params.status);
      if (params.sort_by) q.set('sort_by', params.sort_by);
      q.set('page', (params.page || 1).toString());
      q.set('limit', (params.limit || 20).toString());

      const res = await this.request<ListResponse<Story>>(`/stories/filter?${q.toString()}`);
      return toList(res);
    } catch {
      return [];
    }
  }

  // ---- CHAPTERS & STREAMING ----
  async getChapter(id: string): Promise<Chapter | null> {
    try {
      return await this.request<Chapter>(`/chapters/${id}`);
    } catch {
      return null;
    }
  }

  async getSignedStreamUrl(
    chapterId: string,
    quality = '320kbps',
    speed = 1.0
  ): Promise<SignedStreamResponse> {
    return this.request<SignedStreamResponse>(`/chapters/${chapterId}/stream?quality=${quality}&speed=${speed}&format=json`);
  }

  async getPlaybackSpeeds(): Promise<{ default_speed: number; speeds: Array<{ value: number; label: string; description: string }> }> {
    try {
      return await this.request<PlaybackSpeedsResponse>('/chapters/playback-speeds');
    } catch {
      return {
        default_speed: 1.0,
        speeds: [
          { value: 0.5, label: '0.5x', description: 'Rất chậm' },
          { value: 0.75, label: '0.75x', description: 'Chậm' },
          { value: 1.0, label: '1.0x', description: 'Chuẩn' },
          { value: 1.25, label: '1.25x', description: 'Hơi nhanh' },
          { value: 1.5, label: '1.5x', description: 'Nhanh' },
          { value: 1.75, label: '1.75x', description: 'Rất nhanh' },
          { value: 2.0, label: '2.0x', description: 'Tốc biến x2' },
        ],
      };
    }
  }

  async saveListeningProgress(
    chapterId: string,
    progressSeconds: number,
    isCompleted = false,
    speed = 1.0,
    storyId?: string
  ): Promise<void> {
    try {
      await this.request('/chapters/progress', {
        method: 'POST',
        body: JSON.stringify({
          chapter_id: chapterId,
          story_id: storyId,
          last_position_seconds: progressSeconds,
          playback_speed: speed,
          is_completed: isCompleted,
        }),
      });
    } catch (e) {
      console.warn('Cannot save progress:', e);
    }
  }

  // ---- COMMENTS ----
  async getChapterComments(chapterId: string, page = 1, limit = 20): Promise<ChapterComment[]> {
    try {
      const res = await this.request<ListResponse<ChapterComment>>(`/chapters/${chapterId}/comments?page=${page}&limit=${limit}`);
      return toList(res);
    } catch {
      return [];
    }
  }

  async createComment(chapterId: string, content: string): Promise<ChapterComment> {
    return this.request(`/chapters/${chapterId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ chapter_id: chapterId, content }),
    });
  }

  async getCommentReplies(commentId: string, page = 1, limit = 20): Promise<ChapterComment[]> {
    try {
      const res = await this.request<ListResponse<ChapterComment>>(`/comments/${commentId}/replies?page=${page}&limit=${limit}`);
      return toList(res);
    } catch {
      return [];
    }
  }

  async replyComment(commentId: string, content: string): Promise<ChapterComment> {
    const res = await this.request<ChapterComment>(`/comments/${commentId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    return res;
  }

  async reactComment(commentId: string, reactionType = 'like'): Promise<CommentReactionResponse> {
    const res = await this.request<CommentReactionResponse>(`/comments/${commentId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ reaction_type: reactionType }),
    });
    return res;
  }

  // ---- FAVORITES ----
  async toggleFavorite(storyId: string): Promise<{ is_favorite: boolean }> {
    const res = await this.request<{ is_favorite: boolean }>(`/stories/${storyId}/favorite`, {
      method: 'POST',
    });
    return res;
  }

  async checkFavorite(storyId: string): Promise<{ is_favorite: boolean }> {
    try {
      const res = await this.request<{ is_favorite: boolean }>(`/stories/${storyId}/favorite`);
      return res;
    } catch {
      return { is_favorite: false };
    }
  }

  // ---- CATEGORIES ----
  async getCategories(): Promise<Category[]> {
    try {
      const res = await this.request<ListResponse<Category>>('/stories/categories');
      return toList(res);
    } catch {
      return [];
    }
  }

  // ---- AI ASSISTANT ----
  async askAI(prompt: string, storyId?: string): Promise<{ answer: string }> {
    return this.request<{ answer: string }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt, story_id: storyId }),
    });
  }

  async getStoryRealms(storyId: string): Promise<StoryRealmsResponse> {
    return this.request(`/ai/stories/${storyId}/realms`);
  }

  // ---- USER PROFILE ----
  async getMe(): Promise<User | null> {
    if (typeof window !== 'undefined' && !this.getToken()) return null;
    try {
      return await this.request<User>('/users/me', { cache: 'no-store' });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_profile');
        window.dispatchEvent(new Event('tienton-session-change'));
        return null;
      }
      throw error;
    }
  }

  async logout(refreshToken: string): Promise<void> {
    await this.request('/auth/logout', { method: 'POST', body: JSON.stringify({ refresh_token: refreshToken }) });
  }

  // ---- CULTIVATION (TU VI) ----
  async getCultivation(): Promise<UserCultivation | null> {
    try {
      return await this.request<UserCultivation>('/users/cultivation');
    } catch {
      return null;
    }
  }

  async getCultivationRealms(): Promise<CultivationRealmInfo[]> {
    try {
      const res = await this.request<ListResponse<CultivationRealmInfo>>('/cultivation/realms');
      return toList(res);
    } catch {
      return [];
    }
  }

  // ---- USER ACTIONS (AVATAR, FAVORITES, HISTORY, PAYMENTS) ----
  async uploadAvatar(file: File, isRetry = false): Promise<{ avatar_url: string; user?: User }> {
    const token = this.getToken();
    const formData = new FormData();
    formData.append('avatar', file);

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${this.baseUrl}/users/avatar`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (res.status === 401 && !isRetry) {
      const newToken = await this.refreshToken();
      if (newToken) {
        return this.uploadAvatar(file, true);
      }
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.message || 'Lỗi tải ảnh đại diện lên');
    }
    return data.data || data;
  }

  async updateProfile(body: { username?: string; avatar_url?: string }): Promise<User> {
    return this.request<User>('/users/me', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async updatePassword(body: { old_password?: string; new_password?: string }): Promise<void> {
    await this.request('/users/password', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async getMySubscription(): Promise<UserSubscription | null> {
    try {
      return await this.request<UserSubscription | null>('/payments/my-subscription');
    } catch {
      return null;
    }
  }

  async setup2FA(): Promise<{ secret: string; qr_code_url: string }> {
    const res = await this.request<TwoFactorSetupResponse>('/auth/2fa/setup', {
      method: 'POST',
    });
    return res;
  }

  async enable2FA(secret: string, code: string): Promise<{ backup_codes: string[] }> {
    const res = await this.request<{ backup_codes: string[] }>('/auth/2fa/enable', {
      method: 'POST',
      body: JSON.stringify({ secret, code }),
    });
    return res;
  }

  async disable2FA(code: string): Promise<void> {
    await this.request('/auth/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async getUserFavorites(): Promise<FavoriteStoryItem[]> {
    try {
      const res = await this.request<ListResponse<FavoriteStoryItem>>('/users/favorites');
      return toList(res);
    } catch {
      return [];
    }
  }

  async getUserHistory(): Promise<ListeningHistoryItem[]> {
    try {
      const res = await this.request<ListResponse<ListeningHistoryItem>>('/users/history');
      return toList(res);
    } catch {
      return [];
    }
  }

  async getUserPayments(): Promise<PaymentHistoryItem[]> {
    try {
      const res = await this.request<ListResponse<PaymentHistoryItem>>('/payments/history');
      return toList(res);
    } catch {
      return [];
    }
  }

  // ---- NOTIFICATIONS ----
  async getNotifications(page = 1, limit = 20): Promise<NotificationItem[]> {
    try {
      const res = await this.request<ListResponse<NotificationItem>>(`/notifications?page=${page}&limit=${limit}`);
      return toList(res);
    } catch {
      return [];
    }
  }

  async getUnreadNotificationCount(): Promise<number> {
    try {
      const res = await this.request<{ unread_count: number }>('/notifications/unread-count');
      if (res && typeof res.unread_count === 'number') return res.unread_count;
      return 0;
    } catch {
      return 0;
    }
  }

  async markNotificationAsRead(id: string): Promise<boolean> {
    try {
      await this.request(`/notifications/${id}/read`, { method: 'PUT' });
      return true;
    } catch {
      return false;
    }
  }

  async markAllNotificationsAsRead(): Promise<boolean> {
    try {
      await this.request('/notifications/read-all', { method: 'PUT' });
      return true;
    } catch {
      return false;
    }
  }

  // ---- PARTNER / CREATOR STUDIO ----
  async becomePartner(): Promise<{ user_id: string; role: string }> {
    return await this.request<{ user_id: string; role: string }>('/partner/become-partner', {
      method: 'POST',
    });
  }

  async getPartnerStats(): Promise<PartnerStats> {
    try {
      const res = await this.request<PartnerStats>('/partner/stats');
      return res || { total_stories: 0, total_chapters: 0, total_views: 0, total_listens: 0, is_admin: false };
    } catch {
      return { total_stories: 0, total_chapters: 0, total_views: 0, total_listens: 0, is_admin: false };
    }
  }

  async getPartnerStories(): Promise<PartnerStoryItem[]> {
    try {
      const res = await this.request<ListResponse<PartnerStoryItem>>('/partner/stories');
      return toList(res);
    } catch {
      return [];
    }
  }

  async createPartnerStory(data: CreatePartnerStoryReq): Promise<{ id: string; slug: string }> {
    return await this.request<{ id: string; slug: string }>('/partner/stories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePartnerStory(id: string, data: Partial<CreatePartnerStoryReq>): Promise<boolean> {
    try {
      await this.request(`/partner/stories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return true;
    } catch {
      return false;
    }
  }

  async deletePartnerStory(id: string): Promise<boolean> {
    try {
      await this.request(`/partner/stories/${id}`, {
        method: 'DELETE',
      });
      return true;
    } catch {
      return false;
    }
  }

  async getPartnerStoryChapters(storyId: string): Promise<Chapter[]> {
    try {
      const res = await this.request<ListResponse<Chapter>>(`/partner/stories/${storyId}/chapters`);
      return toList(res);
    } catch {
      return [];
    }
  }

  async createPartnerChapter(storyId: string, data: CreatePartnerChapterReq): Promise<Chapter> {
    return await this.request<Chapter>(`/partner/stories/${storyId}/chapters`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async attachPartnerChapterAudio(chapterId: string, audioUrl: string, durationSeconds?: number): Promise<ChapterAudioFile> {
    return await this.request<ChapterAudioFile>(`/partner/chapters/${chapterId}/audio`, {
      method: 'POST',
      body: JSON.stringify({ audio_url: audioUrl, duration_seconds: durationSeconds || 0 }),
    });
  }

  async deletePartnerChapter(chapterId: string): Promise<unknown> {
    return await this.request<unknown>(`/partner/chapters/${chapterId}`, {
      method: 'DELETE',
    });
  }

  async uploadPartnerCover(file: File): Promise<string> {
    const token = this.getToken();
    if (!token) {
      throw new Error('Vui lòng đăng nhập lại tài khoản để tải ảnh bìa');
    }

    const formData = new FormData();
    formData.append('cover', file);

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/partner/upload-cover`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
    } catch (networkErr: unknown) {
      throw new Error(
        getErrorMessage(networkErr) === 'Load failed' || getErrorMessage(networkErr) === 'Failed to fetch'
          ? 'Không thể kết nối đến máy chủ backend (http://localhost:8080). Hãy đảm bảo backend đang chạy.'
          : (getErrorMessage(networkErr) || 'Lỗi mạng khi tải ảnh bìa')
      );
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || errData.message || `Lỗi tải ảnh bìa lên (mã lỗi: ${res.status})`);
    }

    const data = await res.json();
    return data.data?.url || data.url || '';
  }

  async uploadPartnerAudio(
    file: File,
    onProgress?: (percent: number, loadedBytes: number, totalBytes: number) => void
  ): Promise<string> {
    const token = this.getToken();
    if (!token) {
      throw new Error('Vui lòng đăng nhập lại tài khoản để có quyền tải file audio');
    }

    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.baseUrl}/partner/upload-audio`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent, event.loaded, event.total);
          }
        };
      }

      xhr.onload = () => {
        try {
          const resp = JSON.parse(xhr.responseText || '{}');
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(resp.data?.url || resp.url || '');
          } else {
            reject(
              new Error(
                resp.error ||
                resp.message ||
                `Lỗi tải file audio lên Cloudflare R2 (mã lỗi: ${xhr.status})`
              )
            );
          }
        } catch {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve('');
          } else {
            reject(new Error(`Máy chủ phản hồi lỗi (mã lỗi: ${xhr.status})`));
          }
        }
      };

      xhr.onerror = () => {
        reject(
          new Error(
            'Lỗi kết nối khi tải file audio lên máy chủ (Load failed). Vui lòng kiểm tra backend và đảm bảo đường truyền ổn định.'
          )
        );
      };

      xhr.ontimeout = () => {
        reject(new Error('Hết thời gian chờ khi tải file audio. Vui lòng thử lại.'));
      };

      const formData = new FormData();
      formData.append('audio', file);
      xhr.send(formData);
    });
  }

  // ---- THANH TOÁN & XÁC NHẬN TỰ ĐỘNG (PAYMENTS & AUTO VERIFICATION) ----
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      const res = await this.request<ListResponse<SubscriptionPlan>>('/payments/plans');
      return toList(res);
    } catch {
      return [];
    }
  }

  async createPayment(planId: number, provider: string = 'vietqr'): Promise<CreatePaymentResp> {
    return await this.request<CreatePaymentResp>('/payments/create', {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId, provider }),
    });
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatusResp> {
    return await this.request<PaymentStatusResp>(`/payments/${paymentId}/status`);
  }

  async getActiveSubscription(): Promise<UserSubscription | null> {
    try {
      return await this.request<UserSubscription>('/payments/my-subscription');
    } catch {
      return null;
    }
  }

  // ---- QUẢN TRỊ VIÊN ADMIN PORTAL ----
  async getAdminStats(): Promise<AdminStats> {
    return await this.request<AdminStats>('/admin/stats');
  }

  async getAdminUsers(page: number = 1, limit: number = 50): Promise<{ items: AdminUser[]; total?: number }> {
    const res = await this.request<ListResponse<AdminUser>>(`/admin/users?page=${page}&limit=${limit}`);
    return { items: toList(res), total: Array.isArray(res) ? undefined : res.total };
  }

  async updateUserRole(userId: string, role: string): Promise<AdminUser> {
    return await this.request<AdminUser>(`/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  async getAdminReports(): Promise<AdminReport[]> {
    try {
      const res = await this.request<ListResponse<AdminReport>>('/admin/reports');
      return toList(res);
    } catch {
      return [];
    }
  }

  async updateReportStatus(reportId: string, status: string, notes?: string): Promise<AdminReport> {
    return await this.request<AdminReport>(`/admin/reports/${reportId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, admin_notes: notes }),
    });
  }

  // ---- MẠNG XÃ HỘI TIÊN HIỆP: LUẬN ĐẠO CÁC (COMMUNITY) ----
  async getCommunityPosts(topic?: string, page: number = 1, limit: number = 30): Promise<CommunityPost[]> {
    try {
      const q = new URLSearchParams();
      if (topic && topic !== 'all') q.set('topic', topic);
      q.set('page', page.toString());
      q.set('limit', limit.toString());

      const res = await this.request<ListResponse<CommunityPost>>(`/community/posts?${q.toString()}`);
      return toList(res);
    } catch {
      return [];
    }
  }

  async createCommunityPost(data: CreateCommunityPostReq): Promise<CommunityPost> {
    const res = await this.request<CommunityPost>('/community/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res;
  }

  async getCommunityPost(id: string): Promise<CommunityPost> {
    return await this.request<CommunityPost>(`/community/posts/${id}`);
  }

  async deleteCommunityPost(id: string): Promise<unknown> {
    return await this.request<unknown>(`/community/posts/${id}`, {
      method: 'DELETE',
    });
  }

  async togglePostLike(id: string): Promise<{ is_liked: boolean; like_count: number }> {
    return await this.request<{ is_liked: boolean; like_count: number }>(`/community/posts/${id}/like`, {
      method: 'POST',
    });
  }

  async getPostComments(postId: string): Promise<CommunityComment[]> {
    try {
      const res = await this.request<ListResponse<CommunityComment>>(`/community/posts/${postId}/comments`);
      return toList(res);
    } catch {
      return [];
    }
  }

  async createPostComment(postId: string, content: string, parentId?: string): Promise<CommunityComment> {
    const res = await this.request<CommunityComment>(`/community/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, parent_id: parentId }),
    });
    return res;
  }

  // ---- DANH SÁCH PHÁT (PLAYLISTS) ----
  async getUserPlaylists(): Promise<Playlist[]> {
    try {
      const res = await this.request<ListResponse<Playlist>>('/playlists');
      return toList(res);
    } catch {
      return [];
    }
  }

  async createPlaylist(data: CreatePlaylistReq): Promise<Playlist> {
    const res = await this.request<Playlist>('/playlists', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res;
  }

  async getPlaylistDetail(id: string): Promise<PlaylistDetail> {
    return await this.request<PlaylistDetail>(`/playlists/${id}`);
  }

  async updatePlaylist(id: string, data: Partial<CreatePlaylistReq>): Promise<Playlist> {
    const res = await this.request<Playlist>(`/playlists/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res;
  }

  async deletePlaylist(id: string): Promise<unknown> {
    return await this.request<unknown>(`/playlists/${id}`, {
      method: 'DELETE',
    });
  }

  async addPlaylistItem(playlistId: string, chapterId: string): Promise<unknown> {
    return await this.request<unknown>(`/playlists/${playlistId}/items`, {
      method: 'POST',
      body: JSON.stringify({ chapter_id: chapterId }),
    });
  }

  async removePlaylistItem(playlistId: string, chapterId: string): Promise<unknown> {
    return await this.request<unknown>(`/playlists/${playlistId}/items/${chapterId}`, {
      method: 'DELETE',
    });
  }

  // ---- BÁO CÁO & KHIẾU NẠI (REPORTS) ----
  async createReport(data: CreateReportReq): Promise<unknown> {
    return await this.request<unknown>('/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ---- THEO DÕI TÁC GIẢ & MC (FOLLOW) ----
  async getFollowedAuthors(): Promise<FollowedAuthor[]> {
    try {
      const res = await this.request<ListResponse<FollowedAuthor>>('/users/following-authors');
      return toList(res);
    } catch {
      return [];
    }
  }

  async getFollowedNarrators(): Promise<FollowedNarrator[]> {
    try {
      const res = await this.request<ListResponse<FollowedNarrator>>('/users/following-narrators');
      return toList(res);
    } catch {
      return [];
    }
  }

  async toggleFollowAuthor(authorId: string): Promise<{ is_following: boolean }> {
    return await this.request<{ is_following: boolean }>(`/authors/${authorId}/follow`, {
      method: 'POST',
    });
  }

  async toggleFollowNarrator(narratorId: string): Promise<{ is_following: boolean }> {
    return await this.request<{ is_following: boolean }>(`/narrators/${narratorId}/follow`, {
      method: 'POST',
    });
  }

  // ---- QUÊN & ĐẶT LẠI MẬT KHẨU (PASSWORD RECOVERY) ----
  async forgotPassword(email: string): Promise<unknown> {
    return await this.request<unknown>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, new_password: string): Promise<unknown> {
    return await this.request<unknown>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password }),
    });
  }

  // ---- ĐĂNG NHẬP, ĐĂNG KÝ & XÁC THỰC EMAIL/2FA ----
  async login(email: string, password: string): Promise<LoginResponse> {
    return await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(username: string, email: string, password: string): Promise<{ user: User }> {
    return await this.request<{ user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
  }

  async socialLogin(data: {
    provider: string;
    email: string;
    name: string;
    provider_user_id: string;
    avatar_url?: string;
  }): Promise<AuthenticatedResponse> {
    return await this.request<AuthenticatedResponse>('/auth/social', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyTwoFactorLogin(mfa_token: string, code: string): Promise<AuthenticatedResponse> {
    return await this.request<AuthenticatedResponse>('/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ mfa_token, code }),
    });
  }

  async verifyEmail(token: string): Promise<unknown> {
    return await this.request<unknown>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async resendVerificationEmail(email: string): Promise<unknown> {
    return await this.request<unknown>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }
}

export const api = new ApiClient(API_BASE_URL);

export function getFullAvatarUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const backendBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:8080';
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return `${backendBase}${cleanUrl}`;
}

