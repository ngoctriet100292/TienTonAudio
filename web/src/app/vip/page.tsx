'use client';

import { MediaImage } from '@/components/media-image';

import { getErrorMessage } from '@/lib/errors';

import { CultivationSpinner } from '@/components/cultivation-spinner';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';
import { CreatePaymentResp, PaymentStatusResp, SubscriptionPlan, UserSubscription } from '@/types';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  Flame,
  QrCode,
  ShieldCheck,
  Sparkles,
  X,
  Zap
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

export default function VipPage() {
  const router = useRouter();
  const { user, isAuthenticated, refreshProfile } = useAuth();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [activeSub, setActiveSub] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal Thanh Toán
  const [, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<CreatePaymentResp | null>(null);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  // Trạng thái xác nhận tự động
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<PaymentStatusResp | null>(null);
  const [countdown, setCountdown] = useState(900); // 15 phút
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handlePaymentCompleted = async (statusRes: PaymentStatusResp) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    setPaymentSuccess(statusRes);
    if (refreshProfile) {
      await refreshProfile();
    }
    const updatedSub = await api.getActiveSubscription();
    setActiveSub(updatedSub);
  };

  // Khởi tạo thanh toán VietQR
  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/vip');
      return;
    }

    setSelectedPlan(plan);
    setCreatingPayment(true);
    setPaymentSuccess(null);
    setCountdown(900);

    try {
      const order = await api.createPayment(plan.id, 'vietqr');
      setPaymentOrder(order);
      setPaymentModalOpen(true);
    } catch (err: unknown) {
      alert(getErrorMessage(err) || 'Lỗi tạo đơn thanh toán');
    } finally {
      setCreatingPayment(false);
    }
  };

  // Xác nhận tự động ngay (Auto Verification / Instant Test)
  const handleCheckPayment = async () => {
    if (!paymentOrder) return;
    setCheckingPayment(true);
    try {
      const res = await api.getPaymentStatus(paymentOrder.payment_id);
      if (res.is_completed) {
        await handlePaymentCompleted(res);
      } else {
        alert("Giao dịch chưa được xác nhận. Vui lòng chờ đối soát thanh toán.");
      }
    } catch (err: unknown) {
      alert(getErrorMessage(err) || 'Lỗi xác nhận tự động');
    } finally {
      setCheckingPayment(false);
    }
  };

  // Sao chép nội dung
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getPlanBonusExp = (days: number) => {
    return days * 50;
  };

  // Load plans & active subscription
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        const [plansData, subData] = await Promise.all([
          api.getSubscriptionPlans(),
          isAuthenticated ? api.getActiveSubscription() : Promise.resolve(null),
        ]);

        if (plansData && plansData.length > 0) {
          setPlans(plansData);
        } else {
          // Fallback mặc định nếu chưa kịp tải
          setPlans([
            {
              id: 1,
              name: 'Đồng Đan Cảnh (1 Tháng)',
              price: 49000,
              duration_days: 30,
              description: 'Mở khóa toàn bộ chương VIP, Âm thanh chuẩn Studio 320kbps, Tải về ngoại tuyến, Không quảng cáo',
            },
            {
              id: 2,
              name: 'Kim Đan Cảnh (3 Tháng)',
              price: 129000,
              duration_days: 90,
              description: 'Tất cả đặc quyền Đồng Đan Cảnh, Tiết kiệm 15%, Huy hiệu VIP Kim Đan phát sáng, Tặng +4.500 Tu Vi Đột Phá',
            },
            {
              id: 3,
              name: 'Tiên Vương Cảnh (1 Năm)',
              price: 449000,
              duration_days: 365,
              description: 'Tất cả đặc quyền Kim Đan, Tiết kiệm 25%, Huy hiệu Tiên Vương mạ vàng độc quyền, Nghe trước các tập audio mới nhất, Tặng +18.250 Tu Vi Đột Phá',
            },
          ]);
        }
        setActiveSub(subData);
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [isAuthenticated]);

  // Đếm ngược thời gian thanh toán 15 phút
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (paymentModalOpen && countdown > 0 && !paymentSuccess) {
      timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [paymentModalOpen, countdown, paymentSuccess]);

  const onPaymentCompleted = useEffectEvent(handlePaymentCompleted);

  // Tự động Polling kiểm tra trạng thái đơn hàng mỗi 3 giây
  useEffect(() => {
    if (paymentModalOpen && paymentOrder && !paymentSuccess) {
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const statusRes = await api.getPaymentStatus(paymentOrder.payment_id);
          if (statusRes && statusRes.is_completed) {
            void onPaymentCompleted(statusRes);
          }
        } catch {
          // Bỏ qua lỗi polling tạm thời
        }
      }, 3000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [paymentModalOpen, paymentOrder, paymentSuccess]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 pb-24 space-y-12">
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
          Trải nghiệm âm thanh thượng đỉnh 320kbps, đắm chìm trong thế giới tu chân huyền ảo không quảng cáo và tự động tăng điểm Tu Vi.
        </p>

        {/* Trạng thái VIP hiện tại nếu có */}
        {activeSub && (
          <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/40 max-w-lg mx-auto flex items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex-shrink-0">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-amber-400 font-black uppercase tracking-wider">
                  Đặc Quyền Đang Kích Hoạt
                </p>
                <p className="text-sm font-bold text-white">{activeSub.plan_name}</p>
                <p className="text-[11px] text-slate-400 font-mono">
                  Hạn dùng đến: {new Date(activeSub.expires_at).toLocaleDateString('vi-VN')}
                </p>
              </div>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" /> Còn hạn
            </span>
          </div>
        )}
      </div>

      {/* Bảng giá các gói VIP */}
      {loading ? (
        <div className="py-16">
          <CultivationSpinner size="lg" text="Đang nạp các tiên trận gói VIP..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan, idx) => {
            const isPopular = plan.duration_days === 90 || idx === 1;
            const bonusExp = getPlanBonusExp(plan.duration_days);

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between rounded-3xl p-7 transition-all ${isPopular
                    ? 'bg-gradient-to-b from-[#1c2438] to-[#0f172a] border-2 border-amber-500 shadow-2xl shadow-amber-500/20 md:-translate-y-2'
                    : 'bg-slate-900/80 border border-white/10 hover:border-white/20'
                  }`}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#ffd166] to-[#ffb703] px-3.5 py-0.5 text-[11px] font-black text-black shadow-md flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> KHUYÊN DÙNG • TIẾT KIỆM 15%
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base sm:text-lg font-black text-white">{plan.name}</h3>
                    <span className="text-xs text-slate-400 font-mono">
                      {plan.duration_days} ngày
                    </span>
                  </div>

                  {/* Giá tiền */}
                  <div className="mt-4 mb-3">
                    <span className="text-3xl sm:text-4xl font-black text-white">
                      {formatPrice(plan.price)}
                    </span>
                  </div>

                  {/* Quà Đột Phá Tu Vi */}
                  <div className="mb-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
                    <Flame className="w-3.5 h-3.5" />
                    <span>Tặng +{bonusExp.toLocaleString()} Tu Vi Đột Phá</span>
                  </div>

                  {/* Tính năng */}
                  <ul className="space-y-3 text-xs text-slate-300 border-t border-white/10 pt-5">
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span>Mở khóa 100% chương VIP độc quyền</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span>Âm thanh chuẩn Studio 320kbps tốc độ cao</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span>Không quảng cáo làm phiền khi tu luyện</span>
                    </li>
                    {plan.duration_days >= 90 && (
                      <li className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <span className="text-amber-300 font-semibold">
                          Huy hiệu VIP Kim Đan phát sáng rực rỡ
                        </span>
                      </li>
                    )}
                    {plan.duration_days >= 365 && (
                      <li className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <span className="text-amber-300 font-bold">
                          Nghe trước tập mới + Hỗ trợ tông chủ 24/7
                        </span>
                      </li>
                    )}
                  </ul>
                </div>

                <button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={creatingPayment}
                  className={`mt-8 w-full py-3.5 rounded-xl font-black text-xs sm:text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${isPopular
                      ? 'bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black shadow-amber-500/30 hover:scale-102 active:scale-98'
                      : 'bg-slate-800 hover:bg-slate-700 text-white border border-white/10'
                    }`}
                >
                  <Zap className="w-4 h-4" />
                  {activeSub ? 'GIA HẠN GÓI NÀY' : 'NÂNG CẤP NGAY'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Thanh Toán VietQR Tự Động */}
      {paymentModalOpen && paymentOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in-0">
          <div className="relative w-full max-w-lg rounded-3xl border border-amber-500/30 bg-[#0f172a] p-6 sm:p-7 shadow-2xl shadow-amber-500/10 space-y-5">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Thanh Toán Quét Mã VietQR</h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Tự động kích hoạt gói VIP sau khi nhận tiền
                  </p>
                </div>
              </div>

              <button
                onClick={() => setPaymentModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Màn hình Thành Công */}
            {paymentSuccess ? (
              <div className="py-6 text-center space-y-4 animate-in zoom-in-95">
                <div className="h-16 w-16 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-10 h-10 animate-bounce" />
                </div>

                <div>
                  <h4 className="text-xl font-black text-white">Đột Phá Thành Công!</h4>
                  <p className="text-xs text-amber-300 font-semibold mt-1">
                    Gói {paymentSuccess.plan_name} đã được kích hoạt thành công.
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Đan dược đột phá +{paymentSuccess.bonus_exp.toLocaleString()} Tu Vi đã hấp thu vào kinh mạch.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 text-xs text-slate-300 space-y-1.5 text-left max-w-sm mx-auto">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Trạng thái:</span>
                    <span className="text-emerald-400 font-bold">Hoàn tất</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cảnh giới hiện tại:</span>
                    <span className="text-amber-400 font-bold">
                      {paymentSuccess.cultivation_realm || user?.cultivation_realm || 'Đột Phá'}
                    </span>
                  </div>
                  {paymentSuccess.expires_at && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Hạn dùng đến:</span>
                      <span className="font-mono text-white">
                        {new Date(paymentSuccess.expires_at).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    setPaymentModalOpen(false);
                    router.push('/');
                  }}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-sm shadow-lg shadow-amber-500/25"
                >
                  Vào Nghe Truyện Ngay
                </button>
              </div>
            ) : (
              /* Màn hình Chờ Quét Mã QR */
              <div className="space-y-4">
                {/* Khung QR Code & Đếm Ngược */}
                <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-3">
                  <div className="relative p-2 bg-white rounded-2xl shadow-xl">
                    <MediaImage
                      src={paymentOrder.qr_code_url}
                      alt="VietQR Napas 24/7"
                      className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                    />
                  </div>

                  {/* Trạng thái quét & Đồng hồ đếm ngược */}
                  <div className="flex items-center justify-between w-full text-xs px-2 pt-1 border-t border-white/10">
                    <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                      <span>Đang chờ chuyển khoản...</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatCountdown(countdown)}</span>
                    </div>
                  </div>
                </div>

                {/* Chi Tiết Thông Tin Chuyển Khoản */}
                <div className="space-y-2 text-xs">
                  {/* Ngân Hàng */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
                    <span className="text-slate-400">Ngân hàng:</span>
                    <span className="font-bold text-white">{paymentOrder.bank_name}</span>
                  </div>

                  {/* Số Tài Khoản */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
                    <span className="text-slate-400">Số tài khoản:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-400 text-sm">
                        {paymentOrder.bank_account}
                      </span>
                      <button
                        onClick={() => copyToClipboard(paymentOrder.bank_account, 'account')}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                        title="Sao chép số tài khoản"
                      >
                        {copiedField === 'account' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Chủ Tài Khoản */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
                    <span className="text-slate-400">Chủ tài khoản:</span>
                    <span className="font-bold text-white">{paymentOrder.account_name}</span>
                  </div>

                  {/* Số Tiền */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
                    <span className="text-slate-400">Số tiền:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-white text-sm">
                        {formatPrice(paymentOrder.amount)}
                      </span>
                      <button
                        onClick={() => copyToClipboard(paymentOrder.amount.toString(), 'amount')}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                        title="Sao chép số tiền"
                      >
                        {copiedField === 'amount' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Nội Dung Chuyển Khoản (Bắt Buộc) */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <div>
                      <span className="text-amber-400 font-bold block">Nội dung chuyển khoản:</span>
                      <span className="text-[11px] text-slate-400">Giữ nguyên để hệ thống tự duyệt</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-amber-300 text-sm">
                        {paymentOrder.transfer_content}
                      </span>
                      <button
                        onClick={() => copyToClipboard(paymentOrder.transfer_content, 'content')}
                        className="p-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300"
                        title="Sao chép nội dung"
                      >
                        {copiedField === 'content' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Hướng Dẫn & Nút Xác Nhận Tự Động */}
                <div className="pt-2 border-t border-white/10 space-y-2.5">
                  <div className="flex items-start gap-2 text-[11px] text-slate-400">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <span>
                      Mở app ngân hàng để quét mã QR. Gói VIP được kích hoạt sau khi giao dịch được đối soát.
                    </span>
                  </div>

                  {/* Nút Kích Hoạt Tự Động Ngay (Mô phỏng / Xác nhận giao dịch) */}
                  <button
                    onClick={handleCheckPayment}
                    disabled={checkingPayment}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {checkingPayment ? (
                      <CultivationSpinner size="xs" text="Đang kiểm tra thanh toán..." showText={true} />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Kiểm tra trạng thái thanh toán
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
