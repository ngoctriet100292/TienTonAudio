'use client';

import { getErrorMessage } from '@/lib/errors';

import { api } from '@/lib/api';
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, Mail, Send } from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setStatus(null);

    try {
      await api.forgotPassword(email.trim());
      setStatus({
        type: 'success',
        text: 'Thư thần thức khôi phục mật khẩu đã được gửi đến hòm thư của Đạo Hữu. Vui lòng kiểm tra hộp thư đến (hoặc thư rác)!',
      });
      setEmail('');
    } catch (err: unknown) {
      setStatus({
        type: 'error',
        text: getErrorMessage(err) || 'Không tìm thấy tài khoản với email này hoặc lỗi hệ thống.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-400 border border-amber-500/30 mb-2 shadow-lg shadow-amber-500/10">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Khôi Phục <span className="gold-text">Thần Thức</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Nhập địa chỉ thư phòng (email) đã đăng ký để nhận ấn chú khôi phục mật mã đăng nhập.
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
                Địa Chỉ Email Đăng Ký
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="daohuu@tientonaudio.com"
                  className="w-full rounded-2xl bg-slate-900 border border-white/10 px-4 py-3 pl-11 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-all"
                  required
                />
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 hover:scale-102 active:scale-98 disabled:opacity-50 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              {loading ? 'Đang gửi thần thư...' : 'Gửi Ấn Chú Khôi Phục'}
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
    </div>
  );
}
