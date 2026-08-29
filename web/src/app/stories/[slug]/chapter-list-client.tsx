'use client';

import React from 'react';
import { Play, Volume2, Lock, Clock } from 'lucide-react';
import { Story, Chapter } from '@/types';
import { useAudio } from '@/context/audio-context';

export default function ChapterListClient({ story, chapters }: { story: Story; chapters: Chapter[] }) {
  const { currentChapter, isPlaying, playChapter } = useAudio();

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {chapters.map((ch) => {
        const isCurrent = currentChapter?.id === ch.id;

        return (
          <div
            key={ch.id}
            onClick={() => playChapter(story, ch)}
            className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
              isCurrent
                ? 'bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-500/10'
                : 'bg-slate-900/60 border-white/10 hover:border-amber-500/30 hover:bg-slate-850'
            }`}
          >
            <div className="flex items-center gap-3 truncate">
              <div
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                  isCurrent ? 'bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {isCurrent && isPlaying ? (
                  <Volume2 className="w-4 h-4 animate-pulse" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </div>

              <div className="truncate">
                <h4 className={`text-xs font-bold truncate ${isCurrent ? 'text-amber-400' : 'text-white'}`}>
                  {ch.title}
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(ch.duration_seconds)}
                  </span>
                  <span>•</span>
                  <span>{ch.narrator_name}</span>
                </div>
              </div>
            </div>

            {ch.is_premium && (
              <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded bg-gradient-to-r from-amber-400 to-amber-600 text-black shadow-sm">
                <Lock className="w-2.5 h-2.5" />
                VIP
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
