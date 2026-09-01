'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  MessageSquare,
  BookOpen,
  Crown,
  Sparkles,
  CheckCheck,
  Check,
  Clock,
  ChevronRight,
  Info,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { NotificationItem } from '@/types';
import { CultivationSpinner } from '@/components/cultivation-spinner';

export function NotificationDropdown() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = async () => {
    if (!isAuthenticated) return;
    try {
      const count = await api.getUnreadNotificationCount();
      setUnreadCount(count);
    } catch {
      // Bỏ qua lỗi kết nối
    }
  };

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const [items, count] = await Promise.all([
        api.getNotifications(1, 15),
        api.getUnreadNotificationCount(),
      ]);
      setNotifications(items);
      setUnreadCount(count);
    } catch {
      // Bỏ qua lỗi
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 45000); // Cập nhật định kỳ 45s
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Bỏ qua
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // Bỏ qua
    }
  };

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.is_read) {
      await handleMarkAsRead(item.id);
    }
    setOpen(false);
    // Nếu có liên kết điều hướng
    if (item.type === 'vip_expiring') {
      router.push('/vip');
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSeconds < 60) return 'Vừa xong';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes} phút trước`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return d.toLocaleDateString('vi-VN');
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'comment_reply':
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex-shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
        );
      case 'new_chapter':
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex-shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
        );
      case 'vip_expiring':
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 flex-shrink-0">
            <Crown className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 flex-shrink-0">
            <Bell className="w-4 h-4" />
          </div>
        );
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Nút Chuông Linh Thư */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl text-slate-300 hover:text-amber-400 hover:bg-slate-800/80 transition-all active:scale-95"
        title="Linh Thư Báo Tin"
        aria-label="Linh Thư Báo Tin"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-amber-600 text-black text-[10px] font-black shadow-md shadow-amber-500/40 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu Linh Thư */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-white/10 bg-[#0c121e]/95 p-0 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in-0 zoom-in-95 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3.5 border-b border-white/10 bg-slate-900/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#ffd166] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Linh Thư Báo Tin
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {unreadCount} mới
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] text-slate-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition-colors"
                title="Đánh dấu tất cả đã đọc"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Đã đọc hết</span>
              </button>
            )}
          </div>

          {/* Danh sách thông báo */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-white/5 scrollbar-thin">
            {loading && notifications.length === 0 ? (
              <div className="py-8">
                <CultivationSpinner size="sm" text="Đang tiếp nhận linh thư..." showText={true} />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-2">
                <Bell className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-semibold text-slate-300">Không có linh thư nào</p>
                <p className="text-[11px] text-slate-500">
                  Các thông báo về bình luận, chương mới hoặc hội viên sẽ xuất hiện tại đây.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`p-3 sm:p-3.5 flex items-start gap-3 hover:bg-slate-800/60 transition-colors cursor-pointer group relative ${
                    !item.is_read ? 'bg-amber-500/[0.04]' : ''
                  }`}
                >
                  {/* Icon loại thông báo */}
                  {getNotificationIcon(item.type)}

                  {/* Nội dung */}
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center justify-between gap-1">
                      <h4
                        className={`text-xs font-bold truncate ${
                          !item.is_read ? 'text-white' : 'text-slate-300'
                        }`}
                      >
                        {item.title}
                      </h4>
                      {!item.is_read && (
                        <span className="h-2 w-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1.5 font-mono">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{formatRelativeTime(item.created_at)}</span>
                    </div>
                  </div>

                  {/* Nút đánh dấu đã đọc riêng lẻ */}
                  {!item.is_read && (
                    <button
                      onClick={(e) => handleMarkAsRead(item.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-amber-400 transition-opacity"
                      title="Đánh dấu đã đọc"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-white/10 bg-slate-900/60 text-center">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="text-[11px] text-amber-400 hover:text-amber-300 font-bold transition-colors inline-flex items-center gap-1"
            >
              Xem trang cá nhân tu luyện <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
