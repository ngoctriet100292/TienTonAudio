'use client';

import { getRealmProgress } from '@/lib/cultivation';
import { useCultivationCatalogue } from '@/context/cultivation-context';
import { MediaImage } from '@/components/media-image';

import { NotificationDropdown } from '@/components/notification-dropdown';
import { useAuth } from '@/context/auth-context';
import { getFullAvatarUrl } from '@/lib/api';
import { useHydrated } from '@/lib/use-hydrated';
import {
  Bookmark,
  BookOpen,
  Bot,
  ChevronDown,
  Compass,
  Crown,
  Flame,
  Headphones,
  Info,
  LayoutGrid,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  PenTool,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';

export function Navbar() {
  const router = useRouter();
  const { realms, count } = useCultivationCatalogue();
  const REALM_COUNT = count || '…';
  const { user, isAuthenticated, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [introDropdownOpen, setIntroDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mounted = useHydrated();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const introTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleIntroMouseEnter = () => {
    if (introTimeoutRef.current) clearTimeout(introTimeoutRef.current);
    setIntroDropdownOpen(true);
  };

  const handleIntroMouseLeave = () => {
    introTimeoutRef.current = setTimeout(() => {
      setIntroDropdownOpen(false);
    }, 150);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  useEffect(() => {

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (introRef.current && !introRef.current.contains(event.target as Node)) {
        setIntroDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (introTimeoutRef.current) clearTimeout(introTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  return (
    <header className="site-header sticky top-0 z-40 w-full border-b border-white/10 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo Tiên Tôn Audio */}
        <div className="flex items-center gap-4 xl:gap-8 flex-shrink-0">
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group flex-shrink-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ffd166] via-[#ffb703] to-[#d48b00] p-[1.5px] shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#070a11]">
                <Headphones className="h-4 w-4 sm:h-5 sm:w-5 text-[#ffd166]" />
              </div>
            </div>
            <div className="flex-shrink-0">
              <span className="text-base sm:text-lg font-semibold tracking-tight text-white whitespace-nowrap">
                TIÊN TÔN <span className="text-[#ffb703]">AUDIO</span>
              </span>
              <span className="hidden sm:block text-[11px] sm:text-[11px] font-semibold tracking-normal text-slate-400">
                Truyện hay · Giọng đọc chất lượng
              </span>
            </div>
          </Link>

          {/* Navigation Links (Desktop: Tinh gọn, chỉ giữ 4 mục chính + Dropdown Tiện Ích) */}
          <nav className="hidden lg:flex items-center gap-3.5 xl:gap-5 text-sm font-medium flex-shrink-0">
            <Link
              href="/"
              className="text-white hover:text-[#ffb703] transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Compass className="w-4 h-4 flex-shrink-0 text-amber-400" />
              <span>Khám phá</span>
            </Link>
            <Link
              href="/categories"
              className="text-slate-300 hover:text-[#ffb703] transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <BookOpen className="w-4 h-4 flex-shrink-0 text-slate-400" />
              <span>Thể loại</span>
            </Link>
            <Link
              href="/rankings"
              className="text-slate-300 hover:text-[#ffb703] transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Crown className="w-4 h-4 text-[#ffb703] flex-shrink-0" />
              <span>Xếp hạng</span>
            </Link>
            <Link
              href="/library"
              className="text-slate-300 hover:text-[#ffb703] transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Bookmark className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>Tủ truyện</span>
            </Link>

            {/* Dropdown Tiện Ích (Gom Luận Đạo, Cảnh Giới, AI Đạo Hữu, Giới Thiệu, Liên Hệ) */}
            <div
              className="relative flex-shrink-0"
              ref={introRef}
              onMouseEnter={handleIntroMouseEnter}
              onMouseLeave={handleIntroMouseLeave}
            >
              <button
                type="button"
                onClick={() => setIntroDropdownOpen(!introDropdownOpen)}
                className={`flex items-center gap-1.5 transition-colors font-medium cursor-pointer py-2 whitespace-nowrap ${introDropdownOpen ? 'text-[#ffb703]' : 'text-slate-300 hover:text-[#ffb703]'
                  }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                <span>Khám phá thêm</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${introDropdownOpen ? 'rotate-180 text-[#ffb703]' : ''
                    }`}
                />
              </button>

              {introDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-72 rounded-2xl border border-white/10 bg-[#0c121e]/98 p-2.5 shadow-2xl backdrop-blur-2xl animate-in fade-in-0 zoom-in-95 z-50">
                  {/* Luận Đạo - Mạng Xã Hội */}
                  <Link
                    href="/community"
                    onClick={() => setIntroDropdownOpen(false)}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/80 transition-colors group"
                  >
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 group-hover:scale-105 transition-transform">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                          Luận Đạo Các
                        </p>
                        <span className="text-[11px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                          Cộng Đồng
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        Giao lưu, bình phẩm cùng các đạo hữu
                      </p>
                    </div>
                  </Link>

                  {/* Cảnh Giới Tu Tiên */}
                  <Link
                    href="/cultivation"
                    onClick={() => setIntroDropdownOpen(false)}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/80 transition-colors group"
                  >
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 group-hover:scale-105 transition-transform">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                          Cảnh Giới Tu Tiên
                        </p>
                        <span className="text-[11px] px-1.5 py-0.5 rounded font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                          {REALM_COUNT} cảnh
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        Bảng cảnh giới & tích lũy tu vi
                      </p>
                    </div>
                  </Link>

                  {/* AI Đạo Hữu */}
                  <Link
                    href="/ai"
                    onClick={() => setIntroDropdownOpen(false)}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/80 transition-colors group"
                  >
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 group-hover:scale-105 transition-transform">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                        AI Đạo Hữu
                      </p>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        Trợ lý AI giải đáp cốt truyện tu chân
                      </p>
                    </div>
                  </Link>

                  {/* Về Chúng Tôi */}
                  <Link
                    href="/about"
                    onClick={() => setIntroDropdownOpen(false)}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/80 transition-colors group"
                  >
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30 group-hover:scale-105 transition-transform">
                      <Info className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white group-hover:text-sky-300 transition-colors">
                        Về Chúng Tôi
                      </p>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        Sứ mệnh & tôn chỉ Tiên Tôn Audio
                      </p>
                    </div>
                  </Link>

                  {/* Liên Hệ & Hỗ Trợ */}
                  <Link
                    href="/contact"
                    onClick={() => setIntroDropdownOpen(false)}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/80 transition-colors group"
                  >
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 group-hover:scale-105 transition-transform">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                        Liên Hệ & Báo Lỗi
                      </p>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        Góp ý, hợp tác & bản quyền DMCA
                      </p>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Thanh tìm kiếm & Avatar Đạo Hữu */}
        <div className="flex items-center gap-3 xl:gap-4 flex-shrink-0">
          <form onSubmit={handleSearch} className="relative hidden sm:block w-40 md:w-48 lg:w-44 xl:w-64">
            <input
              type="text"
              placeholder="Tìm kiếm truyện..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full bg-slate-900/90 border border-white/10 px-3.5 py-2 pl-9 text-xs text-white placeholder-slate-400 focus:border-[#ffb703] focus:outline-none transition-all"
            />
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          </form>

          {/* Nút VIP nhỏ gọn */}
          <Link
            href="/vip"
            className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-200 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-amber-500/5 border border-amber-500/30 hover:border-amber-500/50 shadow-sm shadow-amber-500/10 transition-all hover:scale-105 active:scale-95"
            title="Đặc quyền Hội Viên VIP"
          >
            <Crown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span className="font-extrabold tracking-wider">VIP</span>
          </Link>

          {/* Linh Thư Báo Tin (Thông Báo) */}
          {mounted && isAuthenticated && <NotificationDropdown />}

          {/* User Avatar - Khi đăng nhập CHỈ hiện ảnh đại diện */}
          {mounted && isAuthenticated && user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="group relative flex h-10 w-10 items-center justify-center rounded-full p-[2px] bg-gradient-to-tr from-[#ffd166] via-[#ffb703] to-amber-700 shadow-lg shadow-amber-500/25 hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                title="Tài khoản Đạo Hữu"
              >
                {user.avatar_url ? (
                  <MediaImage
                    src={getFullAvatarUrl(user.avatar_url)}
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
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full overflow-hidden bg-gradient-to-tr from-[#ffd166] to-[#ffb703] text-black font-black text-base shadow-md">
                        {user.avatar_url ? (
                          <MediaImage
                            src={getFullAvatarUrl(user.avatar_url)}
                            alt={user.username}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          user.username[0]?.toUpperCase() || 'U'
                        )}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-white truncate">{user.username}</p>
                          <span className="text-[11px] px-2 py-0.5 rounded font-bold bg-amber-500/20 text-[#ffd166] border border-amber-500/30">
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
                          className="font-black px-2 py-0.5 rounded-md text-[11px] tracking-wider uppercase shadow-sm"
                          style={{
                            backgroundColor: `${user.cultivation_color || '#38BDF8'}20`,
                            color: user.cultivation_color || '#38BDF8',
                            borderColor: `${user.cultivation_color || '#38BDF8'}40`,
                            borderWidth: 1,
                          }}
                        >
                          {user.cultivation_realm || 'Phàm Nhân'} Cảnh
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-1">
                        <span>Tu Vi: {user.cultivation_exp || 0} điểm</span>
                        <span>Cấp {user.cultivation_level || 1}/{REALM_COUNT}</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#ffd166] to-[#ffb703] rounded-full transition-all duration-500"
                          style={{
                            width: `${(realms.length ? getRealmProgress(user.cultivation_exp, realms).progress : 0)}%`,
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

                  <Link href="/account" onClick={()=>setDropdownOpen(false)} className="block px-3 py-2.5 text-sm font-semibold text-amber-300 hover:bg-slate-800 rounded-xl">Tiên lộ · Nghe tiếp & thành tựu</Link>
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
                      href="/library"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-800 hover:text-amber-400 transition-colors font-medium"
                    >
                      <Bookmark className="w-4 h-4 text-amber-400" />
                      Tủ Truyện Tiên Phủ (Thư Viện)
                    </Link>

                    <Link
                      href="/cultivation"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-800 hover:text-amber-400 transition-colors"
                    >
                      <Flame className="w-4 h-4 text-amber-400" />
                      {REALM_COUNT} cảnh giới
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

                    <Link
                      href="/studio"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-800 hover:text-amber-400 transition-colors font-semibold text-amber-300"
                    >
                      <PenTool className="w-4 h-4 text-amber-400" />
                      Kênh Đối Tác / Sáng Tác
                    </Link>

                    {user.role === 'admin' && (
                      <Link
                        href="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-rose-500/20 text-rose-300 transition-colors font-bold border border-rose-500/30"
                      >
                        <ShieldCheck className="w-4 h-4 text-rose-400" />
                        Quản Trị Tối Cao (Admin)
                      </Link>
                    )}

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

          {/* Nút Hamburger Menu cho Mobile/Tablet (< lg) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white hover:border-amber-400/50 transition-all focus:outline-none"
            aria-label="Mở menu điều hướng"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-amber-400" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation (Hiển thị khi thu nhỏ màn hình và bấm hamburger) */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-16 bottom-0 z-50 bg-[#070a11]/98 backdrop-blur-3xl overflow-y-auto px-4 py-6 border-t border-white/10 animate-in fade-in-0 slide-in-from-top-4 duration-200">
          <div className="space-y-6 max-w-lg mx-auto">
            {/* Form tìm kiếm Mobile */}
            <form
              onSubmit={(e) => {
                handleSearch(e);
                setMobileMenuOpen(false);
              }}
              className="relative"
            >
              <input
                type="text"
                placeholder="Tìm kiếm truyện, tác giả..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl bg-slate-900 border border-white/15 px-4 py-3 pl-11 text-sm text-white placeholder-slate-400 focus:border-[#ffb703] focus:outline-none"
              />
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
            </form>

            {/* Menu chính */}
            <div className="space-y-1">
              <p className="text-[11px] uppercase font-bold text-slate-500 tracking-wider px-3 mb-2">
                Điều Hướng Chính
              </p>
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-200 hover:text-white hover:bg-slate-800/60 font-semibold text-sm transition-all"
              >
                <Compass className="w-5 h-5 text-sky-400" />
                Khám Phá Truyện
              </Link>
              <Link
                href="/rankings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-200 hover:text-white hover:bg-slate-800/60 font-semibold text-sm transition-all"
              >
                <Crown className="w-5 h-5 text-amber-400" />
                Bảng Vàng Tiên Vương
              </Link>
              <Link
                href="/categories"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-200 hover:text-white hover:bg-slate-800/60 font-semibold text-sm transition-all"
              >
                <BookOpen className="w-5 h-5 text-emerald-400" />
                Thể Loại Audio
              </Link>
              <Link
                href="/library"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-200 hover:text-white hover:bg-slate-800/60 font-semibold text-sm transition-all"
              >
                <Bookmark className="w-5 h-5 text-amber-400" />
                Tủ Truyện Cá Nhân
              </Link>
              <Link
                href="/vip"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/30 text-amber-300 font-bold text-sm"
              >
                <span className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  Hội Viên VIP Tiên Tôn
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded font-mono font-black bg-amber-500/30 text-amber-300 uppercase">
                  VIP
                </span>
              </Link>
            </div>

            {/* Giới thiệu & Khám phá thế giới */}
            <div className="space-y-1 pt-3 border-t border-white/10">
              <p className="text-[11px] uppercase font-bold text-slate-500 tracking-wider px-3 mb-2">
                Giới Thiệu & Tiên Đạo
              </p>
              <Link
                href="/community"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-4 py-3 rounded-2xl text-slate-200 hover:text-white hover:bg-slate-800/60 font-semibold text-sm transition-all"
              >
                <span className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-amber-400" />
                  Luận Đạo Các (Cộng Đồng)
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded font-mono font-bold bg-amber-500/20 text-amber-300 uppercase">
                  Hot
                </span>
              </Link>
              <Link
                href="/cultivation"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-4 py-3 rounded-2xl text-slate-200 hover:text-white hover:bg-slate-800/60 font-semibold text-sm transition-all"
              >
                <span className="flex items-center gap-3">
                  <Flame className="w-5 h-5 text-amber-400" />
                  {REALM_COUNT} cảnh giới
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded font-mono font-bold bg-amber-500/20 text-amber-300 uppercase">
                  Mới
                </span>
              </Link>
              <Link
                href="/ai"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-200 hover:text-white hover:bg-slate-800/60 font-semibold text-sm transition-all"
              >
                <Bot className="w-5 h-5 text-indigo-400" />
                AI Đạo Hữu (Hỏi Đáp)
              </Link>
              <Link
                href="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-200 hover:text-white hover:bg-slate-800/60 font-semibold text-sm transition-all"
              >
                <Info className="w-5 h-5 text-sky-400" />
                Về Chúng Tôi
              </Link>
              <Link
                href="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-200 hover:text-white hover:bg-slate-800/60 font-semibold text-sm transition-all"
              >
                <Mail className="w-5 h-5 text-emerald-400" />
                Liên Hệ & Hỗ Trợ
              </Link>
            </div>

            {/* Thông tin tài khoản Mobile */}
            {mounted && isAuthenticated && user ? (
              <div className="pt-3 border-t border-white/10 space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900 border border-white/10">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full overflow-hidden bg-gradient-to-tr from-[#ffd166] to-[#ffb703] text-black font-black">
                    {user.avatar_url ? (
                      <MediaImage
                        src={getFullAvatarUrl(user.avatar_url)}
                        alt={user.username}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      user.username[0]?.toUpperCase() || 'U'
                    )}
                  </div>
                  <div className="truncate flex-1">
                    <p className="text-sm font-bold text-white truncate">{user.username}</p>
                    <p className="text-xs text-amber-400 font-medium">
                      {user.cultivation_realm || 'Phàm Nhân'} Cảnh (Cấp {user.cultivation_level || 1})
                    </p>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                  >
                    <Settings className="w-4 h-4" />
                  </Link>
                </div>

                <Link href="/account" onClick={()=>setMobileMenuOpen(false)} className="block rounded-xl bg-amber-400/10 p-3 text-sm text-amber-300">Tiên lộ · Nghe tiếp & thành tựu</Link>
                <Link
                  href="/studio"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 px-3 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 border border-amber-500/30 transition-colors"
                >
                  <PenTool className="w-4 h-4 text-amber-400" /> Kênh Đối Tác Sáng Tác (Studio)
                </Link>

                {user.role === 'admin' && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-2.5 px-3 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 border border-rose-500/30 transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4 text-rose-400" /> Quản Trị Tối Cao (Admin Portal)
                  </Link>
                )}

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs flex items-center justify-center gap-2 border border-rose-500/30 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Đăng Xuất Tài Khoản
                </button>
              </div>
            ) : (
              <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-3">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-3 rounded-2xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs text-center shadow-md shadow-amber-500/20"
                >
                  Đăng Nhập
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-3 rounded-2xl bg-slate-800 text-white font-bold text-xs text-center border border-white/10 hover:bg-slate-700"
                >
                  Đăng Ký
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
