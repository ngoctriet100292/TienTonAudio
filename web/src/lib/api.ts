import { Story, Chapter, Category } from '@/types';

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

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
        next: { revalidate: 60 },
      });
      return res.items || res;
    } catch {
      return [];
    }
  }

  async getTopViewStories(limit = 10): Promise<Story[]> {
    try {
      const res = await this.request<any>(`/stories/top-views?limit=${limit}`, {
        next: { revalidate: 300 },
      });
      return res.items || res;
    } catch {
      return [];
    }
  }

  async getStoryBySlug(slug: string): Promise<Story | null> {
    try {
      return await this.request<Story>(`/stories/${slug}`, {
        next: { revalidate: 60 },
      });
    } catch {
      return null;
    }
  }

  async getStoryChapters(storyId: string, page = 1, limit = 100): Promise<Chapter[]> {
    try {
      const res = await this.request<any>(`/stories/${storyId}/chapters?page=${page}&limit=${limit}`, {
        next: { revalidate: 60 },
      });
      return res.items || res;
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

  async getSignedStreamUrl(chapterId: string, quality = '128k'): Promise<{ signed_url: string; expires_at: string }> {
    return this.request<{ signed_url: string; expires_at: string }>(`/chapters/${chapterId}/stream?quality=${quality}`);
  }

  async saveListeningProgress(chapterId: string, progressSeconds: number, isCompleted = false): Promise<void> {
    try {
      await this.request('/chapters/progress', {
        method: 'POST',
        body: JSON.stringify({
          chapter_id: chapterId,
          progress_seconds: progressSeconds,
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
      body: JSON.stringify({ content }),
    });
  }

  async reactComment(commentId: string, type: 'like' | 'heart' | 'laugh' | 'cry'): Promise<void> {
    await this.request(`/comments/${commentId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
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

  // ---- PAYMENTS / VIP ----
  async getVipPlans(): Promise<any[]> {
    try {
      const res = await this.request<any>('/payments/plans');
      return res.items || res;
    } catch {
      return [
        { id: '1-month', name: 'Đồng Đan (1 Tháng)', price: 49000, duration_days: 30 },
        { id: '3-months', name: 'Kim Đan (3 Tháng)', price: 129000, duration_days: 90 },
        { id: '1-year', name: 'Tiên Vương (1 Năm)', price: 449000, duration_days: 365 },
      ];
    }
  }

  async createPayment(planId: string, provider: 'vnpay' | 'momo' | 'stripe'): Promise<{ checkout_url: string }> {
    return this.request<{ checkout_url: string }>('/payments/create', {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId, provider }),
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
