import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getRemainingSeconds,
  getTaskStatus,
  startTask,
  pauseTask,
  resetTask,
  toggleTaskRunning,
  checkCompletion,
  reconcileRestoredTasks,
  TIMER_STATUS,
} from '../src/lib/timer-engine.js';

test('Timer Engine - Bắt đầu một phiên, pause và resume mà không mất thời gian đã chốt', () => {
  const task0 = {
    id: 'test-1',
    name: 'Test Task',
    goal: 100,
    left: 100,
    runStart: null,
  };

  const t0 = 1000000;
  // 1. Bắt đầu
  const started = startTask(task0, t0);
  assert.equal(started.runStart, t0);
  assert.equal(getTaskStatus(started, t0), TIMER_STATUS.RUNNING);

  // 2. Chạy 30 giây thực tế
  const t1 = t0 + 30 * 1000;
  const rem30 = getRemainingSeconds(started, t1);
  assert.equal(rem30, 70);

  // 3. Tạm dừng tại giây thứ 30
  const paused = pauseTask(started, t1);
  assert.equal(paused.runStart, null);
  assert.equal(paused.left, 70);
  assert.equal(getTaskStatus(paused, t1), TIMER_STATUS.PAUSED);

  // 4. Đợi thêm 100 giây trong trạng thái pause
  const t2 = t1 + 100 * 1000;
  assert.equal(getRemainingSeconds(paused, t2), 70); // Không bị trừ thêm

  // 5. Tiếp tục chạy từ giây 70
  const resumed = startTask(paused, t2);
  assert.equal(resumed.runStart, t2);
  assert.equal(resumed.left, 70);

  // 6. Chạy tiếp 20 giây thực tế
  const t3 = t2 + 20 * 1000;
  assert.equal(getRemainingSeconds(resumed, t3), 50);
});

test('Timer Engine - Đang chạy A, chọn xem B: A vẫn tiếp tục chạy độc lập', () => {
  const t0 = 1000000;
  let tasks = [
    { id: 'task-a', name: 'Task A', goal: 60, left: 60, runStart: null },
    { id: 'task-b', name: 'Task B', goal: 60, left: 60, runStart: null },
  ];

  // Bắt đầu Task A
  tasks = toggleTaskRunning(tasks, 'task-a', t0);
  assert.equal(tasks[0].id, 'task-a');
  assert.ok(tasks[0].runStart);
  assert.equal(tasks[1].runStart, null);

  // Chỉ xem Task B (không bấm toggle) -> trạng thái tasks không đổi, A vẫn chạy
  const t1 = t0 + 10 * 1000;
  assert.equal(getRemainingSeconds(tasks[0], t1), 50);
  assert.equal(getRemainingSeconds(tasks[1], t1), 60);
});

test('Timer Engine - Bắt đầu B trong lúc A đang chạy: A pause, chỉ B chạy', () => {
  const t0 = 1000000;
  let tasks = [
    { id: 'task-a', name: 'Task A', goal: 100, left: 100, runStart: null },
    { id: 'task-b', name: 'Task B', goal: 80, left: 80, runStart: null },
  ];

  // Bắt đầu Task A
  tasks = toggleTaskRunning(tasks, 'task-a', t0);
  assert.ok(tasks.find(t => t.id === 'task-a').runStart);

  // Sau 25 giây, người dùng bấm bắt đầu Task B
  const t1 = t0 + 25 * 1000;
  tasks = toggleTaskRunning(tasks, 'task-b', t1);

  const taskA = tasks.find(t => t.id === 'task-a');
  const taskB = tasks.find(t => t.id === 'task-b');

  // Task A đã được chốt và pause ở 75s còn lại
  assert.equal(taskA.runStart, null);
  assert.equal(taskA.left, 75);
  assert.equal(getTaskStatus(taskA, t1), TIMER_STATUS.PAUSED);

  // Chỉ Task B đang chạy
  assert.equal(taskB.runStart, t1);
  assert.equal(getTaskStatus(taskB, t1), TIMER_STATUS.RUNNING);
});

test('Timer Engine - Reset đưa về mục tiêu và dừng timer', () => {
  const task = {
    id: 'test-reset',
    name: 'Reset Test',
    goal: 120,
    left: 40,
    runStart: 1000,
    sessionId: 'sess_1',
  };

  const reset = resetTask(task);
  assert.equal(reset.left, 120);
  assert.equal(reset.runStart, null);
  assert.equal(reset.sessionId, null);
  assert.equal(getTaskStatus(reset), TIMER_STATUS.IDLE);
});

test('Timer Engine - Sự kiện hoàn thành (checkCompletion) chỉ bắn duy nhất một lần cho mỗi phiên', () => {
  const t0 = 1000000;
  const taskRunning = {
    id: 'test-done',
    name: 'Done Task',
    goal: 50,
    left: 50,
    runStart: t0,
    sessionId: 'sess_unique_123',
  };

  const handledSessionIds = new Set();

  // Tại t0 + 49s: chưa hết
  const res1 = checkCompletion([taskRunning], handledSessionIds, t0 + 49 * 1000);
  assert.equal(res1.completionEvent, null);
  assert.equal(res1.updatedTasks[0].left, 50); // Vẫn đang run

  // Tại t0 + 51s: vừa hết giờ!
  const res2 = checkCompletion([taskRunning], handledSessionIds, t0 + 51 * 1000);
  assert.notEqual(res2.completionEvent, null);
  assert.equal(res2.completionEvent.sessionId, 'sess_unique_123');
  assert.equal(res2.completionEvent.taskId, 'test-done');
  assert.equal(res2.updatedTasks[0].left, 0);
  assert.equal(res2.updatedTasks[0].runStart, null);

  // Đánh dấu đã xử lý
  handledSessionIds.add('sess_unique_123');

  // Lần tick tiếp theo: KHÔNG được bắn lại sự kiện hoàn thành
  const res3 = checkCompletion(res2.updatedTasks, handledSessionIds, t0 + 52 * 1000);
  assert.equal(res3.completionEvent, null);
});

test('Timer Engine - Khôi phục an toàn (reconcileRestoredTasks) khi app sleep hoặc đóng lúc đang chạy', () => {
  const t0 = 1000000;
  const savedTasks = [
    {
      id: 'task-expired',
      name: 'Expired While Sleeping',
      goal: 60,
      left: 60,
      runStart: t0,
      sessionId: 'sess_sleep_1',
    },
    {
      id: 'task-still-running',
      name: 'Still Running',
      goal: 1000,
      left: 1000,
      runStart: t0,
      sessionId: 'sess_running_2',
    }
  ];

  const handled = new Set();
  // Giả sử máy tính thức dậy sau 200 giây
  const wakeTime = t0 + 200 * 1000;

  const { tasks, expiredSessions } = reconcileRestoredTasks(savedTasks, handled, wakeTime);

  // Task expired đã bị chốt về 0 và ghi nhận sự kiện hết hạn
  const tExp = tasks.find(t => t.id === 'task-expired');
  assert.equal(tExp.left, 0);
  assert.equal(tExp.runStart, null);
  assert.equal(expiredSessions.length, 1);
  assert.equal(expiredSessions[0].sessionId, 'sess_sleep_1');

  // Task còn thời gian: tiếp tục chạy với thời gian còn lại chính xác (1000 - 200 = 800)
  const tRun = tasks.find(t => t.id === 'task-still-running');
  assert.equal(tRun.left, 800);
  assert.equal(tRun.runStart, wakeTime);
});

test('Timer Engine - Thời gian còn lại không bao giờ âm', () => {
  const task = {
    id: 'test-zero',
    name: 'Zero Test',
    goal: 10,
    left: 10,
    runStart: 1000,
  };
  // Đã trôi 50 giây trong khi mục tiêu chỉ 10 giây
  const remaining = getRemainingSeconds(task, 1000 + 50 * 1000);
  assert.equal(remaining, 0);
});
