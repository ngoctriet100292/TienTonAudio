
import { FavoriteButton } from '@/components/favorite-button';
import { MediaImage } from '@/components/media-image';
import { StoryStatusBadge } from '@/components/story-status-badge';
import { api } from '@/lib/api';
import { ArrowUpDown, Filter, Headphones, Search, Sparkles, Star } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Tìm Kiếm Truyện Tiên Hiệp Audio',
  description: 'Tìm kiếm hàng ngàn bộ truyện audio tiên hiệp, huyền huyễn, kiếm hiệp theo tên truyện, tác giả hoặc giọng đọc MC.',
};

interface Props {
  searchParams: Promise<{ q?: string; status?: string; sort?: string; narrator?:string; min_chapters?:string; min_minutes?:string }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const { q, status, sort, narrator, min_chapters, min_minutes } = await searchParams;
  const query = q || '';
  const currentStatus = status || '';
  const currentSort = sort || 'views';

  const filters = new URLSearchParams({q:query,status:currentStatus,sort:currentSort,narrator:narrator||'',min_chapters:min_chapters||'0',min_minutes:min_minutes||'0'});
  const results = await api.searchCatalogue(filters);

  const statusFilters: { label: string; value: string }[] = [
    { label: 'Tất cả trạng thái', value: '' },
    { label: 'Hoàn thành', value: 'completed' },
    { label: 'Còn tiếp', value: 'ongoing' },
    { label: 'Tạm ngưng', value: 'paused' },
  ];

  const sortOptions: { label: string; value: string }[] = [
    { label: 'Nghe nhiều nhất 🔥', value: 'views' },
    { label: 'Đánh giá cao nhất ⭐', value: 'rating' },
    { label: 'Nhiều chương nhất 📚', value: 'chapters' },
  ];

  const buildFilterUrl = (newStatus?: string, newSort?: string) => {
    const params = new URLSearchParams(filters);
    if (query) params.set('q', query);
    const s = newStatus !== undefined ? newStatus : currentStatus;
    if (s) params.set('status', s);
    const o = newSort !== undefined ? newSort : currentSort;
    if (o && o !== 'views') params.set('sort', o);
    return `/search?${params.toString()}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 space-y-8 pb-16">
      <div className="border-b border-white/10 pb-6 space-y-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
            <Search className="w-4 h-4 text-amber-400" />
            Kính Lúp Tìm Kiếm
          </div>
          <h1 className="text-3xl font-black text-white">
            {query ? `Kết quả tìm kiếm cho: "${query}"` : 'Khám Phá Toàn Bộ Kho Truyện'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Hiển thị tối đa 100 kết quả: <span className="text-amber-400 font-bold">{results.length}</span> tác phẩm phù hợp
          </p>
        </div>

        <form action="/search" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
 {[["q","Tên truyện / tác giả",query],["narrator","Giọng đọc",narrator||''],["min_chapters","Số chương tối thiểu",min_chapters||''],["min_minutes","Thời lượng tối thiểu (phút)",min_minutes||'']].map(([name,label,value])=><label className="text-sm text-slate-300" key={name}>{label}<input name={name} defaultValue={value} type={name.startsWith('min_')?'number':'text'} min={0} className="mt-1 w-full rounded-xl border border-white/15 bg-slate-950 p-3"/></label>)}
 <input type="hidden" name="status" value={currentStatus}/><input type="hidden" name="sort" value={currentSort}/><button className="rounded-xl bg-amber-400 px-4 py-2 font-semibold text-slate-950">Tìm kiếm</button>
 </form>
 {/* Thanh công cụ lọc & sắp xếp */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-white/5">
          {/* Bộ lọc trạng thái truyện */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5 mr-1">
              <Filter className="w-3.5 h-3.5 text-amber-400" />
              Trạng thái:
            </span>
            {statusFilters.map((f) => {
              const isActive = currentStatus === f.value;
              return (
                <Link
                  key={f.value}
                  href={buildFilterUrl(f.value, undefined)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${isActive
                      ? 'bg-amber-500 text-black border-amber-500 shadow-md shadow-amber-500/20'
                      : 'bg-slate-900/80 text-slate-300 border-white/10 hover:border-amber-500/40 hover:text-white'
                    }`}
                >
                  {f.label}
                </Link>
              );
            })}
          </div>

          {/* Bộ chọn sắp xếp */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5 mr-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
              Sắp xếp:
            </span>
            {sortOptions.map((opt) => {
              const isActive = currentSort === opt.value;
              return (
                <Link
                  key={opt.value}
                  href={buildFilterUrl(undefined, opt.value)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${isActive
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                      : 'bg-slate-900/60 text-slate-400 border-white/10 hover:border-white/20 hover:text-white'
                    }`}
                >
                  {opt.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl bg-slate-900/20 space-y-3">
          <Sparkles className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-slate-300 text-sm font-semibold">Không tìm thấy tác phẩm nào phù hợp</p>
          <p className="text-slate-500 text-xs">Hãy thử từ khóa khác hoặc thiết lập lại bộ lọc trạng thái</p>
          <Link href="/search" className="inline-block mt-3 text-xs font-bold text-amber-400 hover:underline">
            Xóa bộ lọc tìm kiếm
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {results.map((story) => (
            <Link
              key={story.id}
              href={`/stories/${story.slug}`}
              className="group flex flex-col glass-card rounded-2xl overflow-hidden p-3"
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-slate-800">
                {story.cover_image_url && (
                  <MediaImage
                    src={story.cover_image_url}
                    alt={story.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}

                {/* Status Badge */}
                <div className="absolute top-2 right-2">
                  <StoryStatusBadge status={story.status} size="sm" />
                </div>

                {/* Nút Yêu Thích Nhanh */}
                <div className="absolute bottom-2 left-2 z-10">
                  <FavoriteButton storyId={story.id} variant="icon" />
                </div>

                {/* Rating Badge */}
                <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/80 backdrop-blur-sm px-2 py-0.5 text-[11px] font-bold text-amber-400">
                  <Star className="h-3 w-3 fill-current text-amber-400" />
                  {story.rating_avg.toFixed(1)}
                </div>
              </div>

              <div className="pt-3 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white line-clamp-2 group-hover:text-amber-400 transition-colors leading-snug">
                    {story.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">{story.author_name}</p>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5 pt-2">
                  <span className="flex items-center gap-1">
                    <Headphones className="w-3 h-3 text-amber-400" />
                    {(story.view_count / 1000).toFixed(1)}k
                  </span>
                  <span>{story.total_chapters} tập</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
