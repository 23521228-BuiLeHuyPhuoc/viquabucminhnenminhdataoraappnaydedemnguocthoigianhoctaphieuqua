'use client';

import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { PALETTE } from '../lib/timer-engine';
import { parseDuration } from '../lib/time-parser';

const EMOJI_OPTIONS = ['📚', '💻', '🇬🇧', '🎓', '📖', '✍️', '🎯', '🎨', '🚀', '🧠', '🎧', '⚡'];

export default function TaskEditModal({
  isOpen,
  onClose,
  taskToEdit,
  onSaveTask,
}) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📚');
  const [color, setColor] = useState(PALETTE[0]);
  const [durationStr, setDurationStr] = useState('45');
  const [errorMsg, setErrorMsg] = useState('');

  const isEditing = !!taskToEdit;

  useEffect(() => {
    if (isOpen) {
      if (taskToEdit) {
        setName(taskToEdit.name || '');
        setEmoji(taskToEdit.emoji || '📚');
        setColor(taskToEdit.color || PALETTE[0]);
        const mins = Math.round((taskToEdit.goal || 2700) / 60);
        setDurationStr(String(mins));
      } else {
        setName('');
        setEmoji('📚');
        setColor(PALETTE[Math.floor(Math.random() * PALETTE.length)]);
        setDurationStr('45');
      }
      setErrorMsg('');
    }
  }, [isOpen, taskToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Vui lòng nhập tên công việc.');
      return;
    }

    const parsed = parseDuration(durationStr);
    if (!parsed.success) {
      setErrorMsg(parsed.error);
      return;
    }

    onSaveTask({
      id: taskToEdit?.id,
      name: name.trim(),
      emoji: emoji || '⏱',
      color,
      goal: parsed.seconds,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in select-none">
      <div
        className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 shadow-2xl p-5 text-slate-100 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-100">
            {isEditing ? 'Chỉnh sửa công việc' : 'Thêm công việc mới'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* Tên công việc & Emoji */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Tên công việc & Biểu tượng</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                maxLength={4}
                className="w-12 text-center py-2 rounded-xl bg-white/5 border border-white/10 text-lg outline-none focus:border-blue-500"
                title="Biểu tượng emoji"
              />
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Vd: Ôn thi, Lập trình..."
                autoFocus
                className="flex-1 px-3 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-white outline-none focus:border-blue-500"
              />
            </div>

            {/* Gợi ý emoji */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {EMOJI_OPTIONS.map((em) => (
                <button
                  type="button"
                  key={em}
                  onClick={() => setEmoji(em)}
                  className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all ${
                    emoji === em ? 'bg-white/20 scale-110' : 'hover:bg-white/10'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Chọn màu sắc */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Màu chủ đạo</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PALETTE.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 relative"
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-4 h-4 text-slate-950 font-bold" />}
                </button>
              ))}
            </div>
          </div>

          {/* Thời lượng mục tiêu */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Thời lượng mục tiêu (phút hoặc giờ:phút)</label>
            <input
              type="text"
              value={durationStr}
              onChange={(e) => {
                setDurationStr(e.target.value);
                setErrorMsg('');
              }}
              placeholder="Vd: 45 hoặc 1:30"
              className="px-3 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-white outline-none focus:border-blue-500 font-mono"
            />
          </div>

          {errorMsg && <p className="text-xs text-rose-400 font-medium">{errorMsg}</p>}

          {/* Nút lưu */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-600 text-white"
            >
              {isEditing ? 'Lưu thay đổi' : 'Thêm công việc'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
