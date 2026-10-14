import { ArrowUpRight, FileText, LockKeyhole, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { EditorialCTA, EditorialHeading, EditorialHero, EditorialShell } from '@/components/editorial';
import { Reveal } from '@/components/reveal';
import { policyDocuments } from '@/lib/policies';

export const metadata: Metadata = { title: 'Trung tâm chính sách | Tiên Tôn Audio', description: 'Thông tin về bảo mật, sử dụng dịch vụ và yêu cầu bản quyền tại Tiên Tôn Audio.' };
const icons = [LockKeyhole, FileText, ShieldCheck];

export default function PoliciesPage() {
  return <EditorialShell label="Trung tâm chính sách"><EditorialHero eyebrow="RÕ RÀNG ĐỂ AN TÂM THƯỞNG THỨC" title="Một không gian tốt." accent="Bắt đầu từ sự tin tưởng." description="Thông tin về tài khoản, dữ liệu và nội dung được tập hợp ở đây để bạn dễ tìm hiểu, dễ tra cứu và biết nơi cần liên hệ khi có thắc mắc." variant="shield" />
    <section><Reveal><EditorialHeading eyebrow="NHỮNG THÔNG TIN BẠN CẦN" title="Chọn chủ đề để tìm hiểu." /></Reveal><div className="grid gap-5 md:grid-cols-3">{policyDocuments.map((document, index) => { const Icon = icons[index]; return <Reveal key={document.slug} delay={index * 80}><Link href={`/${document.slug}`} className="editorial-card group flex h-full flex-col p-7"><span className="editorial-icon mb-8"><Icon size={24} /></span><h2 className="mb-3 text-xl font-semibold text-white">{document.label}</h2><p className="mb-8 text-sm leading-relaxed text-slate-400">{document.description}</p><span className="mt-auto flex items-center gap-2 text-sm text-[#ffd166]">Đọc chi tiết <ArrowUpRight size={17} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" /></span></Link></Reveal>; })}</div></section>
    <EditorialCTA title="Một câu hỏi vẫn còn bỏ ngỏ?" description="Chúng tôi sẵn sàng tiếp nhận câu hỏi về tài khoản, dữ liệu và quyền sử dụng nội dung." href="/contact" action="Liên hệ hỗ trợ" />
  </EditorialShell>;
}
