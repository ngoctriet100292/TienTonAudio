'use client';

import { REALM_COUNT } from '@/lib/cultivation';

import { MediaImage } from '@/components/media-image';

import { useAsyncResource } from '@/lib/use-async-resource';

import { getErrorMessage } from '@/lib/errors';

import { CultivationSpinner } from '@/components/cultivation-spinner';
import { useAuth } from '@/context/auth-context';
import { api, getFullAvatarUrl } from '@/lib/api';
import { CommunityComment, CommunityPost, Story } from '@/types';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Compass,
  Crown,
  Flame,
  Headphones,
  Heart,
  MessageSquare,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

const TOPICS = [
  { id: 'all', label: 'Tất Cả', icon: '✨' },
  { id: 'luan_dao', label: 'Luận Đạo', icon: '📜' },
  { id: 'review', label: 'Review Truyện', icon: '⭐' },
  { id: 'tim_truyen', label: 'Tìm Truyện', icon: '🔍' },
  { id: 'dot_pha', label: 'Đột Phá Tu Vi', icon: '⚡' },
  { id: 'tam_su', label: 'Tâm Sự Đồng Đạo', icon: '💬' },
];

export default function CommunityPage() {
  const router = useRouter();
  const { user, isAuthenticated, refreshProfile } = useAuth();

  const [selectedTopic, setSelectedTopic] = useState('all');
  const { data: posts, setData: setPosts, loading } = useAsyncResource<CommunityPost[]>(`community:${selectedTopic}:${user?.id || 'guest'}`, () => api.getCommunityPosts(selectedTopic, 1, 30), []);

  // Đăng bài state
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState('luan_dao');
  const [selectedStoryId, setSelectedStoryId] = useState<string>('');
  const { data: stories } = useAsyncResource<Story[]>('community-stories', () => api.getStories(1, 50), []);
  const [posting, setPosting] = useState(false);

  // Comments state map: postId -> comments list
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<{ [key: string]: CommunityComment[] }>({});
  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({});
  const [submittingComment, setSubmittingComment] = useState<{ [key: string]: boolean }>({});

  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3000);
  };


  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      router.push('/login?redirect=/community');
      return;
    }
    if (!content.trim() || content.trim().length < 5) {
      showToast('Nội dung luận đạo tối thiểu 5 ký tự', 'error');
      return;
    }

    setPosting(true);
    try {
      const newPost = await api.createCommunityPost({
        content: content.trim(),
        topic,
        story_id: selectedStoryId || undefined,
      });

      setPosts([newPost, ...posts]);
      setContent('');
      setSelectedStoryId('');
      showToast('Phát đàn luận đạo thành công! Đạo Hữu được cộng +50 Tu Vi EXP');
      if (refreshProfile) refreshProfile();
    } catch (err: unknown) {
      showToast(getErrorMessage(err) || 'Lỗi phát đàn luận đạo', 'error');
    } finally {
      setPosting(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/community');
      return;
    }

    try {
      const res = await api.togglePostLike(postId);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, is_liked: res.is_liked, like_count: res.like_count }
            : p
        )
      );
    } catch (err: unknown) {
      showToast(getErrorMessage(err) || 'Lỗi tương tác', 'error');
    }
  };

  const handleToggleComments = async (postId: string) => {
    if (activeCommentPostId === postId) {
      setActiveCommentPostId(null);
      return;
    }

    setActiveCommentPostId(postId);
    if (!commentsMap[postId]) {
      try {
        const comments = await api.getPostComments(postId);
        setCommentsMap((prev) => ({ ...prev, [postId]: comments }));
      } catch {
        // Fallback
      }
    }
  };

  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;
    if (!isAuthenticated) {
      router.push('/login?redirect=/community');
      return;
    }

    setSubmittingComment((prev) => ({ ...prev, [postId]: true }));
    try {
      const newComment = await api.createPostComment(postId, text);
      setCommentsMap((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment],
      }));
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p))
      );
      showToast('Gửi đàm đạo thành công (+10 Tu Vi)');
      if (refreshProfile) refreshProfile();
    } catch (err: unknown) {
      showToast(getErrorMessage(err) || 'Lỗi gửi bình luận', 'error');
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Đạo hữu có chắc chắn muốn thu hồi bài luận đạo này?')) return;

    try {
      await api.deleteCommunityPost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      showToast('Đã thu hồi bài luận đạo');
    } catch (err: unknown) {
      showToast(getErrorMessage(err) || 'Lỗi xóa bài', 'error');
    }
  };

  const handleShare = (postId: string) => {
    const url = `${window.location.origin}/community#post-${postId}`;
    navigator.clipboard.writeText(url);
    showToast('Đã sao chép liên kết bài luận đạo!');
  };

  const getTopicBadge = (top: string) => {
    switch (top) {
      case 'review':
        return { label: 'Review Truyện', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
      case 'tim_truyen':
        return { label: 'Tìm Truyện', color: 'bg-sky-500/20 text-sky-300 border-sky-500/30' };
      case 'dot_pha':
        return { label: 'Đột Phá', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      case 'tam_su':
        return { label: 'Tâm Sự', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
      default:
        return { label: 'Luận Đạo', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };



  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 pb-24 space-y-8">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed top-20 right-5 z-50 rounded-2xl px-4 py-3 text-xs font-bold shadow-2xl flex items-center gap-2 border animate-in fade-in slide-in-from-top-2 ${toastMsg.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40'
              : 'bg-rose-950/90 text-rose-300 border-rose-500/40'
            }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header Luận Đạo Các */}
      <div className="motion-card relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-r from-[#141b2b] via-[#0f172a] to-[#1c162e] p-8 shadow-2xl shadow-amber-500/10">
        <div className="absolute -right-16 -bottom-16 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-400">
            <Sparkles className="h-3.5 w-3.5" />
            TIÊN MÔN VẠN GIỚI • ĐẠO HỮU GIAO LƯU
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">
            Luận Đạo Các <span className="gold-text">Đàm Đạo Tu Tiên</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Thiên địa bất nhân dĩ vạn vật vi sô cẩu. Nơi chư vị đạo hữu cùng luận bàn đại đạo, review tuyệt phẩm audio, đàm đạo tình tiết và kết duyên đồng đạo.
          </p>
        </div>
      </div>

      {/* Layout Grid: 2 Cột (Main Feed 2/3 + Sidebar 1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* CỘT CHÍNH (FEED) */}
        <div className="lg:col-span-2 space-y-6">
          {/* KHUNG PHÁT ĐÀN LUẬN ĐẠO (CREATE POST) */}
          <div className="motion-card rounded-3xl border border-white/10 bg-[#0f172a]/90 p-5 sm:p-6 shadow-xl backdrop-blur-xl space-y-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-tr from-[#ffd166] to-[#ffb703] text-black font-black flex items-center justify-center flex-shrink-0">
                {user?.avatar_url ? (
                  <MediaImage src={getFullAvatarUrl(user.avatar_url)} alt={user.username} className="h-full w-full object-cover" />
                ) : (
                  user?.username?.[0]?.toUpperCase() || <User className="w-5 h-5" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  {user?.username || 'Vô Danh Đạo Hữu'}
                  {user?.cultivation_realm && (
                    <span
                      className="text-[11px] font-black px-2 py-0.5 rounded-full uppercase"
                      style={{
                        backgroundColor: `${user.cultivation_color || '#38BDF8'}20`,
                        color: user.cultivation_color || '#38BDF8',
                      }}
                    >
                      {user.cultivation_realm}
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-amber-400 font-medium">
                  {isAuthenticated ? 'Phát đàn luận đạo để nhận +50 Tu Vi' : 'Đăng nhập để giao lưu cùng chư vị'}
                </p>
              </div>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-3">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                placeholder="Chư vị đồng đạo hôm nay tu luyện thế nào? Có tuyệt phẩm nào tâm đắc muốn cùng luận bàn?..."
                className="w-full rounded-2xl bg-slate-900 border border-white/10 p-4 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none resize-none"
              />

              {/* Tùy chọn chủ đề & đính kèm truyện */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Chọn Chủ Đề */}
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="rounded-xl bg-slate-800 border border-white/10 px-3 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-amber-400"
                  >
                    <option value="luan_dao">📜 Luận Đạo</option>
                    <option value="review">⭐ Review Truyện</option>
                    <option value="tim_truyen">🔍 Tìm Truyện</option>
                    <option value="dot_pha">⚡ Đột Phá Tu Vi</option>
                    <option value="tam_su">💬 Tâm Sự</option>
                  </select>

                  {/* Đính Kèm Bộ Truyện */}
                  <select
                    value={selectedStoryId}
                    onChange={(e) => setSelectedStoryId(e.target.value)}
                    className="rounded-xl bg-slate-800 border border-white/10 px-3 py-1.5 text-xs text-slate-300 font-medium focus:outline-none focus:border-amber-400 max-w-[200px] truncate"
                  >
                    <option value="">Gắn thẻ truyện (Tùy chọn)</option>
                    {stories.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={posting || !content.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs shadow-lg shadow-amber-500/20 hover:scale-102 active:scale-98 transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {posting ? 'Đang phát đàn...' : 'Phát Đàn (+50 Tu Vi)'}
                </button>
              </div>
            </form>
          </div>

          {/* BỘ LỌC CHỦ ĐỀ (TOPIC FILTER PILLS) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {TOPICS.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTopic(t.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${selectedTopic === t.id
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/10'
                  }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* DANH SÁCH BÀI VIẾT (FEED) */}
          {loading ? (
            <div className="py-16">
              <CultivationSpinner size="lg" text="Đang ngưng tụ thần thức các bài luận đạo..." />
            </div>
          ) : posts.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-white/10 bg-slate-900/60 space-y-3">
              <MessageSquare className="w-10 h-10 text-amber-400/50 mx-auto" />
              <p className="text-sm font-bold text-white">Chưa Có Bài Luận Đạo Nào Trong Chủ Đề Này</p>
              <p className="text-xs text-slate-400">
                Hãy là vị Đạo Hữu đầu tiên khai mở pháp đàn luận bàn cùng vạn giới!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => {
                const topicBadge = getTopicBadge(post.topic);
                const isAuthor = user?.id === post.user_id;
                const isAdmin = user?.role === 'admin';
                const comments = commentsMap[post.id] || [];
                const isCommentsOpen = activeCommentPostId === post.id;

                return (
                  <div
                    key={post.id}
                    id={`post-${post.id}`}
                    className="motion-card rounded-3xl border border-white/10 bg-[#0f172a]/90 p-5 sm:p-6 shadow-xl space-y-4 transition-all hover:border-white/20"
                  >
                    {/* Header Bài Viết */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-slate-800 border border-white/10 flex-shrink-0 flex items-center justify-center font-bold text-amber-400">
                          {post.author_avatar ? (
                            <MediaImage
                              src={getFullAvatarUrl(post.author_avatar)}
                              alt={post.author_name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            post.author_name.charAt(0).toUpperCase()
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-white">
                              {post.author_name}
                            </span>
                            {post.cultivation_realm && (
                              <span
                                className="text-[11px] font-black px-2 py-0.5 rounded-full uppercase border shadow-sm"
                                style={{
                                  backgroundColor: `${post.cultivation_color || '#38BDF8'}15`,
                                  borderColor: `${post.cultivation_color || '#38BDF8'}40`,
                                  color: post.cultivation_color || '#38BDF8',
                                }}
                              >
                                {post.cultivation_realm} • Cấp {post.cultivation_level}
                              </span>
                            )}
                            {post.author_role === 'admin' && (
                              <span className="text-[11px] font-mono font-black px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                                Admin
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {formatRelativeTime(post.created_at)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${topicBadge.color}`}
                        >
                          {topicBadge.label}
                        </span>

                        {(isAuthor || isAdmin) && (
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                            title="Xóa bài"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Nội Dung Bài Viết */}
                    <div className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {post.content}
                    </div>

                    {/* Thẻ Bộ Truyện Đính Kèm (Nếu Có) */}
                    {post.story_title && post.story_slug && (
                      <Link
                        href={`/stories/${post.story_slug}`}
                        className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900 border border-amber-500/20 hover:border-amber-500/50 transition-all group"
                      >
                        {post.story_cover_url ? (
                          <MediaImage
                            src={post.story_cover_url}
                            alt={post.story_title}
                            className="h-12 w-9 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="h-12 w-9 rounded-lg bg-slate-800 flex items-center justify-center text-amber-400">
                            <BookOpen className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                            <Headphones className="w-3 h-3" /> Tác Phẩm Đàm Đạo
                          </span>
                          <p className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                            {post.story_title}
                          </p>
                        </div>
                        <span className="text-[11px] font-bold text-amber-400 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 flex-shrink-0">
                          Nghe Ngay
                        </span>
                      </Link>
                    )}

                    {/* Thanh Tương Tác: Thả Tim, Bình Luận, Chia Sẻ */}
                    <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs">
                      <div className="flex items-center gap-4">
                        {/* Nút Like */}
                        <button
                          onClick={() => handleToggleLike(post.id)}
                          className={`flex items-center gap-1.5 font-bold transition-all ${post.is_liked
                              ? 'text-rose-400 fill-rose-400'
                              : 'text-slate-400 hover:text-rose-400'
                            }`}
                        >
                          <Heart
                            className={`w-4 h-4 ${post.is_liked ? 'fill-rose-500 text-rose-500 animate-bounce' : ''}`}
                          />
                          <span>{post.like_count}</span>
                        </button>

                        {/* Nút Mở Bình Luận */}
                        <button
                          onClick={() => handleToggleComments(post.id)}
                          className="flex items-center gap-1.5 text-slate-400 hover:text-white font-bold transition-colors"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>{post.comment_count} Đàm đạo</span>
                        </button>
                      </div>

                      {/* Nút Chia Sẻ */}
                      <button
                        onClick={() => handleShare(post.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Sao chép liên kết bài"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* KHU VỰC BÌNH LUẬN TRỰC TIẾP */}
                    {isCommentsOpen && (
                      <div className="space-y-3 pt-3 border-t border-white/10 animate-in fade-in-0 duration-200">
                        {/* Danh sách bình luận */}
                        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                          {comments.length === 0 ? (
                            <p className="text-xs text-slate-500 italic py-2">
                              Chưa có lời đàm đạo nào. Hãy là đạo hữu đầu tiên để lại ý kiến!
                            </p>
                          ) : (
                            comments.map((c) => (
                              <div
                                key={c.id}
                                className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-slate-900/60 border border-white/5 text-xs"
                              >
                                <div className="h-7 w-7 rounded-full overflow-hidden bg-slate-800 border border-white/10 flex-shrink-0 flex items-center justify-center font-bold text-amber-400 text-[11px]">
                                  {c.author_avatar ? (
                                    <MediaImage
                                      src={getFullAvatarUrl(c.author_avatar)}
                                      alt={c.author_name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    c.author_name.charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-white">{c.author_name}</span>
                                      {c.cultivation_realm && (
                                        <span
                                          className="text-[11px] font-black px-1.5 py-0.2 rounded-full uppercase"
                                          style={{
                                            backgroundColor: `${c.cultivation_color || '#38BDF8'}20`,
                                            color: c.cultivation_color || '#38BDF8',
                                          }}
                                        >
                                          {c.cultivation_realm}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[11px] text-slate-500 font-mono">
                                      {formatRelativeTime(c.created_at)}
                                    </span>
                                  </div>
                                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                                    {c.content}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Ô Nhập Bình Luận */}
                        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                          <input
                            type="text"
                            value={commentInputs[post.id] || ''}
                            onChange={(e) =>
                              setCommentInputs((prev) => ({
                                ...prev,
                                [post.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddComment(post.id);
                            }}
                            placeholder="Để lại lời đàm đạo cùng đồng đạo (+10 Tu Vi)..."
                            className="flex-1 rounded-xl bg-slate-900 border border-white/10 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                          />
                          <button
                            onClick={() => handleAddComment(post.id)}
                            disabled={
                              submittingComment[post.id] || !commentInputs[post.id]?.trim()
                            }
                            className="p-2 rounded-xl bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-50 transition-colors"
                            title="Gửi bình luận"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CỘT PHẢI (SIDEBAR) */}
        <div className="space-y-6">
          {/* QUY TẮC TIÊN MÔN */}
          <div className="motion-card rounded-3xl border border-amber-500/20 bg-slate-900/80 p-5 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Môn Quy Luận Đạo
            </h3>
            <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <span>Hòa ái đàm đạo, tôn trọng quan điểm tu chân của chư vị đồng đạo.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <span>Không phát ngôn khẩu nghiệp, công kích cá nhân hay xúc phạm tác giả.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <span>Mỗi bài phát đàn chất lượng nhận <strong>+50 Tu Vi</strong>, mỗi bình luận nhận <strong>+10 Tu Vi</strong> thăng cấp Cảnh Giới.</span>
              </li>
            </ul>
          </div>

          {/* LỐI TẮT BẢNG VÀNG & CẢNH GIỚI */}
          <div className="motion-card rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                {REALM_COUNT} cảnh giới
              </h3>
              <Link href="/cultivation" className="text-[11px] text-amber-400 hover:underline font-bold">
                Khám Phá
              </Link>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tích lũy Tu Vi thông qua việc nghe truyện, đàm đạo tại Luận Đạo Các và nâng cấp VIP để đột phá từ Phàm Nhân lên Tiên Tôn Cảnh!
            </p>
            <Link
              href="/cultivation"
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 border border-white/10 transition-colors"
            >
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              Xem Cảnh Giới Của Bản Thân
            </Link>
          </div>

          {/* BANNER VIP TIÊN TÔN */}
          <div className="motion-card rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900 p-5 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider">
              <Crown className="w-4 h-4" />
              Hội Viên Tiên Tôn Các
            </div>
            <h4 className="text-sm font-bold text-white">
              Đột Phá Kim Đan • Thưởng Hàng Ngàn Tu Vi
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Nâng cấp gói VIP để mở khóa 100% audio 320kbps và nhận đan dược tăng vọt cảnh giới.
            </p>
            <Link
              href="/vip"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 hover:scale-102 transition-all"
            >
              <Zap className="w-3.5 h-3.5" />
              Nâng Cấp VIP Ngay (49k)
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
