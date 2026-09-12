'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bookmark,
  Heart,
  History,
  ListMusic,
  Plus,
  Play,
  Trash2,
  BookOpen,
  Headphones,
  User,
  Mic,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FolderPlus,
  X,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useAudio } from '@/context/audio-context';
import { api, getFullAvatarUrl } from '@/lib/api';
import {
  FavoriteStoryItem,
  ListeningHistoryItem,
  Playlist,
  PlaylistDetail,
  FollowedAuthor,
  FollowedNarrator,
  Story,
  Chapter,
} from '@/types';
import { CultivationSpinner } from '@/components/cultivation-spinner';

export default function LibraryPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { playChapter } = useAudio();

  const [activeTab, setActiveTab] = useState<'favorites' | 'history' | 'playlists' | 'following'>('favorites');

  // Favorites state
  const [favorites, setFavorites] = useState<FavoriteStoryItem[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);

  // History state
  const [history, setHistory] = useState<ListeningHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Playlists state
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);

  // Following state
  const [followedAuthors, setFollowedAuthors] = useState<FollowedAuthor[]>([]);
  const [followedNarrators, setFollowedNarrators] = useState<FollowedNarrator[]>([]);
  const [followingLoading, setFollowingLoading] = useState(false);

  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirect=/library');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    if (activeTab === 'favorites') {
      loadFavorites();
    } else if (activeTab === 'history') {
      loadHistory();
    } else if (activeTab === 'playlists') {
      loadPlaylists();
    } else if (activeTab === 'following') {
      loadFollowing();
    }
  }, [activeTab, isAuthenticated]);

  const loadFavorites = async () => {
    setFavoritesLoading(true);
    try {
      const data = await api.getUserFavorites();
      setFavorites(data || []);
    } catch {
      // Fallback
    } finally {
      setFavoritesLoading(false);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await api.getUserHistory();
      setHistory(data || []);
    } catch {
      // Fallback
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadPlaylists = async () => {
    setPlaylistsLoading(true);
    try {
      const data = await api.getUserPlaylists();
      setPlaylists(data || []);
    } catch {
      // Fallback
    } finally {
      setPlaylistsLoading(false);
    }
  };

  const loadFollowing = async () => {
    setFollowingLoading(true);
    try {
      const [authors, narrators] = await Promise.all([
        api.getFollowedAuthors(),
        api.getFollowedNarrators(),
      ]);
      setFollowedAuthors(authors || []);
      setFollowedNarrators(narrators || []);
    } catch {
      // Fallback
    } finally {
      setFollowingLoading(false);
    }
  };

  const handleRemoveFavorite = async (storyId: string) => {
    try {
      await api.toggleFavorite(storyId);
      setFavorites((prev) => prev.filter((f) => f.id !== storyId));
      showToast('Đã gỡ truyện khỏi Tủ Yêu Thích');
    } catch (err: any) {
      showToast(err.message || 'Lỗi thao tác', 'error');
    }
  };

  const handleUnfollowAuthor = async (authorId: string, authorName: string) => {
    try {
      await api.toggleFollowAuthor(authorId);
      setFollowedAuthors((prev) => prev.filter((a) => a.id !== authorId));
      showToast(`Đã hủy theo dõi tác giả ${authorName}`);
    } catch (err: any) {
      showToast(err.message || 'Lỗi thao tác', 'error');
    }
  };

  const handleUnfollowNarrator = async (narratorId: string, narratorName: string) => {
    try {
      await api.toggleFollowNarrator(narratorId);
      setFollowedNarrators((prev) => prev.filter((n) => n.id !== narratorId));
      showToast(`Đã hủy theo dõi giọng đọc ${narratorName}`);
    } catch (err: any) {
      showToast(err.message || 'Lỗi thao tác', 'error');
    }
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    setCreatingPlaylist(true);
    try {
      const newP = await api.createPlaylist({
        name: newPlaylistName.trim(),
        is_public: isPublic,
      });
      setPlaylists([newP, ...playlists]);
      setNewPlaylistName('');
      setCreateModalOpen(false);
      showToast('Tạo danh sách phát thành công!');
    } catch (err: any) {
      showToast(err.message || 'Lỗi tạo playlist', 'error');
    } finally {
      setCreatingPlaylist(false);
    }
  };

  const handleOpenPlaylistDetail = async (playlistId: string) => {
    setIsDetailLoading(true);
    try {
      const detail = await api.getPlaylistDetail(playlistId);
      setSelectedPlaylist(detail);
    } catch (err: any) {
      showToast(err.message || 'Lỗi tải playlist', 'error');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    if (!confirm('Đạo hữu có chắc chắn muốn xóa danh sách phát này?')) return;
    try {
      await api.deletePlaylist(playlistId);
      setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
      if (selectedPlaylist?.playlist.id === playlistId) {
        setSelectedPlaylist(null);
      }
      showToast('Đã xóa danh sách phát');
    } catch (err: any) {
      showToast(err.message || 'Lỗi xóa playlist', 'error');
    }
  };

  const handleRemoveItem = async (playlistId: string, chapterId: string) => {
    try {
      await api.removePlaylistItem(playlistId, chapterId);
      if (selectedPlaylist) {
        setSelectedPlaylist({
          ...selectedPlaylist,
          items: selectedPlaylist.items.filter((item) => item.chapter_id !== chapterId),
        });
      }
      showToast('Đã gỡ tập khỏi danh sách phát');
    } catch (err: any) {
      showToast(err.message || 'Lỗi thao tác', 'error');
    }
  };

  const playHistoryItem = (item: ListeningHistoryItem) => {
    const s: Story = {
      id: item.story_id,
      title: item.story_title,
      slug: item.story_slug,
      author_name: 'Đang cập nhật',
      description: '',
      cover_image_url: item.cover_image_url,
      categories: ['Tiên Hiệp'],
      status: 'ongoing',
      view_count: 0,
      favorite_count: 0,
      rating_avg: 5,
      rating_count: 0,
      total_chapters: 0,
    };
    const c: Chapter = {
      id: item.chapter_id,
      story_id: item.story_id,
      chapter_number: item.chapter_number,
      title: item.chapter_title,
      content: '',
      duration_seconds: item.duration_seconds,
      listen_count: 0,
      narrator_name: 'Hệ Thống',
      is_premium: false,
      created_at: item.updated_at,
    };
    playChapter(s, c);
    showToast(`Đang phát: ${item.chapter_title}`);
  };

  const playPlaylistItem = (item: any) => {
    const s: Story = {
      id: item.story_id,
      title: item.story_title,
      slug: '',
      author_name: 'Đang cập nhật',
      description: '',
      cover_image_url: item.cover_image_url || '',
      categories: ['Tiên Hiệp'],
      status: 'ongoing',
      view_count: 0,
      favorite_count: 0,
      rating_avg: 5,
      rating_count: 0,
      total_chapters: 0,
    };
    const c: Chapter = {
      id: item.chapter_id,
      story_id: item.story_id,
      chapter_number: item.chapter_number,
      title: item.chapter_title,
      content: '',
      duration_seconds: item.duration_seconds,
      listen_count: 0,
      narrator_name: 'Hệ Thống',
      is_premium: false,
      created_at: item.added_at,
    };
    playChapter(s, c);
    showToast(`Đang phát: ${item.chapter_title}`);
  };

  const handlePlayAll = () => {
    if (!selectedPlaylist || selectedPlaylist.items.length === 0) return;
    playPlaylistItem(selectedPlaylist.items[0]);
  };

  if (!isAuthenticated && !isLoading) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 pb-24 space-y-8">
      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`fixed top-20 right-5 z-50 rounded-2xl px-4 py-3 text-xs font-bold shadow-2xl flex items-center gap-2 border animate-in fade-in slide-in-from-top-2 ${
            toastMsg.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40'
              : 'bg-rose-950/90 text-rose-300 border-rose-500/40'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header Tủ Truyện Tiên Phủ */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-r from-[#141b2b] via-[#0f172a] to-[#1c162e] p-8 shadow-2xl shadow-amber-500/10">
        <div className="absolute -right-16 -bottom-16 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-400">
            <Bookmark className="h-3.5 w-3.5" />
            TÀNG KINH CÁC CÁ NHÂN
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">
            Tủ Truyện <span className="gold-text">Tiên Phủ</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Nơi cất giữ các bộ truyện yêu thích, danh sách phát audio tự chọn và theo dõi dấu chân tu chân trên từng chương truyện.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-white/10">
        <button
          onClick={() => setActiveTab('favorites')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === 'favorites'
              ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Heart className="w-4 h-4" />
          <span>Yêu Thích</span>
          {favorites.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/20 font-mono">
              {favorites.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === 'history'
              ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Lịch Sử Nghe</span>
          {history.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/20 font-mono">
              {history.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('playlists')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === 'playlists'
              ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ListMusic className="w-4 h-4" />
          <span>Danh Sách Phát</span>
          {playlists.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/20 font-mono">
              {playlists.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('following')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === 'following'
              ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Đang Theo Dõi</span>
        </button>
      </div>

      {/* TAB 1: YÊU THÍCH */}
      {activeTab === 'favorites' && (
        <div className="space-y-6">
          {favoritesLoading ? (
            <div className="py-16">
              <CultivationSpinner size="lg" text="Đang mở Tủ Yêu Thích..." />
            </div>
          ) : favorites.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-white/10 bg-slate-900/60 space-y-3">
              <Heart className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-white">Chưa Có Truyện Nào Trong Tủ Yêu Thích</p>
              <p className="text-xs text-slate-400">
                Hãy khám phá các tác phẩm và nhấn vào biểu tượng Trái Tim để lưu lại đây!
              </p>
              <Link
                href="/categories"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs shadow-md mt-2"
              >
                <BookOpen className="w-3.5 h-3.5" /> Khám Phá Truyện Ngay
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {favorites.map((fav) => (
                <div
                  key={fav.id}
                  className="group relative rounded-2xl overflow-hidden border border-white/10 bg-slate-900/80 hover:border-amber-500/40 transition-all flex flex-col"
                >
                  <Link href={`/stories/${fav.slug}`} className="aspect-[3/4] overflow-hidden bg-slate-800 relative block">
                    <img
                      src={fav.cover_image_url || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80'}
                      alt={fav.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleRemoveFavorite(fav.id);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors"
                      title="Gỡ khỏi yêu thích"
                    >
                      <Heart className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </Link>

                  <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <Link
                        href={`/stories/${fav.slug}`}
                        className="text-xs font-bold text-white hover:text-amber-400 line-clamp-1 transition-colors"
                      >
                        {fav.title}
                      </Link>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {fav.total_chapters} chương
                      </p>
                    </div>

                    <Link
                      href={`/stories/${fav.slug}`}
                      className="w-full py-1.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                    >
                      <Headphones className="w-3 h-3" /> Nghe Ngay
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LỊCH SỬ NGHE */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {historyLoading ? (
            <div className="py-16">
              <CultivationSpinner size="lg" text="Đang ngưng tụ lịch sử nghe..." />
            </div>
          ) : history.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-white/10 bg-slate-900/60 space-y-3">
              <History className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-white">Chưa Có Lịch Sử Nghe Truyện</p>
              <p className="text-xs text-slate-400">
                Hãy chọn một tập truyện bất kỳ và hòa mình vào đại đạo tu chân!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => {
                const percent = Math.min(
                  100,
                  Math.round(((item.last_position_seconds || 0) / (item.duration_seconds || 1)) * 100)
                );
                return (
                  <div
                    key={item.chapter_id}
                    className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-amber-500/30 transition-all"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="h-12 w-9 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                        {item.cover_image_url ? (
                          <img
                            src={item.cover_image_url}
                            alt={item.story_title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-amber-400 font-bold text-xs">
                            <BookOpen className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <Link
                          href={`/stories/${item.story_slug}`}
                          className="text-xs font-bold text-white hover:text-amber-400 transition-colors truncate block"
                        >
                          {item.story_title}
                        </Link>
                        <p className="text-[11px] text-amber-400 font-medium truncate mt-0.5">
                          Tập {item.chapter_number}: {item.chapter_title}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono mt-1">
                          <span>Đã nghe: {percent}%</span>
                          <span>•</span>
                          <span>
                            {Math.floor((item.last_position_seconds || 0) / 60)}:
                            {String((item.last_position_seconds || 0) % 60).padStart(2, '0')} /{' '}
                            {Math.floor((item.duration_seconds || 0) / 60)}:
                            {String((item.duration_seconds || 0) % 60).padStart(2, '0')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button
                        onClick={() => playHistoryItem(item)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Tiếp Tục Nghe
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DANH SÁCH PHÁT (PLAYLISTS) */}
      {activeTab === 'playlists' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ListMusic className="w-5 h-5 text-amber-400" />
              Danh Sách Phát Của Bạn ({playlists.length})
            </h2>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 text-black font-black text-xs flex items-center gap-1.5 shadow-md hover:bg-amber-400 transition-colors"
            >
              <Plus className="w-4 h-4" /> Tạo Playlist Mới
            </button>
          </div>

          {playlistsLoading ? (
            <div className="py-16">
              <CultivationSpinner size="lg" text="Đang ngưng tụ danh sách phát..." />
            </div>
          ) : playlists.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-white/10 bg-slate-900/60 space-y-3">
              <FolderPlus className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-white">Chưa Có Danh Sách Phát Nào</p>
              <p className="text-xs text-slate-400">
                Hãy tạo danh sách phát đầu tiên để lưu lại các tập truyện đắc ý nhất!
              </p>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs shadow-md mt-2"
              >
                <Plus className="w-3.5 h-3.5" /> Tạo Ngay
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 space-y-4 hover:border-amber-500/40 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-white line-clamp-1">{pl.name}</h3>
                      <button
                        onClick={() => handleDeletePlaylist(pl.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Xóa playlist"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">
                      {pl.total_items} tập audio • {pl.is_public ? 'Công khai' : 'Riêng tư'}
                    </p>
                  </div>

                  <button
                    onClick={() => handleOpenPlaylistDetail(pl.id)}
                    className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-white/10 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Headphones className="w-3.5 h-3.5" /> Xem Chi Tiết
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ĐANG THEO DÕI */}
      {activeTab === 'following' && (
        <div className="space-y-8">
          {/* Tác Giả */}
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <User className="w-4 h-4" /> Tác Giả Đang Theo Dõi ({followedAuthors.length})
            </h3>
            {followingLoading ? (
              <div className="py-8 text-center text-xs text-slate-500">Đang tải...</div>
            ) : followedAuthors.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Chưa theo dõi tác giả nào.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {followedAuthors.map((author) => (
                  <div
                    key={author.id}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-amber-500/30 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full overflow-hidden bg-slate-800 flex-shrink-0 flex items-center justify-center text-amber-400 font-bold text-sm">
                        {author.avatar_url ? (
                          <img src={getFullAvatarUrl(author.avatar_url)} alt={author.name} className="h-full w-full object-cover" />
                        ) : (
                          author.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{author.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{author.bio || 'Tác giả Tiên Hiệp'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnfollowAuthor(author.id, author.name)}
                      className="text-[11px] px-2.5 py-1 rounded-lg border border-rose-500/25 text-rose-400 hover:bg-rose-500/10 transition-colors flex-shrink-0 font-medium"
                      title={`Hủy theo dõi ${author.name}`}
                    >
                      Hủy theo dõi
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* MC Diễn Cảm */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <h3 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Mic className="w-4 h-4" /> MC Diễn Cảm Đang Theo Dõi ({followedNarrators.length})
            </h3>
            {followingLoading ? (
              <div className="py-8 text-center text-xs text-slate-500">Đang tải...</div>
            ) : followedNarrators.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Chưa theo dõi giọng đọc MC nào.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {followedNarrators.map((narrator) => (
                  <div
                    key={narrator.id}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-amber-500/30 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full overflow-hidden bg-slate-800 flex-shrink-0 flex items-center justify-center text-amber-400 font-bold text-sm">
                        {narrator.avatar_url ? (
                          <img src={getFullAvatarUrl(narrator.avatar_url)} alt={narrator.name} className="h-full w-full object-cover" />
                        ) : (
                          narrator.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{narrator.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{narrator.bio || 'MC Diễn Đọc Truyền Cảm'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnfollowNarrator(narrator.id, narrator.name)}
                      className="text-[11px] px-2.5 py-1 rounded-lg border border-rose-500/25 text-rose-400 hover:bg-rose-500/10 transition-colors flex-shrink-0 font-medium"
                      title={`Hủy theo dõi ${narrator.name}`}
                    >
                      Hủy theo dõi
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL TẠO PLAYLIST */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-0">
          <div className="w-full max-w-md rounded-3xl border border-amber-500/30 bg-[#0f172a] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-amber-400" />
                Tạo Danh Sách Phát Mới
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlaylist} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Tên Danh Sách Phát
                </label>
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="VD: Tuyệt Phẩm Tu Tiên Ban Đêm..."
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="rounded border-white/20 bg-slate-900 text-amber-500 focus:ring-0"
                />
                <label htmlFor="is_public" className="text-xs text-slate-300 cursor-pointer">
                  Công khai cho các đồng đạo khác cùng nghe
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creatingPlaylist || !newPlaylistName.trim()}
                  className="px-5 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 disabled:opacity-50 transition-colors"
                >
                  {creatingPlaylist ? 'Đang tạo...' : 'Tạo Playlist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT PLAYLIST */}
      {selectedPlaylist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-0">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0f172a] p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-black text-white">{selectedPlaylist.playlist.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedPlaylist.items.length} tập audio trong danh sách
                </p>
              </div>
              <button
                onClick={() => setSelectedPlaylist(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedPlaylist.items.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePlayAll}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all"
                >
                  <Play className="w-4 h-4 fill-current" /> Phát Toàn Bộ Playlist
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {selectedPlaylist.items.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">
                  Playlist chưa có tập audio nào. Hãy duyệt các bộ truyện và thêm tập vào đây!
                </p>
              ) : (
                selectedPlaylist.items.map((item, idx) => (
                  <div
                    key={item.chapter_id}
                    className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/60 border border-white/5 hover:border-white/10 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-slate-500 font-mono w-5 text-center font-bold">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">{item.chapter_title}</p>
                        <p className="text-[11px] text-amber-400/80 truncate">{item.story_title}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => playPlaylistItem(item)}
                        className="p-2 rounded-xl bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-colors"
                        title="Phát tập này"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <button
                        onClick={() =>
                          handleRemoveItem(selectedPlaylist.playlist.id, item.chapter_id)
                        }
                        className="p-2 rounded-xl text-slate-500 hover:text-rose-400 transition-colors"
                        title="Gỡ khỏi playlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
