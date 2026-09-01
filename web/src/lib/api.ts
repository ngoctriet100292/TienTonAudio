import { Story, Chapter, Category, User, UserCultivation, CultivationRealmInfo, PaymentHistoryItem, FavoriteStoryItem, ListeningHistoryItem, NotificationItem, PartnerStats, PartnerStoryItem, CreatePartnerStoryReq, CreatePartnerChapterReq, SubscriptionPlan, CreatePaymentResp, PaymentStatusResp, UserSubscription } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

class ApiClient {
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

  private async refreshToken(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_profile');
        return null;
      }

      const json = await res.json();
      const tokens = json.data || json;
      if (tokens && tokens.access_token) {
        localStorage.setItem('access_token', tokens.access_token);
        if (tokens.refresh_token) {
          localStorage.setItem('refresh_token', tokens.refresh_token);
        }
        return tokens.access_token;
      }
    } catch {
      return null;
    }
    return null;
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

    if (res.status === 401 && !isRetry) {
      const newToken = await this.refreshToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        return this.request<T>(endpoint, { ...options, headers }, true);
      }
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `Lỗi yêu cầu: ${res.status}`);
    }

    const data = await res.json();
    return data.data !== undefined ? data.data : data;
  }

  // ---- STORIES ----
  async getStories(page = 1, limit = 20): Promise<Story[]> {
    try {
      const res = await this.request<any>(`/stories?page=${page}&limit=${limit}`, {
        next: { revalidate: 30 },
      });
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.items)) return res.items;
      return [];
    } catch {
      return [];
    }
  }

  async getTopViewStories(limit = 10): Promise<Story[]> {
    try {
      const res = await this.request<any>(`/stories/top-views?limit=${limit}`, {
        next: { revalidate: 30 },
      });
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.items)) return res.items;
      return [];
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
      const res = await this.request<any>(`/stories/${storyId}/chapters?page=${page}&limit=${limit}`, {
        next: { revalidate: 30 },
      });
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.items)) return res.items;
      return [];
    } catch {
      return [];
    }
  }

  async getRelatedStories(storyId: string, limit = 6): Promise<Story[]> {
    try {
      const res = await this.request<any>(`/stories/${storyId}/related?limit=${limit}`);
      return res.items || res;
    } catch {
      return [];
    }
  }

  async searchStories(query: string): Promise<Story[]> {
    try {
      const res = await this.request<any>(`/stories/search?q=${encodeURIComponent(query)}`);
      return res.items || res;
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

      const res = await this.request<any>(`/stories/filter?${q.toString()}`);
      return res.items || res;
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

  async getSignedStreamUrl(chapterId: string, quality = '128k', speed = 1.0): Promise<{ signed_url: string; expires_at: string; playback_speed: number; available_speeds: any[] }> {
    return this.request<any>(`/chapters/${chapterId}/stream?quality=${quality}&speed=${speed}`);
  }

  async getPlaybackSpeeds(): Promise<{ default_speed: number; speeds: Array<{ value: number; label: string; description: string }> }> {
    try {
      return await this.request<any>('/chapters/playback-speeds');
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

  async saveListeningProgress(chapterId: string, progressSeconds: number, isCompleted = false, speed = 1.0): Promise<void> {
    try {
      await this.request('/chapters/progress', {
        method: 'POST',
        body: JSON.stringify({
          chapter_id: chapterId,
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
  async getChapterComments(chapterId: string, page = 1, limit = 20): Promise<any[]> {
    try {
      const res = await this.request<any>(`/chapters/${chapterId}/comments?page=${page}&limit=${limit}`);
      return res.items || res;
    } catch {
      return [];
    }
  }

  async createComment(chapterId: string, content: string): Promise<any> {
    return this.request(`/chapters/${chapterId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ chapter_id: chapterId, content }),
    });
  }

  async getCommentReplies(commentId: string, page = 1, limit = 20): Promise<any[]> {
    try {
      const res = await this.request<any>(`/comments/${commentId}/replies?page=${page}&limit=${limit}`);
      return res.items || res.data || (Array.isArray(res) ? res : []);
    } catch {
      return [];
    }
  }

  async replyComment(commentId: string, content: string): Promise<any> {
    const res = await this.request<any>(`/comments/${commentId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    return res.data || res;
  }

  async reactComment(commentId: string, reactionType = 'like'): Promise<any> {
    const res = await this.request<any>(`/comments/${commentId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ reaction_type: reactionType }),
    });
    return res.data || res;
  }

  // ---- FAVORITES ----
  async toggleFavorite(storyId: string): Promise<{ is_favorite: boolean }> {
    const res = await this.request<any>(`/stories/${storyId}/favorite`, {
      method: 'POST',
    });
    return res.data || res;
  }

  async checkFavorite(storyId: string): Promise<{ is_favorite: boolean }> {
    try {
      const res = await this.request<any>(`/stories/${storyId}/favorite`);
      return res.data || res;
    } catch {
      return { is_favorite: false };
    }
  }

  // ---- CATEGORIES ----
  async getCategories(): Promise<Category[]> {
    try {
      const res = await this.request<any>('/stories/categories');
      return res.items || res;
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

  async getStoryRealms(storyId: string): Promise<any> {
    return this.request(`/ai/stories/${storyId}/realms`);
  }

  // ---- USER PROFILE ----
  async getMe(): Promise<User | null> {
    try {
      return await this.request<User>('/users/me');
    } catch {
      return null;
    }
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
      const res = await this.request<any>('/cultivation/realms');
      return res.items || res;
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

  async getMySubscription(): Promise<any> {
    try {
      return await this.request<any>('/payments/my-subscription');
    } catch {
      return null;
    }
  }

  async setup2FA(): Promise<{ secret: string; qr_code_url: string }> {
    const res = await this.request<any>('/auth/2fa/setup', {
      method: 'POST',
    });
    return res.data || res;
  }

  async enable2FA(code: string): Promise<{ backup_codes: string[] }> {
    const res = await this.request<any>('/auth/2fa/enable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    return res.data || res;
  }

  async disable2FA(code: string): Promise<void> {
    await this.request('/auth/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async getUserFavorites(): Promise<FavoriteStoryItem[]> {
    try {
      const res = await this.request<any>('/users/favorites');
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.items)) return res.items;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    } catch {
      return [];
    }
  }

  async getUserHistory(): Promise<ListeningHistoryItem[]> {
    try {
      const res = await this.request<any>('/users/history');
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.items)) return res.items;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    } catch {
      return [];
    }
  }

  async getUserPayments(): Promise<PaymentHistoryItem[]> {
    try {
      const res = await this.request<any>('/payments/history');
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.items)) return res.items;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    } catch {
      return [];
    }
  }

  // ---- NOTIFICATIONS ----
  async getNotifications(page = 1, limit = 20): Promise<NotificationItem[]> {
    try {
      const res = await this.request<any>(`/notifications?page=${page}&limit=${limit}`);
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.items)) return res.items;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    } catch {
      return [];
    }
  }

  async getUnreadNotificationCount(): Promise<number> {
    try {
      const res = await this.request<any>('/notifications/unread-count');
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
      const res = await this.request<any>('/partner/stories');
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.items)) return res.items;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
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
      const res = await this.request<any>(`/partner/stories/${storyId}/chapters`);
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.items)) return res.items;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
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

  async uploadPartnerCover(file: File): Promise<string> {
    const token = this.getToken();
    const formData = new FormData();
    formData.append('cover', file);

    const res = await fetch(`${this.baseUrl}/partner/upload-cover`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Không thể tải ảnh bìa lên');
    }

    const data = await res.json();
    return data.data?.url || data.url || '';
  }

  async uploadPartnerAudio(file: File): Promise<string> {
    const token = this.getToken();
    const formData = new FormData();
    formData.append('audio', file);

    const res = await fetch(`${this.baseUrl}/partner/upload-audio`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Không thể tải file audio lên Cloudflare R2');
    }

    const data = await res.json();
    return data.data?.url || data.url || '';
  }

  // ---- THANH TOÁN & XÁC NHẬN TỰ ĐỘNG (PAYMENTS & AUTO VERIFICATION) ----
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      const res = await this.request<any>('/payments/plans');
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.items)) return res.items;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
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

  async autoConfirmPayment(paymentId: string): Promise<PaymentStatusResp> {
    return await this.request<PaymentStatusResp>(`/payments/${paymentId}/confirm-auto`, {
      method: 'POST',
    });
  }

  async getActiveSubscription(): Promise<UserSubscription | null> {
    try {
      return await this.request<UserSubscription>('/payments/my-subscription');
    } catch {
      return null;
    }
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


