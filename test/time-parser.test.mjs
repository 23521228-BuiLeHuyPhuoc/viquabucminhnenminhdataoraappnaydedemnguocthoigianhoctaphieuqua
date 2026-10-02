import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDuration,
  formatRemaining,
  formatDurationShort,
  formatDurationVietnamese,
  MAX_DURATION_SECONDS,
} from '../src/lib/time-parser.js';

test('parseDuration - phân tích phút cơ bản', () => {
  assert.deepEqual(parseDuration('90'), { success: true, seconds: 90 * 60 });
  assert.deepEqual(parseDuration('15'), { success: true, seconds: 15 * 60 });
  assert.deepEqual(parseDuration('25'), { success: true, seconds: 25 * 60 });
  assert.deepEqual(parseDuration('45'), { success: true, seconds: 45 * 60 });
});

test('parseDuration - phân tích định dạng giờ:phút (1:30, 0:45)', () => {
  assert.deepEqual(parseDuration('1:30'), { success: true, seconds: 90 * 60 });
  assert.deepEqual(parseDuration('0:45'), { success: true, seconds: 45 * 60 });
  assert.deepEqual(parseDuration('2:00'), { success: true, seconds: 120 * 60 });
  assert.deepEqual(parseDuration('1:05'), { success: true, seconds: 65 * 60 });
});

test('parseDuration - từ chối các chuỗi không hợp lệ', () => {
  // Chuỗi sai cấu trúc như 1:20:30
  const r1 = parseDuration('1:20:30');
  assert.equal(r1.success, false);
  assert.match(r1.error, /Định dạng không hợp lệ/);

  // Phút >= 60 trong giờ:phút
  const r2 = parseDuration('1:60');
  assert.equal(r2.success, false);
  assert.match(r2.error, /Phút phải từ 00 đến 59/);

  // Bằng 0 hoặc âm
  const r3 = parseDuration('0');
  assert.equal(r3.success, false);
  assert.match(r3.error, /phải lớn hơn 0/);

  const r4 = parseDuration('-10');
  assert.equal(r4.success, false);

  // Vượt quá 24h
  const r5 = parseDuration('25:00');
  assert.equal(r5.success, false);
  assert.match(r5.error, /không được vượt quá 24 giờ/);

  // Chuỗi rỗng / ký tự đặc biệt
  const r6 = parseDuration('abc');
  assert.equal(r6.success, false);
});

test('formatRemaining - định dạng hiển thị đồng hồ MM:SS và HH:MM:SS', () => {
  assert.equal(formatRemaining(90), '01:30');
  assert.equal(formatRemaining(3599), '59:59');
  assert.equal(formatRemaining(3600), '01:00:00');
  assert.equal(formatRemaining(5400), '01:30:00');
  assert.equal(formatRemaining(0), '00:00');
  // Không bao giờ hiện số âm
  assert.equal(formatRemaining(-15), '00:00');
});

test('formatDurationShort - định dạng ngắn', () => {
  assert.equal(formatDurationShort(5400), '1h30');
  assert.equal(formatDurationShort(3600), '1h');
  assert.equal(formatDurationShort(2700), '45p');
});

test('formatDurationVietnamese - định dạng tiếng Việt', () => {
  assert.equal(formatDurationVietnamese(5400), '1 giờ 30 phút');
  assert.equal(formatDurationVietnamese(3600), '1 giờ');
  assert.equal(formatDurationVietnamese(2700), '45 phút');
});
