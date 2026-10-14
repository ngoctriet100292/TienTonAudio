'use client';

import { useAudio } from '@/context/audio-context';
import { Chapter, Story } from '@/types';
import { BookOpen, Clock, Lock, Play, Search, Volume2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function ChapterListClient({ story, chapters }: { story: Story; chapters: Chapter[] }) {
  const { currentChapter, isPlaying, playChapter } = useAudio();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredChapters = searchTerm.trim()
    ? chapters.filter((c) =>
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.chapter_number.toString().includes(searchTerm)
    )
    : chapters;

  const formatDuration = (secs: number) => {
    if (!secs) return 'Truyện chữ';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-4">
      {/* Thanh tìm kiếm nhanh chương */}
      {chapters.length > 10 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm nhanh số chương hoặc tiêu đề..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/90 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[650px] overflow-y-auto pr-1">
        {filteredChapters.map((ch) => {
          const isCurrent = currentChapter?.id === ch.id;

          return (
            <div
              key={ch.id}
              className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${isCurrent
                  ? 'bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-500/10'
                  : 'bg-slate-900/60 border-white/10 hover:border-amber-500/30 hover:bg-slate-850'
                }`}
            >
              {/* Cột trái: Nhấp vào để mở trình đọc truyện chữ */}
              <Link
                href={`/stories/${story.slug}/chapters/${ch.id}`}
                className="flex items-center gap-3 truncate flex-1 hover:opacity-90 group"
              >
                <div
                  className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${isCurrent ? 'bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black' : 'bg-slate-800 text-amber-400 group-hover:bg-amber-500/20'
                    }`}
                >
                  <BookOpen className="w-4 h-4" />
                </div>

                <div className="truncate">
                  <h4 className={`text-xs font-bold truncate ${isCurrent ? 'text-amber-400' : 'text-white group-hover:text-amber-300'}`}>
                    {ch.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span>Chương {ch.chapter_number}</span>
                    {ch.duration_seconds > 0 ? (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(ch.duration_seconds)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span>•</span>
                        <span className="text-emerald-400 font-medium">Bản Chữ</span>
                      </>
                    )}
                  </div>
                </div>
              </Link>

              {/* Cột phải: Nút Đọc chữ và Nút Nghe Audio */}
              <div className="flex items-center gap-2 ml-3">
                <Link
                  href={`/stories/${story.slug}/chapters/${ch.id}`}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors border border-amber-500/30"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Đọc
                </Link>

                {ch.duration_seconds > 0 && (
                  <button
                    onClick={() => playChapter(story, ch, undefined, chapters)}
                    className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${isCurrent && isPlaying
                        ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    title="Phát Audio"
                  >
                    {isCurrent && isPlaying ? <Volume2 className="w-3.5 h-3.5 animate-pulse" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  </button>
                )}

                {ch.is_premium && (
                  <span className="flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded bg-gradient-to-r from-amber-400 to-amber-600 text-black shadow-sm">
                    <Lock className="w-2.5 h-2.5" />
                    VIP
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
