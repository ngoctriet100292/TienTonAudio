'use client';

import { useState, type FormEvent } from 'react';
import { ArrowUpRight, Mail } from 'lucide-react';

export function ContactForm() {
  const [message, setMessage] = useState('');
  function compose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const subject = `[Tiên Tôn Audio · ${data.get('topic')}] ${data.get('name')}`;
    const body = `Họ tên: ${data.get('name')}\nEmail liên hệ: ${data.get('email')}\n\n${data.get('content')}`;
    window.location.href = `mailto:support@tientonaudio.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setMessage('Bản nháp đã được chuyển tới ứng dụng email. Hãy nhấn Gửi trong ứng dụng đó để hoàn tất. Nếu ứng dụng không mở, bạn có thể sao chép nội dung và gửi tới support@tientonaudio.com.');
  }
  const inputClass = 'w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white transition-colors focus:border-[#ffb703]';
  return <form onSubmit={compose} className="space-y-5">
    <div className="grid gap-5 sm:grid-cols-2"><div><label htmlFor="contact-name" className="mb-2 block text-sm text-slate-300">Tên của bạn</label><input id="contact-name" name="name" required maxLength={100} autoComplete="name" placeholder="Bạn muốn được gọi là…" className={inputClass} /></div><div><label htmlFor="contact-email" className="mb-2 block text-sm text-slate-300">Email liên hệ</label><input id="contact-email" name="email" type="email" required autoComplete="email" placeholder="ban@example.com" className={inputClass} /></div></div>
    <div><label htmlFor="contact-topic" className="mb-2 block text-sm text-slate-300">Bạn muốn trao đổi về</label><select id="contact-topic" name="topic" className={inputClass}><option>Hỗ trợ sử dụng</option><option>Báo lỗi và góp ý</option><option>Bản quyền tác phẩm</option><option>Hợp tác sáng tác / thu âm</option><option>Nội dung khác</option></select></div>
    <div><label htmlFor="contact-content" className="mb-2 block text-sm text-slate-300">Nội dung</label><textarea id="contact-content" name="content" required minLength={10} maxLength={4000} rows={6} placeholder="Chia sẻ vấn đề, đường dẫn liên quan và điều bạn cần hỗ trợ…" className={`${inputClass} resize-y`} /></div>
    <p className="text-xs leading-relaxed text-slate-400">Nút bên dưới mở bản nháp trong ứng dụng email của bạn. Nội dung chỉ được gửi khi bạn xác nhận trong ứng dụng email.</p>
    <button type="submit" className="editorial-button w-full sm:w-auto"><Mail size={17} />Soạn email hỗ trợ<ArrowUpRight size={17} /></button>
    {message && <p role="status" className="rounded-xl border border-[#ffb703]/25 bg-[#ffb703]/5 p-4 text-sm leading-relaxed text-[#ffd166]">{message}</p>}
  </form>;
}
