'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Compass,
  Mail,
  Send,
  MessageSquare,
  ShieldCheck,
  Headphones,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

export default function ContactPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('support');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMsg(null);

    setTimeout(() => {
      setIsSubmitting(false);
      setStatusMsg({
        type: 'success',
        text: 'Cảm ơn Đạo Hữu! Thư truyền âm đã được gửi thành công. Ban Quản Trị sẽ hồi đáp qua thư phòng (email) trong vòng 24 giờ.',
      });
      setFullName('');
      setEmail('');
      setContent('');
    }, 800);
  };

  return (
    <main className="min-h-screen py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-400 font-medium">
          <Link href="/" className="hover:text-[#ffd166] flex items-center gap-1">
            <Compass className="w-3.5 h-3.5" /> Trang Chủ
          </Link>
          <span>/</span>
          <span className="text-amber-400 font-bold flex items-center gap-1">
            <Mail className="w-3.5 h-3.5" /> Liên Hệ & Hỗ Trợ
          </span>
        </nav>

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-b from-[#162035]/80 via-[#0d1424]/90 to-[#070a12] p-8 sm:p-12 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-[#ffd166]" />
              Truyền Âm Vạn Dặm • Hồi Đáp Tận Tâm
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
              Liên Hệ & <span className="bg-gradient-to-r from-[#ffd166] via-[#ffb703] to-amber-500 bg-clip-text text-transparent">Hỗ Trợ</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Nếu Đạo Hữu có bất kỳ thắc mắc, phản ánh lỗi, yêu cầu bản quyền DMCA hoặc muốn hợp tác thu âm audio và quảng cáo, hãy gửi thông điệp cho chúng tôi.
            </p>
          </div>
        </div>

        {/* Main Grid: Form + Info Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cột 1 & 2: Form liên hệ */}
          <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-xl shadow-xl">
            <h2 className="text-xl font-black text-white mb-2 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-400" />
              Gửi Thông Điệp Tới Tiên Tôn Audio
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Vui lòng điền thông tin bên dưới, chư vị chấp sự sẽ liên hệ lại với Đạo Hữu sớm nhất.
            </p>

            {statusMsg && (
              <div
                className={`p-4 rounded-2xl text-xs mb-6 flex items-start gap-3 ${
                  statusMsg.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                }`}
              >
                {statusMsg.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                )}
                <span>{statusMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Họ Tên / Đạo Hiệu <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="VD: Hàn Lập, Tiêu Viêm..."
                    className="w-full rounded-xl bg-slate-800/80 border border-white/10 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-[#ffb703] focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Địa Chỉ Email <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="daohuu@gmail.com"
                    className="w-full rounded-xl bg-slate-800/80 border border-white/10 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-[#ffb703] focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Chủ Đề Cần Hỗ Trợ
                </label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full rounded-xl bg-slate-800/80 border border-white/10 px-4 py-2.5 text-xs text-white focus:border-[#ffb703] focus:outline-none transition-all"
                >
                  <option value="support">Báo lỗi nghe truyện / Góp ý tính năng</option>
                  <option value="voice">Hợp tác MC thu âm / Diễn đọc audio</option>
                  <option value="dmca">Bản quyền tác phẩm / Yêu cầu DMCA</option>
                  <option value="ads">Hợp tác quảng cáo & tài trợ</option>
                  <option value="other">Chủ đề khác</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Nội Dung Chi Tiết <span className="text-amber-400">*</span>
                </label>
                <textarea
                  required
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Mô tả chi tiết vấn đề hoặc yêu cầu hợp tác của Đạo Hữu..."
                  className="w-full rounded-xl bg-slate-800/80 border border-white/10 p-4 text-xs text-white placeholder-slate-500 focus:border-[#ffb703] focus:outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  'Đang Truyền Âm...'
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Gửi Thư Truyền Âm
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Cột 3: Kênh liên hệ trực tiếp */}
          <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Headphones className="w-4 h-4 text-amber-400" />
                Kênh Trực Tuyến
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-800/60 border border-white/5 space-y-1">
                  <p className="text-slate-400 text-[11px]">Hòm Thư Điện Tử</p>
                  <p className="font-mono font-bold text-amber-300">support@tientonaudio.com</p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-800/60 border border-white/5 space-y-1">
                  <p className="text-slate-400 text-[11px]">Cộng Đồng Telegram</p>
                  <p className="font-mono font-bold text-sky-400">@TienTonAudio_Community</p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-800/60 border border-white/5 space-y-1">
                  <p className="text-slate-400 text-[11px]">Hỗ Trợ VIP & Khẩn Cấp</p>
                  <p className="font-mono font-bold text-emerald-400">vip@tientonaudio.com</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Thời Gian Tiếp Nhận
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Hệ thống tiếp nhận thư tín 24/7. Đội ngũ trực đài sẽ phản hồi từ <strong className="text-white">08:00 - 22:00</strong> tất cả các ngày trong tuần.
              </p>
            </div>

            <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6 space-y-2">
              <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Chính Sách Bản Quyền DMCA
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Nếu phát hiện bất kỳ nội dung âm thanh hoặc văn bản nào vi phạm quyền tác giả, vui lòng gửi kèm tài liệu chứng minh đến email bản quyền để chúng tôi xử lý trong vòng 48h.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
