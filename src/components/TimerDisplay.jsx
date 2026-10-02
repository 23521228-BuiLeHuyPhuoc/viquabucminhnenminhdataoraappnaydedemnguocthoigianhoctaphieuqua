'use client';

import React from 'react';
import { formatRemaining } from '../lib/time-parser';
import { TIMER_STATUS } from '../lib/timer-engine';

export const VIETNAMESE_QUOTES = [
  'Mỗi phút hôm nay là một viên gạch xây nên phiên bản tốt hơn của bạn.',
  'Không cần hoàn hảo, chỉ cần có mặt đều đặn mỗi ngày.',
  'Hạt cát nào cũng rơi xuống, hãy để nó rơi vào việc bạn thật sự muốn.',
  'Bạn của ngày mai sẽ cảm ơn bạn của hôm nay.',
  'Mệt thì nghỉ một chút rồi quay lại, tiến độ vẫn còn đó.',
  'Đừng nhìn cả ngọn núi, chỉ cần nhìn bước chân tiếp theo.',
  'Một giờ tập trung đáng giá hơn ba giờ lướt điện thoại.',
  'Bắt đầu là phần khó nhất, và bạn đang làm được rồi đó.',
  'Dòng thời gian lặng lẽ trôi, giá trị đọng lại do chính bạn tạo ra.',
];

export default function TimerDisplay({
  remainingSeconds = 0,
  goalSeconds = 0,
  status = TIMER_STATUS.IDLE,
  taskName = '',
  taskEmoji = '⏱',
  taskColor = '#60a5fa',
  quoteIndex = 0,
}) {
  const formattedTime = formatRemaining(remainingSeconds);
  const quote = VIETNAMESE_QUOTES[quoteIndex % VIETNAMESE_QUOTES.length];

  // Trạng thái hiển thị
  const getStatusBadge = () => {
    switch (status) {
      case TIMER_STATUS.RUNNING:
        return (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide transition-all shadow-sm"
            style={{
              backgroundColor: `${taskColor}22`,
              color: taskColor,
              border: `1px solid ${taskColor}44`,
            }}
          >
            <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: taskColor }} />
            Đang tập trung...
          </span>
        );
      case TIMER_STATUS.PAUSED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Đang tạm dừng
          </span>
        );
      case TIMER_STATUS.COMPLETED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            🎉 Hoàn thành mục tiêu!
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            Sẵn sàng bắt đầu
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center text-center select-none w-full max-w-md mx-auto">
      {/* Tiêu đề công việc */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl" role="img" aria-label="task emoji">
          {taskEmoji}
        </span>
        <h2 className="text-lg font-bold tracking-tight text-slate-100 max-w-[260px] truncate" title={taskName}>
          {taskName}
        </h2>
      </div>

      {/* Huy hiệu trạng thái */}
      <div className="mb-3">{getStatusBadge()}</div>

      {/* Hiển thị số đồng hồ lớn với tabular-nums */}
      <div
        className="text-5xl sm:text-6xl font-black tabular-nums tracking-tight py-1 transition-all duration-300 drop-shadow-sm"
        style={{
          color: status === TIMER_STATUS.COMPLETED ? '#4ade80' : 'var(--text-main)',
          textShadow: status === TIMER_STATUS.RUNNING ? `0 0 24px ${taskColor}40` : 'none',
        }}
      >
        {formattedTime}
      </div>

      {/* Câu châm ngôn tích cực */}
      <div className="mt-3 px-4 py-2 rounded-xl text-xs sm:text-[13px] leading-relaxed italic text-slate-400 max-w-sm border border-white/5 bg-white/[0.02]">
        &ldquo;{quote}&rdquo;
      </div>
    </div>
  );
}
