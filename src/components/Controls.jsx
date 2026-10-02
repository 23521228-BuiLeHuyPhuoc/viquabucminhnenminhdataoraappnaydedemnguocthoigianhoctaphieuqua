'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Clock, PictureInPicture2, CheckCircle2 } from 'lucide-react';
import { TIMER_STATUS } from '../lib/timer-engine';

export default function Controls({
  status = TIMER_STATUS.IDLE,
  taskColor = '#60a5fa',
  hasProgress = false,
  onTogglePlay,
  onReset,
  onOpenDurationModal,
  onToggleMiniMode,
  isMiniMode = false,
}) {
  const [confirmReset, setConfirmReset] = useState(false);

  // Tự động hủy xác nhận reset sau 3 giây
  useEffect(() => {
    if (!confirmReset) return;
    const timer = setTimeout(() => {
      setConfirmReset(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [confirmReset]);

  const handleResetClick = () => {
    if (!hasProgress) {
      onReset();
      return;
    }

    if (!confirmReset) {
      setConfirmReset(true);
    } else {
      setConfirmReset(false);
      onReset();
    }
  };

  const isRunning = status === TIMER_STATUS.RUNNING;
  const isCompleted = status === TIMER_STATUS.COMPLETED;

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-sm mx-auto select-none mt-4">
      {/* Nút chính Bắt đầu / Tạm dừng */}
      <button
        onClick={onTogglePlay}
        disabled={isCompleted}
        className={`w-full py-3.5 px-6 rounded-2xl font-bold text-base flex items-center justify-center gap-2.5 transition-all duration-200 active:scale-95 shadow-lg ${
          isCompleted
            ? 'bg-slate-700/50 text-slate-400 cursor-not-allowed border border-white/5'
            : isRunning
            ? 'bg-transparent border-2 text-white hover:bg-white/5'
            : 'text-slate-950 hover:brightness-110 hover:shadow-xl'
        }`}
        style={{
          borderColor: isRunning ? taskColor : 'transparent',
          backgroundColor: isRunning ? 'transparent' : isCompleted ? undefined : taskColor,
          color: isRunning ? taskColor : undefined,
          boxShadow: isRunning ? `0 0 20px ${taskColor}25` : undefined,
        }}
      >
        {isCompleted ? (
          <>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Mục này đã hoàn thành</span>
          </>
        ) : isRunning ? (
          <>
            <Pause className="w-5 h-5 fill-current" />
            <span>Tạm dừng</span>
          </>
        ) : status === TIMER_STATUS.PAUSED ? (
          <>
            <Play className="w-5 h-5 fill-current" />
            <span>Tiếp tục</span>
          </>
        ) : (
          <>
            <Play className="w-5 h-5 fill-current" />
            <span>Bắt đầu</span>
          </>
        )}
      </button>

      {/* Hàng nút phụ: Đặt lại & Chỉnh giờ & Thu nhỏ mini */}
      <div className="grid grid-cols-3 gap-2 w-full">
        {/* Nút Đặt lại với xác nhận 2 bước */}
        <button
          onClick={handleResetClick}
          className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 border ${
            confirmReset
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm animate-pulse'
              : 'bg-white/[0.05] hover:bg-white/[0.09] text-slate-300 border-white/[0.08]'
          }`}
          title="Đặt lại thời gian về mục tiêu ban đầu"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${confirmReset ? 'rotate-180 transition-transform' : ''}`} />
          <span className="truncate">{confirmReset ? 'Xác nhận?' : 'Đặt lại'}</span>
        </button>

        {/* Nút Chỉnh thời lượng */}
        <button
          onClick={onOpenDurationModal}
          className="py-2 px-3 rounded-xl text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.09] text-slate-300 border border-white/[0.08] flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95"
          title="Thay đổi thời lượng mục tiêu"
        >
          <Clock className="w-3.5 h-3.5" />
          <span className="truncate">Chỉnh giờ</span>
        </button>

        {/* Nút Chuyển sang đồng hồ nổi mini */}
        <button
          onClick={onToggleMiniMode}
          className="py-2 px-3 rounded-xl text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.09] text-slate-300 border border-white/[0.08] flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95"
          title="Thu nhỏ thành đồng hồ nổi trên các ứng dụng khác"
        >
          <PictureInPicture2 className="w-3.5 h-3.5" />
          <span className="truncate">Cửa sổ nổi</span>
        </button>
      </div>

      <div className="text-[11px] text-slate-500 text-center flex items-center gap-1.5 select-none pt-1">
        <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-slate-400 font-mono">
          Space
        </kbd>
        <span>bắt đầu/tạm dừng</span>
        <span className="mx-1">•</span>
        <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-slate-400 font-mono">
          M
        </kbd>
        <span>đồng hồ nổi</span>
      </div>
    </div>
  );
}
