import { api } from '@/lib/api';
import { BookOpen } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Thể Loại Truyện Audio Tiên Hiệp, Huyền Huyễn, Kiếm Hiệp',
  description: 'Khám phá hàng ngàn bộ truyện audio phân loại theo Tiên Hiệp, Huyền Huyễn, Trùng Sinh, Kiếm Hiệp, Đô Thị...',
};

const DEFAULT_CATEGORIES: Record<string, { icon: string; desc: string; count: number }> = {
  'tien-hiep': { icon: '⚔️', desc: 'Tu chân luyện khí, tầm tiên vấn đạo, nghịch thiên cải mệnh, ngự kiếm phi hành.', count: 48 },
  'huyen-huyen': { icon: '🔮', desc: 'Thế giới kỳ ảo dị giới, đấu khí ma pháp, linh hồn lực, thần thú dị bảo.', count: 35 },
  'kiem-hiep': { icon: '🗡️', desc: 'Giang hồ sóng gió, ân oán tình thù, hiệp khách hiệp nghĩa, chưởng môn danh phái.', count: 18 },
  'do-thi-tu-tien': { icon: '🏙️', desc: 'Tiên tôn trùng sinh nơi đô thị phồn hoa, trang bức đả kiểm, bảo vệ mỹ nhân.', count: 15 },
  'he-thong': { icon: '⚡', desc: 'Bàn tay vàng tối thượng, nhiệm vụ thăng cấp thần tốc chấn hưng tông môn.', count: 22 },
  'xuyen-khong': { icon: '🌀', desc: 'Linh hồn xuyên qua dị giới, dùng kiến thức hiện đại khuynh đảo càn khôn.', count: 19 },
  'trung-sinh': { icon: '⚡', desc: 'Sống lại một kiếp, mang theo ký ức kiếp trước chuyển mình trở thành bá chủ.', count: 24 },
  'khoa-huyen': { icon: '🚀', desc: 'Công nghệ tương lai, cơ giáp không gian, phi thuyền vũ trụ, biến dị gen.', count: 12 },
};

export default async function CategoriesPage() {
  const apiCategories = await api.getCategories();

  let categories = (apiCategories || []).map((c) => {
    const meta = DEFAULT_CATEGORIES[c.slug] || { icon: '📜', desc: c.description || 'Danh sách truyện audio hấp dẫn.', count: 10 };
    return {
      name: c.name,
      slug: c.slug,
      icon: meta.icon,
      desc: c.description || meta.desc,
      count: meta.count,
    };
  });

  if (categories.length === 0) {
    categories = Object.entries(DEFAULT_CATEGORIES).map(([slug, meta]) => ({
      name: slug.replace(/-/g, ' ').toUpperCase(),
      slug,
      icon: meta.icon,
      desc: meta.desc,
      count: meta.count,
    }));
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
      <div className="border-b border-white/10 pb-6">
        <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
          <BookOpen className="w-4 h-4 text-amber-400" />
          Phân Loại Tác Phẩm
        </div>
        <h1 className="text-3xl font-black text-white">Thể Loại Truyện Audio</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Lựa chọn cảnh giới và phong cách truyện yêu thích của Đạo Hữu.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => (
          <Link
            key={cat.slug}
            href={`/categories/${cat.slug}`}
            className="flex flex-col justify-between p-6 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-amber-500/50 hover:bg-slate-850 transition-all group"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl p-2.5 rounded-2xl bg-slate-800 border border-white/10">{cat.icon}</span>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  {cat.count} tác phẩm
                </span>
              </div>
              <h2 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">
                {cat.name}
              </h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                {cat.desc}
              </p>
            </div>

            <div className="mt-6 flex items-center gap-1 text-xs font-bold text-amber-400">
              Khám phá thể loại ➔
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
