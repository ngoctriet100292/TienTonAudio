'use client';

import React, { useState } from 'react';
import { Sparkles, Send, Bot, User, BookOpen } from 'lucide-react';
import { api } from '@/lib/api';

export default function AIAssistantPage() {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: 'Chào mừng Đạo Hữu quang lâm! Ta là Trợ Lý AI Đạo Hữu của Tiên Tôn Các. Đạo Hữu đang tu luyện đến chương nào, cần hỏi về hệ thống cảnh giới hay tình tiết truyện gì cứ thoải mái đàm đạo cùng ta!',
    },
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    const userText = prompt;
    setPrompt('');
    setMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setLoading(true);

    try {
      const res = await api.askAI(userText);
      setMessages((prev) => [...prev, { role: 'assistant', text: res.answer || 'Đạo Hữu hỏi rất hay, theo ghi chép trong bí tịch...' }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Thần thức tạm thời bị nhiễu loạn (Backend AI chưa được kết nối API key Gemini/OpenAI). Vui lòng thử lại sau ít phút!',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
      {/* Header */}
      <div className="border-b border-white/10 pb-4 flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">
            <Sparkles className="w-4 h-4" />
            Trợ Lý AI Đạo Hữu
          </div>
          <h1 className="text-2xl font-black text-white">Đàm Đạo Tiên Hiệp Cùng AI</h1>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="h-[520px] rounded-3xl border border-white/10 bg-slate-900/60 p-6 overflow-y-auto space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'assistant' && (
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-md">
                <Bot className="w-5 h-5" />
              </div>
            )}

            <div
              className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-[80%] whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-medium'
                  : 'bg-slate-800 text-slate-200 border border-white/5'
              }`}
            >
              {m.text}
            </div>

            {m.role === 'user' && (
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-800 text-amber-400 border border-amber-500/30">
                <User className="w-5 h-5" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <Bot className="w-4 h-4 text-indigo-400 animate-spin" /> Đang vận chuyển linh lực suy nghĩ...
          </div>
        )}
      </div>

      {/* Khẩu quyết gợi ý hỏi nhanh */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Khẩu quyết gợi ý:
        </span>
        {[
          'Hàn Lập tu luyện những công pháp nào?',
          'Cảnh giới Kim Đan và Nguyên Anh khác nhau thế nào?',
          'Tóm tắt đại kết cục Phàm Nhân Tu Tiên',
          'Nâng cấp VIP nhận được bao nhiêu Tu Vi đột phá?',
        ].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setPrompt(s)}
            className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 text-xs transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSend} className="flex gap-3">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Hỏi về cảnh giới tu vi, diễn biến nhân vật, tóm tắt cốt truyện..."
          className="flex-1 rounded-2xl bg-slate-900 border border-white/10 px-5 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#ffd166] to-[#ffb703] text-black font-black text-xs shadow-lg shadow-amber-500/20 hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
        >
          <Send className="w-4 h-4" /> Gửi
        </button>
      </form>
    </div>
  );
}
