/**
 * Storage adapter - Quản lý lưu trữ và khôi phục dữ liệu
 * Hỗ trợ:
 * - Schema versioning
 * - Tự động fallback khi dữ liệu cũ hoặc lỗi định dạng
 * - Lưu qua Electron IPC nếu chạy desktop, hoặc localStorage nếu chạy web
 * - Debounced save để tránh ghi đĩa liên tục mỗi tick
 */

import { DEFAULT_TASKS, getTodayDateString } from './timer-engine.js';

export const SCHEMA_VERSION = 1;
const STORAGE_KEY = 'flow_timer_app_data_v1';

export const DEFAULT_STATE = {
  version: SCHEMA_VERSION,
  date: getTodayDateString(),
  tasks: DEFAULT_TASKS,
  selectedTaskId: 'english',
  theme: 'dark', // 'dark' | 'light'
  soundEnabled: true,
  desktopNotifications: false,
  reducedMotion: false,
  miniDisplayMode: 'card', // 'card' | 'bar'
  isPinned: true, // Always on top in mini mode
  handledSessionIds: [], // Session IDs đã kích hoạt chuông hoàn thành
  todayFocusSeconds: {}, // { [taskId]: seconds }
};

/**
 * Xác thực và chuẩn hóa dữ liệu đã lưu
 */
export function sanitizeLoadedState(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_STATE, date: getTodayDateString() };
  }

  const currentDate = getTodayDateString();
  const stateDate = raw.date || currentDate;

  // Đảm bảo tasks là mảng hợp lệ
  let tasks = Array.isArray(raw.tasks) && raw.tasks.length > 0 ? raw.tasks : DEFAULT_TASKS;

  // Chuẩn hóa từng task
  tasks = tasks.map(t => ({
    id: String(t.id || `task_${Math.random().toString(36).slice(2, 7)}`),
    name: String(t.name || 'Công việc'),
    emoji: String(t.emoji || '⏱'),
    color: String(t.color || '#60a5fa'),
    goal: typeof t.goal === 'number' && t.goal > 0 ? t.goal : 25 * 60,
    left: typeof t.left === 'number' ? Math.max(0, Math.min(t.left, t.goal || 25 * 60)) : (t.goal || 25 * 60),
    runStart: typeof t.runStart === 'number' ? t.runStart : null,
    endAt: typeof t.endAt === 'number' ? t.endAt : null,
    sessionId: t.sessionId || null,
  }));

  // Tìm selectedTaskId hợp lệ
  let selectedTaskId = raw.selectedTaskId;
  if (!tasks.some(t => t.id === selectedTaskId)) {
    selectedTaskId = tasks[0]?.id || 'english';
  }

  return {
    version: SCHEMA_VERSION,
    date: stateDate,
    tasks,
    selectedTaskId,
    theme: raw.theme === 'light' ? 'light' : 'dark',
    soundEnabled: raw.soundEnabled !== false,
    desktopNotifications: !!raw.desktopNotifications,
    reducedMotion: !!raw.reducedMotion,
    miniDisplayMode: raw.miniDisplayMode === 'bar' ? 'bar' : 'card',
    isPinned: raw.isPinned !== false,
    handledSessionIds: Array.isArray(raw.handledSessionIds) ? raw.handledSessionIds.slice(-200) : [],
    todayFocusSeconds: (typeof raw.todayFocusSeconds === 'object' && raw.todayFocusSeconds !== null)
      ? raw.todayFocusSeconds
      : {},
  };
}

/**
 * Tải dữ liệu từ LocalStorage hoặc Electron API
 */
export async function loadPersistedState() {
  try {
    // Nếu có Electron API
    if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.loadData === 'function') {
      const electronData = await window.electronAPI.loadData();
      if (electronData) {
        return sanitizeLoadedState(electronData);
      }
    }

    // Nếu chạy Web / fallback LocalStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return sanitizeLoadedState(parsed);
      }
    }
  } catch (err) {
    console.warn('[Storage] Không thể đọc dữ liệu đã lưu, sử dụng mặc định:', err);
  }

  return { ...DEFAULT_STATE, date: getTodayDateString() };
}

let saveTimeout = null;

/**
 * Lưu dữ liệu với debounce để tránh spam đĩa/storage
 */
export function savePersistedState(state, immediate = false) {
  if (typeof window === 'undefined') return;

  const doSave = () => {
    try {
      const sanitized = sanitizeLoadedState(state);
      const serialized = JSON.stringify(sanitized);

      // Lưu qua localStorage
      if (window.localStorage) {
        localStorage.setItem(STORAGE_KEY, serialized);
      }

      // Lưu qua Electron
      if (window.electronAPI && typeof window.electronAPI.saveData === 'function') {
        window.electronAPI.saveData(sanitized);
      }
    } catch (err) {
      console.error('[Storage] Lỗi khi lưu trạng thái:', err);
    }
  };

  if (immediate) {
    if (saveTimeout) clearTimeout(saveTimeout);
    doSave();
  } else {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(doSave, 800); // 800ms debounce
  }
}
