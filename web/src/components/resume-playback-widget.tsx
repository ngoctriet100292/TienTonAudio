'use client';

import { MediaImage } from '@/components/media-image';

import {useAuth} from '@/context/auth-context';
import {useAsyncResource} from '@/lib/use-async-resource';
import {platform,ResumeItem} from '@/lib/platform';
import { useAudio } from '@/context/audio-context';
import { formatAudioTime } from '@/lib/timeline';
import { Headphones, Pause, Play, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export function ResumePlaybackWidget() {
 const {user}=useAuth();
 return user ? <ServerResume key={user.id} userId={user.id}/> : <LocalResume/>;
}
function ServerResume({userId}:{userId:string}) {
 const {data,error,reload}=useAsyncResource(`resume:${userId}`,()=>platform<ResumeItem[]>('/users/continue-listening'),[]);
 if(error)return <p className="text-sm text-slate-400">Chưa đồng bộ được tiến độ. <button className="text-amber-300" onClick={reload}>Thử lại</button></p>;
 if(!data.length)return null;
 const item=data[0];
 return <section className="rounded-2xl border border-amber-400/30 bg-slate-900 p-5 space-y-3"><div className="flex justify-between gap-3"><h2 className="font-semibold text-amber-300">Tiếp tục nghe</h2><Link className="text-sm text-slate-400" href="/account">Lịch sử & thành tựu</Link></div><p className="font-bold">{item.story_title}</p><p className="text-sm text-slate-400">{item.chapter_title} · {Math.floor(item.position_seconds/60)} phút</p><Link className="inline-flex rounded-xl bg-amber-400 px-4 py-2 font-semibold text-slate-950" href={`/stories/${item.story_slug}/chapters/${item.chapter_id}`}>Tiếp tục</Link></section>;
}
function LocalResume() {
  const {
    lastPlayedSession,
    resumeLastPlayed,
    currentChapter,
    isPlaying,
    togglePlay,
    currentTime,
    duration,
  } = useAudio();

  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !lastPlayedSession) {
    return null;
  }

  const { story, chapter, currentTime: savedTime, duration: savedDuration } = lastPlayedSession;
  const isThisActive = currentChapter?.id === chapter.id;

  const displayTime = isThisActive ? currentTime : savedTime;
  const displayDuration = isThisActive ? (duration || savedDuration) : savedDuration;
  const progressPercent = displayDuration > 0
    ? Math.min(100, Math.max(0, (displayTime / displayDuration) * 100))
    : 0;

  const handleAction = () => {
    if (isThisActive) {
      togglePlay();
    } else {
      resumeLastPlayed();
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-slate-900/95 to-[#0b101d] p-4 sm:p-5 shadow-xl shadow-amber-500/10 backdrop-blur-xl animate-in fade-in-0 slide-in-from-top-2 duration-300">
      {/* Nền ánh kim huyền ảo */}
      <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-amber-500/15 blur-2xl pointer-events-none" />

      {/* Header Widget */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
          <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Headphones className="w-3.5 h-3.5" />
            Đạo Hữu Đang Nghe Dở
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800/60 transition-colors"
          title="Tạm ẩn"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Cover thumbnail */}
        <Link
          href={`/stories/${story.slug}`}
          className="relative h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0 rounded-xl overflow-hidden border border-amber-500/30 group"
        >
          {story.cover_image_url ? (
            <MediaImage
              src={story.cover_image_url}
              alt={story.title}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="h-full w-full bg-slate-800 flex items-center justify-center text-amber-400 font-bold">
              TT
            </div>
          )}
        </Link>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <Link
            href={`/stories/${story.slug}`}
            className="text-sm sm:text-base font-bold text-white hover:text-amber-400 transition-colors truncate block"
          >
            {story.title}
          </Link>
          <p className="text-xs text-amber-300/90 truncate font-medium mt-0.5">
            {chapter.title}
          </p>

          {/* Progress bar */}
          <div className="mt-2 space-y-1">
            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden border border-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>{formatAudioTime(displayTime)} / {formatAudioTime(displayDuration)}</span>
              <span className="font-bold text-amber-400">{Math.round(progressPercent)}%</span>
            </div>
          </div>
        </div>

        {/* Nút bấm Tiếp tục nghe */}
        <div className="flex-shrink-0 pl-1">
          <button
            onClick={handleAction}
            className="flex items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-yellow-300 text-black font-extrabold text-xs sm:text-sm shadow-lg shadow-amber-500/25 hover:scale-105 active:scale-95 transition-all"
          >
            {isThisActive && isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span className="hidden sm:inline">Tạm Dừng</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>Tiếp Tục</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
