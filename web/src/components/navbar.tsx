'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Sparkles,
  Crown,
  Headphones,
  BookOpen,
  Compass,
  Bot,
  User,
  LogOut,
  ChevronDown,
  ShieldCheck,
  History,
  Heart,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';

export function Navbar() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Đảm bảo client render sau khi mount để tránh lỗi hydration mismatch với localStorage
  useEffect(() => {
    setMounted(true);

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#070a11]/90 backdrop-blur-xl">
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
            <Link href="/ai" className="text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1.5 font-semibold">
              <Bot className="w-4 h-4" />
              AI Đạo Hữu
            </Link>
            <Link href="/vip" className="text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1.5 font-semibold">
              <Sparkles className="w-4 h-4" />
              Hội Viên VIP
            </Link>
          </nav>
        </div>

        {/* Thanh tìm kiếm & Tài khoản Đạo Hữu */}
        <div className="flex items-center gap-4">
          <form onSubmit={handleSearch} className="relative hidden sm:block w-52 lg:w-72">
            <input
              type="text"
              placeholder="Tìm kiếm truyện, tác giả..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full bg-slate-900/90 border border-white/10 px-4 py-2 pl-10 text-xs text-white placeholder-slate-400 focus:border-[#ffb703] focus:outline-none transition-all"
            />
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          </form>

          {/* User Account / Login Button */}
          {mounted && isAuthenticated && user ? (
            <div className="relative" ref={dropdownRef}>
              {/* Nút bấm Avatar mở Dropdown */}
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 p-1 pl-2.5 rounded-full border border-amber-500/30 bg-slate-900/80 hover:border-amber-400 transition-all shadow-md shadow-amber-500/10"
              >
                <div className="flex flex-col text-right hidden md:block">
                  <span className="text-xs font-bold text-white leading-tight">
                    {user.username}
                  </span>
                  <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                    {user.role === 'admin' ? 'Quản Trị Viên' : 'Đạo Hữu'}
                  </span>
                </div>

                {/* Avatar tròn viền vàng */}
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-[#ffd166] to-[#ffb703] text-black font-black text-xs shadow-md">
                  {user.username[0]?.toUpperCase() || 'U'}
                </div>

                <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-1 hidden sm:block" />
              </button>

              {/* Menu Dropdown Thông Tin Người Dùng */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-white/10 bg-[#0f172a]/95 p-3 shadow-2xl backdrop-blur-2xl animate-in fade-in-0 zoom-in-95 z-50">
                  {/* Header trong dropdown */}
                  <div className="border-b border-white/10 pb-3 mb-2 px-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-[#ffd166] to-[#ffb703] text-black font-black text-sm">
                        {user.username[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-bold text-white truncate">{user.username}</p>
                        <p className="text-xs text-slate-400 truncate">{user.email}</p>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] bg-slate-800/80 rounded-lg px-2.5 py-1">
                      <span className="text-slate-400">Bảo mật 2FA:</span>
                      <span className={`font-bold flex items-center gap-1 ${user.two_factor_enabled ? 'text-emerald-400' : 'text-amber-400'}`}>
                        <ShieldCheck className="w-3 h-3" />
                        {user.two_factor_enabled ? 'Đã bật' : 'Chưa bật'}
                      </span>
                    </div>
                  </div>

                  {/* Danh sách tính năng */}
                  <div className="space-y-1 text-xs text-slate-300">
                    <Link
                      href="/rankings"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800 hover:text-white transition-colors"
                    >
                      <Crown className="w-4 h-4 text-amber-400" />
                      Bảng Vàng Tiên Vương
                    </Link>

                    <Link
                      href="/vip"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800 hover:text-amber-400 transition-colors"
                    >
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Đặc Quyền Hội Viên VIP
                    </Link>

                    <Link
                      href="/ai"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800 hover:text-indigo-400 transition-colors"
                    >
                      <Bot className="w-4 h-4 text-indigo-400" />
                      Đàm Đạo Với AI Đạo Hữu
                    </Link>

                    <div className="border-t border-white/10 my-1 pt-1" />

                    {/* Nút Đăng Xuất */}
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors font-semibold"
                    >
                      <LogOut className="w-4 h-4" />
                      Đăng Xuất Tài Khoản
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ffd166] to-[#ffb703] px-5 py-2 text-xs font-black text-black shadow-md shadow-amber-500/20 hover:opacity-95 transition-opacity"
            >
              Đăng Nhập
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
