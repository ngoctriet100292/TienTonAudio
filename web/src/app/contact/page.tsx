import { ArrowUpRight, BookOpen, Mail, Plus, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { EditorialHeading, EditorialHero, EditorialShell } from '@/components/editorial';
import { ContactForm } from '@/components/contact-form';
import { Reveal } from '@/components/reveal';

export const metadata: Metadata = { title: 'Liên hệ & hỗ trợ | Tiên Tôn Audio', description: 'Trao đổi với Tiên Tôn Audio về hỗ trợ sử dụng, góp ý, hợp tác và bản quyền tác phẩm.' };

export default function ContactPage() {
  return <EditorialShell label="Liên hệ & hỗ trợ">
    <EditorialHero eyebrow="CHÚNG TÔI LUÔN LẮNG NGHE" title="Bạn có điều muốn nói?" accent="Hãy bắt đầu cuộc trò chuyện." description="Một góp ý nhỏ, một vấn đề cần giải đáp hay ý tưởng hợp tác mới — chúng tôi muốn được nghe từ bạn. Chọn chủ đề và chia sẻ điều bạn đang cần hỗ trợ.">
      <a href="#contact-form" className="editorial-button">Viết lời nhắn <ArrowUpRight size={17} /></a>
    </EditorialHero>
    <div className="grid items-start gap-8 lg:grid-cols-[1.4fr_0.8fr]">
      <Reveal><section id="contact-form" className="editorial-card scroll-mt-28 p-6 sm:p-9"><EditorialHeading eyebrow="MỘT LỜI NHẮN, MỘT KẾT NỐI" title="Chia sẻ cùng Tiên Tôn." description="Thông tin cụ thể sẽ giúp chúng tôi hiểu vấn đề của bạn nhanh hơn." /><ContactForm /></section></Reveal>
      <aside className="space-y-5"><Reveal delay={80}><div className="editorial-card p-7"><span className="editorial-icon mb-5"><Mail size={23} /></span><h2 className="mb-2 text-lg font-semibold text-white">Liên hệ qua email</h2><p className="mb-5 text-sm leading-relaxed text-slate-400">Bạn cũng có thể gửi ảnh chụp lỗi và tài liệu liên quan trực tiếp qua email.</p><a href="mailto:support@tientonaudio.com" className="break-all text-sm text-[#ffd166] hover:underline">support@tientonaudio.com</a></div></Reveal><Reveal delay={120}><Link href="/copyright" className="editorial-card group block p-7"><ShieldCheck size={24} className="mb-5 text-[#ffb703]" /><h2 className="mb-2 text-lg font-semibold text-white">Yêu cầu bản quyền</h2><p className="text-sm leading-relaxed text-slate-400">Xem những thông tin cần chuẩn bị khi gửi yêu cầu liên quan đến một tác phẩm.</p><span className="mt-5 flex items-center gap-2 text-sm text-[#ffd166]">Xem hướng dẫn <ArrowUpRight size={16} /></span></Link></Reveal><Reveal delay={160}><div className="rounded-2xl border border-white/10 p-6"><BookOpen className="mb-3 text-slate-400" size={20} /><p className="text-sm leading-relaxed text-slate-400">Đừng gửi mật khẩu, mã OTP hoặc thông tin thẻ thanh toán trong lời nhắn hỗ trợ.</p></div></Reveal></aside>
    </div>
    <Reveal><section><EditorialHeading eyebrow="CÓ THỂ BẠN ĐANG TÌM" title="Một vài câu trả lời trước khi gửi thư." /><div className="editorial-faq divide-y divide-white/10 border-y border-white/10">{[
      ['Tôi gặp lỗi phát audio, cần gửi thông tin gì?', 'Hãy gửi đường dẫn truyện và chương, thiết bị, trình duyệt, thời điểm xảy ra lỗi và ảnh chụp màn hình nếu có.'],
      ['Tôi đã thanh toán nhưng VIP chưa được kích hoạt?', 'Hãy gửi mã đơn hàng, thời gian thanh toán và bằng chứng giao dịch. Không chia sẻ mã OTP, mật khẩu ngân hàng hoặc toàn bộ thông tin thẻ.'],
      ['Tôi muốn hợp tác thu âm hoặc đăng truyện?', 'Chọn chủ đề hợp tác và giới thiệu tác phẩm, kinh nghiệm hoặc mẫu giọng đọc của bạn. Nêu rõ phạm vi quyền sử dụng nội dung bạn đề xuất.'],
    ].map(([question, answer]) => <details key={question}><summary>{question}<Plus size={18} /></summary><p className="faq-answer max-w-3xl pb-6 text-sm leading-relaxed text-slate-400">{answer}</p></details>)}</div></section></Reveal>
  </EditorialShell>;
}
