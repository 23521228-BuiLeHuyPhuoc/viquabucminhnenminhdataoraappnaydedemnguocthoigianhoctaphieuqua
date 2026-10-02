/**
 * Module âm thanh chuông báo hoàn thành sử dụng Web Audio API
 * - 100% Offline, không phụ thuộc file ngoài, không lo lỗi 404
 * - Âm chuông êm dịu, ấm áp, tạo cảm giác thành tựu tích cực
 * - Xử lý an toàn browser autoplay policy
 */

let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Phát âm thanh chuông hoàn thành (C-Major Chime)
 */
export function playCompletionSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Hợp âm 3 nốt: C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz), C6 (1046.50Hz)
    const notes = [
      { freq: 523.25, time: 0.00, dur: 1.2 },
      { freq: 659.25, time: 0.12, dur: 1.3 },
      { freq: 783.99, time: 0.24, dur: 1.5 },
      { freq: 1046.50, time: 0.36, dur: 2.0 },
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);

      // Thêm chút sóng tam giác hài âm ấm
      gain.gain.setValueAtTime(0.001, now + time);
      gain.gain.exponentialRampToValueAtTime(0.18, now + time + 0.03); // Attack
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur); // Decay

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + dur + 0.1);
    });
  } catch (err) {
    console.warn('[Sound] Không thể phát âm thanh:', err);
  }
}

/**
 * Âm thanh click nhẹ phản hồi khi thao tác nút
 */
export function playClickSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  } catch (e) {
    // Silent fail
  }
}
