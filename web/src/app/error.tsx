'use client';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <div className="mx-auto max-w-xl px-4 py-20 text-center"><span className="editorial-icon mb-6"><AlertCircle size={24} /></span><h1 className="mb-4 font-serif text-3xl text-white">Có chút gián đoạn trên hành trình.</h1><p className="mb-8 text-sm leading-relaxed text-slate-400">Trang này chưa thể tải đầy đủ. Bạn có thể thử lại hoặc quay về thư viện để tiếp tục khám phá.</p><div className="flex flex-wrap justify-center gap-3"><button onClick={retry} className="editorial-button"><RefreshCw size={16} />Thử lại</button><Link href="/" className="editorial-button-secondary">Về trang chủ</Link></div></div>;
}
