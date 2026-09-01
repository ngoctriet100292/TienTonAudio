'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAudio, PLAYBACK_SPEEDS } from '@/context/audio-context';
import { Play, Pause, RotateCcw, RotateCw, SkipBack, SkipForward, Volume2, Gauge, ListMusic, Lock, X } from 'lucide-react';

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
    playChapter,
  } = useAudio();

  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const speedMenuRef = useRef<HTMLDivElement>(null);
  const playlistDrawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(event.target as Node)) {
        setSpeedMenuOpen(false);
      }
      if (
        playlistDrawerRef.current &&
        !playlistDrawerRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('[data-playlist-trigger]')
      ) {
        setPlaylistOpen(false);
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
      {/* Floating Playlist Drawer */}
      {playlistOpen && playlist.length > 0 && (
        <div
          ref={playlistDrawerRef}
          className="absolute bottom-full left-0 right-0 p-3 sm:px-6 pointer-events-none mb-1"
        >
          <div className="mx-auto max-w-2xl rounded-2xl border border-amber-500/30 bg-[#0c121e]/98 p-4 shadow-2xl backdrop-blur-2xl pointer-events-auto animate-in slide-in-from-bottom-3 duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  Danh Sách Tập • {currentStory.title}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {playlist.length} tập
                </span>
              </div>
              <button
                onClick={() => setPlaylistOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chapter Items List */}
            <div className="max-h-72 overflow-y-auto divide-y divide-white/5 mt-2 scrollbar-thin">
              {playlist.map((ch) => {
                const isActive = ch.id === currentChapter.id;
                return (
                  <button
                    key={ch.id}
                    onClick={() => {
                      playChapter(currentStory, ch, undefined, playlist);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                      isActive
                        ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
                        : 'hover:bg-slate-800/60 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Active Indicator / Soundwave animation */}
                      {isActive ? (
                        <div className="flex items-end gap-0.5 h-4 w-4 flex-shrink-0">
                          <span className="w-1 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.3s] h-3" />
                          <span className="w-1 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.15s] h-4" />
                          <span className="w-1 bg-amber-400 rounded-full animate-bounce h-2" />
                        </div>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-500 w-4 text-center flex-shrink-0">
                          {ch.chapter_number}
                        </span>
                      )}

                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">
                          Tập {ch.chapter_number}: {ch.title}
                        </p>
                        {ch.narrator_name && (
                          <p className="text-[10px] text-slate-500 mt-0.5">MC: {ch.narrator_name}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {ch.is_premium && (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <Lock className="w-2.5 h-2.5" /> VIP
                        </span>
                      )}
                      {ch.duration_seconds > 0 && (
                        <span className="text-[11px] font-mono text-slate-500">
                          {formatTime(ch.duration_seconds)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

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

        {/* Thanh âm lượng, danh sách tập & Bộ chọn tốc độ phát */}
        <div className="flex items-center justify-end gap-2 sm:gap-3 flex-shrink-0">
          {/* Nút Mở Danh Sách Tập (Playlist Drawer) */}
          {playlist.length > 0 && (
            <button
              data-playlist-trigger="true"
              onClick={() => setPlaylistOpen(!playlistOpen)}
              className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all shadow-sm ${
                playlistOpen
                  ? 'bg-amber-500 text-black border-amber-500 shadow-amber-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-white/10'
              }`}
              title="Danh sách các tập trong hàng đợi phát"
            >
              <ListMusic className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Danh sách</span>
              <span className="text-[10px] font-mono opacity-80">({playlist.length})</span>
            </button>
          )}

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
