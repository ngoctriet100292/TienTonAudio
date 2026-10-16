import Link from 'next/link';
import { Compass } from 'lucide-react';
export default function NotFound() {
  return <div className="mx-auto max-w-xl px-4 py-20 text-center"><span className="editorial-icon mb-6"><Compass size={24} /></span><p className="editorial-kicker mb-4">404 · CHƯA TÌM THẤY</p><h1 className="mb-4 font-serif text-3xl text-white">Câu chuyện này chưa có ở đây.</h1><p className="mb-8 text-sm leading-relaxed text-slate-400">Đường dẫn có thể đã thay đổi hoặc nội dung không còn trong thư viện. Hãy tìm một tác phẩm khác để tiếp tục hành trình.</p><Link href="/categories" className="editorial-button">Khám phá thư viện</Link></div>;
}
