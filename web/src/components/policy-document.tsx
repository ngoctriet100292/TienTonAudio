import { ArrowLeft, ArrowUpRight, FileText, Mail } from 'lucide-react';
import Link from 'next/link';
import type { PolicyDocument as Document } from '@/lib/policies';
import { EditorialHero, EditorialShell } from './editorial';
import { Reveal } from './reveal';

export function PolicyDocument({ document }: { document: Document }) {
  return <EditorialShell label={document.label}>
    <EditorialHero eyebrow={document.eyebrow} title={document.title} accent={document.accent} description={document.description} variant="shield"><Link href="/policies" className="editorial-button-secondary"><ArrowLeft size={16} />Trung tâm chính sách</Link></EditorialHero>
    <div className="grid items-start gap-10 lg:grid-cols-[250px_1fr] lg:gap-16">
      <aside className="lg:sticky lg:top-28"><div className="rounded-2xl border border-white/10 p-5"><p className="editorial-kicker mb-4 flex items-center gap-2"><FileText size={14} />TRONG TRANG NÀY</p><nav aria-label="Mục lục chính sách" className="space-y-1">{document.sections.map((section, index) => <a key={section.id} href={`#${section.id}`} className="flex gap-3 rounded-lg px-2 py-2.5 text-xs text-slate-400 transition-colors hover:bg-[#ffb703]/5 hover:text-[#ffd166]"><span className="text-slate-500">{String(index + 1).padStart(2, '0')}</span>{section.title}</a>)}</nav></div><Link href="/contact" className="mt-5 flex items-center gap-2 px-2 text-xs text-[#ffd166]">Bạn cần giải đáp thêm?<ArrowUpRight size={14} /></Link></aside>
      <article className="min-w-0 space-y-10">{document.sections.map((section, index) => <Reveal key={section.id}><section id={section.id} className="scroll-mt-28 border-b border-white/10 pb-9"><div className="mb-5 flex items-start gap-4"><span className="pt-1 font-serif text-xl text-[#ffb703]/70">{String(index + 1).padStart(2, '0')}</span><h2 className="text-xl font-semibold text-white sm:text-2xl">{section.title}</h2></div><div className="policy-copy sm:pl-10">{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}{section.bullets && <ul>{section.bullets.map(item => <li key={item}>{item}</li>)}</ul>}</div></section></Reveal>)}<Reveal><div className="editorial-cta rounded-2xl border border-[#ffb703]/20 p-7"><Mail className="mb-4 text-[#ffb703]" size={24} /><h2 className="text-lg font-semibold text-white">Cần trao đổi về chính sách này?</h2><p className="mb-5 mt-2 text-sm text-slate-400">Chia sẻ câu hỏi hoặc trường hợp cụ thể của bạn với chúng tôi.</p><Link href="/contact" className="inline-flex items-center gap-2 text-sm text-[#ffd166]">Liên hệ hỗ trợ<ArrowUpRight size={16} /></Link></div></Reveal></article>
    </div>
  </EditorialShell>;
}
