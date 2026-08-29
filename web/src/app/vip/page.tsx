import React from 'react';
import type { Metadata } from 'next';
import { Crown, CheckCircle2, Sparkles, ShieldCheck, Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Nâng Cấp Hội Viên VIP Tiên Tôn - Nghe Truyện Không Giới Hạn',
  description: 'Trở thành Hội Viên VIP Tiên Tôn: Nghe audio 320kbps không giới hạn, không quảng cáo, mở khóa toàn bộ tập trả phí.',
};

export default function VipPage() {
  const plans = [
    {
      id: '1-month',
      name: 'Đồng Đan Cảnh',
      duration: '1 Tháng',
      price: '49.000đ',
      popular: false,
      features: [
        'Mở khóa toàn bộ chương VIP',
        'Âm thanh chuẩn Studio 320kbps',
        'Tải về nghe ngoại tuyến',
        'Không quảng cáo ngắt quãng',
      ],
    },
    {
      id: '3-months',
      name: 'Kim Đan Cảnh',
      duration: '3 Tháng',
      price: '129.000đ',
      popular: true,
      badge: 'TIẾT KIỆM 15%',
      features: [
        'Mở khóa toàn bộ chương VIP',
        'Âm thanh chuẩn Studio 320kbps',
        'Tải về nghe ngoại tuyến',
        'Huy hiệu VIP Kim Đan phát sáng',
        'Hỏi đáp không giới hạn với AI Đạo Hữu',
      ],
    },
    {
      id: '1-year',
      name: 'Tiên Vương Cảnh',
      duration: '1 Năm',
      price: '449.000đ',
      popular: false,
      badge: 'TIẾT KIỆM 25%',
      features: [
        'Tất cả đặc quyền Kim Đan',
        'Nghe trước các tập audio mới nhất',
        'Huy hiệu Tiên Vương mạ vàng độc quyền',
        'Hỗ trợ kỹ thuật ưu tiên 24/7',
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 space-y-16">
      {/* Header VIP */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-bold text-amber-400">
          <Crown className="w-4 h-4 text-amber-400" />
          HỘI VIÊN TIÊN TÔN CÁC
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white">
          Nâng Cấp Cảnh Giới <span className="gold-text">Hội Viên VIP</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-300">
          Trải nghiệm âm thanh thượng đỉnh, đắm chìm trong thế giới tu chân huyền ảo không giới hạn.
        </p>
      </div>

      {/* Bảng giá các gói */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative flex flex-col justify-between rounded-3xl p-8 transition-all ${
              plan.popular
                ? 'bg-gradient-to-b from-[#1c2438] to-[#0f172a] border-2 border-amber-500 shadow-2xl shadow-amber-500/20 scale-105'
                : 'bg-slate-900/70 border border-white/10 hover:border-white/20'
            }`}
          >
            {plan.badge && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#ffd166] to-[#ffb703] px-3.5 py-0.5 text-[10px] font-black text-black shadow-md">
                {plan.badge}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                <span className="text-xs text-slate-400">{plan.duration}</span>
              </div>

              <div className="mt-4 mb-6">
                <span className="text-3xl sm:text-4xl font-black text-white">{plan.price}</span>
              </div>

              <ul className="space-y-3 text-xs text-slate-300 border-t border-white/10 pt-6">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              className={`mt-8 w-full py-3.5 rounded-xl font-black text-xs transition-all shadow-lg ${
                plan.popular
                  ? 'bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black shadow-amber-500/30 hover:scale-102'
                  : 'bg-slate-800 hover:bg-slate-700 text-white'
              }`}
            >
              NÂNG CẤP NGAY
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
