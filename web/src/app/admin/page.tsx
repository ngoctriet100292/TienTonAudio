'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  BookOpen,
  Headphones,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  UserCheck,
  UserX,
  Crown,
  ChevronRight,
  Clock,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { api, getFullAvatarUrl } from '@/lib/api';
import { AdminStats, AdminUser, AdminReport } from '@/types';
import { CultivationSpinner } from '@/components/cultivation-spinner';

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'reports'>('stats');

  // Stats
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Users
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Reports
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [updatingReportId, setUpdatingReportId] = useState<string | null>(null);

  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      loadStats();
      loadUsers();
      loadReports();
    }
  }, [isAuthenticated, isAdmin]);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const data = await api.getAdminStats();
      setStats(data);
    } catch {
      // Fallback
    } finally {
      setLoadingStats(false);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await api.getAdminUsers(1, 100);
      setUsers(data.items || []);
    } catch {
      // Fallback
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadReports = async () => {
    setLoadingReports(true);
    try {
      const data = await api.getAdminReports();
      setReports(data || []);
    } catch {
      // Fallback
    } finally {
      setLoadingReports(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    setUpdatingUserId(userId);
    try {
      await api.updateUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      showToast(`Đã cập nhật vai trò thành công thành: ${newRole.toUpperCase()}`);
    } catch (err: any) {
      showToast(err.message || 'Lỗi cập nhật vai trò', 'error');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleUpdateReportStatus = async (reportId: string, status: 'resolved' | 'rejected') => {
    setUpdatingReportId(reportId);
    try {
      await api.updateReportStatus(reportId, status, 'Đã xử lý bởi Admin');
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status } : r))
      );
      showToast(`Đã cập nhật trạng thái báo cáo thành: ${status === 'resolved' ? 'ĐÃ XỬ LÝ' : 'BÁC BỎ'}`);
    } catch (err: any) {
      showToast(err.message || 'Lỗi cập nhật báo cáo', 'error');
    } finally {
      setUpdatingReportId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24">
        <CultivationSpinner size="lg" text="Đang kích hoạt Thần Thức Quản Trị..." />
      </div>
    );
  }

  // Nếu không phải Admin
  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-white">Tiên Phủ Cấm Địa</h1>
          <p className="text-sm text-slate-400">
            Khu vực này chỉ dành riêng cho **Quản Trị Viên Tối Cao (Admin)** của Tiên Tôn Các. Vui lòng đăng nhập tài khoản có thẩm quyền.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 text-xs font-bold transition-all border border-white/10"
        >
          Trở Về Trang Chủ
        </Link>
      </div>
    );
  }

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 pb-24 space-y-8">
      {/* Toast Message */}
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
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header Admin */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-400 mb-2">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            TIÊN TÔN ĐIỀU HÀNH NGHỊ VIỆN
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Trung Tâm Quản Trị Tối Cao (Admin Portal)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Giám sát tài chính, phân quyền thành viên và kiểm duyệt báo cáo toàn hệ thống.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              loadStats();
              loadUsers();
              loadReports();
              showToast('Đã làm mới dữ liệu hệ thống!');
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-white/10 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Làm mới
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'stats'
              ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Tổng Quan Số Liệu
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'users'
              ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-4 h-4" />
          Quản Lý Thành Viên ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'reports'
              ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Kiểm Duyệt Báo Cáo ({reports.filter((r) => r.status === 'pending').length} chờ)
        </button>
      </div>

      {/* TAB 1: THỐNG KÊ SỐ LIỆU (STATS) */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Doanh Thu */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/30">
              <div className="flex items-center justify-between text-slate-400 mb-2 text-xs font-semibold">
                <span>Tổng Doanh Thu VIP</span>
                <DollarSign className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-amber-300">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                  stats?.total_revenue || 0
                )}
              </p>
              <p className="text-[11px] text-slate-400 mt-2">Thanh toán VietQR Napas 24/7</p>
            </div>

            {/* Tổng Đạo Hữu */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10">
              <div className="flex items-center justify-between text-slate-400 mb-2 text-xs font-semibold">
                <span>Tổng Đạo Hữu</span>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-white">
                {(stats?.total_users || users.length).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400 mt-2">Thành viên đã đăng ký</p>
            </div>

            {/* Tổng Tác Phẩm */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10">
              <div className="flex items-center justify-between text-slate-400 mb-2 text-xs font-semibold">
                <span>Tổng Bộ Truyện</span>
                <BookOpen className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-white">
                {(stats?.total_stories || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400 mt-2">
                {(stats?.total_chapters || 0).toLocaleString()} tập audio & chữ
              </p>
            </div>

            {/* Tổng Lượt Nghe */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10">
              <div className="flex items-center justify-between text-slate-400 mb-2 text-xs font-semibold">
                <span>Tổng Lượt Nghe Audio</span>
                <Headphones className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-white">
                {(stats?.total_chapter_listens || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400 mt-2">
                {(stats?.total_story_views || 0).toLocaleString()} lượt xem truyện
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: QUẢN LÝ THÀNH VIÊN (USERS) */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Tìm đạo hữu theo tên, email..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
            <span className="text-xs text-slate-400">
              Hiển thị {filteredUsers.length} / {users.length} thành viên
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/60">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-[11px] uppercase font-bold text-slate-400 border-b border-white/10">
                <tr>
                  <th className="px-5 py-3.5">Đạo Hữu</th>
                  <th className="px-5 py-3.5">Email</th>
                  <th className="px-5 py-3.5">Ngày gia nhập</th>
                  <th className="px-5 py-3.5">Vai Trò Hiện Tại</th>
                  <th className="px-5 py-3.5 text-right">Thao Tác Phân Quyền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full overflow-hidden bg-slate-800 border border-white/10 flex-shrink-0 flex items-center justify-center font-bold text-amber-400">
                          {u.avatar_url ? (
                            <img
                              src={getFullAvatarUrl(u.avatar_url)}
                              alt={u.username}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            u.username.charAt(0).toUpperCase()
                          )}
                        </div>
                        <span className="font-bold text-white">{u.username}</span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 font-mono text-slate-400">{u.email}</td>

                    <td className="px-5 py-3.5 text-slate-400">
                      {new Date(u.created_at).toLocaleDateString('vi-VN')}
                    </td>

                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          u.role === 'admin'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : u.role === 'partner' || u.role === 'creator'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : u.role === 'narrator'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-slate-800 text-slate-400 border border-white/10'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <select
                        value={u.role}
                        disabled={updatingUserId === u.id}
                        onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                        className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg px-2.5 py-1 border border-white/10 focus:outline-none focus:border-amber-400"
                      >
                        <option value="user">User (Đạo Hữu)</option>
                        <option value="partner">Partner (Đối Tác Sáng Tác)</option>
                        <option value="narrator">Narrator (MC Diễn Cảm)</option>
                        <option value="admin">Admin (Quản Trị Tối Cao)</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BÁO CÁO KHIẾU NẠI (REPORTS) */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="p-12 text-center text-slate-400 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="font-bold text-white">Không Có Khiếu Nại Nào Cần Xử Lý</p>
              <p className="text-xs">Tất cả chương truyện và bình luận đều hoạt động hòa ái!</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/60">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-[11px] uppercase font-bold text-slate-400 border-b border-white/10">
                  <tr>
                    <th className="px-5 py-3.5">Mục Vi Phạm</th>
                    <th className="px-5 py-3.5">Lý Do</th>
                    <th className="px-5 py-3.5">Người Báo</th>
                    <th className="px-5 py-3.5">Thời Gian</th>
                    <th className="px-5 py-3.5">Trạng Thái</th>
                    <th className="px-5 py-3.5 text-right">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                  {reports.map((r) => (
                    <tr key={r.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-white uppercase">
                        {r.target_type}
                      </td>

                      <td className="px-5 py-3.5 text-amber-300">{r.reason}</td>

                      <td className="px-5 py-3.5 text-slate-400 font-mono">
                        {r.reporter_username || 'Ẩn Danh'}
                      </td>

                      <td className="px-5 py-3.5 text-slate-400">
                        {new Date(r.created_at).toLocaleDateString('vi-VN')}
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            r.status === 'resolved'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : r.status === 'rejected'
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        {r.status === 'pending' ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              disabled={updatingReportId === r.id}
                              onClick={() => handleUpdateReportStatus(r.id, 'resolved')}
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors"
                            >
                              Duyệt Xử Lý
                            </button>
                            <button
                              disabled={updatingReportId === r.id}
                              onClick={() => handleUpdateReportStatus(r.id, 'rejected')}
                              className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold text-[11px] transition-colors"
                            >
                              Bác Bỏ
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-mono">Đã Đóng</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
