'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { KeyRound } from 'lucide-react';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/context/auth-context';
import { CultivationSpinner } from '@/components/cultivation-spinner';
import type { OAuthProvider } from '@/types';

const errors: Record<string, string> = {
  provider_unavailable: 'Đăng nhập này chưa được cấu hình. Vui lòng dùng email.',
  access_denied: 'Bạn đã hủy đăng nhập. Có thể thử lại bất cứ lúc nào.',
  invalid_state: 'Phiên đăng nhập đã hết hạn hoặc không thuộc trình duyệt này. Vui lòng thử lại.',
  email_conflict: 'Email này đã có tài khoản. Hãy dùng cách đăng nhập đã đăng ký để bảo vệ tài khoản của bạn.',
  email_unavailable: 'Nhà cung cấp chưa cấp email hoặc tài khoản không khả dụng. Vui lòng dùng email để đăng ký.',
};
function safeRedirect(path = '/') { return path.startsWith('/') && !path.startsWith('//') && !/[\\\r\n]/.test(path) ? path : '/'; }
export default function OAuthCallbackPage() {
  const router = useRouter();
  const { login } = useAuth();
  const completeLogin = useEffectEvent(login);
  const flow = useRef<{ code: string; provider: string; error: string } | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(true);
  const [mfa, setMfa] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [redirect, setRedirect] = useState('/');
  useEffect(() => {
    let cancelled = false;
    if (!flow.current) {
      const params = new URLSearchParams(window.location.search);
      flow.current = { code: params.get('code') || '', provider: params.get('provider') || '', error: params.get('error') || '' };
      window.history.replaceState(null, '', '/auth/callback');
    }
    const callback = flow.current;
    const run = async () => {
      try {
        if (callback.error) throw new Error(errors[callback.error] || 'Đăng nhập chưa hoàn tất. Vui lòng thử lại.');
        if (!callback.code || !['google', 'facebook', 'apple'].includes(callback.provider)) throw new Error('Không có phiên đăng nhập hợp lệ. Vui lòng bắt đầu lại.');
        const result = await api.exchangeOAuthCode(callback.provider as OAuthProvider, callback.code);
        if (cancelled) return;
        if ('verification_required' in result && result.verification_required) { router.replace(`/verify-email?email=${encodeURIComponent(result.email)}`); return; }
        const destination = safeRedirect(result.redirect_path);
        setRedirect(destination);
        if ('mfa_required' in result && result.mfa_required) { setMfa(result.mfa_token); return; }
        if (!('cookie_session' in result) || !result.cookie_session || !result.user) throw new Error('Phản hồi đăng nhập không hợp lệ.');
        completeLogin(result.user);
        router.replace(destination);
      } catch (err) { if (!cancelled) setError(getErrorMessage(err) || 'Đăng nhập thất bại.'); }
      finally { if (!cancelled) setPending(false); }
    };
    void run();
    return () => { cancelled = true; };
  }, [router]);
  const verifyMfa = async (event: React.FormEvent) => {
    event.preventDefault(); if (!mfa || pending) return;
    setPending(true); setError('');
    try {
      const result = await api.verifyTwoFactorLogin(mfa, otp);
      login(result.user);
      router.replace(redirect);
    } catch (err) { setError(getErrorMessage(err) || 'Mã 2FA không hợp lệ.'); }
    finally { setPending(false); }
  };
  return <div className="mx-auto max-w-md px-4 py-16"><div className="motion-card rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-center">
    <h1 className="text-2xl font-bold text-white">{mfa ? 'Xác thực 2FA' : 'Đăng nhập Tiên Tôn Audio'}</h1>
    {pending && <div role="status" className="py-8"><CultivationSpinner size="md" text="Đang xác thực…" /></div>}
    {error && <p role="alert" className="mt-5 rounded-xl bg-rose-500/10 p-4 text-sm leading-relaxed text-rose-300">{error}</p>}
    {mfa && <form onSubmit={verifyMfa} className="mt-6 space-y-4 text-left"><label htmlFor="oauth-otp" className="block text-sm text-slate-300">Mã từ ứng dụng xác thực hoặc mã dự phòng</label><input id="oauth-otp" autoComplete="one-time-code" value={otp} onChange={event => setOtp(event.target.value)} required className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white" /><button disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ffb703] py-3 font-semibold text-black disabled:opacity-50"><KeyRound size={16} />Xác thực</button></form>}
    {!pending && <Link href="/login" className="mt-6 inline-block text-sm text-[#ffd166]">Quay lại đăng nhập</Link>}
  </div></div>;
}
