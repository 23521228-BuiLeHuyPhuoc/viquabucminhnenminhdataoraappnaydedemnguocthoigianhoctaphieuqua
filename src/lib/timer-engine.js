/**
 * Timer Engine - Bộ máy đếm ngược thời gian thực
 */

export const TIMER_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
};

export const DEFAULT_TASKS = [
  { id: 'english', name: 'Tiếng Anh', emoji: '🇬🇧', color: '#60a5fa', goal: 90 * 60, left: 90 * 60, runStart: null, endAt: null, sessionId: null, completedSessions: [] },
  { id: 'thesis',  name: 'Khóa luận', emoji: '🎓', color: '#c084fc', goal: 150 * 60, left: 150 * 60, runStart: null, endAt: null, sessionId: null, completedSessions: [] },
  { id: 'coding',  name: 'Lập trình', emoji: '💻', color: '#4ade80', goal: 120 * 60, left: 120 * 60, runStart: null, endAt: null, sessionId: null, completedSessions: [] },
  { id: 'reading', name: 'Đọc sách',  emoji: '📖', color: '#fb923c', goal: 45 * 60, left: 45 * 60, runStart: null, endAt: null, sessionId: null, completedSessions: [] },
];

export const PALETTE = [
  '#60a5fa', // Blue
  '#c084fc', // Purple
  '#4ade80', // Green
  '#fb923c', // Orange
  '#f472b6', // Pink
  '#38bdf8', // Sky
  '#e879f9', // Fuchsia
  '#a3e635', // Lime
];

export function generateSessionId() {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getTodayDateString() {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(new Date());
  } catch (e) {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

export const isTaskRunning = task => Number.isFinite(task?.runStart);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function getRemainingSeconds(task, now = Date.now()) {
  if (!task) return 0;
  const goal = Number.isFinite(task.goal) && task.goal > 0 ? task.goal : 0;
  const left = Number.isFinite(task.left) ? clamp(task.left, 0, goal) : goal;
  if (!isTaskRunning(task)) return left;
  const deadline = Number.isFinite(task.endAt) ? task.endAt : task.runStart + left * 1000;
  // Prevent a backwards system-clock jump from adding more time than this segment began with.
  return clamp((deadline - now) / 1000, 0, left);
}
export function getTaskStatus(task, now = Date.now()) {
  if (!task) return TIMER_STATUS.IDLE;
  if (getRemainingSeconds(task, now) <= 0) return TIMER_STATUS.COMPLETED;
  if (isTaskRunning(task)) return TIMER_STATUS.RUNNING;
  return task.left < task.goal || task.sessionId ? TIMER_STATUS.PAUSED : TIMER_STATUS.IDLE;
}
export function pauseTask(task, now = Date.now()) {
  if (!isTaskRunning(task)) return task;
  return { ...task, left: getRemainingSeconds(task, now), runStart: null, endAt: null };
}
export function startTask(task, now = Date.now()) {
  if (!task || isTaskRunning(task)) return task;
  const left = getRemainingSeconds(task, now);
  if (left <= 0) return task;
  return { ...task, left, runStart: now, endAt: now + left * 1000,
    sessionId: task.sessionId || generateSessionId() };
}
export function resetTask(task) {
  return task ? { ...task, left: task.goal, runStart: null, endAt: null, sessionId: null } : task;
}
export function editTask(task, changes) {
  if (!task) return task;
  const goal = changes.goal ?? task.goal;
  if (!Number.isFinite(goal) || goal < 1 || goal > 86400) throw new Error('Thời lượng không hợp lệ.');
  const updated = { ...task, ...changes, id: task.id, goal };
  return goal === task.goal ? updated : resetTask(updated);
}
export function toggleTaskRunning(tasks, targetTaskId, now = Date.now()) {
  const target = tasks.find(t => t.id === targetTaskId);
  // Starting a completed task must not pause another task.
  if (!target || getRemainingSeconds(target, now) <= 0) return tasks;
  if (isTaskRunning(target)) return tasks.map(t => t.id === targetTaskId ? pauseTask(t, now) : t);
  return tasks.map(t => t.id === targetTaskId ? startTask(t, now) : pauseTask(t, now));
}
export function checkCompletion(tasks, handledSessionIds = new Set(), now = Date.now()) {
  const completionEvents = [];
  let changed = false;
  const seen = new Set(handledSessionIds);
  const updatedTasks = tasks.map(t => {
    if (!isTaskRunning(t) || getRemainingSeconds(t, now) > 0) return t;
    changed = true;
    if (t.sessionId && !seen.has(t.sessionId)) {
      seen.add(t.sessionId);
      completionEvents.push({ taskId: t.id, taskName: t.name, sessionId: t.sessionId,
        timestamp: t.endAt ?? (t.runStart + t.left * 1000) });
    }
    return { ...t, left: 0, runStart: null, endAt: null };
  });
  return { updatedTasks: changed ? updatedTasks : tasks,
    completionEvent: completionEvents[0] || null, completionEvents };
}
export function reconcileRestoredTasks(savedTasks, handledSessionIds = new Set(), now = Date.now()) {
  const result = checkCompletion(savedTasks || [], handledSessionIds, now);
  let hasRunning = false;
  const tasks = result.updatedTasks.map(t => {
    if (!isTaskRunning(t)) return t;
    if (hasRunning) return pauseTask(t, now);
    hasRunning = true;
    const left = getRemainingSeconds(t, now);
    return { ...t, left, runStart: now, endAt: now + left * 1000 };
  });
  return { tasks, expiredSessions: result.completionEvents.map(e => ({ ...e, completedWhileClosed: true })) };
}
