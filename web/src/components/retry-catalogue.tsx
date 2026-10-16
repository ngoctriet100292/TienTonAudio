'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
export function RetryCatalogue() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <button type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())} className="editorial-button disabled:opacity-60"><RefreshCw size={16} className={pending ? 'animate-spin' : ''} />{pending ? 'Đang tải lại…' : 'Thử lại'}</button>;
}
