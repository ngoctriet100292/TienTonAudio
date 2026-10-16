
import { FavoriteButton } from '@/components/favorite-button';
import { MediaImage } from '@/components/media-image';
import { ResumePlaybackWidget } from '@/components/resume-playback-widget';
import { CatalogueState } from '@/components/catalogue-state';
import { SoundOrbit } from '@/components/editorial';
import { StoryStatusBadge } from '@/components/story-status-badge';
import { api } from '@/lib/api';
import { Story } from '@/types';
import { BookOpen, ChevronRight, Crown, Flame, Headphones, MessageSquare, PenTool, Play, Sparkles, Star, Zap } from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = [
  { slug: '', name: 'Tất cả', icon: '✨' },
  { slug: 'tien-hiep', name: 'Tiên hiệp', icon: '⚔️' },
  { slug: 'huyen-huyen', name: 'Huyền huyễn', icon: '🔮' },
  { slug: 'trung-sinh', name: 'Trùng sinh', icon: '⚡' },
  { slug: 'kiem-hiep', name: 'Kiếm hiệp', icon: '🗡️' },
  { slug: 'do-thi-tu-tien', name: 'Đô thị tu tiên', icon: '🏙️' },
];

export const revalidate = 30;

export default async function HomePage() {
  let stories: Story[] = [];
  let unavailable = false;
  try {
    const [apiStories, topViewed] = await Promise.all([api.getStories(1, 12), api.getTopViewStories(12)]);
    stories = topViewed.length > 0 ? topViewed : apiStories;
  } catch { unavailable = true; }
  const heroStory = stories[0];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-14 pt-5 sm:pt-8">
      {/* 0. Widget Đang Nghe Dở / Tiếp Tục Tu Luyện (Nếu có phiên trước đó) */}
      <ResumePlaybackWidget />

      <section className="hero-spotlight relative overflow-hidden rounded-[28px] border border-white/10 px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
        <div className="relative grid items-center gap-10 md:grid-cols-[1.35fr_0.8fr] lg:gap-16">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2.5 text-xs font-medium tracking-[0.14em] text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              KHÔNG GIAN TRUYỆN & AUDIO
            </div>
            <h1 className="hero-title text-[36px] text-white sm:text-[48px] lg:text-[58px]">
              Mỗi câu chuyện,<br />
              <span className="gold-text">một thế giới để lắng nghe.</span>
            </h1>
            <p className="mt-6 max-w-xl text-sm leading-[1.85] text-slate-300 sm:text-base">
              Dành một khoảng thời gian cho riêng mình. Khám phá truyện tiên hiệp,
              đắm chìm trong giọng đọc yêu thích và tiếp tục câu chuyện ở bất cứ đâu.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={heroStory ? `/stories/${heroStory.slug}` : '/categories'} className="gold-gradient inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl px-6 text-sm font-semibold text-slate-950 shadow-lg shadow-black/15 transition-transform hover:-translate-y-0.5">
                <Play className="h-4 w-4 fill-current" />
                Bắt đầu lắng nghe
              </Link>
              <Link href="/categories" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.035] px-5 text-sm font-medium text-slate-200 transition-colors hover:border-white/25 hover:bg-white/[0.07]">
                Khám phá thư viện <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-2"><Headphones className="h-3.5 w-3.5 text-amber-300" /> Âm thanh 320kbps</span>
              <span className="inline-flex items-center gap-2"><BookOpen className="h-3.5 w-3.5 text-amber-300" /> Nghe và đọc cùng lúc</span>
            </div>
          </div>
          {heroStory ? <Link href={`/stories/${heroStory.slug}`} className="group relative mx-auto hidden w-full max-w-[260px] md:block lg:max-w-[280px]" aria-label={`Khám phá ${heroStory.title}`}>
            <div className="hero-cover relative aspect-[3/4] overflow-hidden rounded-[18px] border border-white/15 bg-slate-800">
              <MediaImage src={heroStory.cover_image_url} alt={heroStory.title} width={420} height={560} sizes="280px" preload className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent" />
              <span className="absolute left-4 top-4 rounded-full border border-white/20 bg-slate-950/65 px-3 py-1.5 text-[11px] font-medium text-amber-200 backdrop-blur-md">Lựa chọn hôm nay</span>
              <div className="absolute inset-x-5 bottom-5">
                <p className="mb-2 text-xs text-amber-200">{heroStory.author_name || 'Tiên Tôn Audio'}</p>
                <h2 className="text-lg font-semibold leading-relaxed text-white">{heroStory.title}</h2>
                <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-3 text-xs text-slate-300">
                  <span>{heroStory.total_chapters.toLocaleString('vi-VN')} chương</span>
                  <span className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" /> {heroStory.rating_avg.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </Link> : <div className="hidden md:block"><SoundOrbit /></div>}
        </div>
      </section>

      {/* 2. Category Filter Pills */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" />
            Tìm câu chuyện hợp với bạn
          </h2>
          <Link href="/categories" className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-semibold">
            Xem tất cả <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat, idx) => (
            <Link
              href={cat.slug ? `/categories/${cat.slug}` : '/categories'}
              key={cat.name}
              className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-2xl border text-xs font-semibold transition-all ${idx === 0
                  ? 'bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black border-transparent shadow-md shadow-amber-500/20'
                  : 'bg-slate-900/60 border-white/10 text-slate-300 hover:border-amber-500/40 hover:text-white'
                }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>

            </Link>
          ))}
        </div>
      </section>

      {/* 3. Được nghe nhiều nhất (Top Views Leaderboard) */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <Crown className="w-6 h-6 text-[#ffd166]" />
              Được nghe nhiều nhất
            </h2>
            <p className="text-xs text-slate-400 mt-1">Những câu chuyện được cộng đồng yêu thích</p>
          </div>
          <Link href="/rankings" className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-semibold">
            Xem bảng xếp hạng <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {stories.map((story, index) => {
            const rankBadges = [
              'bg-gradient-to-r from-amber-300 to-amber-500 text-black', // #1
              'bg-gradient-to-r from-slate-200 to-slate-400 text-black', // #2
              'bg-gradient-to-r from-orange-400 to-amber-700 text-white', // #3
            ];

            return (
              <Link
                key={story.id}
                href={`/stories/${story.slug}`}
                className="story-card group relative flex flex-col glass-card rounded-2xl overflow-hidden p-3"
              >
                {/* Ảnh bìa & Huy hiệu thứ hạng */}
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-slate-800">
                  <MediaImage
                    src={story.cover_image_url}
                    alt={story.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Rank Badge */}
                  <div className={`absolute top-2 left-2 px-2.5 py-0.5 rounded-lg text-xs font-black shadow-lg ${index < 3 ? rankBadges[index] : 'bg-black/80 text-white'}`}>
                    #{index + 1}
                  </div>

                  {/* Status Badge: Hoàn thành / Tạm ngưng / Còn tiếp */}
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

                {/* Tiêu đề & Tác giả */}
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
            );
          })}
        </div>
        {stories.length === 0 && <CatalogueState unavailable={unavailable} />}
      </section>

      {/* 4. Banner Nâng Cấp VIP & VietQR Tự Động */}
      <section className="feature-banner relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-r from-[#1c2438] via-[#0f172a] to-[#1a1528] p-8 sm:p-10 shadow-2xl shadow-amber-500/10 flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="space-y-3 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Crown className="w-3.5 h-3.5" />
            Hội Viên VIP Tiên Tôn
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Lắng nghe trọn vẹn. <span className="gold-text">Tận hưởng nhiều hơn.</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Khám phá các chương dành riêng cho hội viên và tích lũy Tu Vi trên hành trình lắng nghe. Gói VIP được kích hoạt sau khi thanh toán được xác nhận.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 flex-shrink-0">
          <Link
            href="/vip"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] hover:from-amber-400 hover:to-amber-500 text-black font-black px-6 py-3.5 shadow-xl shadow-amber-500/25 transition-all hover:scale-105"
          >
            <Zap className="w-4 h-4" />
            Khám phá gói VIP
          </Link>
          <Link
            href="/cultivation"
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-white/10 font-bold text-xs px-5 py-3.5 transition-all"
          >
            <Flame className="w-4 h-4 text-amber-400" />
            Hành trình Tu Vi
          </Link>
        </div>
      </section>

      {/* 5. Banner Kênh Đối Tác Sáng Tác Studio */}
      <section className="feature-banner rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-xl">
        <div className="space-y-3 max-w-xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-widest">
            <PenTool className="w-4 h-4" />
            Tiên Tôn Sáng Tác Đường
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Đạo Hữu Muốn Đăng Truyện & <span className="text-emerald-400">Audio 320kbps?</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Hệ thống Studio dành riêng cho Tác Giả và Giọng Đọc MC: Tải audio trực tiếp lên Cloudflare R2, quản lý tập truyện, thiết lập khóa VIP và theo dõi doanh thu thời gian thực.
          </p>
        </div>

        <Link
          href="/studio"
          className="flex-shrink-0 inline-flex items-center gap-2 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold px-6 py-3.5 shadow-lg shadow-emerald-500/10 transition-all hover:scale-105"
        >
          <PenTool className="w-4 h-4" />
          Vào Sáng Tác Studio
        </Link>
      </section>

      {/* 6. AI Đạo Hữu Banner */}
      <section className="feature-banner rounded-3xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900/80 p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-xl">
        <div className="space-y-3 max-w-xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 uppercase tracking-widest">
            <Sparkles className="w-4 h-4" />
            Trợ Lý AI Đạo Hữu
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Quên Cốt Truyện? <span className="text-indigo-400">Đã Có AI Giải Đáp!</span>
          </h2>
          <p className="text-sm text-slate-300">
            Hỏi đáp chi tiết diễn biến, tóm tắt cảnh giới tu vi, đếm số lượng hồng nhan tri kỷ của nhân vật chính trong tích tắc.
          </p>
        </div>

        <Link
          href="/ai"
          className="flex-shrink-0 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold px-6 py-3.5 shadow-lg shadow-indigo-500/25 transition-all hover:scale-105"
        >
          <MessageSquare className="w-4 h-4" />
          Đàm Đạo Với AI Đạo Hữu
        </Link>
      </section>
    </div>
  );
}
