'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Play, Volume2, ArrowLeft, ArrowRight, BookOpen, MessageSquare, Type, Palette } from 'lucide-react';
import { useAudio } from '@/context/audio-context';
import { Story, Chapter } from '@/types';

export default function ChapterReaderClient({ story, chapter }: { story: Story; chapter: Chapter }) {
  const { currentChapter, isPlaying, playChapter } = useAudio();
  const isThisPlaying = currentChapter?.id === chapter.id && isPlaying;

  const [fontSize, setFontSize] = useState<number>(18);
  const [bgMode, setBgMode] = useState<'dark' | 'sepia' | 'obsidian'>('dark');

  const bgStyles = {
    dark: 'bg-[#0f172a] text-slate-200 border-white/10',
    sepia: 'bg-[#2b241a] text-[#f2e6d8] border-[#4a3b2c]',
    obsidian: 'bg-[#05070c] text-slate-100 border-amber-500/20',
  };

  return (
    <div className="space-y-8">
      {/* 1. Header phát Audio trực tiếp */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/30 shadow-xl">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#ffd166] to-[#ffb703] text-black shadow-md shadow-amber-500/20">
            {isThisPlaying ? <Volume2 className="w-6 h-6 animate-pulse" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
          </div>
          <div>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
              Audio 320kbps • {chapter.narrator_name || 'MC Diễn Cảm'}
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

      {/* 2. Thanh Tùy Biến Trải Nghiệm Đọc (Cỡ chữ & Chế độ màu) */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-white/10 text-xs">
        {/* Đổi cỡ chữ */}
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-slate-400" />
          <button
            onClick={() => setFontSize(Math.max(14, fontSize - 2))}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 font-bold"
          >
            A-
          </button>
          <span className="font-mono text-amber-400">{fontSize}px</span>
          <button
            onClick={() => setFontSize(Math.min(28, fontSize + 2))}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 font-bold"
          >
            A+
          </button>
        </div>

        {/* Chế độ màu nền */}
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-slate-400" />
          <button
            onClick={() => setBgMode('dark')}
            className={`w-6 h-6 rounded-full bg-[#0f172a] border-2 ${bgMode === 'dark' ? 'border-amber-400' : 'border-transparent'}`}
            title="Đêm"
          />
          <button
            onClick={() => setBgMode('sepia')}
            className={`w-6 h-6 rounded-full bg-[#2b241a] border-2 ${bgMode === 'sepia' ? 'border-amber-400' : 'border-transparent'}`}
            title="Giấy Cổ"
          />
          <button
            onClick={() => setBgMode('obsidian')}
            className={`w-6 h-6 rounded-full bg-[#05070c] border-2 ${bgMode === 'obsidian' ? 'border-amber-400' : 'border-transparent'}`}
            title="Huyền Vũ"
          />
        </div>
      </div>

      {/* 3. Khung Văn Bản Tiểu Thuyết */}
      <article className={`p-8 sm:p-12 rounded-3xl border shadow-xl transition-all ${bgStyles[bgMode]}`}>
        <h1 className="text-2xl font-black mb-8 pb-4 border-b border-white/10 text-center text-amber-400">
          {chapter.title}
        </h1>

        <div
          className="leading-loose whitespace-pre-line tracking-wide font-serif select-text"
          style={{ fontSize: `${fontSize}px` }}
        >
          {chapter.content_text}
        </div>
      </article>

      {/* 4. Điều hướng Chương Trước / Mục Lục / Chương Sau */}
      <div className="flex items-center justify-between gap-4 py-6 border-t border-white/10">
        <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 border border-white/10 hover:border-amber-500/40 text-xs font-bold text-slate-300">
          <ArrowLeft className="w-4 h-4" /> Chương Trước
        </button>

        <Link
          href={`/stories/${story.slug}`}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-slate-400 hover:text-white"
        >
          <BookOpen className="w-4 h-4" /> Mục Lục
        </Link>

        <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black text-xs font-black shadow-md shadow-amber-500/20">
          Chương Sau <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
