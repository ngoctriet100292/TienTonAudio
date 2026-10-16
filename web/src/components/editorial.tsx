import { ArrowRight, ChevronRight, Headphones, Sparkles } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode, CSSProperties } from 'react';
import { Reveal } from './reveal';

export function EditorialShell({ label, children }: { label: string; children: ReactNode }) {
  return <div className="editorial-shell mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8">
    <nav aria-label="Đường dẫn" className="mb-6 flex items-center gap-2 text-xs text-slate-400"><Link href="/" className="transition-colors hover:text-[#ffb703]">Trang chủ</Link><ChevronRight size={13} /><span aria-current="page" className="text-slate-200">{label}</span></nav>
    {children}
  </div>;
}

export function SoundOrbit({ variant = 'sound' }: { variant?: 'sound' | 'realm' | 'shield' }) {
  return <div className={`sound-orbit orbit-${variant}`} aria-hidden="true">
    <div className="orbit-glow" /><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><div className="orbit-ring ring-three" />
    <span className="orbit-spark spark-one" /><span className="orbit-spark spark-two" />
    <div className="orbit-core">{variant === 'sound' ? <Headphones size={56} strokeWidth={1.2} /> : <Sparkles size={56} strokeWidth={1.2} />}</div>
    <div className="sound-wave">{Array.from({ length: 23 }, (_, i) => <i key={i} style={{ '--bar-height': `${12 + ((i * 17) % 45)}px`, '--bar-delay': `${i * -0.12}s` } as CSSProperties} />)}</div>
    <span className="orbit-caption">{variant === 'realm' ? 'VÕ ĐẠO · TU TIÊN · TIÊN GIỚI' : variant === 'shield' ? 'TÔN TRỌNG · MINH BẠCH · AN TOÀN' : 'ĐỂ CÂU CHUYỆN ĐƯỢC CẤT LỜI'}</span>
  </div>;
}

export function EditorialHero({ eyebrow, title, accent, description, children, variant = 'sound' }: { eyebrow: string; title: string; accent: string; description: string; children?: ReactNode; variant?: 'sound' | 'realm' | 'shield' }) {
  return <section className="editorial-hero relative isolate grid items-center gap-4 overflow-hidden rounded-[32px] border border-white/10 px-6 py-12 sm:px-10 lg:grid-cols-[1.2fr_0.8fr] lg:px-14 lg:py-14">
    <div className="hero-grid" aria-hidden="true" />
    <div className="relative z-10 min-w-0">
      <p className="editorial-kicker mb-5 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#ffb703]" />{eyebrow}</p>
      <h1 className="hero-title text-4xl text-white sm:text-5xl lg:text-[58px]">{title}<br /><span className="gold-text">{accent}</span></h1>
      <p className="mt-6 max-w-xl text-sm leading-[1.9] text-slate-300 sm:text-base">{description}</p>
      {children && <div className="mt-8 flex flex-wrap gap-3">{children}</div>}
    </div>
    <SoundOrbit variant={variant} />
  </section>;
}

export function EditorialHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return <div className="mb-7 max-w-2xl"><p className="editorial-kicker mb-3">{eyebrow}</p><h2 className="text-2xl font-semibold text-white sm:text-3xl">{title}</h2>{description && <p className="mt-3 text-sm leading-relaxed text-slate-400">{description}</p>}</div>;
}

export function EditorialCTA({ title = 'Câu chuyện tiếp theo đang chờ bạn.', description = 'Chọn một tác phẩm, tìm một góc yên tĩnh và bắt đầu lắng nghe.', href = '/categories', action = 'Khám phá thư viện' }: { title?: string; description?: string; href?: string; action?: string }) {
  return <Reveal><section className="editorial-cta flex flex-col items-start justify-between gap-6 rounded-3xl border border-[#ffb703]/20 p-7 sm:flex-row sm:items-center sm:p-10"><div><h2 className="font-serif text-2xl text-white sm:text-3xl">{title}</h2><p className="mt-3 max-w-xl text-sm text-slate-300">{description}</p></div><Link href={href} className="editorial-button shrink-0">{action}<ArrowRight size={17} /></Link></section></Reveal>;
}
