import test from 'node:test';
import assert from 'node:assert/strict';
import { toggleTaskRunning, checkCompletion, resetTask } from '../src/lib/timer-engine.js';
import {
  reconcileLanes,
  dismissLane,
  laneEntries,
  lanesBlockHeight,
  LANE_DONE_LINGER_MS,
  MAX_VISIBLE_LANES,
} from '../src/lib/multi-timer.js';

const t0 = 1_000_000;
const makeTasks = () => [
  { id: 'a', name: 'A', goal: 100, left: 100, runStart: null, endAt: null, sessionId: null },
  { id: 'b', name: 'B', goal: 60, left: 60, runStart: null, endAt: null, sessionId: null },
  { id: 'c', name: 'C', goal: 300, left: 300, runStart: null, endAt: null, sessionId: null },
];

test('reconcileLanes - không có việc nào chạy → không có làn', () => {
  const lanes = reconcileLanes([], makeTasks(), 'a', t0);
  assert.deepEqual(lanes, []);
});

test('reconcileLanes - mỗi việc đang chạy có một làn, theo thứ tự bắt đầu', () => {
  let tasks = makeTasks();
  tasks = toggleTaskRunning(tasks, 'c', t0);
  let lanes = reconcileLanes([], tasks, 'a', t0);
  tasks = toggleTaskRunning(tasks, 'a', t0 + 1000);
  lanes = reconcileLanes(lanes, tasks, 'a', t0 + 1000);
  assert.deepEqual(lanes.map(l => l.id), ['c', 'a']);
});

test('reconcileLanes - giữ nguyên tham chiếu khi không có thay đổi', () => {
  const tasks = toggleTaskRunning(makeTasks(), 'a', t0);
  const lanes = reconcileLanes([], tasks, 'b', t0);
  assert.equal(reconcileLanes(lanes, tasks, 'b', t0 + 2000), lanes);
});

test('reconcileLanes - tạm dừng vẫn giữ làn để bấm tiếp tục', () => {
  let tasks = toggleTaskRunning(makeTasks(), 'b', t0);
  let lanes = reconcileLanes([], tasks, 'a', t0);
  tasks = toggleTaskRunning(tasks, 'b', t0 + 5000);
  lanes = reconcileLanes(lanes, tasks, 'a', t0 + 5000);
  assert.deepEqual(lanes, [{ id: 'b', doneAt: null }]);
});

test('reconcileLanes - đặt lại (reset) gỡ làn', () => {
  let tasks = toggleTaskRunning(makeTasks(), 'b', t0);
  let lanes = reconcileLanes([], tasks, 'a', t0);
  tasks = tasks.map(t => (t.id === 'b' ? resetTask(t) : t));
  lanes = reconcileLanes(lanes, tasks, 'a', t0 + 1000);
  assert.deepEqual(lanes, []);
});

test('reconcileLanes - xóa công việc gỡ làn', () => {
  const tasks = toggleTaskRunning(makeTasks(), 'b', t0);
  const lanes = reconcileLanes([], tasks, 'a', t0);
  assert.deepEqual(reconcileLanes(lanes, tasks.filter(t => t.id !== 'b'), 'a', t0), []);
});

test('reconcileLanes - hoàn thành: giữ làn để chúc mừng rồi tự gỡ', () => {
  let tasks = toggleTaskRunning(makeTasks(), 'b', t0);
  let lanes = reconcileLanes([], tasks, 'a', t0);
  const doneTime = t0 + 61 * 1000;
  tasks = checkCompletion(tasks, new Set(), doneTime).updatedTasks;
  lanes = reconcileLanes(lanes, tasks, 'a', doneTime);
  assert.deepEqual(lanes, [{ id: 'b', doneAt: doneTime }]);

  lanes = reconcileLanes(lanes, tasks, 'a', doneTime + LANE_DONE_LINGER_MS - 1);
  assert.equal(lanes.length, 1);
  lanes = reconcileLanes(lanes, tasks, 'a', doneTime + LANE_DONE_LINGER_MS);
  assert.deepEqual(lanes, []);
});

test('reconcileLanes - việc đang tập trung bị tạm dừng giữa chừng cũng có làn', () => {
  let tasks = toggleTaskRunning(makeTasks(), 'a', t0);
  tasks = toggleTaskRunning(tasks, 'a', t0 + 10 * 1000);
  const lanes = reconcileLanes([], tasks, 'a', t0 + 10 * 1000);
  assert.deepEqual(lanes.map(l => l.id), ['a']);
});

test('dismissLane - gỡ đúng làn, giữ tham chiếu khi không tìm thấy', () => {
  const lanes = [{ id: 'a', doneAt: null }, { id: 'b', doneAt: null }];
  assert.deepEqual(dismissLane(lanes, 'a'), [{ id: 'b', doneAt: null }]);
  assert.equal(dismissLane(lanes, 'zzz'), lanes);
});

test('laneEntries - bỏ qua việc đang tập trung và làn mồ côi', () => {
  const tasks = makeTasks();
  const lanes = [{ id: 'a', doneAt: null }, { id: 'ghost', doneAt: null }, { id: 'c', doneAt: 5 }];
  const entries = laneEntries(lanes, tasks, 'a');
  assert.deepEqual(entries.map(e => e.task.id), ['c']);
  assert.equal(entries[0].doneAt, 5);
});

test('lanesBlockHeight - tính đúng chiều cao, có hàng "+N" khi vượt giới hạn', () => {
  assert.equal(lanesBlockHeight(0), 0);
  assert.equal(lanesBlockHeight(2, { collapsed: true }), 0);
  assert.equal(lanesBlockHeight(1), 34 + 10);
  assert.equal(lanesBlockHeight(2), 2 * 34 + 4 + 10);
  const overflow = lanesBlockHeight(MAX_VISIBLE_LANES + 3);
  const rows = MAX_VISIBLE_LANES + 1;
  assert.equal(overflow, rows * 34 + (rows - 1) * 4 + 10);
  assert.equal(lanesBlockHeight(NaN), 0);
});
