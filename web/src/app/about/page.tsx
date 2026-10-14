import { ArrowRight, BookOpen, Headphones, Heart, Layers, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { EditorialCTA, EditorialHeading, EditorialHero, EditorialShell } from '@/components/editorial';
import { Reveal } from '@/components/reveal';

export const metadata: Metadata = {
  title: 'Về chúng tôi | Tiên Tôn Audio',
  description: 'Một không gian dành cho người yêu truyện. Khám phá câu chuyện và tinh thần xây dựng Tiên Tôn Audio.',
};

const values = [
  { icon: Headphones, number: '01', title: 'Lắng nghe theo cách của bạn', text: 'Một giọng đọc yêu thích, tốc độ vừa vặn và khoảnh khắc dành riêng cho mình. Chúng tôi chăm chút cho từng thao tác để bạn ở lại cùng câu chuyện.' },
  { icon: BookOpen, number: '02', title: 'Đọc và nghe liền mạch', text: 'Chuyển từ trang chữ sang thanh âm, lưu lại tác phẩm yêu thích và tiếp tục hành trình còn dang dở. Mỗi câu chuyện có nhiều cách để cảm nhận.' },
  { icon: Heart, number: '03', title: 'Cùng chung một thế giới', text: 'Từ một cảm nhận sau chương truyện đến cuộc trao đổi về nhân vật, cộng đồng là nơi những người cùng sở thích tìm thấy nhau.' },
];

export default function AboutPage() {
  return <EditorialShell label="Về chúng tôi">
    <EditorialHero eyebrow="CÂU CHUYỆN CỦA TIÊN TÔN" title="Một nơi để nghe." accent="Một thế giới để thuộc về." description="Tiên Tôn Audio được xây dựng từ tình yêu dành cho truyện tiên hiệp, huyền huyễn và kiếm hiệp. Chúng tôi muốn mỗi lần bạn mở một câu chuyện đều là một khoảng thời gian đáng tận hưởng.">
      <Link href="/categories" className="editorial-button">Tìm câu chuyện của bạn <ArrowRight size={17} /></Link>
      <Link href="#our-story" className="editorial-button-secondary">Về hành trình này</Link>
    </EditorialHero>

    <Reveal><section id="our-story" className="grid scroll-mt-28 gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
      <EditorialHeading eyebrow="VÌ SAO CHÚNG TÔI BẮT ĐẦU" title="Những câu chuyện hay xứng đáng có một không gian đẹp." />
      <div className="space-y-5 text-sm leading-[1.95] text-slate-300 sm:text-base"><p>Có những câu chuyện khiến ta quên thời gian. Có những giọng đọc trở thành người bạn trên đường đi, trong lúc làm việc hay trước khi ngủ.</p><p>Tiên Tôn Audio hướng đến trải nghiệm ấy: dễ tìm truyện, dễ bắt đầu nghe và dễ quay lại nơi bạn đã dừng. Giao diện, âm thanh và cộng đồng cùng phục vụ một điều giản dị — niềm vui được ở trong thế giới mình yêu thích.</p><blockquote className="border-l-2 border-[#ffb703] pl-6 font-serif text-xl text-[#ffd166] sm:text-2xl">“Bật một câu chuyện. Dành một khoảng lặng cho mình.”</blockquote></div>
    </section></Reveal>

    <section><Reveal><EditorialHeading eyebrow="NHỮNG ĐIỀU CHÚNG TÔI CHĂM CHÚT" title="Trải nghiệm bắt đầu từ những điều nhỏ." /></Reveal>
      <div className="grid gap-5 md:grid-cols-3">{values.map(({ icon: Icon, number, title, text }, index) => <Reveal key={number} delay={index * 80}><article className="editorial-card h-full p-7"><div className="mb-8 flex items-center justify-between"><span className="editorial-icon"><Icon size={23} /></span><span className="font-serif text-3xl text-white/15">{number}</span></div><h3 className="mb-3 text-lg font-semibold text-white">{title}</h3><p className="text-sm leading-[1.85] text-slate-400">{text}</p></article></Reveal>)}</div>
    </section>

    <Reveal><section className="grid gap-5 md:grid-cols-2">
      <Link href="/cultivation" className="editorial-card group flex flex-col items-start p-8 sm:p-10"><Layers className="mb-7 text-[#ffb703]" size={28} /><p className="editorial-kicker mb-3">MỘT CHÚT TIÊN HIỆP TRONG ĐỜI THƯỜNG</p><h2 className="mb-4 font-serif text-3xl text-white">17 cảnh giới. Một hành trình của bạn.</h2><p className="mb-7 text-sm leading-relaxed text-slate-400">Mỗi lần trở lại là một bước trên tiên lộ. Khám phá hệ thống cảnh giới và theo dõi tu vi của mình.</p><span className="mt-auto flex items-center gap-2 text-sm text-[#ffd166]">Khám phá cảnh giới <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></span></Link>
      <Link href="/policies" className="editorial-card group flex flex-col items-start p-8 sm:p-10"><ShieldCheck className="mb-7 text-[#ffb703]" size={28} /><p className="editorial-kicker mb-3">XÂY DỰNG TỪ SỰ TÔN TRỌNG</p><h2 className="mb-4 font-serif text-3xl text-white">Tôn trọng tác phẩm và người thưởng thức.</h2><p className="mb-7 text-sm leading-relaxed text-slate-400">Thông tin về sử dụng dịch vụ, dữ liệu cá nhân và cách gửi yêu cầu bản quyền được tập hợp tại trung tâm chính sách.</p><span className="mt-auto flex items-center gap-2 text-sm text-[#ffd166]">Tìm hiểu chính sách <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></span></Link>
    </section></Reveal>
    <EditorialCTA />
  </EditorialShell>;
}
