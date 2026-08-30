'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Headphones, Lock, Mail, KeyRound, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { SocialLoginButtons } from '@/components/social-login-buttons';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'apple') => {
    setError('');
    setLoading(true);

    try {
      // Mock profiles for testing/demonstration. In production, client SDK tokens are passed
      const mockProfiles = {
        google: {
          email: 'daohuu.google@gmail.com',
          name: 'Tiên Tôn Google',
          provider_user_id: 'gg_1029384756',
          avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        },
        facebook: {
          email: 'daohuu.facebook@fb.com',
          name: 'Chân Nhân Facebook',
          provider_user_id: 'fb_9876543210',
          avatar_url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
        },
        apple: {
          email: 'daohuu.apple@privaterelay.appleid.com',
          name: 'Thiên Tôn Apple',
          provider_user_id: 'apple_88371920',
          avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
        },
      };

      const p = mockProfiles[provider];
      const res = await fetch('http://localhost:8080/api/v1/auth/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          email: p.email,
          name: p.name,
          provider_user_id: p.provider_user_id,
          avatar_url: p.avatar_url,
        }),
      });

      const json = await res.json();
      const payload = json.data || json;

      if (!res.ok) {
        throw new Error(payload.error || json.error || `Đăng nhập ${provider} thất bại.`);
      }

      const accessToken = payload.tokens?.access_token || payload.access_token;
      const refreshToken = payload.tokens?.refresh_token || payload.refresh_token;
      const user = payload.user;

      login(accessToken, refreshToken, user);
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:8080/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();
      const payload = json.data || json;

      if (!res.ok) {
        throw new Error(payload.error || json.error || 'Đăng nhập thất bại. Vui lòng kiểm tra lại.');
      }

      // Nếu yêu cầu 2FA
      if (payload.mfa_required) {
        setMfaToken(payload.mfa_token);
        setLoading(false);
        return;
      }

      const accessToken = payload.tokens?.access_token || payload.access_token;
      const refreshToken = payload.tokens?.refresh_token || payload.refresh_token;
      const user = payload.user;

      login(accessToken, refreshToken, user);
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:8080/api/v1/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mfa_token: mfaToken, code: otpCode }),
      });

      const json = await res.json();
      const payload = json.data || json;

      if (!res.ok) {
        throw new Error(payload.error || json.error || 'Mã xác thực 2FA không chính xác.');
      }

      const accessToken = payload.tokens?.access_token || payload.access_token;
      const refreshToken = payload.tokens?.refresh_token || payload.refresh_token;
      const user = payload.user;

      login(accessToken, refreshToken, user);
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 pt-16 sm:pt-24">
      <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center mb-8">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#ffd166] to-[#ffb703] text-black shadow-lg shadow-amber-500/20">
            <Headphones className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black text-white">
            {mfaToken ? 'Xác Minh Bảo Mật 2FA' : 'Gia Nhập Tiên Tôn Các'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {mfaToken ? 'Nhập mã 6 số từ Google Authenticator hoặc mã dự phòng' : 'Đăng nhập để đồng bộ tiến độ tu luyện và nghe audio'}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-400">
            {error}
          </div>
        )}

        {!mfaToken ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="daohuu@gmail.com"
                  className="w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-2.5 pl-10 text-xs text-white placeholder-slate-500 focus:border-[#ffb703] focus:outline-none"
                />
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Mật Khẩu</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-2.5 pl-10 text-xs text-white placeholder-slate-500 focus:border-[#ffb703] focus:outline-none"
                />
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs shadow-lg shadow-amber-500/20 hover:opacity-95 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Đang Đăng Nhập...' : 'ĐĂNG NHẬP'}
            </button>

            <SocialLoginButtons onSocialLogin={handleSocialLogin} loading={loading} />
          </form>
        ) : (
          <form onSubmit={handleVerify2FA} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Mã Xác Thực 6 Số</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  className="w-full rounded-xl bg-slate-800 border border-amber-500/40 px-4 py-2.5 pl-10 text-sm font-mono text-center tracking-widest text-amber-400 focus:outline-none"
                />
                <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs shadow-lg shadow-amber-500/20 hover:opacity-95 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Đang Xác Minh...' : 'XÁC NHẬN MÃ 2FA'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-xs text-slate-400">
          Chưa có tài khoản đạo hữu?{' '}
          <Link href="/register" className="text-amber-400 font-bold hover:underline">
            Đăng ký ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
