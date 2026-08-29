'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Sparkles, Crown, Headphones, BookOpen, Compass } from 'lucide-react';

export function Navbar() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#070a11]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo Tiên Tôn Audio */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ffd166] via-[#ffb703] to-[#d48b00] p-[1.5px] shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#070a11]">
                <Headphones className="h-5 w-5 text-[#ffd166]" />
              </div>
            </div>
            <div>
              <span className="text-lg font-black tracking-wider text-white">
                TIÊN TÔN <span className="text-[#ffb703]">AUDIO</span>
              </span>
              <span className="block text-[10px] font-semibold tracking-widest text-[#ffd166]/70 uppercase">
                Studio 320kbps
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/" className="text-white hover:text-[#ffb703] transition-colors flex items-center gap-1.5">
              <Compass className="w-4 h-4" />
              Khám Phá
            </Link>
            <Link href="/rankings" className="text-slate-300 hover:text-[#ffb703] transition-colors flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-[#ffb703]" />
              Bảng Vàng
            </Link>
            <Link href="/categories" className="text-slate-300 hover:text-[#ffb703] transition-colors flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />
              Thể Loại
            </Link>
            <Link href="/vip" className="text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1.5 font-semibold">
              <Sparkles className="w-4 h-4" />
              Hội Viên VIP
            </Link>
          </nav>
        </div>

        {/* Thanh tìm kiếm & Tài khoản */}
        <div className="flex items-center gap-4">
          <div className="relative hidden sm:block w-64 lg:w-80">
            <input
              type="text"
              placeholder="Tìm tên truyện, tác giả, MC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full bg-slate-900/90 border border-white/10 px-4 py-2 pl-10 text-xs text-white placeholder-slate-400 focus:border-[#ffb703] focus:outline-none focus:ring-1 focus:ring-[#ffb703] transition-all"
            />
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          </div>

          <Link
            href="/login"
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ffd166] to-[#ffb703] px-5 py-2 text-xs font-bold text-black shadow-md shadow-amber-500/20 hover:opacity-95 transition-opacity"
          >
            Đăng Nhập
          </Link>
        </div>
      </div>
    </header>
  );
}
