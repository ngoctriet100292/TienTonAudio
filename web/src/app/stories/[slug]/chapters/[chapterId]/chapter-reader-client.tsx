'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Play, Volume2, ArrowLeft, ArrowRight, BookOpen, Type, Palette, List } from 'lucide-react';
import { useAudio } from '@/context/audio-context';
import { Story, Chapter } from '@/types';

export default function ChapterReaderClient({
  story,
  chapter,
  chapters = [],
}: {
  story: Story;
  chapter: Chapter;
  chapters?: Chapter[];
}) {
  const router = useRouter();
  const { currentChapter, isPlaying, playChapter } = useAudio();
  const isThisPlaying = currentChapter?.id === chapter.id && isPlaying;

  const [fontSize, setFontSize] = useState<number>(18);
  const [bgMode, setBgMode] = useState<'dark' | 'sepia' | 'obsidian'>('dark');

  const bgStyles = {
    dark: 'bg-[#0f172a] text-slate-200 border-white/10',
    sepia: 'bg-[#2b241a] text-[#f2e6d8] border-[#4a3b2c]',
    obsidian: 'bg-[#05070c] text-slate-100 border-amber-500/20',
  };

  // Xác định chương trước và chương tiếp theo
  const currentIndex = chapters.findIndex(
    (c) => c.id === chapter.id || c.chapter_number === chapter.chapter_number
  );
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const nextChapter =
    currentIndex >= 0 && currentIndex < chapters.length - 1
      ? chapters[currentIndex + 1]
      : null;

  const rawContent = chapter.content || chapter.content_text || '';

  return (
    <div className="space-y-8">
      {/* 1. Header phát Audio trực tiếp (Nếu có Audio) */}
      {chapter.duration_seconds > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/30 shadow-xl">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#ffd166] to-[#ffb703] text-black shadow-md shadow-amber-500/20">
              {isThisPlaying ? <Volume2 className="w-6 h-6 animate-pulse" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
            </div>
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                Bản Thu Audio 320kbps • {chapter.narrator_name || 'MC Diễn Cảm'}
              </span>
              <h2 className="text-base font-bold text-white">{chapter.title}</h2>
            </div>
          </div>

          <button
            onClick={() => playChapter(story, chapter)}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs shadow-lg shadow-amber-500/20 hover:scale-105 transition-transform"
          >
            {isThisPlaying ? 'Đang Phát Audio' : 'Phát Audio Chương Này'}
          </button>
        </div>
      )}

      {/* 2. Thanh Tùy Biến Trải Nghiệm Đọc & Chuyển Chương Nhanh */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 text-xs">
        {/* Menu nhảy nhanh chương */}
        {chapters.length > 0 && (
          <div className="flex items-center gap-2">
            <List className="w-4 h-4 text-amber-400" />
            <select
              value={chapter.id}
              onChange={(e) => router.push(`/stories/${story.slug}/chapters/${e.target.value}`)}
              className="bg-slate-800 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
            >
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Đổi cỡ chữ & Chế độ màu nền */}
        <div className="flex items-center gap-4 ml-auto">
          {/* Cỡ chữ */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-lg border border-white/5">
            <Type className="w-3.5 h-3.5 text-slate-400" />
            <button
              onClick={() => setFontSize(Math.max(14, fontSize - 2))}
              className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 font-bold text-white text-[11px]"
              title="Giảm cỡ chữ"
            >
              A-
            </button>
            <span className="font-mono text-amber-400 font-bold px-1 text-[11px]">{fontSize}px</span>
            <button
              onClick={() => setFontSize(Math.min(32, fontSize + 2))}
              className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 font-bold text-white text-[11px]"
              title="Tăng cỡ chữ"
            >
              A+
            </button>
          </div>

          {/* Màu nền đọc truyện */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-lg border border-white/5">
            <Palette className="w-3.5 h-3.5 text-slate-400 mr-1" />
            <button
              onClick={() => setBgMode('dark')}
              className={`w-5 h-5 rounded-full bg-[#0f172a] border-2 transition-all ${
                bgMode === 'dark' ? 'border-amber-400 scale-110' : 'border-slate-700'
              }`}
              title="Chế độ Tối"
            />
            <button
              onClick={() => setBgMode('sepia')}
              className={`w-5 h-5 rounded-full bg-[#2b241a] border-2 transition-all ${
                bgMode === 'sepia' ? 'border-amber-400 scale-110' : 'border-slate-700'
              }`}
              title="Chế độ Giấy Cổ"
            />
            <button
              onClick={() => setBgMode('obsidian')}
              className={`w-5 h-5 rounded-full bg-[#05070c] border-2 transition-all ${
                bgMode === 'obsidian' ? 'border-amber-400 scale-110' : 'border-slate-700'
              }`}
              title="Chế độ Huyền Vũ"
            />
          </div>
        </div>
      </div>

      {/* 3. KHUNG HIỂN THỊ NỘI DUNG TRUYỆN CHỮ */}
      <article className={`p-8 sm:p-14 rounded-3xl border shadow-2xl transition-all ${bgStyles[bgMode]}`}>
        <div className="text-center mb-10 pb-6 border-b border-white/10 space-y-2">
          <span className="text-xs uppercase font-bold text-amber-400 tracking-widest">
            {story.title}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-amber-300">
            {chapter.title}
          </h1>
          {chapter.narrator_name && (
            <p className="text-xs text-slate-400">Biên tập: {chapter.narrator_name}</p>
          )}
        </div>

        {rawContent ? (
          <div
            className="leading-relaxed whitespace-pre-line tracking-wide font-serif select-text space-y-4"
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.85 }}
          >
            {rawContent}
          </div>
        ) : (
          <div className="text-center py-16 space-y-3">
            <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-slate-400 text-sm">Chưa có nội dung văn bản cho chương này.</p>
          </div>
        )}
      </article>

      {/* 4. Điều hướng Chương Trước / Mục Lục / Chương Sau */}
      <div className="flex items-center justify-between gap-4 py-4">
        {prevChapter ? (
          <Link
            href={`/stories/${story.slug}/chapters/${prevChapter.id}`}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 border border-white/10 hover:border-amber-500/40 text-xs font-bold text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Chương Trước
          </Link>
        ) : (
          <div className="px-5 py-2.5 text-xs text-slate-600 font-medium">Chương đầu tiên</div>
        )}

        <Link
          href={`/stories/${story.slug}`}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-amber-400 hover:text-amber-300 hover:border-amber-500/40 transition-colors"
        >
          <BookOpen className="w-4 h-4" /> Mục Lục
        </Link>

        {nextChapter ? (
          <Link
            href={`/stories/${story.slug}/chapters/${nextChapter.id}`}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black text-xs font-black shadow-md shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all"
          >
            Chương Sau <ArrowRight className="w-4 h-4" />
          </Link>
        ) : (
          <div className="px-5 py-2.5 text-xs text-slate-600 font-medium">Chương mới nhất</div>
        )}
      </div>
    </div>
  );
}
