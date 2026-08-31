'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, Heart, Send, Loader2, User, Sparkles, LogIn } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';

interface ChapterCommentsProps {
  chapterId: string;
  chapterTitle?: string;
}

export function ChapterComments({ chapterId, chapterTitle }: ChapterCommentsProps) {
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!chapterId) return;
    setLoading(true);
    api.getChapterComments(chapterId)
      .then((data) => {
        setComments(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setComments([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [chapterId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const created = await api.createComment(chapterId, newComment.trim());
      const commentItem = created.data || created;
      // Prepend the new comment to the list
      setComments((prev) => [
        {
          ...commentItem,
          username: user?.username || 'Đạo Hữu',
          avatar_url: user?.avatar_url,
          created_at: new Date().toISOString(),
          total_reactions: 0,
        },
        ...prev,
      ]);
      setNewComment('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể đăng bình luận. Vui lòng thử lại sau.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (commentId: string) => {
    if (!isAuthenticated) return;
    try {
      await api.reactComment(commentId, 'like');
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            const hasLiked = c.user_reaction === 'like';
            return {
              ...c,
              total_reactions: hasLiked ? Math.max(0, (c.total_reactions || 1) - 1) : (c.total_reactions || 0) + 1,
              user_reaction: hasLiked ? null : 'like',
            };
          }
          return c;
        })
      );
    } catch (e) {
      console.warn('Like error:', e);
    }
  };

  return (
    <div className="space-y-6 pt-8 border-t border-white/10">
      {/* Header khu vực bình luận */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <MessageSquare className="w-5 h-5 text-amber-400" />
          <h3 className="text-xl font-black text-white">
            Đàm Đạo Tu Tiên ({comments.length})
          </h3>
        </div>
        {chapterTitle && (
          <span className="text-xs text-slate-400 truncate max-w-xs font-medium">
            {chapterTitle}
          </span>
        )}
      </div>

      {/* Form nhập bình luận */}
      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="space-y-3 p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-lg">
          <div className="flex items-center gap-2.5 text-xs text-slate-300">
            <span className="font-bold text-amber-400">Đạo Hữu: {user?.username}</span>
            {user?.cultivation_realm && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                {user.cultivation_realm}
              </span>
            )}
          </div>

          <div className="relative">
            <textarea
              rows={3}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Để lại cảm nghĩ, luận bàn công pháp, hoặc dự đoán tình tiết cùng chư vị đạo hữu..."
              maxLength={2000}
              className="w-full rounded-xl bg-slate-950/80 border border-white/10 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none transition-colors"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-400 font-medium">{errorMsg}</p>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-500 font-mono">
              {newComment.length}/2000 ký tự
            </span>
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs shadow-md shadow-amber-500/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Đang phát gửi...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Gửi Đàm Đạo
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-amber-400 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-white">Gia nhập đàm đạo cùng các đạo hữu</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Đăng nhập để luận bàn cốt truyện, bình phẩm nhân vật và tích lũy tu vi mỗi ngày.
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs shadow-md shadow-amber-500/20 hover:scale-105 transition-all"
          >
            <LogIn className="w-3.5 h-3.5" /> Đăng Nhập Ngay
          </Link>
        </div>
      )}

      {/* Danh sách các bình luận */}
      {loading ? (
        <div className="py-8 flex justify-center items-center gap-2 text-slate-400 text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
          Đang nạp đàm đạo...
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-10 rounded-2xl border border-dashed border-white/10 bg-slate-900/30">
          <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-300">Chưa có lời bình nào</p>
          <p className="text-xs text-slate-500 mt-1">
            Hãy là đạo hữu đầu tiên khai mở đàm đạo cho chương truyện này!
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {comments.map((comment) => {
            const hasLiked = comment.user_reaction === 'like';
            return (
              <div
                key={comment.id}
                className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2.5 hover:border-white/10 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl overflow-hidden bg-slate-800 border border-amber-500/20 flex-shrink-0 flex items-center justify-center">
                      {comment.avatar_url ? (
                        <img
                          src={comment.avatar_url}
                          alt={comment.username}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          {comment.username || 'Đạo Hữu'}
                        </span>
                        {comment.cultivation_realm && (
                          <span className="text-[10px] font-semibold px-2 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            {comment.cultivation_realm}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {comment.created_at ? new Date(comment.created_at).toLocaleString('vi-VN') : ''}
                      </span>
                    </div>
                  </div>

                  {/* Nút Like / Thả Tim */}
                  <button
                    onClick={() => handleLike(comment.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      hasLiked
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${hasLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                    <span className="text-[11px] font-mono">{comment.total_reactions || 0}</span>
                  </button>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pl-12">
                  {comment.content}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
