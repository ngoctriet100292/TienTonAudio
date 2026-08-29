'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Flame,
  Zap,
  Sparkles,
  Headphones,
  Crown,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
  Calculator,
  Compass,
  ArrowUpRight,
  Layers,
  Award,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';

interface RealmItem {
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

const ALL_REALMS: RealmItem[] = [
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
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [selectedTier, setSelectedTier] = useState<'all' | 'pham' | 'tien' | 'chiton'>('all');
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [hasVip, setHasVip] = useState(true);

  const filteredRealms = ALL_REALMS.filter(
    (r) => selectedTier === 'all' || r.tier === selectedTier
  );

  // Tính toán dự báo tu luyện
  // 1 giờ nghe = 12 lần ping (mỗi 5 phút) * 5 EXP = 60 EXP/giờ. Nếu có VIP: 120 EXP/giờ.
  const expPerHour = hasVip ? 120 : 60;
  const expPerDay = hoursPerDay * expPerHour;
  const daysToNguyenAnh = Math.ceil(300 / expPerDay);
  const daysToDaiThua = Math.ceil(15000 / expPerDay);
  const daysToTienVuong = Math.ceil(700000 / expPerDay);

  return (
    <div className="space-y-16">
      {/* 1. Thẻ Trạng Thái Của Đạo Hữu Hiện Tại */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-[#121929] via-[#0d1322] to-[#070a12] p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-24 -mt-24 h-80 w-80 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="flex items-center gap-5">
            <div className="relative flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#ffd166] via-[#ffb703] to-amber-600 text-black shadow-xl shadow-amber-500/30">
              <Flame className="w-10 h-10" />
              {isAuthenticated && user && (
                <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-slate-900 border border-amber-400 text-[10px] font-black text-amber-300">
                  Cấp {user.cultivation_level || 1}
                </span>
              )}
            </div>

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                {isAuthenticated && user ? `Đạo Hữu: ${user.username}` : 'Chưa Khai Mở Linh Căn'}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {isAuthenticated && user
                  ? `${user.cultivation_realm || 'Luyện Khí'} Cảnh`
                  : 'Sơ Nhập Tiên Lộ'}
              </h2>

              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
                {isAuthenticated && user
                  ? `Điểm tu vi hiện tại: ${user.cultivation_exp || 0} EXP. Hãy tiếp tục nghe audio truyện để ngưng tụ linh lực, đột phá cảnh giới cao hơn!`
                  : 'Đăng nhập ngay để kích hoạt kinh mạch, tích lũy tu vi tự động khi nghe bất kỳ tập truyện nào trên hệ thống.'}
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => router.push('/settings')}
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs sm:text-sm shadow-lg shadow-amber-500/25 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Flame className="w-4 h-4" /> Động Phủ Của Ta
                </button>
                <button
                  onClick={() => router.push('/vip')}
                  className="px-5 py-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-750 text-amber-300 border border-amber-500/30 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2"
                >
                  <Crown className="w-4 h-4 text-amber-400" /> Nạp VIP (x2 Tu Vi)
                </button>
              </>
            ) : (
              <button
                onClick={() => router.push('/login')}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-sm shadow-xl shadow-amber-500/30 hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                Đăng Nhập Khai Mở Linh Căn <ArrowUpRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Tam Đại Pháp Môn Tăng Trưởng Tu Vi */}
      <div>
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
            <Zap className="w-4 h-4" />
            Bí Kíp Tu Chân
          </div>
          <h2 className="text-3xl font-black text-white">Tam Đại Pháp Môn Tăng Trưởng Tu Vi</h2>
          <p className="text-sm text-slate-400 mt-2">
            Ba phương thức chính giúp Đạo Hữu thăng hoa cảnh giới từ Luyện Khí phàm nhân tới Tiên Đế chí tôn.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Cách 1: Thính Âm Tụ Khí */}
          <div className="relative rounded-3xl border border-white/10 bg-slate-900/60 p-7 space-y-4 hover:border-amber-500/40 transition-all group">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/30 group-hover:scale-110 transition-transform">
              <Headphones className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white">1. Thính Âm Tụ Khí</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mỗi phút nghe truyện audio, kinh mạch tự động hấp thu linh khí trong thanh âm. Hệ thống cộng điểm Tu Vi trực tiếp:
            </p>
            <ul className="space-y-2 text-xs text-slate-300 font-mono">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                <span>Mỗi ping tiến độ: <strong>+5 EXP</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Hoàn thành 1 tập: <strong>+15 EXP</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                <span>Nghe đều đặn mỗi ngày để duy trì khí vận</span>
              </li>
            </ul>
          </div>

          {/* Cách 2: Phục Dụng Linh Đan VIP */}
          <div className="relative rounded-3xl border border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-slate-900/80 p-7 space-y-4 shadow-xl shadow-amber-500/5 group">
            <div className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/40 uppercase">
              Thần Tốc Nhất
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40 group-hover:scale-110 transition-transform">
              <Crown className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white">2. Phục Dụng Linh Đan VIP</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Nâng cấp gói Hội Viên VIP nhận ngay Đan Dược Đột Phá cấp tốc và hưởng tốc độ tu luyện siêu việt:
            </p>
            <ul className="space-y-2 text-xs text-slate-300 font-mono">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                <span>Hội Viên Đồng Đan: <strong>+1.500 EXP</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                <span>Hội Viên Kim Đan: <strong>+4.500 EXP</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                <span>Tiên Vương (1 năm): <strong>+18.250 EXP</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Tốc độ hấp thu linh khí: <strong>x2 (200%)</strong></span>
              </li>
            </ul>
          </div>

          {/* Cách 3: Đàm Đạo Luận Pháp */}
          <div className="relative rounded-3xl border border-white/10 bg-slate-900/60 p-7 space-y-4 hover:border-indigo-500/40 transition-all group">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 group-hover:scale-110 transition-transform">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white">3. Đàm Đạo Luận Pháp</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Giao lưu cùng chư vị đạo hữu, khai phá ngộ tính tâm linh qua các hoạt động tương tác cộng đồng:
            </p>
            <ul className="space-y-2 text-xs text-slate-300 font-mono">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                <span>Bình luận đàm đạo: <strong>+5 EXP</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                <span>Hỏi đáp cùng AI Đạo Hữu: <strong>+10 EXP</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                <span>Đánh giá 5 sao cho tác phẩm: <strong>+10 EXP</strong></span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 3. Máy Tính Dự Báo Đột Phá Tu Vi (Interactive Cultivation Calculator) */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 sm:p-8 backdrop-blur-xl">
        <div className="flex items-center gap-3 pb-6 border-b border-white/10">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">Linh Trận Dự Báo Đột Phá</h3>
            <p className="text-xs text-slate-400">Ước tính thời gian cần thiết để phi thăng theo cường độ nghe truyện của Đạo Hữu.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
          {/* Controls */}
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-300 mb-2">
                <span>Thời gian nghe audio mỗi ngày:</span>
                <span className="text-amber-400 font-mono text-sm">{hoursPerDay} Giờ / Ngày</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="8"
                step="0.5"
                value={hoursPerDay}
                onChange={(e) => setHoursPerDay(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>30 phút</span>
                <span>2 giờ</span>
                <span>4 giờ</span>
                <span>8 giờ (Đại Năng)</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/60 border border-white/5">
              <div>
                <p className="text-xs font-bold text-white">Sử Dụng Đan Dược Hội Viên VIP (x2 Tu Vi)</p>
                <p className="text-[11px] text-slate-400">Tăng gấp đôi tốc độ hấp thu linh khí trong lúc nghe truyện</p>
              </div>
              <input
                type="checkbox"
                checked={hasVip}
                onChange={(e) => setHasVip(e.target.checked)}
                className="h-5 w-5 rounded accent-amber-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Kết quả dự báo */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col justify-center">
              <p className="text-[10px] uppercase font-bold text-emerald-400 mb-1">Trúc Cơ ➔ Nguyên Anh</p>
              <p className="text-2xl font-black text-white font-mono">{daysToNguyenAnh} <span className="text-xs text-slate-400 font-normal">ngày</span></p>
              <p className="text-[10px] text-slate-400 mt-1">300 Điểm Tu Vi</p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col justify-center">
              <p className="text-[10px] uppercase font-bold text-amber-400 mb-1">Phi Thăng Đại Thừa</p>
              <p className="text-2xl font-black text-white font-mono">{daysToDaiThua} <span className="text-xs text-slate-400 font-normal">ngày</span></p>
              <p className="text-[10px] text-slate-400 mt-1">15.000 Điểm Tu Vi</p>
            </div>

            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex flex-col justify-center">
              <p className="text-[10px] uppercase font-bold text-purple-400 mb-1">Chấn Nhiếp Tiên Vương</p>
              <p className="text-2xl font-black text-white font-mono">{daysToTienVuong} <span className="text-xs text-slate-400 font-normal">ngày</span></p>
              <p className="text-[10px] text-slate-400 mt-1">700.000 Điểm Tu Vi</p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bản Đồ Chi Tiết 17 Cảnh Giới Tu Tiên */}
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
              <Layers className="w-4 h-4" />
              Lộ Trình Tu Tiên
            </div>
            <h2 className="text-3xl font-black text-white">Thập Thất Trọng Thiên (17 Cảnh Giới)</h2>
          </div>

          {/* Bộ lọc 3 tầng giới */}
          <div className="flex gap-1.5 p-1 rounded-xl bg-slate-900 border border-white/10 text-xs">
            <button
              onClick={() => setSelectedTier('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                selectedTier === 'all' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tất Cả (17)
            </button>
            <button
              onClick={() => setSelectedTier('pham')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                selectedTier === 'pham' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              Phàm Giới (7)
            </button>
            <button
              onClick={() => setSelectedTier('tien')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                selectedTier === 'tien' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tiên Giới (6)
            </button>
            <button
              onClick={() => setSelectedTier('chiton')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                selectedTier === 'chiton' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              Chí Tôn (4)
            </button>
          </div>
        </div>

        {/* Danh sách thẻ cảnh giới */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRealms.map((realm) => (
            <div
              key={realm.level}
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 p-5 hover:border-amber-500/40 transition-all group shadow-sm hover:shadow-xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl font-black text-sm shadow-md"
                    style={{
                      backgroundColor: `${realm.color}20`,
                      color: realm.color,
                      border: `1px solid ${realm.color}50`,
                    }}
                  >
                    {realm.level}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black text-white">{realm.name} Cảnh</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-white/5 text-slate-400 border border-white/10">
                        {realm.tierName}
                      </span>
                    </div>
                    <p className="text-xs text-amber-400 font-mono font-semibold mt-0.5">
                      {realm.max_exp === -1
                        ? '≥ 2.000.000 EXP'
                        : `${realm.min_exp.toLocaleString()} - ${realm.max_exp.toLocaleString()} EXP`}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mt-3.5 pb-3 border-b border-white/5">
                {realm.description}
              </p>

              <div className="mt-3 space-y-1.5 text-[11px]">
                <div className="flex items-start gap-1.5 text-slate-400">
                  <strong className="text-emerald-400 font-semibold flex-shrink-0">Thần Thông:</strong>
                  <span>{realm.ability}</span>
                </div>
                <div className="flex items-start gap-1.5 text-slate-400">
                  <strong className="text-amber-400 font-semibold flex-shrink-0">Đặc Quyền:</strong>
                  <span>{realm.privilege}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Câu Hỏi Thường Gặp (FAQ) */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-6 sm:p-10 space-y-6">
        <h3 className="text-2xl font-black text-white">Vấn Đạo Chư Cung (Câu Hỏi Thường Gặp)</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300">
          <div className="space-y-2 p-4 rounded-2xl bg-slate-800/40 border border-white/5">
            <h4 className="font-bold text-white text-sm">Tu vi có bị tụt khi tôi không nghe truyện không?</h4>
            <p className="text-slate-400 leading-relaxed">
              Hoàn toàn không. Một khi Đạo Hữu đã khổ tu đắc đạo, linh lực vĩnh viễn tồn lưu trong đan điền, cảnh giới không bao giờ bị thoái lui.
            </p>
          </div>

          <div className="space-y-2 p-4 rounded-2xl bg-slate-800/40 border border-white/5">
            <h4 className="font-bold text-white text-sm">Làm thế nào để hiển thị huy hiệu Cảnh Giới trong bình luận?</h4>
            <p className="text-slate-400 leading-relaxed">
              Hệ thống tự động đồng bộ huy hiệu cảnh giới ngay bên cạnh tên của bạn khi bạn để lại bình luận tại bất kỳ chương truyện nào.
            </p>
          </div>

          <div className="space-y-2 p-4 rounded-2xl bg-slate-800/40 border border-white/5">
            <h4 className="font-bold text-white text-sm">Cảnh giới Tiên Đế có giới hạn số lượng người không?</h4>
            <p className="text-slate-400 leading-relaxed">
              Bất kỳ Đạo Hữu nào đạt từ 2.000.000 điểm Tu Vi trở lên đều có thể đắc đạo Tiên Đế, cùng chư vị đại năng khác xưng bá cửu thiên thập địa.
            </p>
          </div>

          <div className="space-y-2 p-4 rounded-2xl bg-slate-800/40 border border-white/5">
            <h4 className="font-bold text-white text-sm">Nghe audio tăng tốc (1.5x, 2.0x) có được cộng đủ Tu Vi?</h4>
            <p className="text-slate-400 leading-relaxed">
              Có. Hệ thống tính điểm dựa trên số giây nội dung truyện Đạo Hữu đã tiếp thu, giúp việc vừa nghe nhanh vừa thăng cấp cảnh giới diễn ra mượt mà nhất.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
