import { BookOpen, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { RetryCatalogue } from './retry-catalogue';

export function CatalogueState({ unavailable = false }: { unavailable?: boolean }) {
  const Icon = unavailable ? WifiOff : BookOpen;
  return <div className="motion-card mx-auto my-10 max-w-xl rounded-3xl border border-white/10 bg-slate-900/60 p-8 text-center sm:p-12"><span className="editorial-icon mb-6"><Icon size={24} /></span><h2 className="text-xl font-semibold text-white">{unavailable ? 'Chưa thể tải thư viện' : 'Thư viện đang được cập nhật'}</h2><p className="mb-6 mt-3 text-sm leading-relaxed text-slate-400">{unavailable ? 'Kết nối tới thư viện đang gặp gián đoạn. Vui lòng thử lại sau ít phút.' : 'Chưa có tác phẩm trong danh mục này. Hãy quay lại sau hoặc khám phá các thể loại khác.'}</p>{unavailable ? <RetryCatalogue /> : <Link href="/categories" className="editorial-button-secondary">Khám phá thể loại</Link>}</div>;
}
