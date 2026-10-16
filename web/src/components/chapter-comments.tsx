'use client';

import { MediaImage } from '@/components/media-image';

import { useAsyncResource } from '@/lib/use-async-resource';

import { getErrorMessage } from '@/lib/errors';

import { CultivationSpinner } from '@/components/cultivation-spinner';
import { useAuth } from '@/context/auth-context';
import { api, getFullAvatarUrl } from '@/lib/api';
import {
  ChevronDown,
  ChevronUp,
  CornerDownRight,
  LogIn,
  MessageSquare,
  Send,
  Sparkles,
  ThumbsUp
} from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';

export const REACTION_TYPES = [
  { type: 'like', emoji: '👍', label: 'Thích', color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/40' },
  { type: 'love', emoji: '❤️', label: 'Yêu thích', color: 'text-rose-400', bg: 'bg-rose-500/20 border-rose-500/40' },
  { type: 'haha', emoji: '😂', label: 'Haha', color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/40' },
  { type: 'wow', emoji: '😮', label: 'Trầm trồ', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/40' },
  { type: 'sad', emoji: '😢', label: 'Buồn', color: 'text-purple-400', bg: 'bg-purple-500/20 border-purple-500/40' },
  { type: 'angry', emoji: '😡', label: 'Phẫn nộ', color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/40' },
] as const;

type ReactionType = typeof REACTION_TYPES[number]['type'];

interface CommentItemData {
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
  reactions?: Record<string, number>;
  user_reaction?: ReactionType | null;
  created_at: string;
}

interface ChapterCommentsProps {
  chapterId: string;
  chapterTitle?: string;
}

export function ChapterComments({ chapterId, chapterTitle }: ChapterCommentsProps) {
  const { user, isAuthenticated } = useAuth();
  const { data: comments, setData: setComments, loading } = useAsyncResource<CommentItemData[]>(`${chapterId}:${user?.id || 'guest'}`, () => api.getChapterComments(chapterId), []);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmitRootComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const created = await api.createComment(chapterId, newComment.trim());
      const item: CommentItemData = {
        ...created,
        username: user?.username || 'Đạo Hữu',
        avatar_url: user?.avatar_url,
        cultivation_realm: user?.cultivation_realm || 'Phàm Nhân',
        created_at: new Date().toISOString(),
        total_reactions: 0,
        reply_count: 0,
        reactions: {},
        user_reaction: null,
      };
      setComments((prev) => [item, ...prev]);
      setNewComment('');
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err) || 'Không thể đăng bình luận. Vui lòng thử lại sau.');
    } finally {
      setSubmitting(false);
    }
  };



  return (
    <div className="space-y-6 pt-8 border-t border-white/10">
      {/* Tiêu đề & Tổng số bình luận */}
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

      {/* Form đăng bình luận gốc */}
      {isAuthenticated ? (
        <form onSubmit={handleSubmitRootComment} className="space-y-3 p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-lg">
          <div className="flex items-center gap-2.5 text-xs text-slate-300">
            <span className="font-bold text-amber-400">Đạo Hữu: {user?.username}</span>
            {user?.cultivation_realm && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                {user.cultivation_realm} Cảnh
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
                <CultivationSpinner size="xs" text="Đang phát gửi..." showText={true} />
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
                Đăng nhập để luận bàn cốt truyện, thả biểu cảm và phản hồi ý kiến cùng các đạo hữu.
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
        <CultivationSpinner size="md" text="Đang nạp đàm đạo của chư vị đạo hữu..." />
      ) : comments.length === 0 ? (
        <div className="text-center py-10 rounded-2xl border border-dashed border-white/10 bg-slate-900/30">
          <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-300">Chưa có lời bình nào</p>
          <p className="text-xs text-slate-500 mt-1">
            Hãy là đạo hữu đầu tiên khai mở đàm đạo cho chương truyện này!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              chapterId={chapterId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// Từng thẻ bình luận (kèm trả lời & biểu cảm phong phú)
// ----------------------------------------------------
function CommentCard({
  comment,
  chapterId,
  isReply = false,
}: {
  comment: CommentItemData;
  chapterId: string;
  isReply?: boolean;
}) {
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState<CommentItemData>(comment);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  // Danh sách replies con
  const [replies, setReplies] = useState<CommentItemData[]>([]);
  const [showReplies, setShowReplies] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [repliesLoaded, setRepliesLoaded] = useState(false);

  // Menu biểu cảm
  const [showReactionMenu, setShowReactionMenu] = useState(false);
  const reactionMenuRef = useRef<HTMLDivElement>(null);

  const handleReact = async (type: ReactionType) => {
    if (!isAuthenticated) return;
    setShowReactionMenu(false);

    const isCurrentType = data.user_reaction === type;
    const nextReaction = isCurrentType ? null : type;

    // Optimistic UI update
    setData((prev) => {
      const nextReactions = { ...(prev.reactions || {}) };
      if (prev.user_reaction && nextReactions[prev.user_reaction]) {
        nextReactions[prev.user_reaction] = Math.max(0, nextReactions[prev.user_reaction] - 1);
      }
      if (nextReaction) {
        nextReactions[nextReaction] = (nextReactions[nextReaction] || 0) + 1;
      }

      const newTotal = Object.values(nextReactions).reduce((a, b) => a + b, 0);

      return {
        ...prev,
        user_reaction: nextReaction,
        reactions: nextReactions,
        total_reactions: newTotal,
      };
    });

    try {
      const res = await api.reactComment(data.id, type);
      if (res) {
        setData((prev) => ({
          ...prev,
          total_reactions: res.total_reactions ?? prev.total_reactions,
          reactions: res.reactions ?? prev.reactions,
          user_reaction: res.action === 'removed' ? null : res.reaction_type || nextReaction,
        }));
      }
    } catch (e) {
      console.warn('React comment error:', e);
    }
  };

  const handleToggleReplies = async () => {
    if (!showReplies && !repliesLoaded) {
      setLoadingReplies(true);
      try {
        const fetched = await api.getCommentReplies(data.id);
        setReplies(Array.isArray(fetched) ? fetched : []);
        setRepliesLoaded(true);
      } catch (err) {
        console.warn('Cannot load replies:', err);
      } finally {
        setLoadingReplies(false);
      }
    }
    setShowReplies(!showReplies);
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || submittingReply) return;

    setSubmittingReply(true);
    setReplyError(null);

    try {
      const res = await api.replyComment(data.id, replyContent.trim());
      const newReplyItem: CommentItemData = {
        ...res,
        username: user?.username || 'Đạo Hữu',
        avatar_url: user?.avatar_url,
        cultivation_realm: user?.cultivation_realm || 'Phàm Nhân',
        created_at: new Date().toISOString(),
        total_reactions: 0,
        reply_count: 0,
        reactions: {},
        user_reaction: null,
      };

      setReplies((prev) => [...prev, newReplyItem]);
      setData((prev) => ({ ...prev, reply_count: prev.reply_count + 1 }));
      setReplyContent('');
      setShowReplyBox(false);
      setShowReplies(true);
      setRepliesLoaded(true);
    } catch (err: unknown) {
      setReplyError(getErrorMessage(err) || 'Không thể đăng trả lời.');
    } finally {
      setSubmittingReply(false);
    }
  };

  const currentReactionObj = REACTION_TYPES.find((r) => r.type === data.user_reaction);

  // Gom các biểu cảm đã được bấm có số lượng > 0
  const activeReactionPills = REACTION_TYPES.filter(
    (r) => data.reactions && (data.reactions[r.type] || 0) > 0
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (reactionMenuRef.current && !reactionMenuRef.current.contains(e.target as Node)) {
        setShowReactionMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      className={`rounded-2xl p-4 sm:p-5 transition-all ${isReply
          ? 'bg-slate-950/60 border border-white/5 ml-4 sm:ml-8 mt-2.5'
          : 'bg-slate-900/60 border border-white/10 hover:border-white/15'
        }`}
    >
      {/* Tác giả & Cảnh giới */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl overflow-hidden bg-slate-800 border border-amber-500/20 flex-shrink-0 flex items-center justify-center">
            {data.avatar_url ? (
              <MediaImage
                src={getFullAvatarUrl(data.avatar_url)}
                alt={data.username}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-amber-300">
                {data.username ? data.username[0]?.toUpperCase() : 'U'}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-white">
                {data.username || 'Đạo Hữu'}
              </span>
              {data.cultivation_realm && (
                <span className="text-[11px] font-semibold px-2 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  {data.cultivation_realm} Cảnh
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              {data.created_at ? new Date(data.created_at).toLocaleString('vi-VN') : ''}
            </span>
          </div>
        </div>

        {/* Tổng hợp các biểu cảm đã nhận (Reaction Summary Chips) */}
        {data.total_reactions > 0 && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono">
            {activeReactionPills.slice(0, 3).map((r) => (
              <span key={r.type} title={`${r.label}: ${data.reactions?.[r.type] || 0}`}>
                {r.emoji}
              </span>
            ))}
            <span className="text-slate-400 font-bold ml-0.5">{data.total_reactions}</span>
          </div>
        )}
      </div>

      {/* Nội dung bình luận */}
      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed pl-12 mt-2 break-words">
        {data.content}
      </p>

      {/* Cụm hành động: Biểu cảm + Trả lời */}
      <div className="flex items-center gap-3 pl-12 pt-3 text-xs">
        {/* Nút Biểu cảm với menu popup 6 icon */}
        <div className="relative" ref={reactionMenuRef}>
          <button
            onClick={() => setShowReactionMenu(!showReactionMenu)}
            onMouseEnter={() => setShowReactionMenu(true)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${currentReactionObj
                ? `${currentReactionObj.bg} ${currentReactionObj.color}`
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
          >
            {currentReactionObj ? (
              <>
                <span className="text-sm">{currentReactionObj.emoji}</span>
                <span>{currentReactionObj.label}</span>
              </>
            ) : (
              <>
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>Biểu cảm</span>
              </>
            )}
          </button>

          {/* Floating Reaction Bar (6 emoji: 👍 ❤️ 😂 😮 😢 😡) */}
          {showReactionMenu && (
            <div
              onMouseLeave={() => setShowReactionMenu(false)}
              className="absolute bottom-full left-0 mb-2 flex items-center gap-1 p-1.5 rounded-2xl bg-slate-900/95 border border-amber-500/30 shadow-2xl backdrop-blur-xl z-30 animate-in fade-in-0 zoom-in-95"
            >
              {REACTION_TYPES.map((item) => {
                const isSelected = data.user_reaction === item.type;
                return (
                  <button
                    key={item.type}
                    onClick={() => handleReact(item.type)}
                    title={item.label}
                    className={`p-2 rounded-xl text-lg hover:scale-125 active:scale-95 transition-transform ${isSelected ? 'bg-white/15' : 'hover:bg-white/10'
                      }`}
                  >
                    {item.emoji}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Nút Phản Hồi / Trả Lời */}
        {isAuthenticated && (
          <button
            onClick={() => setShowReplyBox(!showReplyBox)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-amber-300 font-bold transition-colors"
          >
            <CornerDownRight className="w-3.5 h-3.5" />
            <span>Trả lời</span>
          </button>
        )}

        {/* Toggle mở danh sách câu trả lời con (chỉ hiển thị ở bình luận gốc) */}
        {!isReply && data.reply_count > 0 && (
          <button
            onClick={handleToggleReplies}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-amber-400 hover:text-amber-300 font-bold transition-colors ml-auto"
          >
            {showReplies ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Thu gọn {data.reply_count} câu trả lời</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Xem {data.reply_count} câu trả lời</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Form nhập Trả lời trực tiếp */}
      {showReplyBox && (
        <form onSubmit={handleSubmitReply} className="pl-12 pt-3 space-y-2">
          <div className="relative">
            <textarea
              rows={2}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder={`Trả lời @${data.username}...`}
              maxLength={2000}
              className="w-full rounded-xl bg-slate-950 border border-white/10 px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-amber-400 focus:outline-none transition-colors resize-none"
            />
          </div>

          {replyError && (
            <p className="text-xs text-rose-400">{replyError}</p>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowReplyBox(false);
                setReplyContent('');
              }}
              className="px-3.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white font-medium transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submittingReply || !replyContent.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs shadow-md shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              {submittingReply ? (
                <CultivationSpinner size="xs" text="Đang phát..." showText={true} />
              ) : (
                <>
                  <Send className="w-3 h-3" />
                  Gửi Phản Hồi
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Danh sách các câu trả lời con (Replies) */}
      {!isReply && showReplies && (
        <div className="pt-2">
          {loadingReplies ? (
            <div className="py-4 pl-12">
              <CultivationSpinner size="sm" text="Đang câu thông lời đàm đạo..." showText={true} />
            </div>
          ) : replies.length === 0 ? (
            <p className="pl-12 pt-2 text-xs text-slate-500 italic">Chưa có câu trả lời nào.</p>
          ) : (
            <div className="space-y-2">
              {replies.map((replyItem) => (
                <CommentCard
                  key={replyItem.id}
                  comment={replyItem}
                  chapterId={chapterId}
                  isReply={true}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
