'use client';

import React from 'react';

/**
 * HourglassSvg - Biểu diễn đồng hồ cát SVG tinh xảo
 * @param {number} fraction - Tỉ lệ thời gian còn lại (0 đến 1)
 * @param {boolean} isRunning - Đồng hồ đang chạy hay không
 * @param {boolean} isCompleted - Đã hoàn thành hay chưa
 * @param {string} color - Màu chủ đạo của công việc
 */
export default function HourglassSvg({
  fraction = 1,
  isRunning = false,
  isCompleted = false,
  color = '#60a5fa',
  size = 140,
  onClick,
}) {
  // Chuẩn hóa fraction trong [0, 1]
  const frac = Math.max(0, Math.min(1, fraction));
  const topHeight = 65 * frac;
  const botHeight = 65 * (1 - frac);

  return (
    <div
      onClick={onClick}
      className="relative flex items-center justify-center cursor-pointer group transition-transform hover:scale-105 active:scale-95 select-none"
      title="Bấm để đổi góc nhìn biểu diễn thời gian"
      style={{ width: size, height: size * 1.3 }}
    >
      <svg
        viewBox="0 0 120 160"
        className="w-full h-full drop-shadow-md transition-all duration-500"
        style={{
          filter: isRunning
            ? `drop-shadow(0 0 18px ${color}55) drop-shadow(0 0 4px ${color}88)`
            : isCompleted
            ? 'drop-shadow(0 0 20px rgba(74, 222, 128, 0.6))'
            : 'none',
        }}
      >
        <defs>
          {/* Đường viền ngoài của đồng hồ cát */}
          <path
            id="hgPath"
            d="M 24 16 H 96 V 32 C 96 60 66 70 64 80 C 66 90 96 100 96 128 V 144 H 24 V 128 C 24 100 54 90 56 80 C 54 70 24 60 24 32 Z"
          />
          <clipPath id="hgClip">
            <use href="#hgPath" />
          </clipPath>

          {/* Gradient màu cát */}
          <linearGradient id="sandGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.95" />
            <stop offset="100%" stopColor={color} stopOpacity="0.65" />
          </linearGradient>

          {/* Gradient hiệu ứng phản chiếu thủy tinh */}
          <linearGradient id="glassReflection" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Nền trong suốt bên trong buồng kính */}
        <use href="#hgPath" fill="rgba(255, 255, 255, 0.04)" />

        {/* Khối cát được clip theo hình dáng đồng hồ */}
        <g clipPath="url(#hgClip)">
          {/* Cát ở buồng trên (rút dần xuống) */}
          <rect
            x="0"
            y={80 - topHeight}
            width="120"
            height={topHeight}
            fill="url(#sandGradient)"
            className="transition-all duration-300 ease-linear"
          />

          {/* Cát ở buồng dưới (dâng dần lên) */}
          <rect
            x="0"
            y={144 - botHeight}
            width="120"
            height={botHeight}
            fill="url(#sandGradient)"
            className="transition-all duration-300 ease-linear"
          />

          {/* Mặt cong của đống cát ở buồng dưới */}
          {botHeight > 2 && (
            <ellipse
              cx="60"
              cy={144 - botHeight}
              rx={Math.min(32, 14 + botHeight * 0.4)}
              ry="4"
              fill={color}
              opacity="0.9"
            />
          )}
        </g>

        {/* Tia cát chảy xuống ở eo giữa */}
        {isRunning && frac > 0 && (
          <line
            x1="60"
            y1="78"
            x2="60"
            y2={144 - botHeight}
            stroke={color}
            strokeWidth="2.5"
            strokeDasharray="4 3"
            className="animate-flow-sand"
            strokeLinecap="round"
          />
        )}

        {/* Viền ngoài thủy tinh của đồng hồ */}
        <use
          href="#hgPath"
          fill="none"
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth="3.5"
          className="transition-colors duration-300"
        />

        {/* Đế trên và đế dưới gỗ/kim loại cao cấp */}
        <rect
          x="16"
          y="8"
          width="88"
          height="8"
          rx="4"
          fill="rgba(255, 255, 255, 0.85)"
          className="shadow-sm"
        />
        <rect
          x="16"
          y="144"
          width="88"
          height="8"
          rx="4"
          fill="rgba(255, 255, 255, 0.85)"
          className="shadow-sm"
        />

        {/* Vạch sáng ánh gương trang nhã */}
        <path
          d="M 32 30 C 32 55 52 68 54 75"
          stroke="url(#glassReflection)"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
