'use client';

import { getErrorMessage } from '@/lib/errors';

import { CultivationSpinner } from '@/components/cultivation-spinner';
import { api } from '@/lib/api';
import { AlertCircle, ArrowRight, CheckCircle2, Mail, MailCheck, Send } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useState } from 'react';

function VerifyEmailContent() {

  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [verifying, setVerifying] = useState(!!token);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form gửi lại email
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || resending) return;

    setResending(true);
    setResendStatus(null);

    try {
      await api.resendVerificationEmail(email.trim());
      setResendStatus({
        type: 'success',
        text: 'Thần thư xác thực mới đã được gửi tới hòm thư của Đạo Hữu. Vui lòng kiểm tra hộp thư!',
      });
      setEmail('');
    } catch (err: unknown) {
      setResendStatus({
        type: 'error',
        text: getErrorMessage(err) || 'Gửi lại thư thất bại. Vui lòng kiểm tra lại địa chỉ email.',
      });
    } finally {
      setResending(false);
    }
  };

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    api.verifyEmail(token)
      .then(() => {
        if (isMounted) {
          setSuccess(true);
          setErrorMsg(null);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setErrorMsg(getErrorMessage(err) || 'Mã ấn chú xác thực không hợp lệ hoặc đã quá hạn.');
        }
      })
      .finally(() => {
        if (isMounted) setVerifying(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-400 border border-amber-500/30 mb-2 shadow-lg shadow-amber-500/10">
          <MailCheck className="w-7 h-7" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          Xác Thực <span className="gold-text">Hồn Ấn Email</span>
        </h1>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          Hoàn tất chứng thực hòm thư để khai mở đầy đủ đặc quyền đàm đạo và tu vi tại Tiên Tôn Các.
        </p>
      </div>

      {/* Card nội dung */}
      <div className="motion-card rounded-3xl border border-white/10 bg-[#0f172a]/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-5">
        {verifying ? (
          <div className="py-8 text-center space-y-4">
            <CultivationSpinner size="md" showText={false} variant="gold" />
            <p className="text-xs font-bold text-amber-300 animate-pulse">
              Đang chứng thực thần ấn email...
            </p>
          </div>
        ) : success ? (
          <div className="text-center space-y-5 py-4">
            <div className="inline-flex p-3 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">Chứng Thực Thành Công!</h2>
              <p className="text-xs text-slate-300">
                Tài khoản của Đạo Hữu đã được xác thực an toàn. Bạn có thể đăng nhập và bắt đầu nghe truyện.
              </p>
            </div>
            <Link
              href="/login"
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 hover:scale-102 transition-transform"
            >
              <span>Tiến Vào Đăng Nhập</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {errorMsg && (
              <div className="p-4 rounded-2xl bg-rose-950/80 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {resendStatus && (
              <div
                className={`p-4 rounded-2xl text-xs font-bold flex items-start gap-2.5 border ${resendStatus.type === 'success'
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-950/80 text-rose-300 border-rose-500/30'
                  }`}
              >
                {resendStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                )}
                <span>{resendStatus.text}</span>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-200">
                {token ? 'Gửi Lại Thần Thư Kích Hoạt Mới' : 'Nhập Email Để Nhận Thư Xác Thực'}
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Nếu ấn chú đã quá hạn hoặc bạn chưa nhận được email, hãy nhập email dưới đây để hệ thống gửi lại ngay.
              </p>
            </div>

            <form onSubmit={handleResend} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Địa Chỉ Email Của Đạo Hữu
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
                disabled={resending || !email.trim()}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 hover:scale-102 active:scale-98 disabled:opacity-50 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                {resending ? 'Đang gửi thư...' : 'Gửi Thần Thư Xác Thực'}
              </button>
            </form>

            <div className="border-t border-white/10 pt-4 text-center">
              <Link
                href="/login"
                className="text-xs text-slate-400 hover:text-amber-400 font-semibold transition-colors"
              >
                ← Quay lại trang Đăng Nhập
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <Suspense fallback={<CultivationSpinner size="lg" text="Đang truyền thần thức..." />}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
