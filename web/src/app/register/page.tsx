'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Headphones, Lock, Mail, User, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { SocialLoginButtons } from '@/components/social-login-buttons';
import { api } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'apple') => {
    setError('');
    setLoading(true);

    try {
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
      const payload = await api.socialLogin({
        provider,
        email: p.email,
        name: p.name,
        provider_user_id: p.provider_user_id,
        avatar_url: p.avatar_url,
      });

      const accessToken = payload.tokens?.access_token || payload.access_token;
      const refreshToken = payload.tokens?.refresh_token || payload.refresh_token;
      const user = payload.user;

      login(accessToken, refreshToken, user);
      router.push('/');
    } catch (err: any) {
      setError(err.message || `Đăng nhập ${provider} thất bại.`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.register(username, email, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Đăng ký không thành công.');
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
          <h1 className="text-2xl font-black text-white">Khởi Đầu Tiên Duyên</h1>
          <p className="text-xs text-slate-400 mt-1">Đăng ký tài khoản để bắt đầu hành trình tu đạo</p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-400">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center space-y-4 py-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">Đăng Ký Thành Công!</h3>
            <p className="text-xs text-slate-300">
              Vui lòng kiểm tra hòm thư Email để nhận mã xác thực tài khoản.
            </p>
            <Link
              href="/login"
              className="inline-block mt-4 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs"
            >
              Chuyển Đến Đăng Nhập
            </Link>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tên Đạo Hiệu (Username)</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="daohuu123"
                  className="w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-2.5 pl-10 text-xs text-white placeholder-slate-500 focus:border-[#ffb703] focus:outline-none"
                />
                <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              </div>
            </div>

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
              {loading ? 'Đang Đăng Ký...' : 'TẠO TÀI KHOẢN'}
            </button>

            <SocialLoginButtons onSocialLogin={handleSocialLogin} loading={loading} />
          </form>
        )}

        <div className="mt-6 text-center text-xs text-slate-400">
          Đã có tài khoản?{' '}
          <Link href="/login" className="text-amber-400 font-bold hover:underline">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
