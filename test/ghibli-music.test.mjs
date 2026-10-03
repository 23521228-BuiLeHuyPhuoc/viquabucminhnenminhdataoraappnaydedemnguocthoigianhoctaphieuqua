import test from 'node:test';
import assert from 'node:assert/strict';
import { GHIBLI_TRACKS, ghibliMusic } from '../src/lib/ghibli-music.js';
import { ambientSound, SOUND_PRESETS } from '../src/lib/ambient-sound.js';

test('Ghibli Music - Danh sách track có đầy đủ các bản nhạc Ghibli kinh điển', () => {
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

test('Ghibli Music - Chức năng Shuffle (Trộn bài) hoạt động chính xác', async () => {
  const { PLAYLISTS, LOOP_MODE } = await import('../src/lib/ghibli-music.js');

  // Initial shuffle should be false
  ghibliMusic.setShuffle(false);
  assert.strictEqual(ghibliMusic.getState().shuffle, false);

  // Toggle shuffle to true
  ghibliMusic.toggleShuffle();
  assert.strictEqual(ghibliMusic.getState().shuffle, true);

  // Toggle back to false
  ghibliMusic.toggleShuffle();
  assert.strictEqual(ghibliMusic.getState().shuffle, false);

  // Direct set
  ghibliMusic.setShuffle(true);
  assert.strictEqual(ghibliMusic.getState().shuffle, true);
  ghibliMusic.setShuffle(false);
});

test('Ghibli Music - Chức năng Loop (Lặp nhạc) hỗ trợ 3 chế độ: ALL, ONE, OFF', async () => {
  const { LOOP_MODE } = await import('../src/lib/ghibli-music.js');

  ghibliMusic.setLoopMode(LOOP_MODE.ALL);
  assert.strictEqual(ghibliMusic.getState().loopMode, LOOP_MODE.ALL);

  // Cycle to ONE
  ghibliMusic.cycleLoopMode();
  assert.strictEqual(ghibliMusic.getState().loopMode, LOOP_MODE.ONE);

  // Cycle to OFF
  ghibliMusic.cycleLoopMode();
  assert.strictEqual(ghibliMusic.getState().loopMode, LOOP_MODE.OFF);

  // Cycle back to ALL
  ghibliMusic.cycleLoopMode();
  assert.strictEqual(ghibliMusic.getState().loopMode, LOOP_MODE.ALL);

  // Rejects invalid mode
  ghibliMusic.setLoopMode('invalid_mode');
  assert.strictEqual(ghibliMusic.getState().loopMode, LOOP_MODE.ALL);
});

test('Ghibli Music - Danh sách phát (Playlists) phân loại chuẩn theo từng bộ phim', async () => {
  const { PLAYLISTS } = await import('../src/lib/ghibli-music.js');

  assert.ok(Array.isArray(PLAYLISTS));
  assert.ok(PLAYLISTS.length >= 8);

  const playlistIds = PLAYLISTS.map(p => p.id);
  assert.ok(playlistIds.includes('all'));
  assert.ok(playlistIds.includes('spirited'));
  assert.ok(playlistIds.includes('totoro'));
  assert.ok(playlistIds.includes('kiki'));
  assert.ok(playlistIds.includes('mononoke'));
  assert.ok(playlistIds.includes('howl_film'));
  assert.ok(playlistIds.includes('nausicaa'));

  // Switch playlist to spirited
  ghibliMusic.setPlaylist('spirited');
  assert.strictEqual(ghibliMusic.getState().activePlaylist, 'spirited');

  // Verify track filtering by playlist
  const spiritedTracks = GHIBLI_TRACKS.filter(t => t.playlist === 'spirited');
  assert.ok(spiritedTracks.length >= 2);
  for (const t of spiritedTracks) {
    assert.strictEqual(t.playlist, 'spirited');
  }

  // Switch playlist to totoro
  ghibliMusic.setPlaylist('totoro');
  assert.strictEqual(ghibliMusic.getState().activePlaylist, 'totoro');

  // Reject invalid playlist
  ghibliMusic.setPlaylist('non_existent_category');
  assert.strictEqual(ghibliMusic.getState().activePlaylist, 'totoro');

  // Reset to all
  ghibliMusic.setPlaylist('all');
  assert.strictEqual(ghibliMusic.getState().activePlaylist, 'all');
});

test('Ghibli Music - Chuyển bài (nextTrack / prevTrack) an toàn không vượt quá giới hạn', () => {
  const initialTrack = ghibliMusic.getCurrentTrack();
  assert.ok(initialTrack);

  // nextTrack
  ghibliMusic.nextTrack();
  const nextTrack = ghibliMusic.getCurrentTrack();
  assert.ok(nextTrack);

  // prevTrack
  ghibliMusic.prevTrack();
  const prevTrack = ghibliMusic.getCurrentTrack();
  assert.ok(prevTrack);
});
