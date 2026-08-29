'use client';

import React from 'react';
import { useAudio } from '@/context/audio-context';
import { Play, Pause, RotateCcw, RotateCw, Volume2 } from 'lucide-react';

export function StickyAudioPlayer() {
  const { currentChapter, currentStory, isPlaying, togglePlay, currentTime, duration, seek, skip } = useAudio();

  if (!currentChapter || !currentStory) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-amber-500/20 bg-[#0c121e]/95 backdrop-blur-2xl shadow-2xl">
      {/* Vạch tiến độ chạy cạnh trên */}
      <div
        className="w-full h-1 bg-white/10 cursor-pointer relative group"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const pct = clickX / rect.width;
          seek(pct * duration);
        }}
      >
        <div
          className="h-full bg-gradient-to-r from-[#ffd166] to-[#ffb703] relative"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md" />
        </div>
      </div>

      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Tên truyện & Tên tập */}
        <div className="flex items-center gap-4 w-1/3 min-w-[200px]">
          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border border-amber-500/30 bg-slate-800 shadow-md">
            {currentStory.cover_image_url ? (
              <img
                src={currentStory.cover_image_url}
                alt={currentStory.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-amber-400 font-bold">
                TT
              </div>
            )}
          </div>
          <div className="truncate">
            <h4 className="text-sm font-bold text-white truncate">{currentChapter.title}</h4>
            <p className="text-xs text-slate-400 truncate">{currentStory.title}</p>
          </div>
        </div>

        {/* Cụm điều khiển Play / Pause / Tua 10s */}
        <div className="flex flex-col items-center justify-center gap-1.5 w-1/3">
          <div className="flex items-center gap-5">
            <button
              onClick={() => skip(-10)}
              className="text-slate-400 hover:text-white transition-colors p-1"
              title="Lùi 10 giây"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlay}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-[#ffd166] to-[#ffb703] text-black shadow-lg shadow-amber-500/30 hover:scale-105 active:scale-95 transition-all"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            <button
              onClick={() => skip(10)}
              className="text-slate-400 hover:text-white transition-colors p-1"
              title="Tới 10 giây"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Thanh âm lượng & chất lượng */}
        <div className="flex items-center justify-end gap-3 w-1/3">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-[#ffd166] border border-amber-500/30 uppercase tracking-wider">
            320kbps
          </span>
          <Volume2 className="w-4 h-4 text-slate-400" />
        </div>
      </div>
    </div>
  );
}
