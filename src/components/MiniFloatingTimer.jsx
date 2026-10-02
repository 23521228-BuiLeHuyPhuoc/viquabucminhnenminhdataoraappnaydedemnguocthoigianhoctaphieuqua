'use client';

import React, { useState } from 'react';
import {
  Play,
  Pause,
  Maximize2,
  Pin,
  PinOff,
  X,
  LayoutGrid,
  Minimize2,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { formatRemaining } from '../lib/time-parser';
import { TIMER_STATUS } from '../lib/timer-engine';

export default function MiniFloatingTimer({
  task,
  remainingSeconds = 0,
  status = TIMER_STATUS.IDLE,
  displayMode = 'card', // 'card' | 'bar'
  isPinned = true,
  onTogglePlay,
  onRestoreFull,
  onTogglePin,
  onChangeDisplayMode,
  onSnapCorner,
  isDesktop = false,
}) {
  const [showCornerMenu, setShowCornerMenu] = useState(false);

  const formattedTime = formatRemaining(remainingSeconds);
  const isRunning = status === TIMER_STATUS.RUNNING;
  const isCompleted = status === TIMER_STATUS.COMPLETED;
  const fraction = task?.goal ? Math.max(0, Math.min(1, remainingSeconds / task.goal)) : 1;
  const percent = Math.round((1 - fraction) * 100);

  // 1. SLIM BAR MODE (Khoảng 330x58px)
  if (displayMode === 'bar') {
    return (
      <div className="w-full h-full flex flex-col justify-between bg-slate-950/95 text-slate-100 border border-white/10 rounded-2xl shadow-2xl overflow-hidden select-none backdrop-blur-xl">
        {/* Thanh nội dung */}
        <div className="flex items-center justify-between px-3 py-2 h-full drag-region">
          {/* Bên trái: Emoji + Tên + Thời gian */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl shrink-0" role="img" aria-label="emoji">
              {task?.emoji || '⏱'}
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-medium text-slate-400 truncate max-w-[90px]" title={task?.name}>
                {task?.name || 'Công việc'}
              </span>
              <span
                className="text-lg font-bold tabular-nums leading-none tracking-tight"
                style={{
                  color: isCompleted ? '#4ade80' : isRunning ? task?.color : 'var(--text-main)',
                }}
              >
                {formattedTime}
              </span>
            </div>
          </div>

          {/* Bên phải: Nút Play/Pause + Pin + Restore */}
          <div className="flex items-center gap-1.5 no-drag">
            {/* Nút Play/Pause */}
            <button
              onClick={onTogglePlay}
              disabled={isCompleted}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-md"
              style={{
                backgroundColor: isCompleted ? '#334155' : task?.color || '#3b82f6',
                color: '#0f172a',
              }}
              title={isRunning ? 'Tạm dừng' : 'Bắt đầu / Tiếp tục'}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              ) : isRunning ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {/* Đổi sang kiểu Card */}
            <button
              onClick={() => onChangeDisplayMode('card')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Chuyển sang dạng thẻ (Card)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>

            {/* Ghim trên cùng */}
            {isDesktop && (
              <button
                onClick={onTogglePin}
                className={`p-1.5 rounded-lg transition-colors ${
                  isPinned ? 'text-amber-400 bg-amber-400/10' : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
                title={isPinned ? 'Đang ghim trên cùng (bấm để bỏ)' : 'Ghim trên các cửa sổ khác'}
              >
                {isPinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Quay lại giao diện đầy đủ */}
            <button
              onClick={onRestoreFull}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Phóng to lại giao diện chính"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Thanh tiến độ viền dưới */}
        <div className="w-full h-1 bg-white/5 overflow-hidden">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${percent}%`,
              backgroundColor: task?.color || '#3b82f6',
            }}
          />
        </div>
      </div>
    );
  }

  // 2. COMPACT CARD MODE (Khoảng 320x175px)
  return (
    <div className="w-full h-full flex flex-col justify-between bg-slate-950/95 text-slate-100 border border-white/10 rounded-2xl shadow-2xl p-3.5 select-none backdrop-blur-xl relative">
      {/* Header kéo thả & điều khiển */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06] drag-region">
        {/* Emoji + Tên task */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0" role="img" aria-label="emoji">
            {task?.emoji || '⏱'}
          </span>
          <span className="text-xs font-semibold text-slate-200 truncate max-w-[120px]" title={task?.name}>
            {task?.name || 'Công việc'}
          </span>
        </div>

        {/* Cụm nút thao tác (no-drag để không bị cản click) */}
        <div className="flex items-center gap-1 no-drag">
          {/* Menu ghim góc nhanh (chỉ khi ở Desktop) */}
          {isDesktop && (
            <div className="relative">
              <button
                onClick={() => setShowCornerMenu(!showCornerMenu)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-[10px] flex items-center gap-0.5"
                title="Ghim nhanh vào 4 góc màn hình"
              >
                <span>Góc</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {showCornerMenu && (
                <div className="absolute right-0 top-6 bg-slate-900 border border-white/10 rounded-lg shadow-xl p-1 z-50 flex flex-col gap-0.5 text-[11px] min-w-[90px]">
                  <button
                    onClick={() => {
                      onSnapCorner('top-left');
                      setShowCornerMenu(false);
                    }}
                    className="px-2 py-1 text-left rounded hover:bg-white/10 text-slate-300"
                  >
                    Góc trên trái
                  </button>
                  <button
                    onClick={() => {
                      onSnapCorner('top-right');
                      setShowCornerMenu(false);
                    }}
                    className="px-2 py-1 text-left rounded hover:bg-white/10 text-slate-300"
                  >
                    Góc trên phải
                  </button>
                  <button
                    onClick={() => {
                      onSnapCorner('bottom-left');
                      setShowCornerMenu(false);
                    }}
                    className="px-2 py-1 text-left rounded hover:bg-white/10 text-slate-300"
                  >
                    Góc dưới trái
                  </button>
                  <button
                    onClick={() => {
                      onSnapCorner('bottom-right');
                      setShowCornerMenu(false);
                    }}
                    className="px-2 py-1 text-left rounded hover:bg-white/10 text-slate-300"
                  >
                    Góc dưới phải
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Chuyển sang Slim Bar */}
          <button
            onClick={() => onChangeDisplayMode('bar')}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Thu gọn thành thanh ngang (Slim Bar)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>

          {/* Ghim Always-on-top */}
          {isDesktop && (
            <button
              onClick={onTogglePin}
              className={`p-1 rounded-md transition-colors ${
                isPinned ? 'text-amber-400 bg-amber-400/10' : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
              title={isPinned ? 'Đang ghim trên cùng (bấm để bỏ)' : 'Ghim trên các cửa sổ khác'}
            >
              {isPinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Phóng to toàn màn hình */}
          <button
            onClick={onRestoreFull}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Trở lại giao diện đầy đủ"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Đóng mini window: trở về full window, không hủy phiên */}
          <button
            onClick={onRestoreFull}
            className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Đóng đồng hồ nổi (trở về giao diện chính)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Trung tâm: Thời gian đếm ngược lớn */}
      <div className="flex flex-col items-center justify-center my-1 drag-region">
        <div
          className="text-4xl font-extrabold tabular-nums tracking-tight leading-none"
          style={{
            color: isCompleted ? '#4ade80' : isRunning ? task?.color : 'var(--text-main)',
            textShadow: isRunning ? `0 0 16px ${task?.color}44` : 'none',
          }}
        >
          {formattedTime}
        </div>
        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
          {isRunning ? (
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Đang tập trung
            </span>
          ) : status === TIMER_STATUS.PAUSED ? (
            <span className="text-amber-400">Đang tạm dừng</span>
          ) : isCompleted ? (
            <span className="text-emerald-400 font-semibold">Đã hoàn thành!</span>
          ) : (
            <span>Sẵn sàng</span>
          )}
          <span>•</span>
          <span className="tabular-nums">{percent}% xong</span>
        </div>
      </div>

      {/* Chân thẻ: Nút Play/Pause và Thanh tiến độ */}
      <div className="flex flex-col gap-2 no-drag">
        {/* Nút hành động chính */}
        <button
          onClick={onTogglePlay}
          disabled={isCompleted}
          className="w-full py-1.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-transform active:scale-95 shadow"
          style={{
            backgroundColor: isCompleted ? '#334155' : task?.color || '#3b82f6',
            color: '#0f172a',
          }}
        >
          {isCompleted ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              <span>Đã hoàn thành</span>
            </>
          ) : isRunning ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Tạm dừng</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{status === TIMER_STATUS.PAUSED ? 'Tiếp tục' : 'Bắt đầu'}</span>
            </>
          )}
        </button>

        {/* Thanh tiến độ */}
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${percent}%`,
              backgroundColor: task?.color || '#3b82f6',
            }}
          />
        </div>
      </div>
    </div>
  );
}
