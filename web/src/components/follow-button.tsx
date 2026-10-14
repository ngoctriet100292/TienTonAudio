'use client';

import { CultivationSpinner } from '@/components/cultivation-spinner';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';
import { UserCheck, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

interface FollowButtonProps {
  targetType: 'author' | 'narrator';
  targetId: string;
  targetName: string;
  initialFollowing?: boolean;
  variant?: 'pill' | 'compact';
  onFollowChange?: (isFollowing: boolean) => void;
}

export function FollowButton({
  targetType,
  targetId,
  targetName,
  initialFollowing = false,
  variant = 'pill',
  onFollowChange,
}: FollowButtonProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      if (confirm(`Vui lòng đăng nhập để theo dõi ${targetType === 'author' ? 'tác giả' : 'giọng đọc'} ${targetName}.`)) {
        router.push('/login');
      }
      return;
    }

    if (loading || !targetId) return;
    setLoading(true);

    const nextState = !isFollowing;
    setIsFollowing(nextState);

    try {
      if (targetType === 'author') {
        const res = await api.toggleFollowAuthor(targetId);
        const actualStatus = res?.is_following ?? nextState;
        setIsFollowing(actualStatus);
        onFollowChange?.(actualStatus);
      } else {
        const res = await api.toggleFollowNarrator(targetId);
        const actualStatus = res?.is_following ?? nextState;
        setIsFollowing(actualStatus);
        onFollowChange?.(actualStatus);
      }
    } catch {
      // Rollback on error
      setIsFollowing(!nextState);
      onFollowChange?.(!nextState);
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'compact') {
    return (
      <button
        onClick={handleToggle}
        disabled={loading}
        title={isFollowing ? 'Hủy theo dõi' : `Theo dõi ${targetName}`}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all active:scale-95 ${isFollowing
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40'
            : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-white/10'
          }`}
      >
        {loading ? (
          <CultivationSpinner size="xs" showText={false} variant="gold" />
        ) : isFollowing ? (
          <>
            <UserCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Đang theo dõi</span>
          </>
        ) : (
          <>
            <UserPlus className="w-3.5 h-3.5" />
            <span>Theo dõi</span>
          </>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm ${isFollowing
          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-500/40'
          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/15'
        }`}
    >
      {loading ? (
        <CultivationSpinner size="xs" showText={false} variant="gold" />
      ) : isFollowing ? (
        <>
          <UserCheck className="w-3.5 h-3.5 text-amber-400" />
          <span>Đang Theo Dõi</span>
        </>
      ) : (
        <>
          <UserPlus className="w-3.5 h-3.5 text-slate-400" />
          <span>Theo Dõi {targetType === 'author' ? 'Tác Giả' : 'MC'}</span>
        </>
      )}
    </button>
  );
}
