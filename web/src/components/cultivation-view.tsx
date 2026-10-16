'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, Flame, Layers, Plus, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { EditorialHeading } from './editorial';
import { Reveal } from './reveal';

import { getRealmProgress, type RealmTier } from '@/lib/cultivation';
import { useCultivationCatalogue } from '@/context/cultivation-context';

export function CultivationInteractiveView() {
  const { user, isAuthenticated } = useAuth();
  const { realms: ALL_REALMS, count: REALM_COUNT, groups: REALM_GROUPS, loading, error, reload } = useCultivationCatalogue();
  const [tier, setTier] = useState<'all' | RealmTier>('all');
  const [selected, setSelected] = useState(1);
  const [hours, setHours] = useState(2);
  const [vip, setVip] = useState(false);
  if (loading) return <div role="status" className="editorial-card p-8 text-slate-400">Đang tải cảnh giới…</div>;
  if (error || !ALL_REALMS.length) return <div role="alert" className="editorial-card p-8 text-slate-300">Không tải được danh sách cảnh giới.<button type="button" onClick={reload} className="editorial-button ml-4">Thử lại</button></div>;
  const realm = ALL_REALMS.find(item => item.level === selected) ?? ALL_REALMS[0];
  const filtered = ALL_REALMS.filter(item => tier === 'all' || item.tier === tier);
  const exp = user?.cultivation_exp || 0;
  const daily = hours * (vip ? 120 : 60);
  const format = (value: number) => value.toLocaleString('vi-VN');
  const chooseTier = (value: typeof tier) => { setTier(value); if (value !== 'all' && realm.tier !== value) setSelected(ALL_REALMS.find(item => item.tier === value)!.level); };

  return <div className="space-y-14">
    <Reveal><section className="editorial-card flex flex-col justify-between gap-6 p-6 sm:p-8 md:flex-row md:items-center">
      <div className="flex items-center gap-4"><span className="editorial-icon shrink-0"><Flame size={24} /></span><div><p className="editorial-kicker mb-1">TIÊN LỘ CỦA BẠN</p><h2 className="text-xl font-semibold text-white">{isAuthenticated ? getRealmProgress(user?.cultivation_exp, ALL_REALMS).realm.name : 'Mọi hành trình đều có một khởi đầu.'}</h2><p className="mt-2 text-sm text-slate-400">{isAuthenticated ? `${format(exp)} tu vi · Tiếp tục khám phá thế giới truyện của bạn.` : 'Đăng nhập để theo dõi tu vi và cảnh giới của mình.'}</p></div></div>
      <Link href={isAuthenticated ? '/settings' : '/login'} className="editorial-button shrink-0">{isAuthenticated ? 'Xem hồ sơ của bạn' : 'Bắt đầu hành trình'}<ArrowUpRight size={17} /></Link>
    </section></Reveal>

    <section id="realm-map" className="scroll-mt-28"><Reveal><EditorialHeading eyebrow="BẢN ĐỒ TIÊN LỘ" title="Từ võ giả nhân gian đến Tiên Đế." description="Chọn một cảnh giới để khám phá. Mỗi mốc tu vi là một chặng đường mới trong hành trình của bạn." /></Reveal>
      <div aria-label="Lọc cảnh giới" className="mb-7 flex flex-wrap gap-2">{[{ key: 'all' as const, label: `Tất cả · ${REALM_COUNT}` }, ...REALM_GROUPS.map(group => ({ key: group.key, label: `${group.label} · ${group.count}` }))].map(item => <button key={item.key} type="button" aria-pressed={tier === item.key} onClick={() => chooseTier(item.key)} className={`rounded-full border px-5 py-2.5 text-xs font-medium transition-colors ${tier === item.key ? 'border-[#ffb703] bg-[#ffb703] text-black' : 'border-white/10 bg-white/[.03] text-slate-400 hover:border-[#ffb703]/50 hover:text-white'}`}>{item.label}</button>)}</div>
      <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{filtered.map(item => <button key={item.level} type="button" aria-pressed={selected === item.level} onClick={() => setSelected(item.level)} className={`group flex items-center gap-3 rounded-2xl border p-4 text-left transition-all ${selected === item.level ? 'border-[#ffb703]/60 bg-[#ffb703]/10' : 'border-white/10 bg-slate-900/50 hover:border-white/25 hover:bg-slate-800/60'}`}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-semibold" style={{ color: item.color, background: `${item.color}15` }}>{String(item.level).padStart(2, '0')}</span><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-white">{item.name}</span><span className="mt-1 block text-xs text-slate-400">{format(item.min_exp)} tu vi</span></span>{selected === item.level ? <Check size={16} className="shrink-0 text-[#ffb703]" /> : <ArrowUpRight size={16} className="shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />}
        </button>)}</div>
        <aside className="editorial-card sticky top-28 overflow-hidden p-8 sm:p-10" aria-label="Chi tiết cảnh giới">
          <div key={realm.level} className="realm-detail"><div className="mb-8 flex items-center justify-between"><span className="editorial-kicker">{realm.tierName}</span><span className="font-serif text-5xl text-white/10">{String(realm.level).padStart(2, '0')}</span></div><div className="mb-6 grid h-20 w-20 place-items-center rounded-3xl border" style={{ background: `${realm.color}12`, color: realm.color, borderColor: `${realm.color}40` }}><Sparkles size={36} strokeWidth={1.2} /></div><h3 className="font-serif text-4xl text-white">{realm.name}</h3><p className="mt-5 text-sm leading-[1.9] text-slate-300">{realm.description}</p><div className="my-7 h-px bg-white/10" /><p className="mb-2 text-xs text-slate-400">Mốc tu vi</p><p className="text-xl font-semibold text-[#ffd166]">{format(realm.min_exp)} {realm.max_exp === -1 ? '+' : `— ${format(realm.max_exp)}`} <span className="text-sm font-normal text-slate-400">EXP</span></p><div className="mt-7 flex items-start gap-2 rounded-xl bg-white/[.03] p-4 text-xs leading-relaxed text-slate-400"><Layers size={16} className="mt-0.5 shrink-0 text-[#ffb703]" />Cảnh giới thể hiện tiến trình tu luyện. Quyền truy cập chương VIP được xác định theo gói hội viên của bạn.</div></div>
        </aside>
      </div>
    </section>

    <Reveal><section className="editorial-card grid gap-8 p-6 sm:p-10 lg:grid-cols-2 lg:gap-14"><div><EditorialHeading eyebrow="TỪNG NGÀY MỘT CHÚT" title="Thử nhịp tu luyện của bạn." description="Ước tính tham khảo với 60 EXP mỗi giờ, hoặc 120 EXP khi bật giả định VIP. Tu vi thực tế được hệ thống ghi nhận theo hoạt động hợp lệ." /><label htmlFor="listening-hours" className="mb-4 flex justify-between gap-3 text-sm text-slate-300"><span>Thời gian nghe mỗi ngày</span><span className="font-semibold text-[#ffb703]">{hours} giờ</span></label><input id="listening-hours" type="range" min="0.5" max="8" step="0.5" value={hours} onChange={event => setHours(Number(event.target.value))} className="w-full accent-[#ffb703]" /><div className="mt-2 flex justify-between text-xs text-slate-500"><span>30 phút</span><span>8 giờ</span></div><label className="mt-6 flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-white/10 p-4"><span className="text-sm text-slate-300">Giả định hội viên VIP · x2 tu vi</span><input type="checkbox" checked={vip} onChange={event => setVip(event.target.checked)} className="h-5 w-5 accent-[#ffb703]" /></label></div><div className="flex flex-col justify-center"><p className="text-xs text-slate-400">Tu vi dự kiến mỗi ngày</p><p className="my-3 font-serif text-6xl text-[#ffd166]">{format(daily)}<span className="ml-3 font-sans text-sm text-slate-400">EXP</span></p><div className="mt-4 space-y-3">{ALL_REALMS.filter(item => ['Tiên Thiên', 'Kết Đan', 'Tiên Quân'].includes(item.name)).map(item => <div key={item.level} className="flex justify-between gap-4 rounded-xl bg-white/[.03] p-4 text-sm"><span className="text-slate-300">{item.name}</span><span className="font-medium text-white">{Math.ceil(Math.max(0, item.min_exp - exp) / daily) || 'Đã đạt'}{item.min_exp > exp ? ' ngày' : ''}</span></div>)}</div></div></section></Reveal>

    <Reveal><section><EditorialHeading eyebrow="HỎI NHANH, ĐÁP GỌN" title="Trước khi bước lên tiên lộ." /><div className="editorial-faq divide-y divide-white/10 border-y border-white/10">{[
      ['Xem tu vi hiện tại ở đâu?', 'Đăng nhập và mở trang Cài đặt để xem hồ sơ, tu vi cùng cảnh giới hiện tại của bạn.'],
      ['Cảnh giới có thay thế gói VIP không?', 'Không. Cảnh giới thể hiện tiến trình tu luyện; quyền nghe và đọc chương premium phụ thuộc vào gói hội viên còn hiệu lực.'],
      ['Các con số dự báo có chính xác tuyệt đối không?', 'Đây là ước tính theo thời gian nghe bạn chọn. Kết quả thực tế phụ thuộc vào hoạt động được hệ thống ghi nhận và những thay đổi của chính sách tu vi.'],
    ].map(([question, answer]) => <details key={question}><summary>{question}<Plus size={18} /></summary><p className="faq-answer max-w-3xl pb-6 text-sm leading-relaxed text-slate-400">{answer}</p></details>)}</div></section></Reveal>
  </div>;
}
