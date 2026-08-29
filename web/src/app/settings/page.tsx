'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Lock,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
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
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';
import { UserCultivation } from '@/types';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, login } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'password' | '2fa' | 'cultivation'>('profile');
  const [cultivationData, setCultivationData] = useState<UserCultivation | null>(null);
  const [cultivationLoading, setCultivationLoading] = useState(false);

  // Form profile
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
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

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
    if (user) {
      setUsername(user.username || '');
      setAvatarUrl(user.avatar_url || '');
    }
  }, [user, isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (activeTab === 'cultivation') {
      setCultivationLoading(true);
      api.getCultivation().then((res) => {
        setCultivationData(res);
      }).finally(() => {
        setCultivationLoading(false);
      });
    }
  }, [activeTab]);

  // 1. Cập nhật hồ sơ
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
        body: JSON.stringify({ username, avatar_url: avatarUrl, bio }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Cập nhật thất bại');

      const updatedUser = { ...user!, username, avatar_url: avatarUrl };
      localStorage.setItem('user_profile', JSON.stringify(updatedUser));
      setProfileMsg({ type: 'success', text: 'Cập nhật hồ sơ đạo hữu thành công!' });
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message });
    } finally {
      setProfileLoading(false);
    }
  };

  // 2. Đổi mật khẩu
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

  // 3. Khởi tạo thiết lập 2FA
  const handleSetup2FA = async () => {
    setMfaMsg(null);
    setMfaLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://localhost:8080/api/v1/auth/2fa/setup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Không thể tạo mã bí mật 2FA');

      const data = json.data || json;
      setMfaSetupData(data);
    } catch (err: any) {
      setMfaMsg({ type: 'error', text: err.message });
    } finally {
      setMfaLoading(false);
    }
  };

  // 4. Kích hoạt 2FA
  const handleEnable2FA = async (e: React.FormEvent) => {
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
      if (!res.ok) throw new Error(json.error || 'Mã xác thực 6 số không đúng');

      const data = json.data || json;
      setBackupCodes(data.backup_codes || []);
      setMfaMsg({ type: 'success', text: 'Kích hoạt bảo mật 2FA thành công!' });

      const updatedUser = { ...user!, two_factor_enabled: true };
      localStorage.setItem('user_profile', JSON.stringify(updatedUser));
      setMfaSetupData(null);
    } catch (err: any) {
      setMfaMsg({ type: 'error', text: err.message });
    } finally {
      setMfaLoading(false);
    }
  };

  // 5. Tắt 2FA
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
      const updatedUser = { ...user!, two_factor_enabled: false };
      localStorage.setItem('user_profile', JSON.stringify(updatedUser));
    } catch (err: any) {
      setMfaMsg({ type: 'error', text: err.message });
    } finally {
      setMfaLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
      {/* Header */}
      <div className="border-b border-white/10 pb-6 flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
            <SettingsIcon className="w-4 h-4" />
            Quản Lý Bản Thân
          </div>
          <h1 className="text-3xl font-black text-white">Cài Đặt Tài Khoản Đạo Hữu</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-px overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold rounded-t-xl transition-all ${
            activeTab === 'profile'
              ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <User className="w-4 h-4" /> Hồ Sơ Cá Nhân
        </button>

        <button
          onClick={() => setActiveTab('password')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold rounded-t-xl transition-all ${
            activeTab === 'password'
              ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Lock className="w-4 h-4" /> Đổi Mật Khẩu
        </button>

        <button
          onClick={() => setActiveTab('2fa')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold rounded-t-xl transition-all ${
            activeTab === '2fa'
              ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Bảo Mật 2 Lớp (2FA)
        </button>

        <button
          onClick={() => setActiveTab('cultivation')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold rounded-t-xl transition-all ${
            activeTab === 'cultivation'
              ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Flame className="w-4 h-4 text-amber-400" /> Động Phủ Tu Vi
        </button>
      </div>

      {/* Tab 1: Hồ Sơ Cá Nhân */}
      {activeTab === 'profile' && (
        <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-xl bg-slate-900/60 p-6 sm:p-8 rounded-3xl border border-white/10">
          {profileMsg && (
            <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${profileMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'}`}>
              {profileMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {profileMsg.text}
            </div>
          )}

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
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email (Không thể thay đổi)</label>
            <input
              type="email"
              disabled
              value={user.email}
              className="w-full rounded-xl bg-slate-800/50 border border-white/5 px-4 py-2.5 text-xs text-slate-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Đường Dẫn Ảnh Đại Diện (Avatar URL)</label>
            <input
              type="url"
              placeholder="https://..."
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={profileLoading}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs shadow-md shadow-amber-500/20 hover:opacity-95 transition-opacity disabled:opacity-50"
          >
            {profileLoading ? 'Đang Lưu...' : 'LƯU THAY ĐỔI'}
          </button>
        </form>
      )}

      {/* Tab 2: Đổi Mật Khẩu */}
      {activeTab === 'password' && (
        <form onSubmit={handleUpdatePassword} className="space-y-6 max-w-xl bg-slate-900/60 p-6 sm:p-8 rounded-3xl border border-white/10">
          {passwordMsg && (
            <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${passwordMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'}`}>
              {passwordMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {passwordMsg.text}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Mật Khẩu Hiện Tại</label>
            <input
              type="password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Mật Khẩu Mới</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nhập Lại Mật Khẩu Mới</label>
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
            {passwordLoading ? 'Đang Đổi...' : 'CẬP NHẬT MẬT KHẨU'}
          </button>
        </form>
      )}

      {/* Tab 3: Bảo Mật 2FA */}
      {activeTab === '2fa' && (
        <div className="space-y-6 max-w-xl bg-slate-900/60 p-6 sm:p-8 rounded-3xl border border-white/10">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/80 border border-white/5">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${user.two_factor_enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {user.two_factor_enabled ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Xác Thực Hai Yếu Tố (TOTP)</h4>
                <p className="text-xs text-slate-400">
                  {user.two_factor_enabled ? 'Tài khoản đang được bảo vệ an toàn.' : 'Chưa kích hoạt. Khuyên dùng Google Authenticator.'}
                </p>
              </div>
            </div>

            {user.two_factor_enabled ? (
              <button
                onClick={handleDisable2FA}
                disabled={mfaLoading}
                className="px-4 py-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-xs hover:bg-rose-500/30 transition-colors"
              >
                Hủy 2FA
              </button>
            ) : (
              !mfaSetupData && (
                <button
                  onClick={handleSetup2FA}
                  disabled={mfaLoading}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs shadow-md"
                >
                  {mfaLoading ? 'Đang Tải...' : 'Kích Hoạt Ngay'}
                </button>
              )
            )}
          </div>

          {mfaMsg && (
            <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${mfaMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'}`}>
              {mfaMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {mfaMsg.text}
            </div>
          )}

          {/* Form nhập OTP khi đang cài đặt 2FA */}
          {mfaSetupData && (
            <form onSubmit={handleEnable2FA} className="space-y-4 pt-4 border-t border-white/10">
              <div className="text-xs text-slate-300 space-y-2">
                <p className="font-semibold text-amber-400">Bước 1: Quét mã QR bằng Google Authenticator hoặc Authy</p>
                <div className="p-4 bg-white rounded-2xl w-fit mx-auto shadow-lg">
                  {/* QR Image nếu có URL */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(mfaSetupData.qr_code_url)}`}
                    alt="2FA QR Code"
                    className="w-44 h-44"
                  />
                </div>
                <p className="text-center font-mono text-[11px] text-slate-400">
                  Hoặc nhập khóa bảo mật: <span className="text-amber-300 font-bold">{mfaSetupData.secret}</span>
                </p>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Bước 2: Nhập mã 6 số hiển thị trong ứng dụng Authenticator
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={mfaOtp}
                    onChange={(e) => setMfaOtp(e.target.value)}
                    placeholder="123456"
                    className="w-full rounded-xl bg-slate-800 border border-amber-500/40 px-4 py-2.5 pl-10 text-center font-mono text-base tracking-widest text-amber-400 focus:outline-none"
                  />
                  <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                </div>
              </div>

              <button
                type="submit"
                disabled={mfaLoading || mfaOtp.length < 6}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs shadow-md shadow-amber-500/20 disabled:opacity-50"
              >
                {mfaLoading ? 'Đang Kích Hoạt...' : 'HOÀN TẤT & LƯU MÃ DỰ PHÒNG'}
              </button>
            </form>
          )}

          {/* Hiển thị 8 mã dự phòng (Backup Codes) */}
          {backupCodes.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-amber-400">8 Mã Dự Phòng Của Đạo Hữu (Lưu Lại Ngay!)</h5>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(backupCodes.join('\n'));
                    setCopiedCodes(true);
                    setTimeout(() => setCopiedCodes(false), 2000);
                  }}
                  className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white"
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

      {/* Tab 4: Động Phủ Tu Vi */}
      {activeTab === 'cultivation' && (
        <div className="space-y-8 animate-in fade-in-0 duration-300">
          {/* Thẻ Cảnh Giới Đạo Hữu */}
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
    </div>
  );
}
