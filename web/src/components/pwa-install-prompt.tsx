'use client';

import { Download, Smartphone, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('tienton_pwa_prompt_dismissed', Date.now().toString());
  };

  useEffect(() => {
    // Kiểm tra xem user đã bấm tắt banner trong 7 ngày qua chưa
    const dismissedAt = localStorage.getItem('tienton_pwa_prompt_dismissed');
    if (dismissedAt) {
      const diff = Date.now() - parseInt(dismissedAt, 10);
      if (diff < 7 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    // Kiểm tra nếu đang chạy ở chế độ standalone (đã cài đặt) thì không hiện
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    // Bắt sự kiện beforeinstallprompt (Android / Chrome / Desktop)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Kiểm tra iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    if (isIosDevice && !isStandalone) {
      // Hiển thị sau 3 giây cho trải nghiệm mượt mà
      const timer = setTimeout(() => { setIsIOS(true); setShowPrompt(true); }, 3000);
      return () => { clearTimeout(timer); window.removeEventListener('beforeinstallprompt', handleBeforeInstall); };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-24 sm:bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 animate-in fade-in-0 slide-in-from-bottom-5 duration-300">
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-r from-[#0c1322] via-[#0f172a] to-[#0a0f1d] p-4 shadow-2xl shadow-amber-500/15 backdrop-blur-2xl">
        {/* Hào quang nền */}
        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-500/20 blur-xl pointer-events-none" />

        <div className="flex items-start gap-3.5">
          {/* App Icon */}
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#ffd166] to-[#ffb703] text-black shadow-md shadow-amber-500/30">
            <Smartphone className="w-5 h-5" />
          </div>

          {/* Info text */}
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-black text-white uppercase tracking-wide">
                Cài Đặt App Tiên Tôn
              </p>
              <span className="text-[11px] px-1.5 py-0.2 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                PWA
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-tight">
              {isIOS
                ? 'Nhấn nút [Chia Sẻ] và chọn "Thêm vào MH chính" để nghe audio toàn màn hình!'
                : 'Trải nghiệm nghe truyện toàn màn hình, mượt mà và tiết kiệm pin như App Native!'}
            </p>

            {/* Nút hành động */}
            {!isIOS && deferredPrompt && (
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  onClick={handleInstall}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 text-black font-extrabold text-xs shadow-md shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  Cài Đặt Ngay
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs transition-colors"
                >
                  Để sau
                </button>
              </div>
            )}
          </div>

          {/* Nút đóng */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800 transition-colors"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
