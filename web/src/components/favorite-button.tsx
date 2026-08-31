'use client';

import React, { useState, useEffect } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';

interface FavoriteButtonProps {
  storyId: string;
  initialCount?: number;
  variant?: 'pill' | 'icon' | 'detail';
}

export function FavoriteButton({ storyId, initialCount = 0, variant = 'detail' }: FavoriteButtonProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [initialChecked, setInitialChecked] = useState(false);

  useEffect(() => {
    if (isAuthenticated && storyId) {
      api.checkFavorite(storyId).then((res) => {
        setIsFavorite(res.is_favorite);
        setInitialChecked(true);
      }).catch(() => {
        setInitialChecked(true);
      });
    } else {
      setInitialChecked(true);
    }
  }, [isAuthenticated, storyId]);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      if (confirm('Vui lòng đăng nhập để lưu tác phẩm này vào danh sách Truyện Yêu Thích của bạn.')) {
        router.push('/login');
      }
      return;
    }

    if (loading) return;
    setLoading(true);

    // Optimistic UI update
    const nextState = !isFavorite;
    setIsFavorite(nextState);
    setCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));

    try {
      const res = await api.toggleFavorite(storyId);
      setIsFavorite(res.is_favorite);
    } catch (err) {
      // Rollback on error
      setIsFavorite(!nextState);
      setCount((prev) => (!nextState ? prev + 1 : Math.max(0, prev - 1)));
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleToggleFavorite}
        disabled={loading}
        title={isFavorite ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
        aria-label={isFavorite ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
        className={`p-2 rounded-xl backdrop-blur-md transition-all active:scale-90 ${
          isFavorite
            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
            : 'bg-black/60 text-slate-300 hover:text-white hover:bg-black/80 border border-white/10'
        }`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
        ) : (
          <Heart className={`w-4 h-4 transition-transform ${isFavorite ? 'fill-rose-500 text-rose-500 scale-110' : ''}`} />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggleFavorite}
      disabled={loading}
      className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-md ${
        isFavorite
          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-rose-500/10'
          : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-white/15'
      }`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
      ) : (
        <Heart className={`w-4 h-4 transition-transform ${isFavorite ? 'fill-rose-500 text-rose-500 scale-110' : 'text-slate-400'}`} />
      )}
      <span>{isFavorite ? 'Đã Yêu Thích' : 'Yêu Thích'}</span>
      {count > 0 && (
        <span className="text-xs font-mono px-1.5 py-0.5 rounded-md bg-white/10 text-slate-300">
          {count}
        </span>
      )}
    </button>
  );
}
