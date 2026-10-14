'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, Flame, Layers, Plus, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { EditorialHeading } from './editorial';
import { Reveal } from './reveal';

export interface RealmItem {
  level: number;
  name: string;
  min_exp: number;
  max_exp: number;
  tier: 'pham' | 'tien' | 'chiton';
  tierName: string;
  description: string;
  ability: string;
  privilege: string;
  color: string;
}

export const ALL_REALMS: RealmItem[] = [
  {
    level: 1,
    name: 'Luyện Khí',
    min_exp: 0,
    max_exp: 60,
    tier: 'pham',
    tierName: 'Phàm Giới',
    description: 'Sơ nhập tiên lộ, khai mở linh căn, cảm ứng thiên địa linh khí nhập thể.',
    ability: 'Linh khí hộ thể, thính lực tăng cường, nghe audio sắc nét.',
    privilege: 'Mở khóa bình luận, lưu lịch sử nghe truyện cá nhân.',
    color: '#94A3B8',
  },
  {
    level: 2,
    name: 'Trúc Cơ',
    min_exp: 60,
    max_exp: 300,
    tier: 'pham',
    tierName: 'Phàm Giới',
    description: 'Đúc thành tiên cơ vĩnh cố, đan điền linh lực ngưng tụ hóa thành dịch thể.',
    ability: 'Tâm thần thanh tịnh, nghe truyện liên tục không mỏi mệt.',
    privilege: 'Huy hiệu Trúc Cơ lam quang lấp lánh trong khu bình luận.',
    color: '#38BDF8',
  },
  {
    level: 3,
    name: 'Nguyên Anh',
    min_exp: 300,
    max_exp: 1000,
    tier: 'pham',
    tierName: 'Phàm Giới',
    description: 'Ngưng kết anh nhi trong đan điền, thần thức sơ thành có thể xuất khiếu du ngoạn.',
    ability: 'Nhất niệm vạn dặm, ghi nhớ vị trí nghe truyện tức thì trên mọi thiết bị.',
    privilege: 'Huy hiệu Nguyên Anh lục ngọc rực rỡ, ưu tiên phát âm thanh 320kbps.',
    color: '#4ADE80',
  },
  {
    level: 4,
    name: 'Hoá Thần',
    min_exp: 1000,
    max_exp: 3000,
    tier: 'pham',
    tierName: 'Phàm Giới',
    description: 'Thần niệm thông thiên triệt địa, câu thông thiên địa quy tắc, chưởng khống tiểu vực.',
    ability: 'Phá vỡ hư vọng, tốc độ tải audio thần tốc không độ trễ.',
    privilege: 'Huy hiệu Hóa Thần tử quang tôn quý, tham gia bình chọn Bảng Vàng.',
    color: '#A78BFA',
  },
  {
    level: 5,
    name: 'Luyện Hư',
    min_exp: 3000,
    max_exp: 7000,
    tier: 'pham',
    tierName: 'Phàm Giới',
    description: 'Hóa hư vi thực, nhục thân và thần hồn dung hợp, xuyên toa không gian phàm giới.',
    ability: 'Xuyên không độ kiếp, tùy chỉnh tốc độ phát âm thanh từ 0.5x đến 2.0x mượt mà.',
    privilege: 'Huy hiệu Luyện Hư hồng hà tráng lệ, mở khóa chế độ đàm đạo cùng AI.',
    color: '#F472B6',
  },
  {
    level: 6,
    name: 'Hợp Đạo',
    min_exp: 7000,
    max_exp: 15000,
    tier: 'pham',
    tierName: 'Phàm Giới',
    description: 'Thiên nhân hợp nhất, bản thân dung nhập thiên đạo, vạn pháp quy tông.',
    ability: 'Đạo âm quán nhĩ, thưởng thức trọn vẹn từng cung bậc cảm xúc của giọng đọc MC.',
    privilege: 'Huy hiệu Hợp Đạo cam hỏa uy vũ, được gắn nhãn Cao Nhân Luận Đạo.',
    color: '#FB923C',
  },
  {
    level: 7,
    name: 'Đại Thừa',
    min_exp: 15000,
    max_exp: 30000,
    tier: 'pham',
    tierName: 'Phàm Giới',
    description: 'Đỉnh phong của phàm nhân tu tiên, đạo tâm viên mãn, chờ nghênh đón chín đạo lôi kiếp phi thăng.',
    ability: 'Chí tôn phàm giới, uy áp chư thiên phàm trần.',
    privilege: 'Huy hiệu Đại Thừa hoàng kim lộng lẫy, quyền đánh giá xếp hạng truyện.',
    color: '#FBBF24',
  },
  {
    level: 8,
    name: 'Nhân Tiên',
    min_exp: 30000,
    max_exp: 55000,
    tier: 'tien',
    tierName: 'Tiên Giới',
    description: 'Vượt qua thiên kiếp phi thăng Tiên Giới, thoát thai hoán cốt, rửa sạch phàm trần trở thành chân tiên.',
    ability: 'Tiên khí hộ thân, thọ mệnh vô cương, hấp thu tiên khí thay vì phàm trần linh khí.',
    privilege: 'Mở khóa viền phát sáng Avatar Tiên Cảnh, tốc độ tu vi tăng trưởng ổn định.',
    color: '#2DD4BF',
  },
  {
    level: 9,
    name: 'Địa Tiên',
    min_exp: 55000,
    max_exp: 90000,
    tier: 'tien',
    tierName: 'Tiên Giới',
    description: 'Lĩnh ngộ tiên tắc của đại địa càn khôn, phúc địa động thiên tự sinh ra trong đan điền.',
    ability: 'Động phủ tự tại, thần thức bảo tồn trọn vẹn bộ nhớ nghe truyện offline.',
    privilege: 'Huy hiệu Địa Tiên ngọc lục tuyệt mỹ, được đề xuất tác phẩm theo sở thích.',
    color: '#34D399',
  },
  {
    level: 10,
    name: 'Thiên Tiên',
    min_exp: 90000,
    max_exp: 140000,
    tier: 'tien',
    tierName: 'Tiên Giới',
    description: 'Ngự khí cửu thiên tiên đình, câu thông thái dương thái âm, pháp lực cuộn trào tựa biển lớn.',
    ability: 'Tiên thuật vô biên, thưởng thức audio chất lượng Lossless không giới hạn băng thông.',
    privilege: 'Huy hiệu Thiên Tiên thanh thiên cao quý, nhãn Danh Gia Giới Tiên.',
    color: '#60A5FA',
  },
  {
    level: 11,
    name: 'Kim Tiên',
    min_exp: 140000,
    max_exp: 210000,
    tier: 'tien',
    tierName: 'Tiên Giới',
    description: 'Bất hủ kim thân, trải qua ức vạn kiếp mà linh hồn bất diệt, thấu triệt ngũ hành.',
    ability: 'Kim thân bất hoại, trải nghiệm nghe truyện không bị quảng cáo làm phiền.',
    privilege: 'Huy hiệu Kim Tiên hoàng kim ánh kim, tự do đổi giao diện đọc truyện.',
    color: '#F59E0B',
  },
  {
    level: 12,
    name: 'Thái Ất Kim Tiên',
    min_exp: 210000,
    max_exp: 300000,
    tier: 'tien',
    tierName: 'Tiên Giới',
    description: 'Tam hoa tụ đỉnh, ngũ khí triều nguyên, chạm đến bản nguyên quy luật của tiên đạo vũ trụ.',
    ability: 'Lĩnh hội huyền cơ, phân tích cốt truyện cùng AI Đạo Hữu không giới hạn lượt hỏi.',
    privilege: 'Huy hiệu Thái Ất tử hà tuyệt luân, tôn vinh trên Bảng Vàng Đạo Hữu.',
    color: '#EC4899',
  },
  {
    level: 13,
    name: 'Đại La Kim Tiên',
    min_exp: 300000,
    max_exp: 450000,
    tier: 'tien',
    tierName: 'Tiên Giới',
    description: 'Siêu thoát tam giới, không nằm trong ngũ hành, vạn kiếp bất ma, chư thiên tôn kính.',
    ability: 'Thần thông vô thượng, tự do du ngoạn muôn vàn bộ truyện audio bất kỳ lúc nào.',
    privilege: 'Huy hiệu Đại La thần quang cực phẩm, quyền ưu tiên nhận thông báo tập mới.',
    color: '#8B5CF6',
  },
  {
    level: 14,
    name: 'Tiên Quân',
    min_exp: 450000,
    max_exp: 700000,
    tier: 'chiton',
    tierName: 'Chí Tôn',
    description: 'Thống ngự một phương Tiên Vực mênh mông, chư thiên tiên nhân đều phải khom lưng phục tùng.',
    ability: 'Hiệu lệnh chư tiên, một câu nói ra ngàn vạn đạo hữu hưởng ứng.',
    privilege: 'Huy hiệu Tiên Quân huyết hồng uy chấn, bình luận luôn được ghim đầu bảng.',
    color: '#EF4444',
  },
  {
    level: 15,
    name: 'Tiên Vương',
    min_exp: 700000,
    max_exp: 1200000,
    tier: 'chiton',
    tierName: 'Chí Tôn',
    description: 'Bá chủ một cõi Tiên Giới, chấn nhiếp Cửu Thiên Thập Địa, khai tông lập phái xưng vương.',
    ability: 'Tiên Vương pháp tướng cao vạn trượng, một niệm biến đổi thiên địa thương hải.',
    privilege: 'Khung Avatar Tiên Vương mạ vàng rực rỡ, toàn quyền truy cập toàn bộ kho sách VIP.',
    color: '#D97706',
  },
  {
    level: 16,
    name: 'Tiên Tôn',
    min_exp: 1200000,
    max_exp: 2000000,
    tier: 'chiton',
    tierName: 'Chí Tôn',
    description: 'Tiên Tôn chí cao vô thượng, đứng trên đỉnh cao Tiên Giới, tay nắm tinh hà, chân đạp luân hồi.',
    ability: 'Đứng đầu chư thiên, duy ngã độc tôn trong thiên địa.',
    privilege: 'Huy hiệu Tiên Tôn kim diễm thần thánh, tôn danh khắc trên Bảng Vàng vĩnh hằng.',
    color: '#FFD166',
  },
  {
    level: 17,
    name: 'Tiên Đế',
    min_exp: 2000000,
    max_exp: -1,
    tier: 'chiton',
    tierName: 'Chí Tôn',
    description: 'Chúa tể tối cao của vạn giới luân hồi, vượt qua thời gian không gian, bất tử bất diệt vĩnh cửu.',
    ability: 'Vô địch thiên hạ, chúa tể vận mệnh của vạn cổ chư thiên.',
    privilege: 'Đặc quyền Tối Cao Tiên Đế, vĩnh viễn lưu danh sử sách Tiên Tôn Audio.',
    color: '#FFB703',
  },
];

export function CultivationInteractiveView() {
  const { user, isAuthenticated } = useAuth();
  const [tier, setTier] = useState<'all' | 'pham' | 'tien' | 'chiton'>('all');
  const [selected, setSelected] = useState(1);
  const [hours, setHours] = useState(2);
  const [vip, setVip] = useState(false);
  const realm = ALL_REALMS.find(item => item.level === selected)!;
  const filtered = ALL_REALMS.filter(item => tier === 'all' || item.tier === tier);
  const exp = user?.cultivation_exp || 0;
  const daily = hours * (vip ? 120 : 60);
  const format = (value: number) => value.toLocaleString('vi-VN');
  const chooseTier = (value: typeof tier) => { setTier(value); if (value !== 'all' && realm.tier !== value) setSelected(ALL_REALMS.find(item => item.tier === value)!.level); };

  return <div className="space-y-14">
    <Reveal><section className="editorial-card flex flex-col justify-between gap-6 p-6 sm:p-8 md:flex-row md:items-center">
      <div className="flex items-center gap-4"><span className="editorial-icon shrink-0"><Flame size={24} /></span><div><p className="editorial-kicker mb-1">TIÊN LỘ CỦA BẠN</p><h2 className="text-xl font-semibold text-white">{isAuthenticated ? user?.cultivation_realm || 'Luyện Khí' : 'Mọi hành trình đều có một khởi đầu.'}</h2><p className="mt-2 text-sm text-slate-400">{isAuthenticated ? `${format(exp)} tu vi · Tiếp tục khám phá thế giới truyện của bạn.` : 'Đăng nhập để theo dõi tu vi và cảnh giới của mình.'}</p></div></div>
      <Link href={isAuthenticated ? '/settings' : '/login'} className="editorial-button shrink-0">{isAuthenticated ? 'Xem hồ sơ của bạn' : 'Bắt đầu hành trình'}<ArrowUpRight size={17} /></Link>
    </section></Reveal>

    <section id="realm-map" className="scroll-mt-28"><Reveal><EditorialHeading eyebrow="BẢN ĐỒ TIÊN LỘ" title="Từ phàm nhân đến Tiên Đế." description="Chọn một cảnh giới để khám phá. Mỗi mốc tu vi là một chặng đường mới trong hành trình của bạn." /></Reveal>
      <div aria-label="Lọc cảnh giới" className="mb-7 flex flex-wrap gap-2">{([{ key: 'all', label: 'Tất cả · 17' }, { key: 'pham', label: 'Phàm giới · 7' }, { key: 'tien', label: 'Tiên giới · 6' }, { key: 'chiton', label: 'Chí tôn · 4' }] as const).map(item => <button key={item.key} type="button" aria-pressed={tier === item.key} onClick={() => chooseTier(item.key)} className={`rounded-full border px-5 py-2.5 text-xs font-medium transition-colors ${tier === item.key ? 'border-[#ffb703] bg-[#ffb703] text-black' : 'border-white/10 bg-white/[.03] text-slate-400 hover:border-[#ffb703]/50 hover:text-white'}`}>{item.label}</button>)}</div>
      <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{filtered.map(item => <button key={item.level} type="button" aria-pressed={selected === item.level} onClick={() => setSelected(item.level)} className={`group flex items-center gap-3 rounded-2xl border p-4 text-left transition-all ${selected === item.level ? 'border-[#ffb703]/60 bg-[#ffb703]/10' : 'border-white/10 bg-slate-900/50 hover:border-white/25 hover:bg-slate-800/60'}`}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-semibold" style={{ color: item.color, background: `${item.color}15` }}>{String(item.level).padStart(2, '0')}</span><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-white">{item.name}</span><span className="mt-1 block text-xs text-slate-400">{format(item.min_exp)} tu vi</span></span>{selected === item.level ? <Check size={16} className="shrink-0 text-[#ffb703]" /> : <ArrowUpRight size={16} className="shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />}
        </button>)}</div>
        <aside className="editorial-card sticky top-28 overflow-hidden p-8 sm:p-10" aria-label="Chi tiết cảnh giới">
          <div key={realm.level} className="realm-detail"><div className="mb-8 flex items-center justify-between"><span className="editorial-kicker">{realm.tierName}</span><span className="font-serif text-5xl text-white/10">{String(realm.level).padStart(2, '0')}</span></div><div className="mb-6 grid h-20 w-20 place-items-center rounded-3xl border" style={{ background: `${realm.color}12`, color: realm.color, borderColor: `${realm.color}40` }}><Sparkles size={36} strokeWidth={1.2} /></div><h3 className="font-serif text-4xl text-white">{realm.name}</h3><p className="mt-5 text-sm leading-[1.9] text-slate-300">{realm.description}</p><div className="my-7 h-px bg-white/10" /><p className="mb-2 text-xs text-slate-400">Mốc tu vi</p><p className="text-xl font-semibold text-[#ffd166]">{format(realm.min_exp)} {realm.max_exp === -1 ? '+' : `— ${format(realm.max_exp)}`} <span className="text-sm font-normal text-slate-400">EXP</span></p><div className="mt-7 flex items-start gap-2 rounded-xl bg-white/[.03] p-4 text-xs leading-relaxed text-slate-400"><Layers size={16} className="mt-0.5 shrink-0 text-[#ffb703]" />Cảnh giới thể hiện tiến trình tu luyện. Quyền truy cập chương VIP được xác định theo gói hội viên của bạn.</div></div>
        </aside>
      </div>
    </section>

    <Reveal><section className="editorial-card grid gap-8 p-6 sm:p-10 lg:grid-cols-2 lg:gap-14"><div><EditorialHeading eyebrow="TỪNG NGÀY MỘT CHÚT" title="Thử nhịp tu luyện của bạn." description="Ước tính tham khảo với 60 EXP mỗi giờ, hoặc 120 EXP khi bật giả định VIP. Tu vi thực tế được hệ thống ghi nhận theo hoạt động hợp lệ." /><label htmlFor="listening-hours" className="mb-4 flex justify-between gap-3 text-sm text-slate-300"><span>Thời gian nghe mỗi ngày</span><span className="font-semibold text-[#ffb703]">{hours} giờ</span></label><input id="listening-hours" type="range" min="0.5" max="8" step="0.5" value={hours} onChange={event => setHours(Number(event.target.value))} className="w-full accent-[#ffb703]" /><div className="mt-2 flex justify-between text-xs text-slate-500"><span>30 phút</span><span>8 giờ</span></div><label className="mt-6 flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-white/10 p-4"><span className="text-sm text-slate-300">Giả định hội viên VIP · x2 tu vi</span><input type="checkbox" checked={vip} onChange={event => setVip(event.target.checked)} className="h-5 w-5 accent-[#ffb703]" /></label></div><div className="flex flex-col justify-center"><p className="text-xs text-slate-400">Tu vi dự kiến mỗi ngày</p><p className="my-3 font-serif text-6xl text-[#ffd166]">{format(daily)}<span className="ml-3 font-sans text-sm text-slate-400">EXP</span></p><div className="mt-4 space-y-3">{[ALL_REALMS[2], ALL_REALMS[6], ALL_REALMS[14]].map(item => <div key={item.level} className="flex justify-between gap-4 rounded-xl bg-white/[.03] p-4 text-sm"><span className="text-slate-300">{item.name}</span><span className="font-medium text-white">{Math.ceil(Math.max(0, item.min_exp - exp) / daily) || 'Đã đạt'}{item.min_exp > exp ? ' ngày' : ''}</span></div>)}</div></div></section></Reveal>

    <Reveal><section><EditorialHeading eyebrow="HỎI NHANH, ĐÁP GỌN" title="Trước khi bước lên tiên lộ." /><div className="editorial-faq divide-y divide-white/10 border-y border-white/10">{[
      ['Xem tu vi hiện tại ở đâu?', 'Đăng nhập và mở trang Cài đặt để xem hồ sơ, tu vi cùng cảnh giới hiện tại của bạn.'],
      ['Cảnh giới có thay thế gói VIP không?', 'Không. Cảnh giới thể hiện tiến trình tu luyện; quyền nghe và đọc chương premium phụ thuộc vào gói hội viên còn hiệu lực.'],
      ['Các con số dự báo có chính xác tuyệt đối không?', 'Đây là ước tính theo thời gian nghe bạn chọn. Kết quả thực tế phụ thuộc vào hoạt động được hệ thống ghi nhận và những thay đổi của chính sách tu vi.'],
    ].map(([question, answer]) => <details key={question}><summary>{question}<Plus size={18} /></summary><p className="faq-answer max-w-3xl pb-6 text-sm leading-relaxed text-slate-400">{answer}</p></details>)}</div></section></Reveal>
  </div>;
}
