'use client';

import { api } from '@/lib/api';
import { useAsyncResource } from '@/lib/use-async-resource';
import type { OAuthProvider } from '@/types';

interface Props { loading?: boolean; }
const providers: { id: OAuthProvider; label: string; mark: string; color: string }[] = [
  { id: 'google', label: 'Google', mark: 'G', color: 'text-[#4285f4]' },
  { id: 'facebook', label: 'Facebook', mark: 'f', color: 'text-[#1877f2]' },
  { id: 'apple', label: 'Apple', mark: '●', color: 'text-white' },
];
export function SocialLoginButtons({ loading = false }: Props) {
  const { data, loading: checking, error, reload } = useAsyncResource('oauth-providers', () => api.getOAuthProviders(), null);
  const begin = (provider: OAuthProvider) => {
    const redirect = new URLSearchParams(window.location.search).get('redirect') || '/';
    window.location.assign(api.getOAuthLoginURL(provider, redirect));
  };
  return <div className="mt-6 space-y-3">
    <div className="flex items-center gap-3 text-[11px] text-slate-500"><span className="h-px flex-1 bg-white/10" />Hoặc tiếp tục với<span className="h-px flex-1 bg-white/10" /></div>
    <div className="grid grid-cols-3 gap-2">{providers.map(provider => <button key={provider.id} type="button" disabled={loading || checking || !data?.[provider.id]} onClick={() => begin(provider.id)} title={!checking && !data?.[provider.id] ? 'Đăng nhập này chưa được bật' : undefined} className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/[.03] px-2 py-3 text-xs text-slate-200 transition hover:border-[#ffb703]/50 hover:bg-white/[.06] disabled:cursor-not-allowed disabled:opacity-40"><span aria-hidden="true" className={`text-xl font-bold ${provider.color}`}>{provider.id === 'apple' ? <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.61 7.59 9.17 7.3c1.36.07 2.3.77 3.09.83 1.18-.24 2.31-.96 3.57-.87 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.67 4.1l.01-.01ZM12.03 7.25C11.88 5.02 13.69 3.18 15.77 3c.29 2.58-2.35 4.5-3.74 4.25Z" /></svg> : provider.mark}</span>{provider.label}</button>)}</div>
    {!!error && <p role="alert" className="text-center text-xs text-slate-400">Không tải được đăng nhập mạng xã hội. <button type="button" onClick={reload} className="text-[#ffb703]">Thử lại</button></p>}
    {!checking && !error && data && !Object.values(data).some(Boolean) && <p className="text-center text-[11px] text-slate-500">Đăng nhập mạng xã hội đang được thiết lập. Bạn có thể dùng email.</p>}
  </div>;
}
