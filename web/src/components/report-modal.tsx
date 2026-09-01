'use client';

import React, { useState } from 'react';
import { ShieldAlert, X, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth-context';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'chapter' | 'comment' | 'story';
  targetId: string;
  targetTitle?: string;
}

const REPORT_REASONS = [
  'Lỗi âm thanh, mất tiếng, file hỏng',
  'Sai thứ tự chương hoặc trùng lặp',
  'Vi phạm bản quyền tác giả / DMCA',
  'Nội dung phản cảm, kích động thù địch',
  'Quảng cáo rác, spam bình luận',
  'Lý do khác',
];

export function ReportModal({ isOpen, onClose, targetType, targetId, targetTitle }: ReportModalProps) {
  const { isAuthenticated } = useAuth();
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setMsg({ type: 'error', text: 'Vui lòng đăng nhập để gửi báo cáo khiếu nại' });
      return;
    }

    setSubmitting(true);
    setMsg(null);

    try {
      await api.createReport({
        target_type: targetType,
        target_id: targetId,
        reason,
        description: description.trim() || undefined,
      });

      setMsg({
        type: 'success',
        text: 'Báo cáo đã được gửi tới Ban Quản Trị để xử lý. Cảm ơn Đạo Hữu!',
      });

      setTimeout(() => {
        onClose();
        setMsg(null);
        setDescription('');
      }, 2000);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Lỗi gửi báo cáo' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-0">
      <div className="w-full max-w-md rounded-3xl border border-rose-500/30 bg-[#0f172a] p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
            <ShieldAlert className="w-5 h-5" />
            <span>Báo Lỗi & Khiếu Nại</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {targetTitle && (
          <p className="text-xs text-slate-400 font-medium">
            Đối tượng: <span className="text-white font-bold">{targetTitle}</span>
          </p>
        )}

        {msg && (
          <div
            className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 border ${
              msg.type === 'success'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-950/80 text-rose-300 border-rose-500/30'
            }`}
          >
            {msg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span>{msg.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Lý Do Báo Cáo
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-white/10 px-3.5 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-rose-400"
            >
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Mô Tả Chi Tiết (Tùy chọn)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Ghi chú thêm thông tin giúp Ban Quản Trị xử lý nhanh nhất..."
              className="w-full rounded-xl bg-slate-900 border border-white/10 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-400 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-600/20 disabled:opacity-50 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? 'Đang gửi...' : 'Gửi Khiếu Nại'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
