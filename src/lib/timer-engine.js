/**
 * Timer Engine - Bộ máy đếm ngược thời gian thực
 * Đảm bảo:
 * 1. Đếm dựa trên mốc thời gian thực (Date.now()), không phụ thuộc độ chính xác của setInterval.
 * 2. Chỉ 1 công việc chạy tại một thời điểm.
 * 3. Hỗ trợ các trạng thái: idle, running, paused, completed.
 * 4. Chuyển đổi công việc: xem công việc khác không dừng công việc đang chạy; bắt đầu công việc khác sẽ tạm dừng công việc cũ.
 * 5. Phiên làm việc (sessionId) duy nhất: sự kiện hoàn thành chỉ bắn duy nhất 1 lần cho mỗi phiên.
 * 6. Khôi phục an toàn sau khi ngủ (sleep) hoặc mở lại ứng dụng.
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

/**
 * Tạo ID phiên làm việc ngẫu nhiên
 */
export function generateSessionId() {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Lấy ngày hôm nay theo múi giờ Asia/Ho_Chi_Minh (YYYY-MM-DD)
 */
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
    // Fallback
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

/**
 * Tính toán số giây còn lại thực tế của một công việc tại thời điểm now
 * @param {object} task 
 * @param {number} [now=Date.now()] 
 * @returns {number}
 */
export function getRemainingSeconds(task, now = Date.now()) {
  if (!task) return 0;
  if (!task.runStart) {
    return Math.max(0, task.left ?? task.goal);
  }
  const elapsed = (now - task.runStart) / 1000;
  return Math.max(0, task.left - elapsed);
}

/**
 * Xác định trạng thái của công việc
 * @param {object} task 
 * @param {number} [now=Date.now()] 
 * @returns {'idle'|'running'|'paused'|'completed'}
 */
export function getTaskStatus(task, now = Date.now()) {
  if (!task) return TIMER_STATUS.IDLE;
  const remaining = getRemainingSeconds(task, now);

  if (remaining <= 0) {
    return TIMER_STATUS.COMPLETED;
  }
  if (task.runStart) {
    return TIMER_STATUS.RUNNING;
  }
  if (task.left < task.goal) {
    return TIMER_STATUS.PAUSED;
  }
  return TIMER_STATUS.IDLE;
}

/**
 * Chốt thời gian còn lại khi tạm dừng
 * @param {object} task 
 * @param {number} [now=Date.now()] 
 * @returns {object} task mới đã được pause
 */
export function pauseTask(task, now = Date.now()) {
  if (!task || !task.runStart) return task;
  const remaining = getRemainingSeconds(task, now);
  return {
    ...task,
    left: remaining,
    runStart: null,
    endAt: null,
  };
}

/**
 * Bắt đầu hoặc tiếp tục một công việc
 * @param {object} task 
 * @param {number} [now=Date.now()] 
 * @returns {object}
 */
export function startTask(task, now = Date.now()) {
  if (!task) return task;
  const remaining = getRemainingSeconds(task, now);
  if (remaining <= 0) return task; // Đã xong, không thể chạy tiếp nếu chưa reset

  const endAt = now + remaining * 1000;
  const sessionId = task.sessionId || generateSessionId();

  return {
    ...task,
    left: remaining,
    runStart: now,
    endAt,
    sessionId,
  };
}

/**
 * Đặt lại công việc về mục tiêu ban đầu
 * @param {object} task 
 * @returns {object}
 */
export function resetTask(task) {
  if (!task) return task;
  return {
    ...task,
    left: task.goal,
    runStart: null,
    endAt: null,
    sessionId: null,
  };
}

/**
 * Cập nhật danh sách công việc khi người dùng bấm Start/Pause cho một task
 * Quy tắc: Nếu task đang chạy -> pause. Nếu task chưa chạy -> pause các task khác, start task này.
 * @param {Array} tasks 
 * @param {string} targetTaskId 
 * @param {number} [now=Date.now()] 
 * @returns {Array}
 */
export function toggleTaskRunning(tasks, targetTaskId, now = Date.now()) {
  const target = tasks.find(t => t.id === targetTaskId);
  if (!target) return tasks;

  const isCurrentlyRunning = !!target.runStart;

  if (isCurrentlyRunning) {
    // Tạm dừng task này
    return tasks.map(t => (t.id === targetTaskId ? pauseTask(t, now) : t));
  } else {
    // Tạm dừng tất cả các task khác, bắt đầu task này
    return tasks.map(t => {
      if (t.id === targetTaskId) {
        return startTask(t, now);
      }
      return pauseTask(t, now);
    });
  }
}

/**
 * Kiểm tra các task đang chạy xem có task nào vừa hoàn thành không.
 * Trả về { updatedTasks, completedEvent }
 * completedEvent: { taskId, taskName, sessionId } hoặc null nếu không có sự kiện mới
 * @param {Array} tasks 
 * @param {Set|Array} handledSessionIds Danh sách các sessionId đã được xử lý hoàn thành
 * @param {number} [now=Date.now()] 
 */
export function checkCompletion(tasks, handledSessionIds = new Set(), now = Date.now()) {
  let completionEvent = null;
  const updatedTasks = tasks.map(t => {
    if (t.runStart) {
      const remaining = getRemainingSeconds(t, now);
      if (remaining <= 0) {
        // Task vừa hết giờ
        const finishedTask = {
          ...t,
          left: 0,
          runStart: null,
          endAt: null,
        };

        if (t.sessionId && !handledSessionIds.has(t.sessionId)) {
          completionEvent = {
            taskId: t.id,
            taskName: t.name,
            sessionId: t.sessionId,
            timestamp: now,
          };
        }
        return finishedTask;
      }
    }
    return t;
  });

  return { updatedTasks, completionEvent };
}

/**
 * Khôi phục trạng thái an toàn sau khi khởi động hoặc tải từ storage
 * Xử lý tình huống hệ thống sleep hoặc app đóng trong lúc timer đang chạy
 * @param {Array} savedTasks 
 * @param {Set} handledSessionIds 
 * @param {number} [now=Date.now()] 
 */
export function reconcileRestoredTasks(savedTasks, handledSessionIds = new Set(), now = Date.now()) {
  let expiredSessions = [];

  const tasks = (savedTasks || []).map(t => {
    if (t.runStart) {
      const remaining = getRemainingSeconds(t, now);
      if (remaining <= 0) {
        // Hết giờ trong lúc app đóng hoặc sleep
        if (t.sessionId && !handledSessionIds.has(t.sessionId)) {
          expiredSessions.push({
            taskId: t.id,
            taskName: t.name,
            sessionId: t.sessionId,
            timestamp: now,
            completedWhileClosed: true,
          });
        }
        return {
          ...t,
          left: 0,
          runStart: null,
          endAt: null,
        };
      } else {
        // Vẫn còn thời gian, tiếp tục chạy
        return {
          ...t,
          left: remaining,
          runStart: now,
          endAt: now + remaining * 1000,
        };
      }
    }
    return {
      ...t,
      left: Math.max(0, Math.min(t.left ?? t.goal, t.goal)),
    };
  });

  return { tasks, expiredSessions };
}
