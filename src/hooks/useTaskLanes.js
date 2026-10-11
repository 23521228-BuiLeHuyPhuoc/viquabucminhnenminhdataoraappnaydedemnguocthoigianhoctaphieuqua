import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { reconcileLanes, dismissLane, laneEntries, MAX_VISIBLE_LANES } from '../lib/multi-timer.js';
import { getTaskStatus, isTaskRunning, TIMER_STATUS } from '../lib/timer-engine.js';

/**
 * Theo dõi các công việc đang đếm ngược song song để giao diện thu nhỏ hiển thị thành từng "làn".
 * Trả về các làn phụ (không gồm việc đang tập trung), số làn bị ẩn và thao tác gỡ làn.
 */
export default function useTaskLanes(tasks, focusId, now) {
  const [lanes, setLanes] = useState(() => reconcileLanes([], tasks, focusId, now));

  useEffect(() => {
    setLanes(previous => reconcileLanes(previous, tasks, focusId, now));
  }, [tasks, focusId, now]);

  const entries = useMemo(() => laneEntries(lanes, tasks, focusId), [lanes, tasks, focusId]);
  const dismiss = useCallback(id => setLanes(previous => dismissLane(previous, id)), []);

  return {
    entries,
    visible: entries.slice(0, MAX_VISIBLE_LANES),
    hiddenCount: Math.max(0, entries.length - MAX_VISIBLE_LANES),
    dismiss,
  };
}

/** Khi vừa mở giao diện thu nhỏ mà việc đang chọn chưa chạy, tự đưa một việc đang chạy lên làm việc chính. */
export function useFocusRunningOnMount(flow, task) {
  useEffect(() => {
    const status = task ? getTaskStatus(task, Date.now()) : TIMER_STATUS.IDLE;
    if (status === TIMER_STATUS.RUNNING || status === TIMER_STATUS.PAUSED) return;
    const running = (flow.state?.tasks || []).find(isTaskRunning);
    if (running && running.id !== task?.id) flow.select(running.id);
    // Chỉ chạy một lần khi cửa sổ nổi vừa mở.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Bật hiệu ứng chúc mừng ngắn mỗi khi có phiên vừa hoàn thành. */
export function useCelebration(celebration, duration = 2800) {
  const [active, setActive] = useState(null);
  // Bỏ qua lần hoàn thành đã xảy ra trước khi giao diện này được mở, tránh phát lại hiệu ứng cũ.
  const seenOnMount = useRef(celebration);
  useEffect(() => {
    if (!celebration || celebration === seenOnMount.current) return;
    setActive(celebration);
    const timeout = setTimeout(() => setActive(null), duration);
    return () => clearTimeout(timeout);
  }, [celebration, duration]);
  return active;
}
