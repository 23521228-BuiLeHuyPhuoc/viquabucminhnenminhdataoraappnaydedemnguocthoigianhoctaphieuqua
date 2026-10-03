import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getRemainingSeconds,
  getTaskStatus,
  startTask,
  pauseTask,
  resetTask,
  editTask,
  toggleTaskRunning,
  checkCompletion,
  reconcileRestoredTasks,
  isTaskRunning,
  generateSessionId,
  TIMER_STATUS,
  DEFAULT_TASKS,
  PALETTE,
} from '../src/lib/timer-engine.js';

// ============================================================
// CRASH FIX VERIFICATION TESTS (Bug #5, #7)
// ============================================================

test('BUG5 FIX - editTask(task, null) không crash TypeError', () => {
  const task = { id: 'x', name: 'Test', goal: 100, left: 100, runStart: null };
  // Trước fix: TypeError: Cannot read properties of null
  const result = editTask(task, null);
  assert.deepEqual(result, task, 'editTask(task, null) phải trả về task gốc');
});

test('BUG5 FIX - editTask(task, undefined) không crash TypeError', () => {
  const task = { id: 'x', name: 'Test', goal: 100, left: 100, runStart: null };
  const result = editTask(task, undefined);
  assert.deepEqual(result, task, 'editTask(task, undefined) phải trả về task gốc');
});

test('BUG5 FIX - editTask(task, "string") không crash TypeError', () => {
  const task = { id: 'x', name: 'Test', goal: 100, left: 100, runStart: null };
  const result = editTask(task, 'invalid');
  assert.deepEqual(result, task, 'editTask(task, "string") phải trả về task gốc');
});

test('BUG5 FIX - editTask(null, changes) trả về null an toàn', () => {
  const result = editTask(null, { goal: 200 });
  assert.equal(result, null);
});

test('editTask - thay đổi goal hợp lệ reset timer', () => {
  const task = { id: 'x', name: 'Test', goal: 100, left: 60, runStart: 5000, sessionId: 's1' };
  const result = editTask(task, { goal: 200 });
  assert.equal(result.goal, 200);
  assert.equal(result.left, 200); // reset vì goal thay đổi
  assert.equal(result.runStart, null);
  assert.equal(result.sessionId, null);
});

test('editTask - thay đổi name nhưng giữ goal không reset timer', () => {
  const task = { id: 'x', name: 'Old', goal: 100, left: 60, runStart: 5000, sessionId: 's1' };
  const result = editTask(task, { name: 'New Name', goal: 100 });
  assert.equal(result.name, 'New Name');
  assert.equal(result.left, 60); // giữ nguyên vì goal không đổi
  assert.equal(result.runStart, 5000);
});

test('editTask - từ chối goal quá lớn (> 86400)', () => {
  const task = { id: 'x', name: 'Test', goal: 100, left: 100, runStart: null };
  assert.throws(() => editTask(task, { goal: 100000 }), /Thời lượng không hợp lệ/);
});

test('editTask - từ chối goal <= 0', () => {
  const task = { id: 'x', name: 'Test', goal: 100, left: 100, runStart: null };
  assert.throws(() => editTask(task, { goal: 0 }), /Thời lượng không hợp lệ/);
  assert.throws(() => editTask(task, { goal: -10 }), /Thời lượng không hợp lệ/);
});

test('editTask - từ chối goal NaN/Infinity', () => {
  const task = { id: 'x', name: 'Test', goal: 100, left: 100, runStart: null };
  assert.throws(() => editTask(task, { goal: NaN }), /Thời lượng không hợp lệ/);
  assert.throws(() => editTask(task, { goal: Infinity }), /Thời lượng không hợp lệ/);
});

test('editTask - giữ nguyên id gốc dù changes cố ghi đè', () => {
  const task = { id: 'original', name: 'Test', goal: 100, left: 100, runStart: null };
  const result = editTask(task, { id: 'hacked', name: 'Updated' });
  assert.equal(result.id, 'original', 'id phải giữ nguyên');
});

// ============================================================
// EDGE CASE: getRemainingSeconds
// ============================================================

test('getRemainingSeconds - null/undefined task trả về 0', () => {
  assert.equal(getRemainingSeconds(null), 0);
  assert.equal(getRemainingSeconds(undefined), 0);
});

test('getRemainingSeconds - task không chạy trả về left', () => {
  const task = { goal: 100, left: 75, runStart: null };
  assert.equal(getRemainingSeconds(task), 75);
});

test('getRemainingSeconds - task đang chạy với endAt chính xác', () => {
  const t0 = 1000000;
  const task = { goal: 100, left: 100, runStart: t0, endAt: t0 + 100 * 1000 };
  assert.equal(getRemainingSeconds(task, t0 + 50 * 1000), 50);
});

test('getRemainingSeconds - không bao giờ trả về âm', () => {
  const t0 = 1000;
  const task = { goal: 10, left: 10, runStart: t0, endAt: t0 + 10 * 1000 };
  assert.equal(getRemainingSeconds(task, t0 + 99999), 0);
});

test('getRemainingSeconds - goal = 0 trả về 0', () => {
  const task = { goal: 0, left: 0, runStart: null };
  assert.equal(getRemainingSeconds(task), 0);
});

test('getRemainingSeconds - left > goal bị clamp về goal', () => {
  const task = { goal: 50, left: 999, runStart: null };
  assert.equal(getRemainingSeconds(task), 50);
});

test('getRemainingSeconds - NaN left mặc định về goal', () => {
  const task = { goal: 60, left: NaN, runStart: null };
  assert.equal(getRemainingSeconds(task), 60);
});

test('getRemainingSeconds - endAt chưa set tính từ runStart + left', () => {
  const t0 = 1000000;
  const task = { goal: 100, left: 80, runStart: t0, endAt: undefined };
  // deadline = t0 + 80*1000
  assert.equal(getRemainingSeconds(task, t0 + 30 * 1000), 50);
});

// ============================================================
// EDGE CASE: getTaskStatus
// ============================================================

test('getTaskStatus - null trả về IDLE', () => {
  assert.equal(getTaskStatus(null), TIMER_STATUS.IDLE);
});

test('getTaskStatus - task mới (left === goal, no session) trả về IDLE', () => {
  const task = { goal: 100, left: 100, runStart: null, sessionId: null };
  assert.equal(getTaskStatus(task), TIMER_STATUS.IDLE);
});

test('getTaskStatus - task đã chạy một phần (left < goal, paused) trả về PAUSED', () => {
  const task = { goal: 100, left: 50, runStart: null, sessionId: 's1' };
  assert.equal(getTaskStatus(task), TIMER_STATUS.PAUSED);
});

test('getTaskStatus - task hết giờ trả về COMPLETED', () => {
  const t0 = 1000;
  const task = { goal: 10, left: 10, runStart: t0, endAt: t0 + 10 * 1000 };
  assert.equal(getTaskStatus(task, t0 + 11 * 1000), TIMER_STATUS.COMPLETED);
});

// ============================================================
// startTask EDGE CASES
// ============================================================

test('startTask - task null trả về null', () => {
  assert.equal(startTask(null), null);
});

test('startTask - task đã đang chạy trả về nguyên task', () => {
  const t0 = 1000;
  const task = { id: 'x', goal: 100, left: 100, runStart: t0 };
  const result = startTask(task, t0 + 5000);
  assert.equal(result, task);
});

test('startTask - task hết giờ (left=0) không khởi chạy', () => {
  const task = { id: 'x', goal: 100, left: 0, runStart: null };
  const result = startTask(task, 1000);
  assert.equal(result, task);
});

test('startTask - tạo sessionId mới nếu chưa có', () => {
  const task = { id: 'x', goal: 100, left: 100, runStart: null, sessionId: null };
  const result = startTask(task, 1000);
  assert.ok(result.sessionId);
  assert.match(result.sessionId, /^sess_/);
});

test('startTask - giữ sessionId cũ nếu đã có', () => {
  const task = { id: 'x', goal: 100, left: 50, runStart: null, sessionId: 'sess_old' };
  const result = startTask(task, 1000);
  assert.equal(result.sessionId, 'sess_old');
});

// ============================================================
// pauseTask EDGE CASES
// ============================================================

test('pauseTask - task không chạy trả về nguyên task', () => {
  const task = { id: 'x', goal: 100, left: 50, runStart: null };
  assert.equal(pauseTask(task), task);
});

test('pauseTask - chốt thời gian còn lại chính xác', () => {
  const t0 = 1000000;
  const task = { id: 'x', goal: 100, left: 100, runStart: t0, endAt: t0 + 100 * 1000 };
  const paused = pauseTask(task, t0 + 40 * 1000);
  assert.equal(paused.left, 60);
  assert.equal(paused.runStart, null);
  assert.equal(paused.endAt, null);
});

// ============================================================
// toggleTaskRunning EDGE CASES
// ============================================================

test('toggleTaskRunning - bắt đầu task đã completed không thay đổi gì', () => {
  const t0 = 1000;
  const tasks = [
    { id: 'done', goal: 10, left: 0, runStart: null },
    { id: 'other', goal: 60, left: 60, runStart: null },
  ];
  const result = toggleTaskRunning(tasks, 'done', t0);
  assert.equal(result, tasks); // Không thay đổi ref
});

test('toggleTaskRunning - task không tồn tại trả về mảng gốc', () => {
  const tasks = [
    { id: 'a', goal: 60, left: 60, runStart: null },
  ];
  const result = toggleTaskRunning(tasks, 'nonexistent', 1000);
  assert.equal(result, tasks);
});

test('toggleTaskRunning - 3+ tasks: chỉ 1 chạy, còn lại pause', () => {
  const t0 = 1000;
  const tasks = [
    { id: 'a', goal: 100, left: 100, runStart: t0 },
    { id: 'b', goal: 100, left: 100, runStart: null },
    { id: 'c', goal: 100, left: 100, runStart: null },
  ];
  // Bắt đầu 'b' → 'a' phải pause
  const result = toggleTaskRunning(tasks, 'b', t0 + 10 * 1000);
  assert.equal(result.find(t => t.id === 'a').runStart, null, 'A phải pause');
  assert.ok(result.find(t => t.id === 'b').runStart, 'B phải running');
  assert.equal(result.find(t => t.id === 'c').runStart, null, 'C phải idle');
});

// ============================================================
// checkCompletion EDGE CASES
// ============================================================

test('checkCompletion - mảng rỗng trả về mảng gốc', () => {
  const result = checkCompletion([], new Set(), 1000);
  assert.equal(result.updatedTasks.length, 0);
  assert.equal(result.completionEvent, null);
});

test('checkCompletion - nhiều task hết cùng lúc báo hết tất cả', () => {
  const t0 = 1000;
  const tasks = [
    { id: 'a', goal: 10, left: 10, runStart: t0, sessionId: 's1' },
    { id: 'b', goal: 5, left: 5, runStart: t0, sessionId: 's2' },
  ];
  const result = checkCompletion(tasks, new Set(), t0 + 15 * 1000);
  assert.equal(result.completionEvents.length, 2);
  assert.equal(result.updatedTasks[0].left, 0);
  assert.equal(result.updatedTasks[1].left, 0);
});

test('checkCompletion - task không running không bị ảnh hưởng', () => {
  const t0 = 1000;
  const tasks = [
    { id: 'idle', goal: 100, left: 100, runStart: null },
    { id: 'running', goal: 10, left: 10, runStart: t0, sessionId: 's1' },
  ];
  const result = checkCompletion(tasks, new Set(), t0 + 15 * 1000);
  assert.equal(result.completionEvents.length, 1);
  assert.equal(result.updatedTasks[0].left, 100); // idle giữ nguyên
});

test('checkCompletion - session đã handled không bắn lại event', () => {
  const t0 = 1000;
  const tasks = [
    { id: 'a', goal: 10, left: 10, runStart: t0, sessionId: 's1' },
  ];
  const handled = new Set(['s1']);
  const result = checkCompletion(tasks, handled, t0 + 15 * 1000);
  // Task vẫn bị chốt về 0 nhưng không tạo completionEvent mới
  assert.equal(result.completionEvents.length, 0);
  assert.equal(result.updatedTasks[0].left, 0);
});

// ============================================================
// reconcileRestoredTasks EDGE CASES
// ============================================================

test('reconcileRestoredTasks - null tasks → mảng rỗng an toàn', () => {
  const result = reconcileRestoredTasks(null, new Set(), 1000);
  assert.ok(Array.isArray(result.tasks));
  assert.equal(result.tasks.length, 0);
});

test('reconcileRestoredTasks - nhiều task running → chỉ 1 tiếp tục, còn lại pause', () => {
  const t0 = 1000;
  const tasks = [
    { id: 'a', goal: 1000, left: 1000, runStart: t0, sessionId: 's1' },
    { id: 'b', goal: 1000, left: 1000, runStart: t0, sessionId: 's2' },
    { id: 'c', goal: 1000, left: 1000, runStart: t0, sessionId: 's3' },
  ];
  const wakeTime = t0 + 100 * 1000;
  const result = reconcileRestoredTasks(tasks, new Set(), wakeTime);
  const running = result.tasks.filter(isTaskRunning);
  assert.equal(running.length, 1, 'Chỉ đúng 1 task được tiếp tục chạy');
});

test('reconcileRestoredTasks - tất cả hết giờ trả về expiredSessions đầy đủ', () => {
  const t0 = 1000;
  const tasks = [
    { id: 'a', goal: 10, left: 10, runStart: t0, sessionId: 's1' },
    { id: 'b', goal: 5, left: 5, runStart: t0, sessionId: 's2' },
  ];
  const result = reconcileRestoredTasks(tasks, new Set(), t0 + 99 * 1000);
  assert.equal(result.expiredSessions.length, 2);
  assert.ok(result.expiredSessions.every(e => e.completedWhileClosed));
});

// ============================================================
// resetTask EDGE CASES
// ============================================================

test('resetTask - null trả về null', () => {
  assert.equal(resetTask(null), null);
});

test('resetTask - đưa về goal và xóa session', () => {
  const task = { id: 'x', goal: 120, left: 30, runStart: 999, endAt: 999 + 30000, sessionId: 's1' };
  const result = resetTask(task);
  assert.equal(result.left, 120);
  assert.equal(result.runStart, null);
  assert.equal(result.endAt, null);
  assert.equal(result.sessionId, null);
});

// ============================================================
// isTaskRunning EDGE CASES
// ============================================================

test('isTaskRunning - null/undefined → false', () => {
  assert.equal(isTaskRunning(null), false);
  assert.equal(isTaskRunning(undefined), false);
});

test('isTaskRunning - runStart = null → false', () => {
  assert.equal(isTaskRunning({ runStart: null }), false);
});

test('isTaskRunning - runStart hợp lệ → true', () => {
  assert.equal(isTaskRunning({ runStart: 1000 }), true);
});

test('isTaskRunning - runStart = NaN → false', () => {
  assert.equal(isTaskRunning({ runStart: NaN }), false);
});

test('isTaskRunning - runStart = Infinity → false', () => {
  assert.equal(isTaskRunning({ runStart: Infinity }), false);
});

// ============================================================
// generateSessionId
// ============================================================

test('generateSessionId - định dạng đúng và duy nhất', () => {
  const id1 = generateSessionId();
  const id2 = generateSessionId();
  assert.match(id1, /^sess_\d+_[a-z0-9]+$/);
  assert.notEqual(id1, id2);
});

// ============================================================
// DEFAULT_TASKS & PALETTE
// ============================================================

test('DEFAULT_TASKS - mọi task có cấu trúc hợp lệ', () => {
  assert.ok(DEFAULT_TASKS.length >= 4);
  for (const task of DEFAULT_TASKS) {
    assert.ok(task.id);
    assert.ok(task.name);
    assert.ok(task.emoji);
    assert.ok(task.color);
    assert.ok(Number.isFinite(task.goal) && task.goal > 0);
    assert.equal(task.left, task.goal);
    assert.equal(task.runStart, null);
  }
});

test('PALETTE - có ít nhất 5 màu hợp lệ', () => {
  assert.ok(PALETTE.length >= 5);
  for (const color of PALETTE) {
    assert.match(color, /^#[0-9a-fA-F]{6}$/);
  }
});

// ============================================================
// STRESS TEST: Liên tục start/pause/start rất nhanh
// ============================================================

test('STRESS - Toggle liên tục 100 lần không crash', () => {
  let tasks = [
    { id: 'stress-a', goal: 3600, left: 3600, runStart: null },
    { id: 'stress-b', goal: 3600, left: 3600, runStart: null },
  ];
  let t = 1000000;
  for (let i = 0; i < 100; i++) {
    const targetId = i % 2 === 0 ? 'stress-a' : 'stress-b';
    tasks = toggleTaskRunning(tasks, targetId, t);
    t += 100; // 100ms between toggles
  }
  // Phải không crash và mỗi task phải có giá trị hợp lệ
  for (const task of tasks) {
    assert.ok(Number.isFinite(task.left));
    assert.ok(task.left >= 0);
    assert.ok(task.left <= task.goal);
  }
});

test('STRESS - checkCompletion 1000 lần liên tục trên mảng lớn', () => {
  const t0 = 1000;
  const tasks = Array.from({ length: 20 }, (_, i) => ({
    id: `task-${i}`,
    goal: 60 + i * 10,
    left: 60 + i * 10,
    runStart: i < 5 ? t0 : null,
    sessionId: i < 5 ? `sess_${i}` : null,
  }));
  const handled = new Set();
  let current = tasks;
  for (let tick = 0; tick < 1000; tick++) {
    const time = t0 + tick * 1000;
    const result = checkCompletion(current, handled, time);
    result.completionEvents.forEach(e => handled.add(e.sessionId));
    current = result.updatedTasks;
  }
  // Mọi task đang chạy phải đã hoàn thành sau 1000s
  for (let i = 0; i < 5; i++) {
    assert.equal(current[i].left, 0);
    assert.equal(current[i].runStart, null);
  }
});

// ============================================================
// BACKWARD CLOCK JUMP PROTECTION
// ============================================================

test('getRemainingSeconds - backward clock jump không cộng thêm thời gian', () => {
  const t0 = 1000000;
  const task = { goal: 100, left: 100, runStart: t0, endAt: t0 + 100 * 1000 };
  // Bình thường tại t0+50s: 50s còn lại
  const normal = getRemainingSeconds(task, t0 + 50 * 1000);
  assert.equal(normal, 50);
  // Clock jump backward 30s: phải không vượt quá left ban đầu (100)
  const backward = getRemainingSeconds(task, t0 - 30 * 1000);
  assert.ok(backward <= task.left, 'Backward clock jump không được vượt quá left');
});
