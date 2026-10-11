/**
 * Multi Timer - Quản lý các "làn" (lanes) hiển thị nhiều công việc đếm ngược song song
 * trong giao diện thu nhỏ (Slim Bar / Thẻ / PiP).
 *
 * Một làn được thêm khi công việc bắt đầu chạy, vẫn giữ lại khi tạm dừng (để bấm tiếp tục ngay),
 * lưu lại một lúc sau khi hoàn thành để hiển thị hiệu ứng chúc mừng, và bị gỡ khi đặt lại hoặc xóa.
 */
import { getTaskStatus, isTaskRunning, TIMER_STATUS } from './timer-engine.js';

export const LANE_DONE_LINGER_MS = 6000;
export const MAX_VISIBLE_LANES = 4;

const sameLanes = (a, b) =>
  a.length === b.length && a.every((lane, i) => lane.id === b[i].id && lane.doneAt === b[i].doneAt);

export function reconcileLanes(prev, tasks, focusId, now = Date.now()) {
  const previous = Array.isArray(prev) ? prev : [];
  const byId = new Map((tasks || []).map(t => [t.id, t]));
  const next = [];
  const seen = new Set();

  for (const lane of previous) {
    const task = byId.get(lane?.id);
    if (!task || seen.has(lane.id)) continue;
    const status = getTaskStatus(task, now);
    if (status === TIMER_STATUS.IDLE) continue;
    if (status === TIMER_STATUS.COMPLETED) {
      const doneAt = Number.isFinite(lane.doneAt) ? lane.doneAt : now;
      if (now - doneAt >= LANE_DONE_LINGER_MS) continue;
      next.push({ id: lane.id, doneAt });
    } else {
      next.push({ id: lane.id, doneAt: null });
    }
    seen.add(lane.id);
  }

  for (const task of tasks || []) {
    if (seen.has(task.id)) continue;
    const focusedInProgress = task.id === focusId && getTaskStatus(task, now) === TIMER_STATUS.PAUSED;
    if (isTaskRunning(task) || focusedInProgress) {
      next.push({ id: task.id, doneAt: null });
      seen.add(task.id);
    }
  }

  return sameLanes(previous, next) ? previous : next;
}

export function dismissLane(lanes, id) {
  return lanes.some(lane => lane.id === id) ? lanes.filter(lane => lane.id !== id) : lanes;
}

/** Các làn phụ (không gồm công việc đang được tập trung), kèm dữ liệu công việc, giữ đúng thứ tự xuất hiện. */
export function laneEntries(lanes, tasks, focusId) {
  const byId = new Map((tasks || []).map(t => [t.id, t]));
  return (lanes || [])
    .filter(lane => lane.id !== focusId && byId.has(lane.id))
    .map(lane => ({ task: byId.get(lane.id), doneAt: lane.doneAt }));
}

/** Chiều cao (px) khối làn phụ bên dưới thanh chính; 0 khi không có làn hoặc đang thu gọn. */
export function lanesBlockHeight(count, { collapsed = false, laneHeight = 34, gap = 4, padding = 10, max = MAX_VISIBLE_LANES } = {}) {
  if (collapsed || !Number.isFinite(count) || count <= 0) return 0;
  const rows = Math.min(count, max) + (count > max ? 1 : 0);
  return rows * laneHeight + (rows - 1) * gap + padding;
}
