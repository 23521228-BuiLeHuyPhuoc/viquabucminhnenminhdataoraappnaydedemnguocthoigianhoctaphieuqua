import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeLoadedState,
  DEFAULT_STATE,
  SCHEMA_VERSION,
  STORAGE_KEY,
} from '../src/lib/storage.js';

// ============================================================
// BUG #3 & #8 FIX VERIFICATION
// ============================================================

test('BUG8 FIX - task với left=0, runStart set → phải clear runStart (ghost running)', () => {
  const state = {
    tasks: [
      { id: 'ghost', name: 'Ghost', goal: 100, left: 0, runStart: 5000, endAt: 5000 + 100000, sessionId: 's1' },
    ],
  };
  const clean = sanitizeLoadedState(state);
  const task = clean.tasks[0];
  assert.equal(task.runStart, null, 'runStart phải null khi left=0');
  assert.equal(task.endAt, null, 'endAt phải null khi left=0');
});

test('BUG8 FIX - task với left > 0, runStart set → giữ nguyên running', () => {
  const state = {
    tasks: [
      { id: 'running', name: 'Running', goal: 100, left: 50, runStart: 5000, endAt: 5000 + 50000 },
    ],
  };
  const clean = sanitizeLoadedState(state);
  const task = clean.tasks[0];
  assert.equal(task.runStart, 5000, 'runStart phải giữ nguyên khi left > 0');
  assert.equal(task.endAt, 5000 + 50000);
});

// ============================================================
// sanitizeLoadedState - EXTREME CORRUPTION SCENARIOS
// ============================================================

test('sanitize - dữ liệu hoàn toàn rác (mảng thay vì object)', () => {
  const clean = sanitizeLoadedState([1, 2, 3]);
  assert.equal(clean.version, SCHEMA_VERSION);
  assert.ok(Array.isArray(clean.tasks));
});

test('sanitize - dữ liệu là số', () => {
  const clean = sanitizeLoadedState(42);
  assert.equal(clean.version, SCHEMA_VERSION);
  assert.ok(clean.tasks.length > 0);
});

test('sanitize - dữ liệu là chuỗi', () => {
  const clean = sanitizeLoadedState('hello');
  assert.equal(clean.version, SCHEMA_VERSION);
  assert.ok(clean.tasks.length > 0);
});

test('sanitize - dữ liệu là boolean', () => {
  const clean = sanitizeLoadedState(true);
  assert.equal(clean.version, SCHEMA_VERSION);
});

test('sanitize - tasks là object thay vì mảng', () => {
  const clean = sanitizeLoadedState({ tasks: { a: 1 } });
  assert.ok(Array.isArray(clean.tasks));
  assert.ok(clean.tasks.length > 0, 'Phải fallback về DEFAULT_TASKS');
});

test('sanitize - tasks có phần tử null/undefined/number', () => {
  const clean = sanitizeLoadedState({
    tasks: [null, undefined, 42, 'string', { id: 'valid', name: 'OK', goal: 60, left: 60 }],
  });
  assert.equal(clean.tasks.length, 5, 'Mỗi phần tử phải được sanitize thành object');
  // Tất cả phải có id, name, goal hợp lệ
  for (const task of clean.tasks) {
    assert.ok(task.id);
    assert.ok(task.name);
    assert.ok(Number.isFinite(task.goal) && task.goal > 0);
  }
});

test('sanitize - task goal âm → mặc định 1500', () => {
  const clean = sanitizeLoadedState({ tasks: [{ id: 'neg', goal: -100 }] });
  assert.equal(clean.tasks[0].goal, 1500);
});

test('sanitize - task goal NaN → mặc định 1500', () => {
  const clean = sanitizeLoadedState({ tasks: [{ id: 'nan', goal: NaN }] });
  assert.equal(clean.tasks[0].goal, 1500);
});

test('sanitize - task goal Infinity → mặc định 1500', () => {
  const clean = sanitizeLoadedState({ tasks: [{ id: 'inf', goal: Infinity }] });
  assert.equal(clean.tasks[0].goal, 1500);
});

test('sanitize - task goal > 86400 bị clamp về 86400', () => {
  const clean = sanitizeLoadedState({ tasks: [{ id: 'big', goal: 99999 }] });
  assert.equal(clean.tasks[0].goal, 86400);
});

test('sanitize - task left > goal bị clamp về goal', () => {
  const clean = sanitizeLoadedState({ tasks: [{ id: 'x', goal: 60, left: 999 }] });
  assert.equal(clean.tasks[0].left, 60);
});

test('sanitize - task left âm bị clamp về 0', () => {
  const clean = sanitizeLoadedState({ tasks: [{ id: 'x', goal: 60, left: -50 }] });
  assert.equal(clean.tasks[0].left, 0);
});

test('sanitize - task left NaN → mặc định về goal', () => {
  const clean = sanitizeLoadedState({ tasks: [{ id: 'x', goal: 60, left: NaN }] });
  assert.equal(clean.tasks[0].left, 60);
});

test('sanitize - màu sắc không hợp lệ → mặc định', () => {
  const clean = sanitizeLoadedState({ tasks: [{ id: 'x', color: 'red' }] });
  assert.equal(clean.tasks[0].color, '#a8c58a');
});

test('sanitize - màu sắc hợp lệ (hex 6 ký tự) giữ nguyên', () => {
  const clean = sanitizeLoadedState({ tasks: [{ id: 'x', color: '#ff00ff' }] });
  assert.equal(clean.tasks[0].color, '#ff00ff');
});

test('sanitize - emoji chuỗi rỗng → mặc định', () => {
  const clean = sanitizeLoadedState({ tasks: [{ id: 'x', emoji: '' }] });
  assert.equal(clean.tasks[0].emoji, '◷');
});

test('sanitize - emoji quá dài bị cắt (max 12)', () => {
  const clean = sanitizeLoadedState({ tasks: [{ id: 'x', emoji: '🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥' }] });
  assert.ok(clean.tasks[0].emoji.length <= 12);
});

test('sanitize - trùng id → tự thêm _copy', () => {
  const clean = sanitizeLoadedState({
    tasks: [
      { id: 'same', name: 'A' },
      { id: 'same', name: 'B' },
    ],
  });
  const ids = clean.tasks.map(t => t.id);
  const unique = new Set(ids);
  assert.equal(unique.size, ids.length, 'Mọi id phải duy nhất');
  assert.ok(ids.includes('same'));
  assert.ok(ids.includes('same_copy'));
});

test('sanitize - theme chỉ nhận dark/light', () => {
  assert.equal(sanitizeLoadedState({ theme: 'dark' }).theme, 'dark');
  assert.equal(sanitizeLoadedState({ theme: 'light' }).theme, 'light');
  assert.equal(sanitizeLoadedState({ theme: 'blue' }).theme, 'dark'); // mặc định
  assert.equal(sanitizeLoadedState({ theme: 123 }).theme, 'dark');
  assert.equal(sanitizeLoadedState({ theme: null }).theme, 'dark');
});

test('sanitize - soundEnabled mặc định true', () => {
  assert.equal(sanitizeLoadedState({}).soundEnabled, true);
  assert.equal(sanitizeLoadedState({ soundEnabled: false }).soundEnabled, false);
  assert.equal(sanitizeLoadedState({ soundEnabled: 'yes' }).soundEnabled, true);
});

test('sanitize - miniDisplayMode chỉ nhận bar/card', () => {
  assert.equal(sanitizeLoadedState({ miniDisplayMode: 'bar' }).miniDisplayMode, 'bar');
  assert.equal(sanitizeLoadedState({ miniDisplayMode: 'card' }).miniDisplayMode, 'card');
  assert.equal(sanitizeLoadedState({ miniDisplayMode: 'invalid' }).miniDisplayMode, 'card');
});

test('sanitize - visualMode chỉ nhận ring/hourglass', () => {
  assert.equal(sanitizeLoadedState({ visualMode: 'ring' }).visualMode, 'ring');
  assert.equal(sanitizeLoadedState({ visualMode: 'hourglass' }).visualMode, 'hourglass');
  assert.equal(sanitizeLoadedState({ visualMode: 'chart' }).visualMode, 'ring');
});

test('sanitize - handledSessionIds chỉ giữ string, cắt max 500', () => {
  const bigArray = Array.from({ length: 600 }, (_, i) => `s${i}`);
  const clean = sanitizeLoadedState({ handledSessionIds: bigArray });
  assert.ok(clean.handledSessionIds.length <= 500);
  assert.ok(clean.handledSessionIds.every(x => typeof x === 'string'));
});

test('sanitize - handledSessionIds lọc bỏ non-string', () => {
  const clean = sanitizeLoadedState({
    handledSessionIds: ['valid', 123, null, undefined, true, 'also_valid'],
  });
  assert.deepEqual(clean.handledSessionIds, ['valid', 'also_valid']);
});

test('sanitize - selectedTaskId không tồn tại → fallback về task đầu tiên', () => {
  const clean = sanitizeLoadedState({
    tasks: [{ id: 'only', name: 'Only Task', goal: 60, left: 60 }],
    selectedTaskId: 'deleted_task',
  });
  assert.equal(clean.selectedTaskId, 'only');
});

test('sanitize - mảng tasks rỗng → selectedTaskId = null', () => {
  const clean = sanitizeLoadedState({ tasks: [] });
  assert.equal(clean.tasks.length, 0);
  assert.equal(clean.selectedTaskId, null);
});

test('sanitize - endAt tự tính khi runStart set nhưng endAt thiếu', () => {
  const clean = sanitizeLoadedState({
    tasks: [{ id: 'x', goal: 60, left: 30, runStart: 5000 }],
  });
  const task = clean.tasks[0];
  assert.equal(task.endAt, 5000 + 30 * 1000);
});

test('sanitize - runStart âm → null', () => {
  const clean = sanitizeLoadedState({
    tasks: [{ id: 'x', goal: 60, left: 60, runStart: -100 }],
  });
  assert.equal(clean.tasks[0].runStart, null);
});

// ============================================================
// STRESS: sanitize rất nhiều tasks
// ============================================================

test('STRESS - sanitize 500 tasks không crash', () => {
  const tasks = Array.from({ length: 500 }, (_, i) => ({
    id: `task_${i}`,
    name: `Task ${i}`,
    emoji: '🔥',
    color: '#ff0000',
    goal: 60 + i,
    left: 30 + i,
    runStart: i % 10 === 0 ? 1000 : null,
  }));
  const clean = sanitizeLoadedState({ tasks });
  assert.equal(clean.tasks.length, 500);
  for (const task of clean.tasks) {
    assert.ok(task.id);
    assert.ok(Number.isFinite(task.goal));
    assert.ok(Number.isFinite(task.left));
  }
});
