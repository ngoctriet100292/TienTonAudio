'use client';

import { getErrorMessage } from '@/lib/errors';

import { api } from '@/lib/api';
import { AlertCircle, ArrowLeft, CheckCircle2, Lock, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useState } from 'react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setStatus({ type: 'error', text: 'Mã ấn chú khôi phục (token) không tồn tại hoặc đã hết hạn.' });
      return;
    }
    if (password.length < 6) {
      setStatus({ type: 'error', text: 'Mật mã tu vi tối thiểu 6 ký tự.' });
      return;
    }
    if (password !== confirmPassword) {
      setStatus({ type: 'error', text: 'Mật mã mới và xác nhận mật mã không trùng khớp.' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      await api.resetPassword(token, password);
      setStatus({
        type: 'success',
        text: 'Đổi mật mã tu vi thành công! Đang chuyển hướng tới Đăng Nhập...',
      });
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: unknown) {
      setStatus({
        type: 'error',
        text: getErrorMessage(err) || 'Mã khôi phục không hợp lệ hoặc đã quá hạn.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-400 border border-amber-500/30 mb-2 shadow-lg shadow-amber-500/10">
          <Lock className="w-7 h-7" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          Đặt Lại <span className="gold-text">Mật Mã</span>
        </h1>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          Thiết lập mật khẩu mới kiên cố cho tài khoản Tiên Tôn Audio của bạn.
        </p>
      </div>

      {/* Form Card */}
      <div className="motion-card rounded-3xl border border-white/10 bg-[#0f172a]/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-5">
        {status && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-start gap-2.5 border animate-in fade-in-0 ${status.type === 'success'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-950/80 text-rose-300 border-rose-500/30'
              }`}
          >
            {status.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{status.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Mật Mã Mới
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự..."
              className="w-full rounded-2xl bg-slate-900 border border-white/10 px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Xác Nhận Mật Mã Mới
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật mã..."
              className="w-full rounded-2xl bg-slate-900 border border-white/10 px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !password || !confirmPassword}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 hover:scale-102 active:scale-98 disabled:opacity-50 transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            {loading ? 'Đang cập nhật...' : 'Cập Nhật Mật Mã'}
          </button>
        </form>

        <div className="border-t border-white/10 pt-4 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Quay Lại Đăng Nhập
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <Suspense fallback={<div className="text-xs text-slate-500">Đang tải...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
