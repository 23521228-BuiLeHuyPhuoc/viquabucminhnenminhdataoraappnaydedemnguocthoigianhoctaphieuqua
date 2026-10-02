'use client';

import React from 'react';
import {
  Minus,
  X,
  Settings,
  PictureInPicture2,
  Moon,
  Sun,
  Flame,
} from 'lucide-react';
import { desktopBridge } from '../lib/desktop-bridge';

export default function TitleBar({
  isDesktop = false,
  theme = 'dark',
  onToggleTheme,
  onOpenSettings,
  onToggleMiniMode,
}) {
  return (
    <header className="h-10 w-full flex items-center justify-between px-3 border-b border-white/[0.06] select-none drag-region bg-black/20 backdrop-blur-md">
      {/* Bên trái: Logo + Tên App */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-sm">
          <Flame className="w-3.5 h-3.5 fill-current" />
        </div>
        <span className="font-bold text-xs tracking-wider text-slate-200 uppercase">Flow</span>
        <span className="text-[11px] text-slate-500 hidden sm:inline">• Đồng hồ tập trung</span>
      </div>

      {/* Bên phải: Nút tiện ích & Điều khiển cửa sổ (no-drag) */}
      <div className="flex items-center gap-1 no-drag">
        {/* Nút chuyển nhanh theme */}
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
        >
          {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
        </button>

        {/* Nút mở cài đặt */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Cài đặt"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        {/* Nút bật đồng hồ nổi */}
        <button
          onClick={onToggleMiniMode}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1 text-xs"
          title="Thu nhỏ thành đồng hồ nổi Desktop"
        >
          <PictureInPicture2 className="w-3.5 h-3.5" />
          <span className="text-[11px] font-medium hidden sm:inline">Nổi</span>
        </button>

        {/* Các nút cửa sổ Windows (chỉ hiện khi chạy trong Electron) */}
        {isDesktop && (
          <div className="flex items-center ml-2 border-l border-white/10 pl-2">
            <button
              onClick={() => desktopBridge.minimize()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Thu nhỏ xuống taskbar"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => desktopBridge.close()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Đóng ứng dụng"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
