import { DEFAULT_TASKS, getTodayDateString, generateSessionId } from './timer-engine.js';
export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'flow_timer_app_data_v1';
export const DEFAULT_STATE = {
  version: SCHEMA_VERSION, tasks: DEFAULT_TASKS, selectedTaskId: 'english', theme: 'dark',
  soundEnabled: true, desktopNotifications: false, reducedMotion: false,
  miniDisplayMode: 'card', isPinned: true, handledSessionIds: [], visualMode: 'ring',
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
export async function loadPersistedState() {
  if (typeof window === 'undefined') return sanitizeLoadedState(null);
  if (window.electronAPI) {
    const result = await window.electronAPI.loadData();
    if (result?.success === false) throw new Error(result.error || 'Không thể đọc dữ liệu.');
    return sanitizeLoadedState(result?.success === true ? result.data : result);
  }
  const value = window.localStorage.getItem(STORAGE_KEY);
  return sanitizeLoadedState(value ? JSON.parse(value) : null);
}
// Each mutation is persisted immediately. No trailing debounce that can lose the last action.
export async function savePersistedState(state) {
  if (typeof window === 'undefined') return;
  const data = sanitizeLoadedState(state);
  if (window.electronAPI) {
    const result = await window.electronAPI.saveData(data);
    if (!result?.success) throw new Error(result?.error || 'Không thể lưu dữ liệu.');
  } else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
