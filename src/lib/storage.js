import { DEFAULT_TASKS, getTodayDateString, generateSessionId } from './timer-engine.js';
export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'flow_timer_app_data_v1';
export const DEFAULT_STATE = {
  version: SCHEMA_VERSION, tasks: DEFAULT_TASKS, selectedTaskId: 'english', theme: 'dark',
  soundEnabled: true, desktopNotifications: false, reducedMotion: false,
  miniDisplayMode: 'bar', isPinned: true, handledSessionIds: [], visualMode: 'ring',
};
const text = (value, fallback, max = 100) => typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export function sanitizeLoadedState(raw) {
  raw = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const ids = new Set();
  const tasks = (Array.isArray(raw.tasks) ? raw.tasks : DEFAULT_TASKS).map((value, i) => {
    const t = value && typeof value === 'object' ? value : {};
    let id = text(t.id, `task_recovered_${i}`);
    while (ids.has(id)) id += '_copy';
    ids.add(id);
    const goal = Number.isFinite(t.goal) && t.goal >= 1 ? clamp(t.goal, 1, 86400) : 1500;
    const left = Number.isFinite(t.left) ? clamp(t.left, 0, goal) : goal;
    const runStart = Number.isFinite(t.runStart) && t.runStart >= 0 ? t.runStart : null;
    return { ...t, id, name: text(t.name, 'Công việc'), emoji: text(t.emoji, '◷', 12),
      color: /^#[0-9a-f]{6}$/i.test(t.color) ? t.color : '#a8c58a', goal, left, runStart,
      endAt: runStart !== null ? (Number.isFinite(t.endAt) ? t.endAt : runStart + left * 1000) : null,
      sessionId: text(t.sessionId, runStart !== null ? generateSessionId() : null) };
  });
  return { ...raw, version: SCHEMA_VERSION, date: text(raw.date, getTodayDateString()), tasks,
    selectedTaskId: ids.has(raw.selectedTaskId) ? raw.selectedTaskId : tasks[0]?.id ?? null,
    theme: raw.theme === 'light' ? 'light' : 'dark', soundEnabled: raw.soundEnabled !== false,
    desktopNotifications: raw.desktopNotifications === true, reducedMotion: raw.reducedMotion === true,
    miniDisplayMode: raw.miniDisplayMode === 'bar' ? 'bar' : 'card', isPinned: raw.isPinned !== false,
    visualMode: raw.visualMode === 'hourglass' ? 'hourglass' : 'ring',
    handledSessionIds: Array.isArray(raw.handledSessionIds) ? raw.handledSessionIds.filter(x => typeof x === 'string').slice(-500) : [] };
}
let syncTimer = null;
let lastSyncedString = null;

async function syncToMongoDB(data) {
  if (typeof window === 'undefined' || typeof fetch === 'undefined') return;
  try {
    const serialized = JSON.stringify(data);
    if (serialized === lastSyncedString) return;
    const res = await fetch('/api/timer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    if (res.ok) {
      lastSyncedString = serialized;
    }
  } catch (err) {
    // Hoạt động offline bình thường nếu mất mạng
  }
}

export async function loadPersistedState() {
  if (typeof window === 'undefined') return sanitizeLoadedState(null);

  let localData = null;
  if (window.electronAPI) {
    const result = await window.electronAPI.loadData();
    if (result?.success === false) throw new Error(result.error || 'Không thể đọc dữ liệu.');
    localData = sanitizeLoadedState(result?.success === true ? result.data : result);
  } else {
    const value = window.localStorage.getItem(STORAGE_KEY);
    localData = sanitizeLoadedState(value ? JSON.parse(value) : null);
  }

  // Nếu trên trình duyệt, thử kiểm tra bản lưu mới nhất từ MongoDB Atlas
  if (typeof window !== 'undefined' && !window.electronAPI && typeof fetch !== 'undefined') {
    try {
      const res = await fetch('/api/timer');
      if (res.ok) {
        const json = await res.json();
        if (json?.success && json?.data && Array.isArray(json.data.tasks) && json.data.tasks.length > 0) {
          const remoteData = sanitizeLoadedState(json.data);
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteData));
          return remoteData;
        }
      }
    } catch (e) {
      // Sử dụng localData nếu chưa kết nối được
    }
  }

  return localData;
}

// Lưu dữ liệu tức thì vào máy cục bộ (0ms), đồng thời đồng bộ ngầm lên MongoDB Atlas
export async function savePersistedState(state) {
  if (typeof window === 'undefined') return;
  const data = sanitizeLoadedState(state);

  // 1. Lưu tức thì trên máy (localStorage hoặc Electron)
  if (window.electronAPI) {
    const result = await window.electronAPI.saveData(data);
    if (!result?.success) throw new Error(result?.error || 'Không thể lưu dữ liệu.');
  } else {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // 2. Đồng bộ ngầm lên MongoDB Atlas (debounce 1 giây để tránh spam network)
  if (typeof window !== 'undefined' && !window.electronAPI) {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      syncToMongoDB(data);
    }, 1000);
  }
}
