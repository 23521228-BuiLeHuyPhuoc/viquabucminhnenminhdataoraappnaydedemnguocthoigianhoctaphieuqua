'use client';

import React, { useState, useEffect } from 'react';
import { X, Clock, AlertTriangle } from 'lucide-react';
import { parseDuration, PRESETS, formatDurationShort } from '../lib/time-parser';

export default function DurationModal({
  isOpen,
  onClose,
  currentGoalSeconds,
  hasProgress,
  onSaveDuration,
}) {
  const [inputValue, setInputValue] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Điền sẵn số phút hoặc định dạng giờ:phút
      if (currentGoalSeconds >= 3600 && currentGoalSeconds % 3600 !== 0) {
        const h = Math.floor(currentGoalSeconds / 3600);
        const m = Math.floor((currentGoalSeconds % 3600) / 60);
        setInputValue(`${h}:${String(m).padStart(2, '0')}`);
      } else {
        setInputValue(String(Math.round(currentGoalSeconds / 60)));
      }
      setErrorMsg('');
    }
  }, [isOpen, currentGoalSeconds]);

  if (!isOpen) return null;

  const handleApply = (valToParse) => {
    const target = valToParse !== undefined ? valToParse : inputValue;
    const result = parseDuration(target);

    if (!result.success) {
      setErrorMsg(result.error);
      return;
    }

    setErrorMsg('');
    onSaveDuration(result.seconds);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleApply();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in select-none">
      <div
        className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 shadow-2xl p-5 text-slate-100 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-200">
            <Clock className="w-4 h-4 text-brand-500" />
            <span>Chỉnh thời lượng mục tiêu</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Ô nhập */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400">
            Nhập số phút hoặc định dạng <span className="font-mono text-slate-300">giờ:phút</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setErrorMsg('');
              }}
              onKeyDown={handleKeyDown}
              placeholder="Vd: 90 hoặc 1:30"
              autoFocus
              className={`flex-1 px-3 py-2 rounded-xl text-sm bg-white/5 border ${
                errorMsg ? 'border-rose-500 focus:border-rose-500' : 'border-white/10 focus:border-blue-500'
              } text-white outline-none focus:ring-1 focus:ring-blue-500 font-mono`}
            />
            <button
              onClick={() => handleApply()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-600 text-white transition-colors"
            >
              Áp dụng
            </button>
          </div>
          {errorMsg ? (
            <p className="text-[11px] text-rose-400 mt-0.5">{errorMsg}</p>
          ) : (
            <p className="text-[11px] text-slate-500">
              Ví dụ: <strong className="text-slate-400">90</strong> (90 phút),{' '}
              <strong className="text-slate-400">1:30</strong> (1 giờ 30 phút),{' '}
              <strong className="text-slate-400">0:45</strong> (45 phút)
            </p>
          )}
        </div>

        {/* Cài đặt nhanh (Presets) */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-400 font-medium">Mục tiêu mẫu nhanh:</span>
          <div className="grid grid-cols-5 gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.minutes}
                onClick={() => {
                  setInputValue(String(p.minutes));
                  handleApply(String(p.minutes));
                }}
                className="py-1.5 px-1 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 transition-all text-center hover:border-white/20"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cảnh báo nếu công việc đang có tiến độ */}
        {hasProgress && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <span>
              Công việc đang có tiến độ. Thay đổi thời lượng sẽ đặt lại đồng hồ về mục tiêu mới.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
