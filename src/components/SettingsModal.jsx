'use client';

import React from 'react';
import { X, Volume2, VolumeX, Moon, Sun, Bell, Sparkles, Layout } from 'lucide-react';
import { playCompletionSound } from '../lib/sound';
import { desktopBridge } from '../lib/desktop-bridge';

export default function SettingsModal({
  isOpen,
  onClose,
  theme = 'dark',
  onToggleTheme,
  soundEnabled = true,
  onToggleSound,
  desktopNotifications = false,
  onToggleNotifications,
  reducedMotion = false,
  onToggleReducedMotion,
  miniDisplayMode = 'card',
  onChangeMiniDisplayMode,
}) {
  if (!isOpen) return null;

  const handleTestSound = () => {
    playCompletionSound();
  };

  const handleRequestNotify = async () => {
    if (!desktopNotifications) {
      const granted = await desktopBridge.requestNotificationPermission();
      onToggleNotifications(granted);
    } else {
      onToggleNotifications(false);
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
          <h3 className="font-bold text-sm text-slate-100">Cài đặt ứng dụng</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {/* Giao diện Sáng / Tối */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              {theme === 'dark' ? (
                <Moon className="w-4 h-4 text-indigo-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-200">Giao diện</span>
                <span className="text-[11px] text-slate-400">
                  {theme === 'dark' ? 'Chế độ tối (Dark mode)' : 'Chế độ sáng (Light mode)'}
                </span>
              </div>
            </div>
            <button
              onClick={onToggleTheme}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-colors"
            >
              {theme === 'dark' ? 'Chuyển sáng' : 'Chuyển tối'}
            </button>
          </div>

          {/* Âm thanh chuông báo */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-200">Chuông khi hoàn thành</span>
                <span className="text-[11px] text-slate-400">Âm thanh chuông nhẹ nhàng</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleTestSound}
                className="px-2 py-1.5 rounded-lg text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-slate-300"
                title="Nghe thử âm chuông"
              >
                Nghe thử
              </button>
              <button
                onClick={onToggleSound}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                  soundEnabled ? 'bg-blue-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    soundEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Kiểu hiển thị đồng hồ nổi */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <Layout className="w-4 h-4 text-sky-400" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-200">Kiểu đồng hồ nổi</span>
                <span className="text-[11px] text-slate-400">
                  {miniDisplayMode === 'card' ? 'Thẻ gọn (Compact Card)' : 'Thanh ngang (Slim Bar)'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg">
              <button
                onClick={() => onChangeMiniDisplayMode('card')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                  miniDisplayMode === 'card' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Card
              </button>
              <button
                onClick={() => onChangeMiniDisplayMode('bar')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                  miniDisplayMode === 'bar' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Slim
              </button>
            </div>
          </div>

          {/* Giảm chuyển động (Reduced Motion) */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-200">Giảm hiệu ứng động</span>
                <span className="text-[11px] text-slate-400">Tắt hoạt ảnh cát rơi và nhấp nháy</span>
              </div>
            </div>
            <button
              onClick={onToggleReducedMotion}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                reducedMotion ? 'bg-blue-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  reducedMotion ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Thông báo desktop */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-amber-400" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-200">Thông báo hệ thống</span>
                <span className="text-[11px] text-slate-400">Báo khi hết giờ đếm ngược</span>
              </div>
            </div>
            <button
              onClick={handleRequestNotify}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                desktopNotifications ? 'bg-blue-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  desktopNotifications ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
