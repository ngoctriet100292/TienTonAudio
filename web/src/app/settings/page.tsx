'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Lock,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Crown,
  Settings as SettingsIcon,
  Flame,
  Zap,
  Sparkles,
  Award,
  Upload,
  Camera,
  Heart,
  HeartOff,
  Clock,
  CreditCard,
  Receipt,
  BookOpen,
  Play,
  Star,
  Trash2,
  Loader2,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';
import {
  UserCultivation,
  FavoriteStoryItem,
  ListeningHistoryItem,
  PaymentHistoryItem,
} from '@/types';

type TabType = 'profile' | 'favorites' | 'history' | 'payments' | 'cultivation' | 'password' | '2fa';

function getFullAvatarUrl(url?: string) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const backendBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:8080';
  return `${backendBase}${url}`;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<TabType>('profile');

  // Tu vi state
  const [cultivationData, setCultivationData] = useState<UserCultivation | null>(null);
  const [cultivationLoading, setCultivationLoading] = useState(false);

  // Form profile & avatar
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Form password
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Form 2FA
  const [mfaSetupData, setMfaSetupData] = useState<{ secret: string; qr_code_url: string } | null>(null);
  const [mfaOtp, setMfaOtp] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [mfaMsg, setMfaMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [mfaLoading, setMfaLoading] = useState(false);

  // Favorites state
  const [favorites, setFavorites] = useState<FavoriteStoryItem[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);

  // History state
  const [history, setHistory] = useState<ListeningHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Payments state
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [activeSubscription, setActiveSubscription] = useState<any>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
    if (user) {
      setUsername(user.username || '');
      setAvatarUrl(user.avatar_url || '');
    }
  }, [user, isAuthenticated, isLoading, router]);

  // Load data based on active tab
  useEffect(() => {
    if (!isAuthenticated) return;

    if (activeTab === 'cultivation') {
      setCultivationLoading(true);
      api.getCultivation().then(setCultivationData).finally(() => setCultivationLoading(false));
    } else if (activeTab === 'favorites') {
      setFavoritesLoading(true);
      api.getUserFavorites().then(setFavorites).finally(() => setFavoritesLoading(false));
    } else if (activeTab === 'history') {
      setHistoryLoading(true);
      api.getUserHistory().then(setHistory).finally(() => setHistoryLoading(false));
    } else if (activeTab === 'payments') {
      setPaymentsLoading(true);
      api.getUserPayments().then(setPayments).finally(() => setPaymentsLoading(false));

      // Lấy thêm gói VIP đang hoạt động
      const token = localStorage.getItem('access_token');
      if (token) {
        fetch('http://localhost:8080/api/v1/payments/my-subscription', {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => setActiveSubscription(data))
          .catch(() => setActiveSubscription(null));
      }
    }
  }, [activeTab, isAuthenticated]);

  // 1. Tải ảnh đại diện lên (Upload Avatar)
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Kiểm tra định dạng & dung lượng (tối đa 5MB)
    if (!file.type.match(/image\/(png|jpeg|jpg|webp)/)) {
      setProfileMsg({ type: 'error', text: 'Chỉ chấp nhận file ảnh định dạng PNG, JPG, JPEG, WEBP' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfileMsg({ type: 'error', text: 'Dung lượng ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn' });
      return;
    }

    setProfileMsg(null);
    setIsUploadingAvatar(true);

    try {
      const res = await api.uploadAvatar(file);
      setAvatarUrl(res.avatar_url);
      await refreshProfile();
      setProfileMsg({ type: 'success', text: 'Tải và cập nhật ảnh đại diện thành công!' });
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message || 'Lỗi tải ảnh đại diện lên' });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 2. Cập nhật hồ sơ bằng tay
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setProfileLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://localhost:8080/api/v1/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username, avatar_url: avatarUrl }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Cập nhật thất bại');

      await refreshProfile();
      setProfileMsg({ type: 'success', text: 'Cập nhật hồ sơ đạo hữu thành công!' });
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message });
    } finally {
      setProfileLoading(false);
    }
  };

  // 3. Đổi mật khẩu
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu mới và xác nhận mật khẩu không khớp' });
      return;
    }

    setPasswordLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://localhost:8080/api/v1/users/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Đổi mật khẩu thất bại');

      setPasswordMsg({ type: 'success', text: 'Đổi mật khẩu thành công!' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message });
    } finally {
      setPasswordLoading(false);
    }
  };

  // 4. Bật 2FA
  const handleStartSetup2FA = async () => {
    setMfaLoading(true);
    setMfaMsg(null);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://localhost:8080/api/v1/auth/2fa/setup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Không thể tạo mã 2FA');
      setMfaSetupData(json.data);
    } catch (err: any) {
      setMfaMsg({ type: 'error', text: err.message });
    } finally {
      setMfaLoading(false);
    }
  };

  const handleConfirmEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaMsg(null);
    setMfaLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://localhost:8080/api/v1/auth/2fa/enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: mfaOtp }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Mã OTP không chính xác');

      setBackupCodes(json.data?.backup_codes || []);
      setMfaMsg({ type: 'success', text: 'Kích hoạt 2FA thành công! Vui lòng lưu các mã cứu hộ dưới đây.' });
      await refreshProfile();
      setMfaSetupData(null);
      setMfaOtp('');
    } catch (err: any) {
      setMfaMsg({ type: 'error', text: err.message });
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    const code = prompt('Vui lòng nhập mã xác thực OTP 6 số hiện tại để tắt 2FA:');
    if (!code) return;

    setMfaLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://localhost:8080/api/v1/auth/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Mã xác thực không hợp lệ');

      setMfaMsg({ type: 'success', text: 'Đã hủy bảo mật 2FA thành công.' });
      await refreshProfile();
    } catch (err: any) {
      setMfaMsg({ type: 'error', text: err.message });
    } finally {
      setMfaLoading(false);
    }
  };

  if (!user) return null;

  const fullAvatar = getFullAvatarUrl(avatarUrl || user.avatar_url);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-8 pb-16 space-y-8">
      {/* Header Profile Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-r from-[#131b2e] via-[#0f172a] to-[#070a11] p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
          {/* Avatar với nút upload nhanh */}
          <div className="relative group">
            <div className="relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-full overflow-hidden border-2 border-amber-400/60 shadow-xl shadow-amber-500/20 bg-slate-800">
              {fullAvatar ? (
                <img
                  src={fullAvatar}
                  alt={user.username}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-3xl sm:text-4xl font-black text-amber-300">
                  {user.username ? user.username.charAt(0).toUpperCase() : 'Đ'}
                </span>
              )}

              {isUploadingAvatar && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-amber-400 gap-1">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-[10px] font-bold">Đang tải...</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute bottom-0 right-0 p-2 rounded-full bg-gradient-to-tr from-[#ffd166] to-[#ffb703] text-black shadow-lg shadow-amber-500/40 hover:scale-110 active:scale-95 transition-all"
              title="Đổi ảnh đại diện"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarFileChange}
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
            />
          </div>

          {/* User Info */}
          <div className="text-center sm:text-left space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-white">{user.username}</h1>
              {user.is_premium ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black shadow-md shadow-amber-500/20">
                  <Crown className="w-3.5 h-3.5 fill-black" /> HỘI VIÊN VIP
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-white/10">
                  Tu Sĩ Tự Do
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 font-mono">{user.email}</p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-[#ffd166]">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                {user.cultivation_realm || 'Luyện Khí'} Cảnh (Cấp {user.cultivation_level || 1})
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Linh lực: <strong className="text-white">{user.cultivation_exp ?? 0} EXP</strong>
              </span>
            </div>
          </div>

          {/* Quick VIP Action */}
          <button
            onClick={() => router.push('/vip')}
            className="flex-shrink-0 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <Crown className="w-4 h-4 fill-black" /> NÂNG CẤP VIP
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-px overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === 'profile'
              ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <User className="w-4 h-4" /> Hồ Sơ & Avatar
        </button>

        <button
          onClick={() => setActiveTab('favorites')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === 'favorites'
              ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Heart className="w-4 h-4 text-rose-400" /> Truyện Yêu Thích
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4 text-blue-400" /> Truyện Đã Lưu & Lịch Sử
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === 'payments'
              ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Receipt className="w-4 h-4 text-emerald-400" /> Lịch Sử Thanh Toán
        </button>

        <button
          onClick={() => setActiveTab('cultivation')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === 'cultivation'
              ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Flame className="w-4 h-4 text-amber-400" /> Động Phủ Tu Vi
        </button>

        <button
          onClick={() => setActiveTab('password')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === 'password'
              ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Lock className="w-4 h-4" /> Đổi Mật Khẩu
        </button>

        <button
          onClick={() => setActiveTab('2fa')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === '2fa'
              ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Bảo Mật 2FA
        </button>
      </div>

      {/* TAB 1: HỒ SƠ & TẢI ẢNH ĐẠI DIỆN */}
      {activeTab === 'profile' && (
        <div className="space-y-6 max-w-2xl bg-slate-900/60 p-6 sm:p-8 rounded-3xl border border-white/10 animate-in fade-in-0 duration-200">
          <div>
            <h3 className="text-lg font-black text-white">Chỉnh Sửa Hồ Sơ Cá Nhân</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Cập nhật đạo hiệu và ảnh đại diện hiển thị trên bình luận và bảng xếp hạng tu vi.
            </p>
          </div>

          {profileMsg && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
                profileMsg.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}
            >
              {profileMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              {profileMsg.text}
            </div>
          )}

          {/* Phần Tải Ảnh Đại Diện Lên */}
          <div className="p-5 rounded-2xl bg-slate-800/60 border border-white/5 space-y-4">
            <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
              Ảnh Đại Diện (Avatar)
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="relative flex-shrink-0">
                <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-amber-400/50 bg-slate-950 flex items-center justify-center">
                  {fullAvatar ? (
                    <img src={fullAvatar} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-slate-500" />
                  )}
                </div>
              </div>

              <div className="space-y-2 text-center sm:text-left flex-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 text-[#ffd166] border border-amber-500/40 text-xs font-bold hover:bg-amber-500/30 transition-all"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {isUploadingAvatar ? 'Đang tải lên...' : 'Tải Ảnh Mới Lên'}
                  </button>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl('')}
                      className="px-3 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-rose-400 text-xs transition-colors"
                    >
                      Gỡ ảnh
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Hỗ trợ PNG, JPG, JPEG, WEBP tối đa 5MB. Ảnh sẽ được tự động cập nhật ngay khi chọn.
                </p>
              </div>
            </div>

            {/* Hoặc nhập URL */}
            <div className="pt-2 border-t border-white/5">
              <label className="block text-[11px] text-slate-400 mb-1">Hoặc nhập URL ảnh trực tiếp:</label>
              <input
                type="url"
                placeholder="https://example.com/avatar.jpg"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tên Đạo Hiệu (Username)</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email (Cố định)</label>
              <input
                type="email"
                disabled
                value={user.email}
                className="w-full rounded-xl bg-slate-800/50 border border-white/5 px-4 py-2.5 text-xs text-slate-400 cursor-not-allowed"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={profileLoading}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs shadow-md shadow-amber-500/20 hover:opacity-95 transition-opacity disabled:opacity-50"
              >
                {profileLoading ? 'Đang Lưu...' : 'LƯU THAY ĐỔI'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: DANH SÁCH TRUYỆN YÊU THÍCH */}
      {activeTab === 'favorites' && (
        <div className="space-y-6 animate-in fade-in-0 duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500 fill-rose-500" /> Tủ Truyện Yêu Thích Của Bạn
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Các bộ truyện đạo hữu đã thả tim theo dõi để nhận thông báo chương mới nhất.
              </p>
            </div>
            <span className="text-xs font-bold text-amber-400 font-mono">
              {favorites.length} tác phẩm
            </span>
          </div>

          {favoritesLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-slate-900 border border-white/5 p-3 space-y-3 animate-pulse">
                  <div className="aspect-[2/3] bg-slate-800 rounded-xl" />
                  <div className="h-4 bg-slate-800 rounded w-3/4" />
                  <div className="h-3 bg-slate-800 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : favorites.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-3xl bg-slate-900/40 border border-white/5 space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-slate-500">
                <HeartOff className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">Chưa có truyện yêu thích</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Hãy bấm vào biểu tượng trái tim ở các trang truyện để lưu lại vào tủ truyện của đạo hữu!
                </p>
              </div>
              <button
                onClick={() => router.push('/search')}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs shadow-md shadow-amber-500/20 hover:scale-105 transition-all"
              >
                Khám Phá Kho Truyện
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {favorites.map((story) => (
                <div
                  key={story.id}
                  className="group relative flex flex-col rounded-2xl bg-slate-900/80 border border-white/10 overflow-hidden hover:border-amber-400/50 hover:shadow-xl hover:shadow-amber-500/10 transition-all"
                >
                  <Link href={`/stories/${story.slug}`} className="block relative aspect-[2/3] overflow-hidden bg-slate-950">
                    {story.cover_image_url ? (
                      <img
                        src={story.cover_image_url}
                        alt={story.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-slate-800 text-slate-600 font-bold">
                        Tiên Tôn
                      </div>
                    )}
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-black text-amber-400 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400" />
                      {story.rating_avg ? story.rating_avg.toFixed(1) : '5.0'}
                    </div>
                  </Link>

                  <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <Link
                        href={`/stories/${story.slug}`}
                        className="text-xs font-bold text-white line-clamp-2 hover:text-amber-400 transition-colors"
                      >
                        {story.title}
                      </Link>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {story.total_chapters || 0} chương
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                      <Link
                        href={`/stories/${story.slug}`}
                        className="text-[11px] font-bold text-amber-400 hover:underline flex items-center gap-1"
                      >
                        Xem chi tiết <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TRUYỆN ĐÃ LƯU & LỊCH SỬ ĐỌC/NGHE */}
      {activeTab === 'history' && (
        <div className="space-y-6 animate-in fade-in-0 duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" /> Tiến Trình Đọc & Nghe Dở Dang
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Các tác phẩm đạo hữu đang trải nghiệm gần đây. Bấm vào để tiếp tục ngay đoạn trước.
              </p>
            </div>
            <span className="text-xs font-bold text-amber-400 font-mono">
              {history.length} chương đã lưu
            </span>
          </div>

          {historyLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 rounded-2xl bg-slate-900 border border-white/5 animate-pulse" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-3xl bg-slate-900/40 border border-white/5 space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-slate-500">
                <BookOpen className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">Chưa có lịch sử trải nghiệm</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Khi bạn đọc truyện chữ hoặc nghe audio trên hệ thống, tiến trình sẽ tự động lưu lại ở đây.
                </p>
              </div>
              <button
                onClick={() => router.push('/search')}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs shadow-md shadow-amber-500/20 hover:scale-105 transition-all"
              >
                Nghe Truyện Ngay
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item, idx) => {
                const progressPct =
                  item.duration_seconds > 0
                    ? Math.min(100, Math.round((item.last_position_seconds / item.duration_seconds) * 100))
                    : 100;

                return (
                  <div
                    key={`${item.story_id}-${item.chapter_id}-${idx}`}
                    className="p-4 rounded-2xl bg-slate-900/70 border border-white/10 hover:border-amber-400/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="h-16 w-12 flex-shrink-0 rounded-xl overflow-hidden bg-slate-800 border border-white/5">
                        {item.cover_image_url ? (
                          <img src={item.cover_image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-[10px] text-slate-500">
                            Ảnh
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <Link
                          href={`/stories/${item.story_slug || item.story_id}`}
                          className="text-sm font-bold text-white hover:text-amber-400 transition-colors truncate block"
                        >
                          {item.story_title}
                        </Link>
                        <p className="text-xs text-amber-400/90 font-medium truncate">
                          Chương {item.chapter_number}: {item.chapter_title}
                        </p>

                        {/* Thanh tiến độ */}
                        <div className="flex items-center gap-3 pt-1">
                          <div className="w-32 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            {item.duration_seconds > 0 ? `${progressPct}% đã nghe` : 'Đã đọc bản chữ'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Nút hành động */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Link
                        href={`/stories/${item.story_slug || item.story_id}/chapters/${item.chapter_id}`}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs shadow-md shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-black" />
                        Tiếp Tục
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: LỊCH SỬ GIAO DỊCH & THANH TOÁN */}
      {activeTab === 'payments' && (
        <div className="space-y-6 animate-in fade-in-0 duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" /> Lịch Sử Thanh Toán & Gói VIP
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Xem lại danh sách các lần nạp linh thạch và đăng ký hội viên VIP của bạn.
              </p>
            </div>

            <button
              onClick={() => router.push('/vip')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs shadow-md shadow-amber-500/20 hover:scale-105 transition-all flex items-center gap-1.5"
            >
              <Crown className="w-3.5 h-3.5 fill-black" /> Gia Hạn VIP
            </button>
          </div>

          {/* Thẻ trạng thái VIP hiện tại */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800/80 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Gói Hội Viên Đang Dùng</p>
                <h4 className="text-base font-black text-white">
                  {activeSubscription?.plan_name || (user.is_premium ? 'VIP Hoàng Kim' : 'Tài Khoản Thường (Miễn Phí)')}
                </h4>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-[11px] text-slate-400">Thời Hạn Sử Dụng</p>
              <p className="text-xs font-mono font-bold text-amber-400">
                {activeSubscription?.expires_at
                  ? new Date(activeSubscription.expires_at).toLocaleDateString('vi-VN')
                  : user.is_premium
                  ? 'Đang hiệu lực'
                  : 'Không giới hạn'}
              </p>
            </div>
          </div>

          {/* Bảng Danh Sách Giao Dịch */}
          {paymentsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 rounded-2xl bg-slate-900 border border-white/5 animate-pulse" />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-3xl bg-slate-900/40 border border-white/5 space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-slate-500">
                <CreditCard className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">Chưa có giao dịch nào</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Bạn chưa từng thực hiện giao dịch thanh toán nào trên Tiên Tôn Audio.
                </p>
              </div>
              <button
                onClick={() => router.push('/vip')}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs shadow-md shadow-amber-500/20 hover:scale-105 transition-all"
              >
                Khám Phá Các Gói VIP
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/60">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/70 border-b border-white/10 text-slate-400 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Gói Dịch Vụ</th>
                    <th className="py-3 px-4">Số Tiền</th>
                    <th className="py-3 px-4">Cổng TT</th>
                    <th className="py-3 px-4">Trạng Thái</th>
                    <th className="py-3 px-4">Ngày Giao Dịch</th>
                    <th className="py-3 px-4">Mã GD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {payments.map((p) => {
                    const isSuccess = p.status === 'completed';
                    const isPending = p.status === 'pending';

                    return (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white">
                          {p.plan_name || 'Gói VIP'}
                          {p.duration_days && (
                            <span className="ml-1.5 text-[10px] text-slate-400 font-normal">
                              ({p.duration_days} ngày)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                          {p.amount ? p.amount.toLocaleString('vi-VN') : 0} đ
                        </td>
                        <td className="py-3.5 px-4 uppercase font-mono text-slate-300">
                          {p.provider || 'Thẻ'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isSuccess
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : isPending
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {isSuccess ? 'Thành công' : isPending ? 'Chờ xử lý' : 'Thất bại'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono">
                          {p.created_at ? new Date(p.created_at).toLocaleString('vi-VN') : '-'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500 text-[10px]">
                          {p.transaction_id || p.id.slice(0, 8)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: ĐỘNG PHỦ TU VI */}
      {activeTab === 'cultivation' && (
        <div className="space-y-8 animate-in fade-in-0 duration-300">
          <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-b from-[#131b2e] to-[#0a0f1d] p-6 sm:p-8 shadow-2xl">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-white/10">
              <div className="flex items-center gap-4">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-200 text-black shadow-lg shadow-amber-500/30">
                  <Flame className="w-8 h-8" />
                  <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-slate-900 border border-amber-400/40 text-[10px] font-black text-amber-300">
                    Cấp {cultivationData?.level || user.cultivation_level || 1}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-black text-white">
                      {cultivationData?.current_realm || user.cultivation_realm || 'Luyện Khí'} Cảnh
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-[#ffd166] border border-amber-500/40">
                      Chính Đạo
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {cultivationData?.description || 'Sơ nhập tiên đạo, cảm ứng thiên địa linh khí'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="px-4 py-2 rounded-xl bg-slate-800/80 border border-white/10 text-right w-full sm:w-auto">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Hấp Thu Linh Khí</p>
                  <p className="text-base font-black text-emerald-400 font-mono">
                    {cultivationData?.exp_multiplier ? `${cultivationData.exp_multiplier}x` : '1.0x'} Tốc Độ
                  </p>
                </div>
              </div>
            </div>

            {/* Tiến độ Đột Phá */}
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400 flex items-center gap-1.5 font-sans font-medium">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Tu Vi Hiện Tại: <strong className="text-white">{cultivationData?.current_exp ?? user.cultivation_exp ?? 0}</strong>
                </span>
                <span className="text-amber-400 font-bold">
                  {cultivationData?.next_realm_exp === -1
                    ? 'Đỉnh Phong Viên Mãn'
                    : `Cần ${cultivationData?.next_realm_exp || 60} để Đột Phá (${(cultivationData?.progress_pct || 0).toFixed(1)}%)`}
                </span>
              </div>

              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-[#ffd166] via-[#ffb703] to-amber-500 rounded-full shadow-lg transition-all duration-700"
                  style={{
                    width: `${Math.min(100, Math.max(5, cultivationData?.progress_pct || 15))}%`,
                  }}
                />
              </div>
            </div>

            {/* Khuyến nghị tăng tu vi */}
            <div className="mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <p className="text-xs text-slate-300">
                  <strong className="text-amber-300">Đan Dược Tiến Giai:</strong> Nâng cấp Hội Viên VIP nhận ngay tới <span className="text-white font-bold">+20.000 Tu Vi</span> và nhân đôi tốc độ hấp thu linh khí khi nghe truyện.
                </p>
              </div>
              <button
                onClick={() => router.push('/vip')}
                className="flex-shrink-0 px-4 py-2 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs shadow-md shadow-amber-500/20 hover:scale-105 transition-all"
              >
                Ghé Các Các VIP
              </button>
            </div>
          </div>

          {/* Lộ Trình 17 Cảnh Giới Tu Tiên */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <h4 className="text-base font-black text-white">17 Cảnh Giới Tu Tiên Tiên Tôn</h4>
              </div>
              <span className="text-xs text-slate-400 font-mono">Bản đồ tu vi</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(cultivationData?.all_realms || []).map((realm) => {
                const currentLevel = cultivationData?.level || user.cultivation_level || 1;
                const isCurrent = realm.level === currentLevel;
                const isPassed = realm.level < currentLevel;

                return (
                  <div
                    key={realm.level}
                    className={`p-4 rounded-2xl border transition-all ${
                      isCurrent
                        ? 'border-amber-400 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                        : isPassed
                        ? 'border-emerald-500/20 bg-slate-900/40 opacity-75'
                        : 'border-white/5 bg-slate-900/20 opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black"
                          style={{
                            backgroundColor: `${realm.color}20`,
                            color: realm.color,
                            border: `1px solid ${realm.color}40`,
                          }}
                        >
                          {realm.level}
                        </span>
                        <div>
                          <h5 className="text-sm font-bold text-white">{realm.name}</h5>
                          <p className="text-[11px] text-slate-400">{realm.description}</p>
                        </div>
                      </div>

                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono tracking-wider"
                        style={{
                          backgroundColor: isCurrent ? '#f59e0b25' : isPassed ? '#10b98120' : '#64748b20',
                          color: isCurrent ? '#fbbf24' : isPassed ? '#34d399' : '#94a3b8',
                        }}
                      >
                        {isCurrent ? 'Đang Tu' : isPassed ? 'Đã Vượt' : `${realm.min_exp} EXP`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: ĐỔI MẬT KHẨU */}
      {activeTab === 'password' && (
        <form onSubmit={handleUpdatePassword} className="space-y-6 max-w-xl bg-slate-900/60 p-6 sm:p-8 rounded-3xl border border-white/10 animate-in fade-in-0 duration-200">
          <div>
            <h3 className="text-lg font-black text-white">Đổi Mật Khẩu Đăng Nhập</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Định kỳ thay đổi mật khẩu giúp bảo vệ công pháp và tài khoản tu luyện an toàn.
            </p>
          </div>

          {passwordMsg && (
            <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${passwordMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'}`}>
              {passwordMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              {passwordMsg.text}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Mật Khẩu Cũ</label>
            <input
              type="password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Mật Khẩu Mới (Tối thiểu 6 ký tự)</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Xác Nhận Mật Khẩu Mới</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={passwordLoading}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs shadow-md shadow-amber-500/20 hover:opacity-95 transition-opacity disabled:opacity-50"
          >
            {passwordLoading ? 'Đang Đổi Mật Khẩu...' : 'XÁC NHẬN ĐỔI'}
          </button>
        </form>
      )}

      {/* TAB 7: BẢO MẬT 2 LỚP (2FA) */}
      {activeTab === '2fa' && (
        <div className="space-y-6 max-w-xl bg-slate-900/60 p-6 sm:p-8 rounded-3xl border border-white/10 animate-in fade-in-0 duration-200">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" /> Xác Thực Hai Yếu Tố (2FA)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Bảo vệ tài khoản bằng ứng dụng Authenticator (Google Authenticator, Authy).
            </p>
          </div>

          {mfaMsg && (
            <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${mfaMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'}`}>
              {mfaMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              {mfaMsg.text}
            </div>
          )}

          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/80 border border-white/5">
            <div>
              <p className="text-xs font-bold text-white">Trạng thái bảo vệ</p>
              <p className="text-[11px] text-slate-400">
                {user.two_factor_enabled ? 'Đang kích hoạt bảo vệ 2 lớp' : 'Chưa kích hoạt 2FA'}
              </p>
            </div>
            {user.two_factor_enabled ? (
              <span className="px-3 py-1 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                BẢO VỆ TỐI ĐA
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-[11px] font-black bg-slate-700 text-slate-300">
                CHƯA BẬT
              </span>
            )}
          </div>

          {!user.two_factor_enabled && !mfaSetupData && (
            <button
              onClick={handleStartSetup2FA}
              disabled={mfaLoading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs shadow-md shadow-amber-500/20 hover:opacity-95 transition-opacity"
            >
              {mfaLoading ? 'Đang Khởi Tạo...' : 'BẮT ĐẦU CÀI ĐẶT 2FA'}
            </button>
          )}

          {user.two_factor_enabled && (
            <div className="space-y-3 pt-2">
              <p className="text-xs text-slate-400">
                Tài khoản của bạn đã được bảo vệ bởi mã TOTP 6 số mỗi khi đăng nhập.
              </p>
              <button
                onClick={handleDisable2FA}
                disabled={mfaLoading}
                className="px-4 py-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-xs hover:bg-rose-500/30 transition-all"
              >
                TẮT XÁC THỰC 2 LỚP
              </button>
            </div>
          )}

          {mfaSetupData && (
            <form onSubmit={handleConfirmEnable2FA} className="space-y-5 pt-4 border-t border-white/10">
              <p className="text-xs text-slate-300">
                1. Mở ứng dụng <strong>Google Authenticator</strong> hoặc <strong>Authy</strong> và quét mã QR bên dưới:
              </p>

              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl max-w-xs mx-auto">
                <img src={mfaSetupData.qr_code_url} alt="QR Code 2FA" className="w-48 h-48" />
              </div>

              <div className="space-y-1">
                <p className="text-xs text-slate-400">Hoặc nhập mã khóa thủ công (Secret key):</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={mfaSetupData.secret}
                    className="w-full rounded-xl bg-slate-800 border border-white/10 px-3.5 py-2 font-mono text-xs text-amber-300 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(mfaSetupData.secret)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10"
                    title="Sao chép"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="block text-xs font-semibold text-slate-300">
                  2. Nhập mã xác thực 6 số từ ứng dụng để kích hoạt:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="123456"
                  value={mfaOtp}
                  onChange={(e) => setMfaOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-2.5 font-mono text-sm tracking-widest text-center text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={mfaLoading || mfaOtp.length !== 6}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs shadow-md shadow-amber-500/20 hover:opacity-95 transition-opacity disabled:opacity-50"
                >
                  {mfaLoading ? 'Đang Kích Hoạt...' : 'XÁC NHẬN BẬT 2FA'}
                </button>
                <button
                  type="button"
                  onClick={() => setMfaSetupData(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs"
                >
                  Hủy Bỏ
                </button>
              </div>
            </form>
          )}

          {backupCodes.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" /> Mã Cứu Hộ Khẩn Cấp (Backup Codes)
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(backupCodes.join('\n'));
                    setCopiedCodes(true);
                    setTimeout(() => setCopiedCodes(false), 2000);
                  }}
                  className="text-[11px] font-bold text-amber-400 flex items-center gap-1 hover:underline"
                >
                  {copiedCodes ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCodes ? 'Đã chép' : 'Sao chép tất cả'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center font-mono text-xs font-bold text-white bg-black/40 p-3 rounded-xl">
                {backupCodes.map((code, idx) => (
                  <div key={idx} className="p-1 rounded bg-slate-800/80">{code}</div>
                ))}
              </div>
              <p className="text-[11px] text-slate-400">
                Lưu ý: Mỗi mã dự phòng chỉ có thể sử dụng 1 lần khi bạn bị mất quyền truy cập điện thoại.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
