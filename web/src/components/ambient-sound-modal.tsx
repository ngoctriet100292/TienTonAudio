'use client';

import { AMBIENT_SOUNDS, useAmbient } from '@/context/ambient-audio-context';
import { Sliders, Volume2, VolumeX, X } from 'lucide-react';

export function AmbientSoundModal() {
  const {
    activeSound,
    isPlaying,
    volume,
    setVolume,
    toggleSound,
    stopSound,
    modalOpen,
    setModalOpen,
  } = useAmbient();

  if (!modalOpen) return null;

  const currentConfig = AMBIENT_SOUNDS.find((s) => s.id === activeSound);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in-0 duration-200">
      <div
        className="relative w-full max-w-xl rounded-3xl border border-amber-500/30 bg-[#0c121e]/98 p-6 shadow-2xl backdrop-blur-2xl space-y-6 text-slate-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-amber-500/30 via-amber-400/20 to-transparent border border-amber-500/40 flex items-center justify-center text-xl shadow-lg shadow-amber-500/10">
              🌊
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">Tiên Cảnh Tiêu Dao</h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-widest">
                  Âm Thanh Nền
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Hòa quyện tiếng thiên nhiên cùng giọng đọc MC để đắm chìm vào thế giới tu tiên.
              </p>
            </div>
          </div>
          <button
            onClick={() => setModalOpen(false)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Danh Sách 6 Cảnh Giới Âm Thanh */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {AMBIENT_SOUNDS.map((sound) => {
            const isSelected = activeSound === sound.id && isPlaying;
            return (
              <button
                key={sound.id}
                onClick={() => toggleSound(sound.id)}
                className={`group relative flex flex-col items-start p-3.5 rounded-2xl text-left transition-all border ${isSelected
                    ? `bg-gradient-to-br ${sound.color} shadow-lg ring-1 ring-amber-400/50 scale-[1.02]`
                    : 'bg-slate-900/80 hover:bg-slate-850 border-white/5 hover:border-white/20 text-slate-300 hover:text-white'
                  }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="text-2xl filter drop-shadow-md group-hover:scale-110 transition-transform">
                    {sound.icon}
                  </span>
                  {isSelected && (
                    <div className="flex items-end gap-0.5 h-3 w-3">
                      <span className="w-0.5 bg-amber-400 rounded-full animate-bounce h-2" />
                      <span className="w-0.5 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.2s] h-3" />
                      <span className="w-0.5 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.4s] h-1.5" />
                    </div>
                  )}
                </div>

                <h4 className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                  {sound.name}
                </h4>
                <p className="text-[11px] text-amber-400/80 font-mono mt-0.5">
                  {sound.subName}
                </p>
                <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                  {sound.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* Bộ Điều Chỉnh Âm Lượng Kênh Môi Trường */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              Âm Lượng Nhạc Nền Thiên Nhiên
            </span>
            <span className="font-mono text-amber-400 font-bold text-xs">
              {Math.round(volume * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setVolume(volume === 0 ? 0.25 : 0)}
              className="text-slate-400 hover:text-white transition-colors"
              title={volume === 0 ? 'Bật âm' : 'Tắt tiếng'}
            >
              {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>
          <p className="text-[11px] text-slate-500 italic">
            * Mẹo tu đạo: Nên giữ âm lượng nền từ 15% - 30% để không lấn át lời MC đọc truyện.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
          {isPlaying && currentConfig ? (
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <span>Đang bật:</span>
              <span className="text-amber-300 font-bold flex items-center gap-1">
                {currentConfig.icon} {currentConfig.name}
              </span>
            </div>
          ) : (
            <span className="text-slate-500 text-[11px]">Chưa bật âm thanh nền</span>
          )}

          <div className="flex items-center gap-2">
            {isPlaying && (
              <button
                onClick={stopSound}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/20 font-medium transition-colors text-xs"
              >
                Tắt Nền
              </button>
            )}
            <button
              onClick={() => setModalOpen(false)}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black shadow-md shadow-amber-500/20 hover:scale-105 transition-transform text-xs"
            >
              Xác Nhận
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
