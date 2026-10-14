'use client';

import { MediaImage } from '@/components/media-image';

import { useAuth } from '@/context/auth-context';
import { getFullAvatarUrl } from '@/lib/api';
import { useHydrated } from '@/lib/use-hydrated';
import { Bookmark, BookOpen, Compass, Crown, Sparkles, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function BottomTabBar() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const mounted = useHydrated();

  const navItems = [
    {
      label: 'Khám Phá',
      href: '/',
      icon: Compass,
      isActive: pathname === '/',
    },
    {
      label: 'Thể Loại',
      href: '/categories',
      icon: BookOpen,
      isActive: pathname.startsWith('/categories'),
    },
    {
      label: 'Bảng Vàng',
      href: '/rankings',
      icon: Crown,
      isActive: pathname.startsWith('/rankings'),
    },
    {
      label: 'Tủ Truyện',
      href: '/library',
      icon: Bookmark,
      isActive: pathname.startsWith('/library'),
    },
    {
      label: 'VIP',
      href: '/vip',
      icon: Sparkles,
      isActive: pathname.startsWith('/vip'),
      highlight: true,
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#070a11]/95 backdrop-blur-2xl px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-2xl">
      <nav className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all ${item.isActive
                  ? 'text-amber-400 scale-105'
                  : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 ${item.isActive
                      ? 'text-amber-400 stroke-[2.5]'
                      : item.highlight
                        ? 'text-amber-300'
                        : 'text-slate-400'
                    }`}
                />
                {item.highlight && !item.isActive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}
              </div>
              <span
                className={`text-[11px] font-semibold mt-0.5 truncate max-w-[56px] text-center ${item.isActive ? 'text-amber-400 font-bold' : ''
                  }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Tab Cá Nhân / Tu Vi */}
        <Link
          href={mounted && isAuthenticated ? '/settings' : '/login'}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all ${pathname.startsWith('/settings') || pathname.startsWith('/login')
              ? 'text-amber-400 scale-105'
              : 'text-slate-400 hover:text-slate-200'
            }`}
        >
          {mounted && isAuthenticated && user ? (
            <div className="relative">
              <div className="w-5 h-5 rounded-full overflow-hidden border border-amber-400/80 bg-slate-800 flex items-center justify-center text-[11px] font-bold text-amber-300">
                {user.avatar_url ? (
                  <MediaImage
                    src={getFullAvatarUrl(user.avatar_url)}
                    alt={user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user.username.charAt(0).toUpperCase()
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
          ) : (
            <User className="w-5 h-5 text-slate-400" />
          )}
          <span
            className={`text-[11px] font-semibold mt-0.5 truncate max-w-[56px] text-center ${pathname.startsWith('/settings') || pathname.startsWith('/login')
                ? 'text-amber-400 font-bold'
                : ''
              }`}
          >
            {mounted && isAuthenticated ? 'Tu Vi' : 'Tài Khoản'}
          </span>
        </Link>
      </nav>
    </div>
  );
}
