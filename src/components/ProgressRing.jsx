'use client';

import React from 'react';

/**
 * ProgressRing - Vòng tiến độ thanh lịch hiển thị thời gian
 */
export default function ProgressRing({
  fraction = 1,
  isRunning = false,
  isCompleted = false,
  color = '#60a5fa',
  size = 140,
  strokeWidth = 8,
  onClick,
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.max(0, Math.min(1, fraction)));

  return (
    <div
      onClick={onClick}
      className="relative flex items-center justify-center cursor-pointer group transition-transform hover:scale-105 select-none"
      style={{ width: size, height: size }}
      title="Bấm để đổi góc nhìn biểu diễn thời gian"
    >
      <svg
        className="w-full h-full -rotate-90 transition-all duration-300"
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Vòng nền mờ */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Vòng tiến độ chính */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-300 ease-linear"
          style={{
            filter: isRunning
              ? `drop-shadow(0 0 8px ${color}aa)`
              : isCompleted
              ? 'drop-shadow(0 0 12px #4ade80)'
              : 'none',
          }}
        />
      </svg>

      {/* Hiển thị phần trăm ở giữa */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-xl font-bold tabular-nums" style={{ color }}>
          {Math.round(fraction * 100)}%
        </span>
        <span className="text-[11px] opacity-60 text-slate-400">còn lại</span>
      </div>
    </div>
  );
}
