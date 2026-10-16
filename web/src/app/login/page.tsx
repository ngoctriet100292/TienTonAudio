'use client';

import { getErrorMessage } from '@/lib/errors';

import { SocialLoginButtons } from '@/components/social-login-buttons';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';
import { Headphones, KeyRound, Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = await api.login(email, password);

      // Nếu yêu cầu 2FA
      if (payload.mfa_required) {
        setMfaToken(payload.mfa_token);
        setLoading(false);
        return;
      }

      if(!payload.cookie_session)throw new Error("Không tạo được phiên đăng nhập.");
      login(payload.user);
      router.push('/');
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Đăng nhập thất bại. Vui lòng kiểm tra lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = await api.verifyTwoFactorLogin(mfaToken || '', otpCode);

      if(!payload.cookie_session)throw new Error("Không tạo được phiên đăng nhập.");
      login(payload.user);
      router.push('/');
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Mã xác thực 2FA không chính xác.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 pt-16 sm:pt-24">
      <div className="motion-card rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
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
            {error}<Link href={`/verify-email?email=${encodeURIComponent(email)}`} className="mt-2 block text-amber-300">Chưa xác thực email? Gửi lại thư</Link>
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">Mật Khẩu</label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] text-amber-400 hover:underline font-medium"
                >
                  Quên mật khẩu?
                </Link>
              </div>
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

            <SocialLoginButtons loading={loading} />
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
