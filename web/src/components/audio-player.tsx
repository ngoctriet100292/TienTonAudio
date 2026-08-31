'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAudio, PLAYBACK_SPEEDS } from '@/context/audio-context';
import { Play, Pause, RotateCcw, RotateCw, SkipBack, SkipForward, Volume2, Gauge } from 'lucide-react';

export function StickyAudioPlayer() {
  const {
    currentChapter,
    currentStory,
    playlist,
    isPlaying,
    togglePlay,
    currentTime,
    duration,
    seek,
    skip,
    playNext,
    playPrev,
    playbackSpeed,
    setPlaybackSpeed,
  } = useAudio();

  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const speedMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(event.target as Node)) {
        setSpeedMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
        {/* Tên truyện & Tên tập */}
        <div className="flex items-center gap-2.5 sm:gap-4 flex-1 min-w-0 mr-2">
          <div className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 overflow-hidden rounded-xl border border-amber-500/30 bg-slate-800 shadow-md">
            {currentStory.cover_image_url ? (
              <img
                src={currentStory.cover_image_url}
                alt={currentStory.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-amber-400 font-bold text-xs">
                TT
              </div>
            )}
          </div>
          <div className="truncate">
            <h4 className="text-xs sm:text-sm font-bold text-white truncate">{currentChapter.title}</h4>
            <p className="text-[10px] sm:text-xs text-slate-400 truncate">{currentStory.title}</p>
          </div>
        </div>

        {/* Cụm điều khiển Play / Pause / Tua 10s */}
        <div className="flex flex-col items-center justify-center gap-1 flex-shrink-0 px-2">
          <div className="flex items-center gap-1.5 sm:gap-4">
            {playlist.length > 1 && (
              <button
                onClick={playPrev}
                className="text-slate-400 hover:text-white transition-colors p-1"
                title="Tập trước"
              >
                <SkipBack className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}

            <button
              onClick={() => skip(-10)}
              className="text-slate-400 hover:text-white transition-colors p-1"
              title="Lùi 10 giây"
            >
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <button
              onClick={togglePlay}
              className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-gradient-to-tr from-[#ffd166] to-[#ffb703] text-black shadow-lg shadow-amber-500/30 hover:scale-105 active:scale-95 transition-all"
            >
              {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />}
            </button>

            <button
              onClick={() => skip(10)}
              className="text-slate-400 hover:text-white transition-colors p-1"
              title="Tới 10 giây"
            >
              <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {playlist.length > 1 && (
              <button
                onClick={playNext}
                className="text-slate-400 hover:text-white transition-colors p-1"
                title="Tập tiếp theo"
              >
                <SkipForward className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-400 font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Thanh âm lượng & Bộ chọn tốc độ phát */}
        <div className="flex items-center justify-end gap-2 sm:gap-3 flex-shrink-0">
          {/* Nút chọn Tốc độ phát (0.5x, 0.75x, 1x, 1.25x, 1.5x, 1.75x, 2x) */}
          <div className="relative" ref={speedMenuRef}>
            <button
              onClick={() => setSpeedMenuOpen(!speedMenuOpen)}
              className="flex items-center gap-1 text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 transition-all shadow-sm"
              title="Điều chỉnh tốc độ phát audio"
            >
              <Gauge className="w-3 h-3 text-[#ffd166]" />
              {playbackSpeed}x
            </button>

            {speedMenuOpen && (
              <div className="absolute bottom-full right-0 mb-2 w-32 rounded-xl border border-white/10 bg-[#0f172a]/95 p-1.5 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in-0 zoom-in-95">
                <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 border-b border-white/10 mb-1">
                  Tốc độ phát
                </div>
                <div className="space-y-0.5">
                  {PLAYBACK_SPEEDS.map((speed) => (
                    <button
                      key={speed}
                      onClick={() => {
                        setPlaybackSpeed(speed);
                        setSpeedMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
                        playbackSpeed === speed
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span>{speed}x</span>
                      {speed === 1.0 && <span className="text-[9px] text-slate-500 font-sans">Chuẩn</span>}
                      {speed === 1.5 && <span className="text-[9px] text-amber-400 font-sans">Hot</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-[#ffd166] border border-amber-500/30 uppercase tracking-wider hidden sm:inline-block">
            320kbps
          </span>
          <Volume2 className="w-4 h-4 text-slate-400" />
        </div>
      </div>
    </div>
  );
}
