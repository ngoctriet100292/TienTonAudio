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
  Settings,
  ShieldCheck,
  ShieldAlert,
  Flame,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';

export function Navbar() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

        {/* Thanh tìm kiếm & Avatar Đạo Hữu */}
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

          {/* User Avatar - Khi đăng nhập CHỈ hiện ảnh đại diện */}
          {mounted && isAuthenticated && user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="group relative flex h-10 w-10 items-center justify-center rounded-full p-[2px] bg-gradient-to-tr from-[#ffd166] via-[#ffb703] to-amber-700 shadow-lg shadow-amber-500/25 hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                title="Tài khoản Đạo Hữu"
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.username}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0d1424] text-[#ffd166] font-black text-sm group-hover:bg-[#141d33] transition-colors">
                    {user.username[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                {/* Chấm tròn trạng thái trực tuyến */}
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-[#070a11]" />
              </button>

              {/* Menu Dropdown - Nơi hiển thị TOÀN BỘ thông tin & Cài Đặt */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-3 w-72 rounded-2xl border border-white/10 bg-[#0c121e]/98 p-4 shadow-2xl backdrop-blur-2xl animate-in fade-in-0 zoom-in-95 z-50">
                  {/* Thông tin đạo hữu */}
                  <div className="border-b border-white/10 pb-3.5 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#ffd166] to-[#ffb703] text-black font-black text-base shadow-md">
                        {user.username[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-white truncate">{user.username}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/20 text-[#ffd166] border border-amber-500/30">
                            {user.role === 'admin' ? 'ADMIN' : 'VIP KIM ĐAN'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">{user.email}</p>
                      </div>
                    </div>

                    {/* Cảnh Giới Tu Tiên */}
                    <div className="mt-3 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-transparent p-2.5 rounded-xl border border-amber-500/20">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-amber-400" />
                          Cảnh Giới:
                        </span>
                        <span
                          className="font-black px-2 py-0.5 rounded-md text-[10px] tracking-wider uppercase shadow-sm"
                          style={{
                            backgroundColor: `${user.cultivation_color || '#38BDF8'}20`,
                            color: user.cultivation_color || '#38BDF8',
                            borderColor: `${user.cultivation_color || '#38BDF8'}40`,
                            borderWidth: 1,
                          }}
                        >
                          {user.cultivation_realm || 'Luyện Khí'} Cảnh
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                        <span>Tu Vi: {user.cultivation_exp || 0} điểm</span>
                        <span>Cấp {user.cultivation_level || 1}/17</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#ffd166] to-[#ffb703] rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(12, ((user.cultivation_exp || 0) % 300) / 3))}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] bg-slate-800/80 rounded-xl px-3 py-1.5 border border-white/5">
                      <span className="text-slate-400">Bảo mật 2FA:</span>
                      <span className={`font-bold flex items-center gap-1 ${user.two_factor_enabled ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {user.two_factor_enabled ? (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5" /> Đã Kích Hoạt
                          </>
                        ) : (
                          <>
                            <ShieldAlert className="w-3.5 h-3.5" /> Chưa Kích Hoạt
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Danh sách tính năng & Cài đặt */}
                  <div className="space-y-1 text-xs text-slate-300">
                    <Link
                      href="/settings"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 hover:text-white transition-colors font-medium text-amber-300"
                    >
                      <Settings className="w-4 h-4 text-[#ffd166]" />
                      Cài Đặt Tài Khoản Cá Nhân
                    </Link>

                    <Link
                      href="/rankings"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-800 hover:text-white transition-colors"
                    >
                      <Crown className="w-4 h-4 text-amber-400" />
                      Bảng Vàng Tiên Vương
                    </Link>

                    <Link
                      href="/vip"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-800 hover:text-amber-400 transition-colors"
                    >
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Đặc Quyền Hội Viên VIP
                    </Link>

                    <Link
                      href="/ai"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-800 hover:text-indigo-400 transition-colors"
                    >
                      <Bot className="w-4 h-4 text-indigo-400" />
                      Đàm Đạo Với AI Đạo Hữu
                    </Link>

                    <div className="border-t border-white/10 my-1.5 pt-1.5" />

                    {/* Nút Đăng Xuất */}
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors font-semibold"
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
