'use client';

import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface CultivationSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen';
  text?: string;
  showText?: boolean;
  variant?: 'gold' | 'cyan' | 'purple' | 'crimson';
  className?: string;
}

const CULTIVATION_QUOTES = [
  'Đang ngưng tụ thiên địa linh khí...',
  'Đang vận chuyển đại chu thiên...',
  'Đang khai mở cửu thiên thần thức...',
  'Đang giải phong ấn cổ tịch chân kinh...',
  'Linh đan sắp thành, chư vị đạo hữu đợi chút...',
  'Đang câu thông thiên địa pháp tắc...',
];

export function CultivationSpinner({
  size = 'md',
  text,
  showText = true,
  variant = 'gold',
  className = '',
}: CultivationSpinnerProps) {
  const [quoteIndex, setQuoteIndex] = useState(0);

  // Kích thước chuẩn
  const dimensions = {
    xs: { ring: 18, stroke: 1.5, core: 6 },
    sm: { ring: 26, stroke: 2, core: 9 },
    md: { ring: 52, stroke: 2.5, core: 16 },
    lg: { ring: 84, stroke: 3, core: 26 },
    xl: { ring: 120, stroke: 3.5, core: 38 },
    fullscreen: { ring: 136, stroke: 4, core: 44 },
  }[size];

  // Màu sắc theo biến thể công pháp
  const colorSchemes = {
    gold: {
      primary: '#ffd166',
      secondary: '#ffb703',
      accent: '#fb8500',
      glow: 'rgba(255, 183, 3, 0.45)',
      glowOuter: 'rgba(255, 209, 102, 0.25)',
      textGradient: 'from-[#ffd166] via-[#ffb703] to-amber-500',
      bgAura: 'bg-amber-500/10',
    },
    cyan: {
      primary: '#38bdf8',
      secondary: '#0284c7',
      accent: '#06b6d4',
      glow: 'rgba(56, 189, 248, 0.45)',
      glowOuter: 'rgba(6, 182, 212, 0.25)',
      textGradient: 'from-cyan-300 via-sky-400 to-blue-500',
      bgAura: 'bg-cyan-500/10',
    },
    purple: {
      primary: '#c084fc',
      secondary: '#9333ea',
      accent: '#a855f7',
      glow: 'rgba(192, 132, 252, 0.45)',
      glowOuter: 'rgba(147, 51, 234, 0.25)',
      textGradient: 'from-purple-300 via-fuchsia-400 to-violet-500',
      bgAura: 'bg-purple-500/10',
    },
    crimson: {
      primary: '#fb7185',
      secondary: '#e11d48',
      accent: '#f43f5e',
      glow: 'rgba(251, 113, 133, 0.45)',
      glowOuter: 'rgba(225, 29, 72, 0.25)',
      textGradient: 'from-rose-300 via-rose-400 to-red-500',
      bgAura: 'bg-rose-500/10',
    },
  }[variant];

  const { ring, stroke, core } = dimensions;
  const radius = (ring - stroke * 2) / 2;
  const center = ring / 2;

  // Render SVG Trận Pháp Âm Dương & Vòng Xoay Bát Quái
  const spinnerSvg = (
    <div
      className="relative flex items-center justify-center flex-shrink-0"
      style={{ width: ring, height: ring }}
    >
      {/* Vầng hào quang linh khí phía sau */}
      <div
        className="absolute inset-0 rounded-full blur-xl pointer-events-none transition-all duration-700"
        style={{ background: colorSchemes.glow }}
      />

      {/* 1. VÒNG NGOÀI (Thiên Đạo Luân Hồi - Quay thuận chiều kim đồng hồ) */}
      <svg
        width={ring}
        height={ring}
        viewBox={`0 0 ${ring} ${ring}`}
        className="absolute inset-0 animate-spin-slow"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={colorSchemes.secondary}
          strokeWidth={stroke}
          strokeDasharray={`${radius * 0.4} ${radius * 0.2} ${radius * 0.1} ${radius * 0.3}`}
          strokeLinecap="round"
          opacity="0.85"
        />
        {/* 4 Nút Tứ Tượng Định Vị (Đông Tây Nam Bắc) */}
        {size !== 'xs' && (
          <>
            <circle cx={center} cy={stroke + 1} r={stroke * 1.2} fill={colorSchemes.primary} />
            <circle cx={center} cy={ring - stroke - 1} r={stroke * 1.2} fill={colorSchemes.primary} />
            <circle cx={stroke + 1} cy={center} r={stroke * 1.2} fill={colorSchemes.primary} />
            <circle cx={ring - stroke - 1} cy={center} r={stroke * 1.2} fill={colorSchemes.primary} />
          </>
        )}
      </svg>

      {/* 2. VÒNG GIỮA (Linh Lực Khí Tức - Quay nghịch chiều) */}
      <svg
        width={ring * 0.76}
        height={ring * 0.76}
        viewBox={`0 0 ${ring * 0.76} ${ring * 0.76}`}
        className="absolute animate-spin-reverse"
      >
        <circle
          cx={(ring * 0.76) / 2}
          cy={(ring * 0.76) / 2}
          r={((ring * 0.76) - stroke * 2) / 2}
          fill="none"
          stroke={colorSchemes.primary}
          strokeWidth={stroke * 0.9}
          strokeDasharray={`${radius * 0.5} ${radius * 0.35}`}
          strokeLinecap="round"
          opacity="0.9"
        />
      </svg>

      {/* 3. LÕI KIM ĐAN / THÁI CỰC TỎA SÁNG (Nhịp thở linh lực animate-qi-pulse) */}
      <div
        className="relative z-10 flex items-center justify-center rounded-full shadow-lg animate-qi-pulse"
        style={{
          width: core,
          height: core,
          background: `radial-gradient(circle, ${colorSchemes.primary} 0%, ${colorSchemes.secondary} 70%, ${colorSchemes.accent} 100%)`,
          boxShadow: `0 0 ${core * 1.2}px ${colorSchemes.glow}`,
        }}
      >
        {/* Điểm cực quang trung tâm */}
        <div
          className="rounded-full bg-white animate-ping opacity-75"
          style={{ width: Math.max(3, core * 0.35), height: Math.max(3, core * 0.35) }}
        />
      </div>
    </div>
  );

  useEffect(() => {
    if (size === 'xs' || size === 'sm') return;
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % CULTIVATION_QUOTES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [size]);

  // Trường hợp hiển thị Fullscreen toàn màn hình (Ví dụ: Chuyển trang, Tải chương lớn)
  if (size === 'fullscreen') {
    return (
      <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070a11]/90 backdrop-blur-2xl px-4 select-none ${className}`}>
        {/* Background Vầng Khí Cảnh */}
        <div className="absolute h-96 w-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none animate-pulse" />

        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
          {spinnerSvg}

          <div className="space-y-2 max-w-sm">
            <h3 className={`text-base sm:text-lg font-black bg-gradient-to-r ${colorSchemes.textGradient} bg-clip-text text-transparent tracking-wide`}>
              TIÊN TÔN AUDIO
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 font-medium tracking-wide animate-pulse min-h-[22px]">
              {text || CULTIVATION_QUOTES[quoteIndex]}
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Trận pháp đang chuyển vận...</span>
          </div>
        </div>
      </div>
    );
  }

  // Trường hợp cỡ nhỏ (xs / sm) - Inline bên trong Button hoặc Badge
  if (size === 'xs' || size === 'sm') {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        {spinnerSvg}
        {showText && text && (
          <span className="text-xs font-medium text-slate-300">{text}</span>
        )}
      </div>
    );
  }

  // Trường hợp cỡ vừa / lớn (md / lg / xl) - Trong Section, Reader hoặc Card
  return (
    <div className={`flex flex-col items-center justify-center py-6 space-y-3.5 select-none ${className}`}>
      {spinnerSvg}
      {showText && (
        <div className="text-center space-y-1">
          <p className={`text-xs sm:text-sm font-bold bg-gradient-to-r ${colorSchemes.textGradient} bg-clip-text text-transparent`}>
            {text || CULTIVATION_QUOTES[quoteIndex]}
          </p>
          <span className="block text-[11px] text-slate-500 font-mono">
            Khí tức lưu chuyển • Chư vị đạo hữu chớ vội
          </span>
        </div>
      )}
    </div>
  );
}
