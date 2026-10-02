import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeLoadedState,
  DEFAULT_STATE,
  SCHEMA_VERSION,
} from '../src/lib/storage.js';

test('Storage - Dữ liệu null/undefined trả về default an toàn', () => {
  const s = sanitizeLoadedState(null);
  assert.equal(s.version, SCHEMA_VERSION);
  assert.ok(s.tasks.length > 0);
  assert.equal(s.theme, 'dark');
});

test('Storage - Dữ liệu thiếu trường hoặc lỗi không làm crash, giữ nguyên các trường hợp lệ', () => {
  const corrupted = {
    version: 1,
    tasks: [
      { id: 'custom-1', name: 'Viết báo cáo', emoji: '📝', color: '#ff0000', goal: 3600, left: 1800 },
      { /* thiếu id, name */ goal: -50 } // task bị hỏng
    ],
    selectedTaskId: 'custom-1',
    theme: 'light',
    soundEnabled: false,
  };

  const clean = sanitizeLoadedState(corrupted);
  assert.equal(clean.theme, 'light');
  assert.equal(clean.soundEnabled, false);
  assert.equal(clean.tasks.length, 2);
  assert.equal(clean.tasks[0].id, 'custom-1');
  assert.equal(clean.tasks[0].left, 1800);
  // Task bị hỏng được sanitize an toàn
  assert.ok(clean.tasks[1].goal > 0);
});

test('Storage - selectedTaskId tự động trỏ về task hợp lệ nếu ID lưu trước đó không tồn tại', () => {
  const state = {
    tasks: [
      { id: 'task-a', name: 'A', goal: 60, left: 60 }
    ],
    selectedTaskId: 'task-non-existent',
  };

  const clean = sanitizeLoadedState(state);
  assert.equal(clean.selectedTaskId, 'task-a');
});
