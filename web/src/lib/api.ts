import type {Page} from './pagination';
import type { AuthenticatedResponse, ChapterAudioFile, ChapterComment, CommentReactionResponse, LoginResponse, PlaybackSpeedsResponse, SignedStreamResponse, StoryRealmsResponse, TwoFactorSetupResponse, OAuthLoginResponse, OAuthProvider } from '@/types';
import { AdminReport, AdminStats, AdminUser, Category, Chapter, CommunityComment, CommunityPost, CreateCommunityPostReq, CreatePartnerChapterReq, CreatePartnerStoryReq, CreatePaymentResp, CreatePlaylistReq, CreateReportReq, CultivationRealmInfo, FavoriteStoryItem, FollowedAuthor, FollowedNarrator, ListeningHistoryItem, NotificationItem, PartnerStats, PartnerStoryItem, PaymentHistoryItem, PaymentStatusResp, Playlist, PlaylistDetail, Story, SubscriptionPlan, User, UserCultivation, UserSubscription } from '@/types';
import { ApiError } from './errors';

const API_BASE_URL = (typeof window === 'undefined' ? process.env.API_INTERNAL_ORIGIN && `${process.env.API_INTERNAL_ORIGIN}/api/v1` : undefined) || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

type ListResponse<T> = T[] | { items?: T[]; data?: T[]; total?: number };
function toList<T>(response: ListResponse<T>): T[] {
  if (!response || typeof response !== 'object') throw new ApiError('Phản hồi danh sách không hợp lệ', 502);
  if (Array.isArray(response)) return response;
  return response.items || response.data || [];
}

function normalizeStory(story: Story): Story {
  const count = (value: number) => Number.isFinite(value) ? value : 0;
  return { ...story, view_count: count(story.view_count), total_chapters: count(story.total_chapters), rating_avg: count(story.rating_avg), rating_count: count(story.rating_count), favorite_count: count(story.favorite_count), categories: Array.isArray(story.categories) ? story.categories : [] };
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private csrfToken: string | null = null;
  private csrfPromise: Promise<string> | null = null;
  private refreshPromise: Promise<boolean> | null = null;
  private sessionQueue: Promise<unknown> = Promise.resolve();

  private sessionState(): { authenticated: boolean; stamp: string } | null {
    if (typeof window === 'undefined') return null;
    try { return JSON.parse(localStorage.getItem('tienton_session_revision') || 'null'); } catch { return null; }
  }
  private markSession(authenticated: boolean, force = false) {
    if (typeof window === 'undefined') return;
    if (force || this.sessionState()?.authenticated !== authenticated) {
      localStorage.setItem('tienton_session_revision', JSON.stringify({authenticated, stamp: `${Date.now()}:${Math.random()}`}));
    }
  }
  private async withSessionLock<T>(work: () => Promise<T>): Promise<T> {
    if (typeof navigator !== 'undefined' && navigator.locks) {
      return await navigator.locks.request(`tienton-session:${this.baseUrl}`, work);
    }
    const next = this.sessionQueue.then(work, work);
    this.sessionQueue = next.catch(() => {});
    return next;
  }
  async prepareBrowserSession(): Promise<string> {
    if (this.csrfToken) return this.csrfToken;
    if (this.csrfPromise) return this.csrfPromise;
    this.csrfPromise = (async () => {
      const res = await fetch(`${this.baseUrl}/auth/csrf`, {credentials:'include',cache:'no-store',signal:AbortSignal.timeout(15000)});
      const data = await res.json();
      if (!res.ok || !data.data?.csrf_token) throw new ApiError('Không khởi tạo được phiên bảo vệ. Vui lòng thử lại.', res.status);
      this.csrfToken = data.data.csrf_token;
      return this.csrfToken as string;
    })().finally(() => {this.csrfPromise = null;});
    return this.csrfPromise;
  }
  private refreshToken(force = false): Promise<boolean> {
    if (this.refreshPromise) return this.refreshPromise;
    const before = this.sessionState()?.stamp;
    this.refreshPromise = this.withSessionLock(async () => {
      const current = this.sessionState();
      if (!force && current?.stamp !== before) return current?.authenticated === true;
      const send = async () => {
        const csrf = await this.prepareBrowserSession();
        return fetch(`${this.baseUrl}/auth/refresh`, {method:'POST',credentials:'include',headers:{'Content-Type':'application/json','X-Session-Mode':'cookie','X-CSRF-Token':csrf},body:'{}',signal:AbortSignal.timeout(15000)});
      };
      let res = await send();
      if (res.status === 403) {
        const failure = await res.clone().json().catch(() => ({}));
        if (failure.code === 'csrf_failed') {this.csrfToken = null;res = await send();}
      }
      if (res.status === 401) {
        this.markSession(false);
        if(current?.authenticated)window.dispatchEvent(new Event('tienton-session-change'));
        return false;
      }
      if (!res.ok) throw new ApiError('Không thể làm mới phiên đăng nhập. Vui lòng thử lại.',res.status);
      this.markSession(true,true);
      return true;
    }).finally(() => {this.refreshPromise = null;});
    return this.refreshPromise;
  }
  private async request<T>(endpoint: string, options: RequestInit = {}, isRetry = false, locked = false, csrfRetried = false): Promise<T> {
    const browser = typeof window !== 'undefined';
    const sessionMutation = ['/auth/login','/auth/logout','/auth/2fa/verify','/auth/oauth/exchange'].includes(endpoint);
    if (browser && sessionMutation && !locked) return this.withSessionLock(() => this.request<T>(endpoint,options,isRetry,true,csrfRetried));
    const multipart = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers: Record<string,string> = {...(multipart ? {} : {'Content-Type':'application/json'}), ...((options.headers as Record<string,string>) || {})};
    if (browser) {
      headers['X-Session-Mode']='cookie';
      if (!['GET','HEAD','OPTIONS'].includes(options.method || 'GET')) headers['X-CSRF-Token']=await this.prepareBrowserSession();
    }
    const stamp = this.sessionState()?.stamp;
    const res = await fetch(`${this.baseUrl}${endpoint}`, {...options,credentials:browser?'include':options.credentials,headers,signal:options.signal || AbortSignal.timeout(15000)});
    if (res.status===401 && browser && !isRetry && (!endpoint.startsWith('/auth/') || /^\/auth\/oauth\/(google|facebook|apple)\/link$/.test(endpoint))) {
      const current=this.sessionState();
      const renewed=current?.stamp!==stamp ? current?.authenticated===true : await this.refreshToken();
      if(renewed)return this.request<T>(endpoint,options,true,locked,csrfRetried);
    }
    if (!res.ok) {
      const errorData=await res.json().catch(()=>({}));
      if(browser && res.status===403 && errorData.code==='csrf_failed' && !csrfRetried){this.csrfToken=null;return this.request<T>(endpoint,options,isRetry,locked,true);}
      throw new ApiError(errorData.error || errorData.message || `Lỗi yêu cầu: ${res.status}`,res.status,errorData.code);
    }
    if (res.status===204){if(browser&&endpoint==='/auth/logout')this.markSession(false,true);return undefined as T;}
    const data=await res.json();const result=data.data!==undefined?data.data:data;
    if(browser && sessionMutation && (endpoint==='/auth/logout' || result.cookie_session===true))this.markSession(endpoint!=='/auth/logout',true);
    return result;
  }

  platformRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, options);
  }
  async searchCatalogue(params: URLSearchParams): Promise<Story[]> {
    return toList(await this.request<ListResponse<Story>>(`/catalogue/search?${params}`, {cache:'no-store'})).map(normalizeStory);
  }
  async searchCataloguePage(params:URLSearchParams):Promise<Page<Story>>{
    const data=await this.request<Page<Story>>(`/catalogue/search?${params}`,{cache:'no-store'});
    return {...data,items:data.items.map(normalizeStory)};
  }
  // ---- STORIES ----
  async getStories(page = 1, limit = 20): Promise<Story[]> {
    const res = await this.request<ListResponse<Story>>(`/stories?page=${page}&limit=${limit}`, {
      next: { revalidate: 30 },
    });
    return toList(res).map(normalizeStory);
  }

  async getTopViewStories(limit = 10): Promise<Story[]> {
    const res = await this.request<ListResponse<Story>>(`/stories/top-views?limit=${limit}`, {
      next: { revalidate: 30 },
    });
    return toList(res).map(normalizeStory);
  }

  async getStoryBySlug(slug: string): Promise<Story | null> {
    try {
      return normalizeStory(await this.request<Story>(`/stories/${encodeURIComponent(slug)}`, {
        next: { revalidate: 30 },
      }));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  }

  async getStoryChapters(storyId: string, page = 1, limit = 1000): Promise<Chapter[]> {
    const res = await this.request<ListResponse<Chapter>>(`/stories/${storyId}/chapters?page=${page}&limit=${limit}`, {
      next: { revalidate: 30 },
    });
    return toList(res);
  }

  async getRelatedStories(storyId: string, limit = 6): Promise<Story[]> {
    try {
      const res = await this.request<ListResponse<Story>>(`/stories/${storyId}/related?limit=${limit}`);
      return toList(res).map(normalizeStory);
    } catch {
      return [];
    }
  }

  async searchStories(query: string): Promise<Story[]> {
    const res = await this.request<ListResponse<Story>>(`/stories/search?q=${encodeURIComponent(query)}`);
    return toList(res).map(normalizeStory);
  }

  async filterStories(params: {
    category_id?: number;
    status?: string;
    sort_by?: string;
    page?: number;
    limit?: number;
  }): Promise<Story[]> {
    const q = new URLSearchParams();
    if (params.category_id) q.set('category_id', params.category_id.toString());
    if (params.status) q.set('status', params.status);
    if (params.sort_by) q.set('sort_by', params.sort_by);
    q.set('page', (params.page || 1).toString());
    q.set('limit', (params.limit || 20).toString());

    const res = await this.request<ListResponse<Story>>(`/stories/filter?${q.toString()}`);
    return toList(res).map(normalizeStory);
  }

  // ---- CHAPTERS & STREAMING ----
  async getChapter(id: string): Promise<Chapter | null> {
    try {
      if(typeof window!=='undefined' && this.sessionState()?.authenticated)await this.getMe();
      return await this.request<Chapter>(`/chapters/${encodeURIComponent(id)}`, { cache: 'no-store' });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  }

  async getSignedStreamUrl(
    chapterId: string,
    quality = '320kbps',
    speed = 1.0
  ): Promise<SignedStreamResponse> {
    if(typeof window!=='undefined' && this.sessionState()?.authenticated)await this.getMe();
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
    if (!this.sessionState()?.authenticated) return;
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

  flushListeningProgress(chapterId:string,position:number,completed:boolean,speed:number,storyId?:string):void{
    if(!this.csrfToken || !this.sessionState()?.authenticated)return;
    void fetch(`${this.baseUrl}/chapters/progress`,{method:'POST',credentials:'include',keepalive:true,headers:{'Content-Type':'application/json','X-Session-Mode':'cookie','X-CSRF-Token':this.csrfToken},body:JSON.stringify({chapter_id:chapterId,story_id:storyId,last_position_seconds:position,is_completed:completed,playback_speed:speed})}).catch(()=>{});
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
    const res = await this.request<ListResponse<Category>>('/stories/categories', { next: { revalidate: 30 } });
    return toList(res);
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
  async getMe(attempt=0): Promise<User | null> {
    const stamp=this.sessionState()?.stamp;
    try {
      const me = await this.request<User>('/users/me',{cache:'no-store'});
      const current=this.sessionState();
      if(current?.stamp!==stamp){if(current?.authenticated===false)return null;if(attempt<1)return this.getMe(attempt+1);return null;}
      this.markSession(true);
      return me;
    } catch(error) {
      if(error instanceof ApiError && error.status===401)return null;
      throw error;
    }
  }
  async logout(): Promise<void> {
    await this.request('/auth/logout',{method:'POST',body:'{}'});
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
    const res = await this.request<ListResponse<CultivationRealmInfo>>('/cultivation/realms');
    return toList(res);
  }

  // ---- USER ACTIONS (AVATAR, FAVORITES, HISTORY, PAYMENTS) ----
  async uploadAvatar(file: File): Promise<{avatar_url:string;user?:User}> {
    const body=new FormData();body.append('avatar',file);
    return this.request('/users/avatar',{method:'POST',body});
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
    const result = await this.request<{ user_id: string; role: string }>('/partner/become-partner', { method: 'POST' });
    // The current access token still contains the old role after activation.
    const renewed = await this.refreshToken(true);
    if (!renewed) throw new ApiError('Vui lòng đăng nhập lại để sử dụng quyền đối tác.', 401);
    return result;
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

  async uploadPartnerCover(file:File):Promise<string>{
    const body=new FormData();body.append('cover',file);
    const result=await this.request<{url:string}>('/partner/upload-cover',{method:'POST',body});return result.url;
  }

  async uploadPartnerAudio(
    file: File,
    onProgress?: (percent: number, loadedBytes: number, totalBytes: number) => void
  ): Promise<string> {
    const me=await this.getMe();if(!me)throw new ApiError('Vui lòng đăng nhập để tải audio.',401);
    const csrf = await this.prepareBrowserSession();

    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.baseUrl}/partner/upload-audio`);
      xhr.withCredentials = true;
      xhr.setRequestHeader('X-Session-Mode','cookie');
      xhr.setRequestHeader('X-CSRF-Token',csrf);

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
    const res = await this.request<ListResponse<SubscriptionPlan>>('/payments/plans');
    return toList(res);
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

  async getOAuthProviders(): Promise<Record<OAuthProvider, boolean>> {
    return this.request('/auth/oauth/providers');
  }
  getOAuthLoginURL(provider: OAuthProvider, redirect = '/'): string {
    return `${this.baseUrl}/auth/oauth/${provider}?redirect=${encodeURIComponent(redirect)}`;
  }
  private oauthExchanges = new Map<string, Promise<OAuthLoginResponse>>();
  exchangeOAuthCode(provider: OAuthProvider, code: string): Promise<OAuthLoginResponse> {
    const key = `${provider}:${code}`;
    const existing = this.oauthExchanges.get(key);
    if (existing) return existing;
    const request = this.request<OAuthLoginResponse>('/auth/oauth/exchange', { method: 'POST', credentials: 'include', body: JSON.stringify({ provider, code }) });
    this.oauthExchanges.set(key, request);
    return request;
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

