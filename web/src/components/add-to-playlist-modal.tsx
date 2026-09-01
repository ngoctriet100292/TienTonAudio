'use client';

import React, { useState, useEffect } from 'react';
import { ListMusic, Plus, Check, X, FolderPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { Playlist } from '@/types';

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterId: string;
  chapterTitle?: string;
}

export function AddToPlaylistModal({
  isOpen,
  onClose,
  chapterId,
  chapterTitle,
}: AddToPlaylistModalProps) {
  const { isAuthenticated } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addedMap, setAddedMap] = useState<{ [key: string]: boolean }>({});
  const [showCreate, setShowCreate] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadPlaylists();
    }
  }, [isOpen, isAuthenticated]);

  const loadPlaylists = async () => {
    setLoading(true);
    try {
      const data = await api.getUserPlaylists();
      setPlaylists(data || []);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (playlistId: string) => {
    setAddingTo(playlistId);
    try {
      await api.addPlaylistItem(playlistId, chapterId);
      setAddedMap((prev) => ({ ...prev, [playlistId]: true }));
    } catch {
      // Fallback
    } finally {
      setAddingTo(null);
    }
  };

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    setCreating(true);
    try {
      const newP = await api.createPlaylist({ name: newPlaylistName.trim() });
      await api.addPlaylistItem(newP.id, chapterId);
      setPlaylists([newP, ...playlists]);
      setAddedMap((prev) => ({ ...prev, [newP.id]: true }));
      setNewPlaylistName('');
      setShowCreate(false);
    } catch {
      // Fallback
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-0">
      <div className="w-full max-w-md rounded-3xl border border-amber-500/30 bg-[#0f172a] p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <ListMusic className="w-5 h-5 text-amber-400" />
            <span>Lưu Vào Danh Sách Phát</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {chapterTitle && (
          <p className="text-xs text-amber-300/90 truncate">
            Tập: <span className="font-bold text-white">{chapterTitle}</span>
          </p>
        )}

        {/* Danh sách playlist */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {loading ? (
            <p className="text-xs text-slate-500 text-center py-6">Đang tải danh sách phát...</p>
          ) : playlists.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">Chưa có danh sách phát nào.</p>
          ) : (
            playlists.map((pl) => {
              const isAdded = addedMap[pl.id];
              return (
                <div
                  key={pl.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 border border-white/5 hover:border-amber-500/30 transition-all text-xs"
                >
                  <div>
                    <p className="font-bold text-white">{pl.name}</p>
                    <p className="text-[11px] text-slate-400">{pl.total_items} tập audio</p>
                  </div>
                  <button
                    onClick={() => handleAdd(pl.id)}
                    disabled={isAdded || addingTo === pl.id}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-all ${
                      isAdded
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500 text-black hover:bg-amber-400'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Đã Lưu
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" /> {addingTo === pl.id ? '...' : 'Lưu'}
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Nút hoặc form tạo nhanh playlist */}
        {!showCreate ? (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs flex items-center justify-center gap-1.5 border border-white/10 transition-colors"
          >
            <FolderPlus className="w-4 h-4" /> Tạo Danh Sách Phát Mới
          </button>
        ) : (
          <form onSubmit={handleCreateAndAdd} className="space-y-2 pt-2 border-t border-white/10">
            <input
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="Nhập tên playlist mới..."
              className="w-full rounded-xl bg-slate-900 border border-white/10 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              required
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={creating || !newPlaylistName.trim()}
                className="px-4 py-1.5 rounded-xl bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 disabled:opacity-50"
              >
                {creating ? 'Đang tạo...' : 'Tạo & Lưu Ngay'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
