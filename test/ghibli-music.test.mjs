import test from 'node:test';
import assert from 'node:assert/strict';
import { GHIBLI_TRACKS, ghibliMusic } from '../src/lib/ghibli-music.js';
import { ambientSound, SOUND_PRESETS } from '../src/lib/ambient-sound.js';

test('Ghibli Music - Danh sách track có đầy đủ các bản nhạc Ghibli kinh điển & Live stream', () => {
  assert.ok(Array.isArray(GHIBLI_TRACKS));
  assert.ok(GHIBLI_TRACKS.length >= 20, `Cần ít nhất 20 bản nhạc, hiện có ${GHIBLI_TRACKS.length}`);

  const ids = GHIBLI_TRACKS.map(t => t.id);
  assert.ok(ids.includes('ghibli_summer'), "Phải có One Summer's Day (Spirited Away)");
  assert.ok(ids.includes('ghibli_howl'), "Phải có The Promise of the World (Howl's Moving Castle)");
  assert.ok(ids.includes('ghibli_totoro_wind'), 'Phải có Path of the Wind (My Neighbor Totoro)');
  assert.ok(ids.includes('ghibli_kiki_ocean'), "Phải có A Town with an Ocean View (Kiki's Delivery Service)");
  assert.ok(ids.includes('ghibli_laputa'), 'Phải có Carrying You (Castle in the Sky)');
  assert.ok(ids.includes('ghibli_always'), 'Phải có Always With Me (Spirited Away Ending)');
  assert.ok(ids.includes('ghibli_mononoke'), 'Phải có Princess Mononoke Main Theme');
  assert.ok(ids.includes('ghibli_radio_piano'), 'Phải có Đài Live Piano 24/7');
  assert.ok(ids.includes('ghibli_radio_lofi'), 'Phải có Đài Live Lofi Chillhop 24/7');
});

test('Ghibli Music - Mỗi bài hát có cấu trúc streamUrl hoặc nốt hợp âm chuẩn xác', () => {
  for (const track of GHIBLI_TRACKS) {
    assert.ok(track.id, 'Phải có ID');
    assert.ok(track.title, 'Phải có title');
    assert.ok(track.film, 'Phải có film');
    assert.ok(track.streamUrl, 'Phải có URL stream âm thanh thực tế');
    assert.ok(track.streamUrl.startsWith('http'), 'URL phải hợp lệ');
  }
});

test('Ghibli Music - Engine methods và volume control hoạt động an toàn', () => {
  // Test volume
  ghibliMusic.setVolume(0.8);
  assert.strictEqual(ghibliMusic.getVolume(), 0.8);

  // Clamp volume between 0 and 1
  ghibliMusic.setVolume(1.5);
  assert.strictEqual(ghibliMusic.getVolume(), 1.0);
  ghibliMusic.setVolume(-0.2);
  assert.strictEqual(ghibliMusic.getVolume(), 0);

  // Reset volume
  ghibliMusic.setVolume(0.5);
  assert.strictEqual(ghibliMusic.getVolume(), 0.5);

  // Track navigation
  const current = ghibliMusic.getCurrentTrack();
  assert.ok(current && current.title);

  // Subscription
  let notified = false;
  const unsubscribe = ghibliMusic.subscribe(() => {
    notified = true;
  });
  ghibliMusic.notify();
  assert.strictEqual(notified, true);
  unsubscribe();
});

test('Ambient Sound - Đồng bộ preset và subscription hoạt động chính xác', () => {
  assert.ok(Array.isArray(SOUND_PRESETS));
  assert.ok(SOUND_PRESETS.length >= 25);

  let notifiedSound = null;
  const unsub = ambientSound.subscribe(type => {
    notifiedSound = type;
  });

  // Test play and stop notifications
  ambientSound.play('off');
  assert.strictEqual(ambientSound.getSound(), 'off');
  assert.strictEqual(notifiedSound, 'off');

  unsub();
});
