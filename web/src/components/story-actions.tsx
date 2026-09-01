'use client';

import React, { useState } from 'react';
import { ShieldAlert, ListMusic, Share2, Check } from 'lucide-react';
import { FavoriteButton } from '@/components/favorite-button';
import { ReportModal } from '@/components/report-modal';
import { AddToPlaylistModal } from '@/components/add-to-playlist-modal';

interface StoryActionsProps {
  storyId: string;
  storyTitle: string;
  favoriteCount: number;
  firstChapterId?: string;
}

export function StoryActions({
  storyId,
  storyTitle,
  favoriteCount,
  firstChapterId,
}: StoryActionsProps) {
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5">
        <FavoriteButton storyId={storyId} initialCount={favoriteCount} />

        {firstChapterId && (
          <button
            onClick={() => setPlaylistModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl border border-white/10 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-amber-400 text-xs font-bold transition-colors"
            title="Thêm vào danh sách phát"
          >
            <ListMusic className="w-4 h-4 text-amber-400" />
            <span>Lưu Playlist</span>
          </button>
        )}

        <button
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl border border-white/10 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-colors"
          title="Chia sẻ truyện"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">Đã Sao Chép</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              <span>Chia Sẻ</span>
            </>
          )}
        </button>

        <button
          onClick={() => setReportModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-3 rounded-xl border border-white/10 bg-slate-900/80 hover:bg-rose-950/40 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 text-xs font-bold transition-colors"
          title="Báo lỗi hoặc khiếu nại bản quyền"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Báo Lỗi</span>
        </button>
      </div>

      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        targetType="story"
        targetId={storyId}
        targetTitle={storyTitle}
      />

      {firstChapterId && (
        <AddToPlaylistModal
          isOpen={playlistModalOpen}
          onClose={() => setPlaylistModalOpen(false)}
          chapterId={firstChapterId}
          chapterTitle={storyTitle}
        />
      )}
    </>
  );
}
