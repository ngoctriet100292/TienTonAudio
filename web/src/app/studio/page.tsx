'use client';

import { MediaImage } from '@/components/media-image';

import { useAsyncResource } from '@/lib/use-async-resource';

import { getErrorMessage } from '@/lib/errors';

import { CultivationSpinner } from '@/components/cultivation-spinner';
import { StoryStatusBadge } from '@/components/story-status-badge';
import { useAuth } from '@/context/auth-context';
import { api, getFullAvatarUrl } from '@/lib/api';
import { formatAudioTime, parseYouTubeTimestamps } from '@/lib/timeline';
import { AudioTimelineMarker, Chapter, PartnerStats, PartnerStoryItem, StoryStatus } from '@/types';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Headphones,
  Lock,
  Music,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import Link from 'next/link';
import React, { useRef, useState } from 'react';

export default function StudioPage() {

  const { user, isAuthenticated, refreshProfile } = useAuth();

  const [becomingPartner, setBecomingPartner] = useState(false);

  // State Modal Tạo/Sửa Truyện
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<PartnerStoryItem | null>(null);
  const [storyTitle, setStoryTitle] = useState('');
  const [storyDesc, setStoryDesc] = useState('');
  const [storyCover, setStoryCover] = useState('');
  const [storyStatus, setStoryStatus] = useState<StoryStatus>('ongoing');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [submittingStory, setSubmittingStory] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // State Quản Lý Tập / Audio
  const [selectedStory, setSelectedStory] = useState<PartnerStoryItem | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [chapterModalOpen, setChapterModalOpen] = useState(false);

  // State Form Thêm Tập
  const [chNumber, setChNumber] = useState<number>(1);
  const [chTitle, setChTitle] = useState('');
  const [chContent, setChContent] = useState('');
  const [chAudioUrl, setChAudioUrl] = useState('');
  const [chIsPremium, setChIsPremium] = useState(false);
  const [chDuration, setChDuration] = useState<number>(0);
  const [chTimestamps, setChTimestamps] = useState('');
  const [parsedMarkers, setParsedMarkers] = useState<AudioTimelineMarker[]>([]);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadDetail, setUploadDetail] = useState<string>('');
  const [submittingChapter, setSubmittingChapter] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const txtFileInputRef = useRef<HTMLInputElement>(null);

  // State Gắn Audio Cho Tập Cũ
  const [attachModalOpen, setAttachModalOpen] = useState(false);
  const [attachTargetChapter, setAttachTargetChapter] = useState<Chapter | null>(null);
  const [attachAudioUrl, setAttachAudioUrl] = useState('');
  const [attachingAudio, setAttachingAudio] = useState(false);
  const [uploadingAttachAudio, setUploadingAttachAudio] = useState(false);
  const [attachUploadProgress, setAttachUploadProgress] = useState(0);
  const [attachUploadDetail, setAttachUploadDetail] = useState('');
  const attachAudioInputRef = useRef<HTMLInputElement>(null);

  const isPartnerOrAdmin =
    user?.role === 'partner' ||
    user?.role === 'creator' ||
    user?.role === 'narrator' ||
    user?.role === 'admin';

  const { data: studio, loading, error: studioError, reload: loadData } = useAsyncResource(
    isAuthenticated && isPartnerOrAdmin ? `studio:${user?.id}:${user?.role}` : null,
    async () => { const [stats, stories] = await Promise.all([api.getPartnerStats(), api.getPartnerStories()]); return { stats, stories }; },
    { stats: { total_stories: 0, total_chapters: 0, total_views: 0, total_listens: 0, is_admin: false } as PartnerStats, stories: [] as PartnerStoryItem[] }
  );
  const { stats, stories } = studio;

  // Đăng ký làm đối tác
  const handleBecomePartner = async () => {
    setBecomingPartner(true);
    try {
      await api.becomePartner();
      if (refreshProfile) await refreshProfile();
      await loadData();
    } catch (err: unknown) {
      alert(getErrorMessage(err) || 'Không thể đăng ký đối tác');
    } finally {
      setBecomingPartner(false);
    }
  };

  // Mở modal tạo truyện
  const handleOpenCreateStory = () => {
    setEditingStory(null);
    setStoryTitle('');
    setStoryDesc('');
    setStoryCover('');
    setStoryStatus('ongoing');
    setStoryModalOpen(true);
  };

  // Mở modal sửa truyện
  const handleOpenEditStory = (s: PartnerStoryItem) => {
    setEditingStory(s);
    setStoryTitle(s.title);
    setStoryDesc(s.description || '');
    setStoryCover(s.cover_image_url || '');
    setStoryStatus(s.status);
    setStoryModalOpen(true);
  };

  // Tải ảnh bìa truyện lên R2
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const url = await api.uploadPartnerCover(file);
      setStoryCover(url);
    } catch (err: unknown) {
      alert(getErrorMessage(err) || 'Lỗi tải ảnh bìa lên Cloudflare R2');
    } finally {
      setUploadingCover(false);
    }
  };

  // Gửi tạo / sửa truyện
  const handleSaveStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyTitle.trim()) {
      alert('Vui lòng nhập tên truyện');
      return;
    }
    setSubmittingStory(true);
    try {
      if (editingStory) {
        await api.updatePartnerStory(editingStory.id, {
          title: storyTitle,
          description: storyDesc,
          cover_image_url: storyCover,
          status: storyStatus,
        });
      } else {
        await api.createPartnerStory({
          title: storyTitle,
          description: storyDesc,
          cover_image_url: storyCover,
          status: storyStatus,
        });
      }
      setStoryModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      alert(getErrorMessage(err) || 'Lỗi lưu thông tin truyện');
    } finally {
      setSubmittingStory(false);
    }
  };

  // Xóa truyện
  const handleDeleteStory = async (id: string, title: string) => {
    if (!confirm(`Đạo hữu có chắc chắn muốn xóa tác phẩm "${title}"?`)) return;
    try {
      await api.deletePartnerStory(id);
      if (selectedStory?.id === id) setSelectedStory(null);
      await loadData();
    } catch (err: unknown) {
      alert(getErrorMessage(err) || 'Lỗi xóa truyện');
    }
  };

  // Mở quản lý tập của truyện
  const handleSelectStory = async (s: PartnerStoryItem) => {
    setSelectedStory(s);
    setLoadingChapters(true);
    try {
      const chList = await api.getPartnerStoryChapters(s.id);
      setChapters(chList);
    } catch {
      setChapters([]);
    } finally {
      setLoadingChapters(false);
    }
  };

  // Mở modal thêm tập
  const handleOpenCreateChapter = () => {
    const nextNum = chapters.length > 0 ? Math.max(...chapters.map((c) => c.chapter_number)) + 1 : 1;
    setChNumber(nextNum);
    setChTitle(`Chương ${nextNum}`);
    setChContent('');
    setChAudioUrl('');
    setChIsPremium(false);
    setChDuration(0);
    setChTimestamps('');
    setParsedMarkers([]);
    setChapterModalOpen(true);
  };

  // Tải file audio lên R2
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Đo thời lượng an toàn trong background
    try {
      const objUrl = URL.createObjectURL(file);
      const audioEl = new Audio();
      audioEl.onloadedmetadata = () => {
        if (!isNaN(audioEl.duration) && audioEl.duration > 0) {
          setChDuration(Math.round(audioEl.duration));
        }
        URL.revokeObjectURL(objUrl);
      };
      audioEl.onerror = () => {
        URL.revokeObjectURL(objUrl);
      };
      audioEl.src = objUrl;
    } catch {
      // Bỏ qua nếu môi trường trình duyệt không hỗ trợ đo trước
    }

    setUploadingAudio(true);
    setUploadProgress(0);
    setUploadDetail('Đang khởi tạo kết nối...');
    try {
      const url = await api.uploadPartnerAudio(file, (percent, loaded, total) => {
        setUploadProgress(percent);
        const loadedMB = (loaded / (1024 * 1024)).toFixed(1);
        const totalMB = (total / (1024 * 1024)).toFixed(1);
        setUploadDetail(`${loadedMB} MB / ${totalMB} MB (${percent}%)`);
      });
      setChAudioUrl(url);
      setUploadDetail('');
    } catch (err: unknown) {
      alert(getErrorMessage(err) || 'Lỗi tải audio lên Cloudflare R2');
    } finally {
      setUploadingAudio(false);
      setUploadProgress(0);
    }
  };

  // Đọc nội dung file .txt vào textarea
  const handleTxtFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) setChContent(text);
    };
    reader.readAsText(file, 'utf-8');
  };

  // Gửi tạo tập mới
  const handleSaveChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStory) return;
    if (!chTitle.trim()) {
      alert('Vui lòng nhập tên chương');
      return;
    }
    setSubmittingChapter(true);
    try {
      await api.createPartnerChapter(selectedStory.id, {
        chapter_number: chNumber,
        title: chTitle,
        content: chContent,
        is_premium: chIsPremium,
        audio_url: chAudioUrl,
        duration_seconds: chDuration,
        timeline_markers: parsedMarkers,
        raw_timestamps: chTimestamps,
      });
      setChapterModalOpen(false);
      // Tải lại danh sách chương
      const chList = await api.getPartnerStoryChapters(selectedStory.id);
      setChapters(chList);
      await loadData();
    } catch (err: unknown) {
      alert(getErrorMessage(err) || 'Lỗi thêm chương');
    } finally {
      setSubmittingChapter(false);
    }
  };

  // Mở modal gắn audio vào tập đã có
  const handleOpenAttachAudio = (ch: Chapter) => {
    setAttachTargetChapter(ch);
    setAttachAudioUrl('');
    setAttachUploadProgress(0);
    setAttachUploadDetail('');
    setAttachModalOpen(true);
  };

  // Tải file MP3 lên R2 cho tập đã có
  const handleUploadForAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAttachAudio(true);
    setAttachUploadProgress(0);
    setAttachUploadDetail('Đang khởi tạo kết nối...');
    try {
      const url = await api.uploadPartnerAudio(file, (percent, loaded, total) => {
        setAttachUploadProgress(percent);
        const loadedMB = (loaded / (1024 * 1024)).toFixed(1);
        const totalMB = (total / (1024 * 1024)).toFixed(1);
        setAttachUploadDetail(`${loadedMB} MB / ${totalMB} MB (${percent}%)`);
      });
      setAttachAudioUrl(url);
      setAttachUploadDetail('');
    } catch (err: unknown) {
      alert(getErrorMessage(err) || 'Lỗi tải audio lên Cloudflare R2');
    } finally {
      setUploadingAttachAudio(false);
      setAttachUploadProgress(0);
    }
  };

  // Lưu audio vào DB cho tập đã có
  const handleSaveAttachAudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachTargetChapter || !attachAudioUrl.trim()) {
      alert('Vui lòng nhập hoặc tải file audio');
      return;
    }

    setAttachingAudio(true);
    try {
      await api.attachPartnerChapterAudio(attachTargetChapter.id, attachAudioUrl.trim());
      alert('Đã gắn file audio vào tập thành công! Bây giờ bạn có thể nghe thử trên web.');
      setAttachModalOpen(false);
      if (selectedStory) {
        const chList = await api.getPartnerStoryChapters(selectedStory.id);
        setChapters(chList);
      }
    } catch (err: unknown) {
      alert(getErrorMessage(err) || 'Lỗi gắn audio vào chương');
    } finally {
      setAttachingAudio(false);
    }
  };

  // Xóa tập
  const handleDeleteChapter = async (id: string, title: string) => {
    if (!confirm(`Đạo hữu có chắc chắn muốn xóa tập "${title}"?`)) return;
    try {
      await api.deletePartnerChapter(id);
      if (selectedStory) {
        const chList = await api.getPartnerStoryChapters(selectedStory.id);
        setChapters(chList);
      }
      await loadData();
    } catch (err: unknown) {
      alert(getErrorMessage(err) || 'Lỗi xóa tập');
    }
  };



  if (!isAuthenticated) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4">
        <div className="motion-card max-w-md w-full text-center p-8 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl space-y-4">
          <Sparkles className="w-12 h-12 text-[#ffd166] mx-auto" />
          <h2 className="text-2xl font-black text-white">Tiên Tôn Sáng Tác Đường</h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Đạo hữu vui lòng đăng nhập tài khoản để vào Kênh Đối Tác Sáng Tác và Quản Lý Truyện Audio.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full py-3 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-sm shadow-lg shadow-amber-500/25 hover:scale-105 transition-all"
          >
            Đăng Nhập Ngay
          </Link>
        </div>
      </div>
    );
  }

  // Nếu user là tài khoản thường ('user') -> Hiện trang đăng ký làm đối tác
  if (!isPartnerOrAdmin) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-12 pb-20 space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Gia Nhập Tiên Tôn Sáng Tác Đường
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">
            Trở Thành <span className="gold-text">Đối Tác Sáng Tác & MC Audio</span>
          </h1>
          <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            Đăng tải các bộ truyện tiên hiệp, huyền huyễn độc quyền và xuất bản các tập audio 320kbps đến hàng vạn Đạo Hữu khắp cửu giới.
          </p>
        </div>

        {/* 3 Lợi ích nổi bật */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Đăng Truyện & Audio</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tải file âm thanh 320kbps trực tiếp lên Cloudflare R2 tốc độ cao, nhập nội dung chữ và cập nhật chương không giới hạn.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Đặc Quyền Khóa VIP</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Chủ động thiết lập chương miễn phí hoặc chương VIP để nhận thù lao linh thạch xứng đáng với công sức sáng tác.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Headphones className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Thống Kê Thời Gian Thực</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Theo dõi chi tiết số lượt nghe audio, số độc giả yêu thích và tương tác đàm đạo của từng tập truyện.
            </p>
          </div>
        </div>

        {/* Nút bấm Đăng Ký */}
        <div className="text-center pt-4">
          <button
            onClick={handleBecomePartner}
            disabled={becomingPartner}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#ffd166] via-[#ffb703] to-amber-600 text-black font-black text-sm sm:text-base shadow-xl shadow-amber-500/25 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
          >
            {becomingPartner ? (
              <CultivationSpinner size="xs" text="Đang khai mở tiên phủ..." showText={true} />
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Khai Mở Tiên Phủ • Kích Hoạt Quyền Đối Tác
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Dashboard Đối Tác Đã Kích Hoạt
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 pb-20 space-y-8">
      {studioError != null && <div role="alert" className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-5 text-sm text-rose-300"><p>Chưa thể tải dữ liệu Studio. Vui lòng kiểm tra kết nối và thử lại.</p><button type="button" onClick={loadData} className="mt-3 font-semibold underline">Tải lại dữ liệu</button></div>}
      {/* Header Studio */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Tiên Tôn Sáng Tác Đường • Kênh Đối Tác</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
            Studio Quản Lý Tác Phẩm
          </h1><nav className="flex flex-wrap gap-3 mt-3 text-sm text-amber-300"><Link href="/studio/publications">Xuất bản & bản nháp</Link><Link href="/studio/analytics">Thống kê tác phẩm</Link></nav>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Đăng truyện, xuất bản audio 320kbps lên Cloudflare R2 và theo dõi tương tác độc giả.
          </p>
        </div>

        <button
          onClick={handleOpenCreateStory}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          Đăng Tác Phẩm Mới
        </button>
      </div>

      {/* 4 Thẻ Thống Kê Tổng Quan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-white/10 flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex-shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Tác Phẩm Đã Đăng</p>
            <h3 className="text-xl sm:text-2xl font-black text-white mt-0.5">
              {stats.total_stories}
            </h3>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-white/10 flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex-shrink-0">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Tập Audio Đã Ra</p>
            <h3 className="text-xl sm:text-2xl font-black text-white mt-0.5">
              {stats.total_chapters}
            </h3>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-white/10 flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex-shrink-0">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Tổng Lượt Nghe</p>
            <h3 className="text-xl sm:text-2xl font-black text-white mt-0.5">
              {stats.total_listens >= 1000 ? `${(stats.total_listens / 1000).toFixed(1)}k` : stats.total_listens}
            </h3>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-white/10 flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex-shrink-0">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Tổng Lượt Đọc</p>
            <h3 className="text-xl sm:text-2xl font-black text-white mt-0.5">
              {stats.total_views >= 1000 ? `${(stats.total_views / 1000).toFixed(1)}k` : stats.total_views}
            </h3>
          </div>
        </div>
      </div>

      {/* Main Studio View: Danh Sách Truyện & Quản Lý Tập */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Cột Trái: Danh Sách Tác Phẩm */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              Tác Phẩm Của Tôi ({stories.length})
            </h2>
          </div>

          {loading ? (
            <CultivationSpinner size="md" text="Đang nạp danh sách tác phẩm..." />
          ) : stories.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-white/10 bg-slate-900/20 space-y-3">
              <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">Đạo hữu chưa đăng tác phẩm nào</p>
              <p className="text-xs text-slate-500">Hãy nhấn &quot;Đăng Tác Phẩm Mới&quot; để bắt đầu sáng tác.</p>
              <button
                onClick={handleOpenCreateStory}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/20 text-[#ffd166] border border-amber-500/40 text-xs font-bold hover:bg-amber-500/30 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Bắt Đầu Ngay
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {stories.map((s) => {
                const isSelected = selectedStory?.id === s.id;
                return (
                  <div
                    key={s.id}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${isSelected
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/10'
                        : 'bg-slate-900/60 border-white/10 hover:border-white/20'
                      }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-16 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-slate-800 border border-white/10">
                        {s.cover_image_url ? (
                          <MediaImage
                            src={getFullAvatarUrl(s.cover_image_url)}
                            alt={s.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                            No Pic
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-white truncate">{s.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <StoryStatusBadge status={s.status} size="sm" />
                          <span className="text-[11px] text-slate-400 font-mono">
                            {s.total_chapters} tập
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1.5 font-mono">
                          <span className="flex items-center gap-1">
                            <Headphones className="w-3 h-3 text-amber-400" />
                            {s.view_count}
                          </span>
                          <span>Cập nhật: {new Date(s.updated_at).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleSelectStory(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${isSelected
                            ? 'bg-amber-500 text-black border-amber-500'
                            : 'bg-slate-800 text-slate-300 border-white/10 hover:bg-slate-700 hover:text-white'
                          }`}
                      >
                        Quản Lý Tập
                      </button>
                      <button
                        onClick={() => handleOpenEditStory(s)}
                        className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                        title="Chỉnh sửa thông tin"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteStory(s.id, s.title)}
                        className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 transition-colors"
                        title="Xóa tác phẩm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cột Phải: Quản Lý Các Tập Của Truyện Đã Chọn */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Headphones className="w-4 h-4 text-amber-400" />
              {selectedStory ? `Tập Audio • ${selectedStory.title}` : 'Danh Sách Tập Audio'}
            </h2>

            {selectedStory && (
              <button
                onClick={handleOpenCreateChapter}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-[#ffd166] border border-amber-500/40 text-xs font-bold hover:bg-amber-500/30 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm Tập Mới
              </button>
            )}
          </div>

          {!selectedStory ? (
            <div className="py-16 px-4 text-center rounded-2xl border border-dashed border-white/10 bg-slate-900/20 space-y-2">
              <Music className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">Chưa chọn tác phẩm nào</p>
              <p className="text-xs text-slate-500">
                Hãy nhấn nút &quot;Quản Lý Tập&quot; ở cột bên trái để xem và đăng audio cho từng chương.
              </p>
            </div>
          ) : loadingChapters ? (
            <CultivationSpinner size="md" text="Đang tải danh sách tập..." />
          ) : chapters.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-white/10 bg-slate-900/20 space-y-3">
              <Music className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">Tác phẩm này chưa có tập nào</p>
              <button
                onClick={handleOpenCreateChapter}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs shadow-md shadow-amber-500/20"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm Tập Đầu Tiên
              </button>
            </div>
          ) : (
            <div className="max-h-[550px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {chapters.map((ch) => (
                <div
                  key={ch.id}
                  className="p-3 rounded-xl bg-slate-900/60 border border-white/10 flex items-center justify-between gap-3 hover:border-white/20 transition-all"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-amber-400">
                        Tập {ch.chapter_number}
                      </span>
                      <h4 className="text-xs font-semibold text-white truncate">{ch.title}</h4>
                      {ch.is_premium && (
                        <span className="flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <Lock className="w-2.5 h-2.5" /> VIP
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 font-mono">
                      <span>Lượt nghe: {ch.listen_count}</span>
                      {ch.duration_seconds > 0 && (
                        <span>{formatAudioTime(ch.duration_seconds)}</span>
                      )}
                      {ch.timeline_markers && ch.timeline_markers.length > 0 && (
                        <span className="text-amber-400 font-bold flex items-center gap-0.5 bg-amber-500/15 px-1.5 py-0.2 rounded border border-amber-500/25">
                          <Clock className="w-2.5 h-2.5" /> {ch.timeline_markers.length} mốc timeline
                        </span>
                      )}
                      <span>{new Date(ch.created_at).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleOpenAttachAudio(ch)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors"
                      title="Gắn file audio vào tập này"
                    >
                      <Music className="w-3 h-3" /> Gắn Audio R2
                    </button>
                    <Link
                      href={`/stories/${selectedStory.slug}/chapters/${ch.id}`}
                      target="_blank"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                      title="Nghe thử trên web"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => handleDeleteChapter(ch.id, ch.title)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      title="Xóa tập này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Đăng / Chỉnh Sửa Truyện */}
      {storyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in-0">
          <div className="relative w-full max-w-lg rounded-3xl border border-white/15 bg-[#0f172a] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                {editingStory ? 'Chỉnh Sửa Tác Phẩm' : 'Đăng Tác Phẩm Mới'}
              </h3>
              <button
                onClick={() => setStoryModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStory} className="space-y-4 text-xs">
              {/* Tên truyện */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold">Tên tác phẩm *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Cửu Tinh Bá Thể Quyết"
                  value={storyTitle}
                  onChange={(e) => setStoryTitle(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3.5 py-2.5 text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              {/* Ảnh bìa & Nút Tải Lên R2 */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold">Ảnh bìa tác phẩm (Cloudflare R2)</label>
                <div className="flex items-center gap-3">
                  <div className="h-16 w-12 rounded-xl bg-slate-800 border border-white/10 overflow-hidden flex-shrink-0">
                    {storyCover ? (
                      <MediaImage
                        src={getFullAvatarUrl(storyCover)}
                        alt="Cover Preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[11px] text-slate-500">
                        Chưa có
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={coverInputRef}
                    accept="image/*"
                    onChange={handleCoverUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={uploadingCover}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 font-semibold"
                  >
                    {uploadingCover ? (
                      <CultivationSpinner size="xs" text="Đang tải R2..." showText={true} />
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        Tải Ảnh Bìa Lên R2
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Trạng thái */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold">Trạng thái phát hành</label>
                <select
                  value={storyStatus}
                  onChange={(e) => setStoryStatus(e.target.value as StoryStatus)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="ongoing">Còn tiếp (Đang ra chương)</option>
                  <option value="completed">Hoàn thành (Đã kết thúc)</option>
                  <option value="paused">Tạm ngưng</option>
                </select>
              </div>

              {/* Tóm tắt */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold">Mô tả tóm tắt nội dung</label>
                <textarea
                  rows={4}
                  placeholder="Giới thiệu đôi nét về bối cảnh, nhân vật chính, pháp bảo..."
                  value={storyDesc}
                  onChange={(e) => setStoryDesc(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 p-3 text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setStoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingStory || uploadingCover}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {submittingStory ? 'Đang lưu...' : editingStory ? 'Lưu Thay Đổi' : 'Xuất Bản Truyện'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thêm Tập & Audio Mới */}
      {chapterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in-0">
          <div className="relative w-full max-w-xl rounded-3xl border border-white/15 bg-[#0f172a] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Headphones className="w-5 h-5 text-amber-400" />
                Thêm Tập Audio Mới
              </h3>
              <button
                onClick={() => setChapterModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveChapter} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">Số tập *</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={chNumber}
                    onChange={(e) => setChNumber(parseFloat(e.target.value) || 1)}
                    className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-slate-300 font-bold">Tiêu đề tập *</label>
                  <input
                    type="text"
                    required
                    value={chTitle}
                    onChange={(e) => setChTitle(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Tải file Audio lên R2 */}
              <div className="space-y-1 p-3 rounded-2xl bg-slate-900/80 border border-white/10">
                <label className="text-slate-200 font-bold flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-amber-400" />
                  File Audio 320kbps (Cloudflare R2)
                </label>
                <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
                  <input
                    type="file"
                    ref={audioInputRef}
                    accept="audio/*,.mp3,.m4a,.wav"
                    onChange={handleAudioUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => audioInputRef.current?.click()}
                    disabled={uploadingAudio}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/20 text-[#ffd166] border border-amber-500/40 font-bold hover:bg-amber-500/30 transition-all"
                  >
                    {uploadingAudio ? (
                      <CultivationSpinner size="xs" text="Đang tải R2..." showText={true} />
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        Tải File Audio Lên R2
                      </>
                    )}
                  </button>
                  {chAudioUrl && (
                    <span className="text-[11px] text-emerald-400 font-mono truncate max-w-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                      Đã tải lên R2 thành công
                    </span>
                  )}
                </div>

                {uploadingAudio && (
                  <div className="w-full mt-3 p-3 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-1.5 animate-in fade-in-50">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-amber-300 flex items-center gap-1.5">
                        <Upload className="w-3 h-3 animate-bounce text-amber-400" />
                        Đang truyền tải tệp audio lên Cloudflare R2...
                      </span>
                      <span className="font-mono font-black text-amber-400">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-white/10">
                      <div
                        className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 h-2 rounded-full transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
                      <span>{uploadDetail || 'Đang gửi gói tin...'}</span>
                      <span>Vui lòng không tắt trình duyệt</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Tải file text hoặc dán nội dung chữ */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Nội dung truyện chữ (tùy chọn)
                  </label>
                  <input
                    type="file"
                    ref={txtFileInputRef}
                    accept=".txt"
                    onChange={handleTxtFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => txtFileInputRef.current?.click()}
                    className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <Upload className="w-2.5 h-2.5" /> Tải file .txt lên
                  </button>
                </div>
                <textarea
                  rows={3}
                  placeholder="Dán nội dung chữ của chương để độc giả vừa nghe vừa đọc..."
                  value={chContent}
                  onChange={(e) => setChContent(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 p-3 text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none resize-none leading-relaxed"
                />
              </div>

              {/* Mốc thời gian phân đoạn (YouTube Timestamps cho audio dài 5h-10h) */}
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-900/90 border border-amber-500/30">
                <div className="flex items-center justify-between">
                  <label className="text-slate-200 font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Mốc Thời Gian / Phân Đoạn (YouTube Timestamps)
                  </label>
                  {parsedMarkers.length > 0 && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                      {parsedMarkers.length} mốc đã nhận
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Dành cho file audio dài (3h, 5h, 10h). Dán danh sách như mô tả YouTube để người nghe click chuyển nhanh:
                </p>
                <textarea
                  rows={3}
                  placeholder={`00:00 Mở đầu: Xuất thế\n15:30 Bí cảnh Vô Lượng\n01:15:20 Đột phá Luyện Khí\n03:45:00 Đại chiến Hắc Ma Tông`}
                  value={chTimestamps}
                  onChange={(e) => {
                    const val = e.target.value;
                    setChTimestamps(val);
                    setParsedMarkers(parseYouTubeTimestamps(val));
                  }}
                  className="w-full rounded-xl bg-slate-950 border border-white/10 p-2.5 text-white font-mono placeholder-slate-600 focus:border-amber-400 focus:outline-none resize-none leading-relaxed text-[11px]"
                />
                {parsedMarkers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1 max-h-24 overflow-y-auto">
                    {parsedMarkers.slice(0, 6).map((m, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/10 flex items-center gap-1"
                      >
                        <span className="text-amber-400 font-mono font-bold">
                          {formatAudioTime(m.start_seconds)}
                        </span>
                        <span className="truncate max-w-[130px]">{m.title}</span>
                      </span>
                    ))}
                    {parsedMarkers.length > 6 && (
                      <span className="text-[11px] text-slate-400 px-1 py-0.5 font-mono">
                        +{parsedMarkers.length - 6} mốc khác...
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Khóa VIP */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-white/10 cursor-pointer">
                <input
                  type="checkbox"
                  checked={chIsPremium}
                  onChange={(e) => setChIsPremium(e.target.checked)}
                  className="h-4 w-4 rounded accent-amber-500"
                />
                <div>
                  <span className="text-xs font-bold text-white flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-400" />
                    Khóa VIP (Chỉ hội viên VIP mới được nghe)
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Hội viên VIP sẽ tiêu hao linh thạch để nghe tập này, doanh thu chia sẻ cho tác giả.
                  </p>
                </div>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setChapterModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingChapter || uploadingAudio}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {submittingChapter ? 'Đang xuất bản...' : 'Xuất Bản Tập Audio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gắn Audio Cho Tập Đã Có */}
      {attachModalOpen && attachTargetChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in-0">
          <div className="relative w-full max-w-lg rounded-3xl border border-white/15 bg-[#0f172a] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Music className="w-5 h-5 text-amber-400" />
                Gắn File Audio Cho Tập {attachTargetChapter.chapter_number}
              </h3>
              <button
                onClick={() => setAttachModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAttachAudio} className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/10 space-y-1">
                <p className="text-white font-bold">{attachTargetChapter.title}</p>
                <p className="text-[11px] text-slate-400">
                  Đạo hữu có thể dán đường dẫn R2 đã tải lên trước đó hoặc chọn file MP3 để hệ thống tự động tải lên và lưu vào cơ sở dữ liệu.
                </p>
              </div>

              {/* Tải file Audio mới lên R2 */}
              <div className="space-y-1 p-3 rounded-2xl bg-slate-900/80 border border-white/10">
                <label className="text-slate-200 font-bold flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  Tải file MP3 lên Cloudflare R2
                </label>
                <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
                  <input
                    type="file"
                    ref={attachAudioInputRef}
                    accept="audio/*,.mp3,.m4a,.wav"
                    onChange={handleUploadForAttach}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => attachAudioInputRef.current?.click()}
                    disabled={uploadingAttachAudio}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/20 text-[#ffd166] border border-amber-500/40 font-bold hover:bg-amber-500/30 transition-all"
                  >
                    {uploadingAttachAudio ? (
                      <CultivationSpinner size="xs" text="Đang tải R2..." showText={true} />
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        Chọn File Audio MP3
                      </>
                    )}
                  </button>
                  {attachAudioUrl && (
                    <span className="text-[11px] text-emerald-400 font-mono truncate max-w-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                      Đã có link audio sẵn sàng
                    </span>
                  )}
                </div>

                {uploadingAttachAudio && (
                  <div className="w-full mt-3 p-3 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-1.5 animate-in fade-in-50">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-amber-300 flex items-center gap-1.5">
                        <Upload className="w-3 h-3 animate-bounce text-amber-400" />
                        Đang truyền tải tệp audio lên Cloudflare R2...
                      </span>
                      <span className="font-mono font-black text-amber-400">{attachUploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-white/10">
                      <div
                        className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 h-2 rounded-full transition-all duration-200"
                        style={{ width: `${attachUploadProgress}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
                      <span>{attachUploadDetail || 'Đang gửi gói tin...'}</span>
                      <span>Vui lòng không tắt trình duyệt</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Nhập hoặc chỉnh sửa URL */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold">Hoặc dán trực tiếp Audio URL (R2 / CDN):</label>
                <input
                  type="text"
                  required
                  placeholder="https://pub-xxxxxx.r2.dev/stories/audio/xxx.mp3"
                  value={attachAudioUrl}
                  onChange={(e) => setAttachAudioUrl(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setAttachModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={attachingAudio || !attachAudioUrl.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {attachingAudio ? 'Đang Lưu...' : 'Lưu File Audio Cho Tập Này'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
