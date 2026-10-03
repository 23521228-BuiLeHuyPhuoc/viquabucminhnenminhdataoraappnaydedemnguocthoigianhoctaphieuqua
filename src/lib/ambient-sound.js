/**
 * AmbientSound - Procedural Ambient Sound Engine using Web Audio API
 * Generates natural focus sounds 100% offline with zero external audio assets.
 * Preserves low CPU and memory footprint.
 * Includes 10 world-renowned focus soundscapes inspired by Brain.fm, Endel, Noisli, Tide & Forest.
 */

let audioCtx = null;
let masterGain = null;
let currentNodes = []; // All active nodes, oscillators, timers
let currentSoundType = 'off';
let volume = 0.35;
let tickTimer = null;
let secondaryTimer = null;

import { ghibliMusic, GHIBLI_TRACKS } from './ghibli-music.js';

let listeners = new Set();

export const SOUND_PRESETS = [
  { id: 'off', name: 'Tắt âm', label: 'Tắt', icon: 'VolumeX', desc: 'Không phát âm thanh nền', category: 'nature' },
  // Studio Ghibli Lo-fi & Piano Focus Tracks & Live Streams
  ...GHIBLI_TRACKS.map(t => ({
    id: t.id,
    name: t.isLive ? `[LIVE] ${t.title}` : t.title,
    label: t.title.split('(')[0].replace(/\[LIVE\]\s*/, '').trim(),
    icon: 'Music',
    desc: `${t.film} — ${t.desc}`,
    category: 'ghibli',
    isLive: !!t.isLive,
  })),
  // World-renowned ambient soundscapes
  { id: 'brown', name: 'Tiếng ồn nâu (Brown Noise)', label: 'Nâu', icon: 'Headphones', desc: 'Sâu lắng, ấm áp, #1 chặn tạp âm & làm dịu tâm trí (ADHD & Deep Work)', category: 'nature' },
  { id: 'binaural', name: 'Sóng não Alpha 10Hz', label: 'Alpha', icon: 'Activity', desc: 'Kích hoạt trạng thái dòng chảy (Flow State) chuẩn khoa học Brain.fm/Endel', category: 'nature' },
  { id: 'rain', name: 'Mưa rào & sấm xa', label: 'Mưa', icon: 'CloudRain', desc: 'Tiếng mưa rơi êm đềm với tiếng sấm rền xa xa thư thái (Noisli / Tide)', category: 'nature' },
  { id: 'fireplace', name: 'Bếp lửa bập bùng', label: 'Lửa', icon: 'Flame', desc: 'Tiếng củi cháy tí tách, than hồng ấm cúng như thư viện mùa đông', category: 'nature' },
  { id: 'waves', name: 'Sóng biển Zen', label: 'Sóng', icon: 'Waves', desc: 'Sóng xô bờ dập dềnh nhịp nhàng, điều hòa nhịp tim & hơi thở', category: 'nature' },
  { id: 'forest', name: 'Gió rừng thông', label: 'Rừng', icon: 'Trees', desc: 'Gió thổi qua tán thông rì rào và âm vang thiên nhiên thanh mát', category: 'nature' },
  { id: 'cafe', name: 'Quán cà phê mộc', label: 'Cà phê', icon: 'Coffee', desc: 'Không khí quán quen, tiếng tách gốm và hơi ấm quen thuộc (Coffitivity)', category: 'nature' },
  { id: 'bowl', name: 'Chuông thiền 432Hz', label: 'Thiền', icon: 'Bell', desc: 'Tần số Solfeggio thanh lọc tâm trí, xóa tan căng thẳng và áp lực', category: 'nature' },
  { id: 'clock', name: 'Tích tắc nhịp điệu', label: 'Đồng hồ', icon: 'Clock', desc: 'Nhịp gõ chuẩn mực giữ nhịp độ học tập kỷ luật kiểu Pomodoro', category: 'nature' },
  { id: 'white', name: 'Tiếng ồn trắng', label: 'Trắng', icon: 'Wind', desc: 'Thác đổ đều đặn, lọc sạch hoàn toàn tiếng ồn xung quanh', category: 'nature' },
];

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Helper: Generate looped noise buffer
function createNoiseBuffer(ctx, durationSeconds, color = 'pink') {
  const bufferSize = ctx.sampleRate * durationSeconds;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let lastOut = 0.0;
  let b0 = 0, b1 = 0, b2 = 0;

  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    if (color === 'white') {
      data[i] = white * 0.4;
    } else if (color === 'brown') {
      // Leaky integration for 1/f^2 brown noise
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.8;
    } else {
      // Pink noise (1/f)
      b0 = 0.99 * b0 + white * 0.05;
      b1 = 0.96 * b1 + white * 0.11;
      b2 = 0.86 * b2 + white * 0.25;
      data[i] = (b0 + b1 + b2) * 0.45;
    }
  }

  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = buffer;
  noiseSource.loop = true;
  return noiseSource;
}

// 1. Deep Brown Noise (The viral focus noise)
function playBrownNoise(ctx, output) {
  const noise = createNoiseBuffer(ctx, 4, 'brown');
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(380, ctx.currentTime);
  filter.Q.setValueAtTime(0.5, ctx.currentTime);

  const subFilter = ctx.createBiquadFilter();
  subFilter.type = 'lowshelf';
  subFilter.frequency.setValueAtTime(120, ctx.currentTime);
  subFilter.gain.setValueAtTime(4, ctx.currentTime);

  noise.connect(filter);
  filter.connect(subFilter);
  subFilter.connect(output);
  noise.start();

  currentNodes.push(noise, filter, subFilter);
}

// 2. Alpha Brainwave (10Hz Binaural Beats + Pink noise cushion)
function playBinauralAlpha(ctx, output) {
  // Stereo channel merger for true binaural presentation
  const merger = ctx.createChannelMerger(2);

  // Left carrier: 210 Hz
  const oscL = ctx.createOscillator();
  oscL.type = 'sine';
  oscL.frequency.setValueAtTime(210, ctx.currentTime);
  const gainL = ctx.createGain();
  gainL.gain.setValueAtTime(0.28, ctx.currentTime);
  oscL.connect(gainL);
  gainL.connect(merger, 0, 0);

  // Right carrier: 200 Hz -> 10Hz Alpha differential
  const oscR = ctx.createOscillator();
  oscR.type = 'sine';
  oscR.frequency.setValueAtTime(200, ctx.currentTime);
  const gainR = ctx.createGain();
  gainR.gain.setValueAtTime(0.28, ctx.currentTime);
  oscR.connect(gainR);
  gainR.connect(merger, 0, 1);

  // Gentle pink noise background bed
  const pink = createNoiseBuffer(ctx, 3, 'pink');
  const pinkFilter = ctx.createBiquadFilter();
  pinkFilter.type = 'lowpass';
  pinkFilter.frequency.setValueAtTime(320, ctx.currentTime);
  const pinkGain = ctx.createGain();
  pinkGain.gain.setValueAtTime(0.12, ctx.currentTime);

  pink.connect(pinkFilter);
  pinkFilter.connect(pinkGain);
  pinkGain.connect(output);

  merger.connect(output);

  oscL.start();
  oscR.start();
  pink.start();

  currentNodes.push(oscL, oscR, gainL, gainR, merger, pink, pinkFilter, pinkGain);
}

// 3. Cozy Rain & Distant Thunder
function playRainSound(ctx, output) {
  const noise = createNoiseBuffer(ctx, 3, 'pink');
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1050, ctx.currentTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.7, ctx.currentTime);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(output);
  noise.start();

  // Periodic distant soft thunder roll every 25-35s
  const triggerThunder = () => {
    if (!audioCtx || currentSoundType !== 'rain') return;
    try {
      const thunderNoise = createNoiseBuffer(ctx, 4, 'brown');
      const tFilter = ctx.createBiquadFilter();
      tFilter.type = 'lowpass';
      tFilter.frequency.setValueAtTime(95, ctx.currentTime);

      const tGain = ctx.createGain();
      const now = ctx.currentTime;
      tGain.gain.setValueAtTime(0.001, now);
      tGain.gain.linearRampToValueAtTime(0.45, now + 1.2);
      tGain.gain.exponentialRampToValueAtTime(0.001, now + 4.5);

      thunderNoise.connect(tFilter);
      tFilter.connect(tGain);
      tGain.connect(output);

      thunderNoise.start(now);
      thunderNoise.stop(now + 4.6);
    } catch (e) {}
  };

  secondaryTimer = setInterval(triggerThunder, 28000);
  currentNodes.push(noise, filter, gain);
}

// 4. Cozy Fireplace / Campfire (Crackling Wood & Glowing Embers)
function playFireplace(ctx, output) {
  // Low-frequency rumble
  const noise = createNoiseBuffer(ctx, 3, 'brown');
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(260, ctx.currentTime);

  const rumbleGain = ctx.createGain();
  rumbleGain.gain.setValueAtTime(0.4, ctx.currentTime);

  noise.connect(filter);
  filter.connect(rumbleGain);
  rumbleGain.connect(output);
  noise.start();

  currentNodes.push(noise, filter, rumbleGain);

  // Random crackle impulses generator
  const triggerCrackle = () => {
    if (!audioCtx || currentSoundType !== 'fireplace') return;
    try {
      const osc = ctx.createOscillator();
      const crackleGain = ctx.createGain();
      const bpf = ctx.createBiquadFilter();

      const freq = 1200 + Math.random() * 2600;
      bpf.type = 'bandpass';
      bpf.frequency.setValueAtTime(freq, ctx.currentTime);
      bpf.Q.setValueAtTime(6, ctx.currentTime);

      osc.type = Math.random() > 0.4 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const now = ctx.currentTime;
      const dur = 0.015 + Math.random() * 0.025;
      crackleGain.gain.setValueAtTime(0.18 + Math.random() * 0.28, now);
      crackleGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.connect(bpf);
      bpf.connect(crackleGain);
      crackleGain.connect(output);

      osc.start(now);
      osc.stop(now + dur + 0.01);
    } catch (e) {}
  };

  tickTimer = setInterval(triggerCrackle, 80 + Math.random() * 90);
}

// 5. Zen Ocean Waves (Rhythmic swell & ebb)
function playOceanWaves(ctx, output) {
  const noise = createNoiseBuffer(ctx, 5, 'brown');

  const waveFilter = ctx.createBiquadFilter();
  waveFilter.type = 'lowpass';
  waveFilter.frequency.setValueAtTime(320, ctx.currentTime);

  const waveGain = ctx.createGain();
  waveGain.gain.setValueAtTime(0.3, ctx.currentTime);

  // LFO: 0.11 Hz (~9s natural wave swell period)
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(0.11, ctx.currentTime);

  const lfoGain = ctx.createGain();
  lfoGain.gain.setValueAtTime(260, ctx.currentTime);

  lfo.connect(lfoGain);
  lfoGain.connect(waveFilter.frequency);

  // Gain swell in sync
  const lfoVolume = ctx.createGain();
  lfoVolume.gain.setValueAtTime(0.2, ctx.currentTime);
  lfo.connect(lfoVolume);
  lfoVolume.connect(waveGain.gain);

  noise.connect(waveFilter);
  waveFilter.connect(waveGain);
  waveGain.connect(output);

  noise.start();
  lfo.start();

  currentNodes.push(noise, waveFilter, waveGain, lfo, lfoGain, lfoVolume);
}

// 6. Forest Wind & Pine Trees
function playForest(ctx, output) {
  const noise = createNoiseBuffer(ctx, 4, 'pink');
  const bpf = ctx.createBiquadFilter();
  bpf.type = 'bandpass';
  bpf.frequency.setValueAtTime(420, ctx.currentTime);
  bpf.Q.setValueAtTime(2.2, ctx.currentTime);

  const windGain = ctx.createGain();
  windGain.gain.setValueAtTime(0.65, ctx.currentTime);

  // Slow wind sway LFO
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(0.14, ctx.currentTime);
  const lfoGain = ctx.createGain();
  lfoGain.gain.setValueAtTime(180, ctx.currentTime);

  lfo.connect(lfoGain);
  lfoGain.connect(bpf.frequency);

  noise.connect(bpf);
  bpf.connect(windGain);
  windGain.connect(output);

  noise.start();
  lfo.start();

  // Subtle woodland cricket pulses in background
  const triggerWoodland = () => {
    if (!audioCtx || currentSoundType !== 'forest') return;
    try {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(4400, ctx.currentTime);

      const now = ctx.currentTime;
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.04, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(g);
      g.connect(output);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch (e) {}
  };

  secondaryTimer = setInterval(triggerWoodland, 3500);
  currentNodes.push(noise, bpf, windGain, lfo, lfoGain);
}

// 7. Warm Cafe Ambience
function playCafe(ctx, output) {
  // Low murmur
  const noise = createNoiseBuffer(ctx, 3, 'brown');
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(420, ctx.currentTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.5, ctx.currentTime);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(output);
  noise.start();

  currentNodes.push(noise, filter, gain);

  // Periodic subtle ceramic cup clink
  const triggerClink = () => {
    if (!audioCtx || currentSoundType !== 'cafe') return;
    try {
      const osc = ctx.createOscillator();
      const clinkGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2600 + Math.random() * 400, ctx.currentTime);

      const now = ctx.currentTime;
      clinkGain.gain.setValueAtTime(0.07, now);
      clinkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(clinkGain);
      clinkGain.connect(output);
      osc.start(now);
      osc.stop(now + 0.06);
    } catch (e) {}
  };

  tickTimer = setInterval(triggerClink, 6500);
}

// 8. 432Hz Tibetan Singing Bowl (Meditative harmonic drone)
function playTibetanBowl(ctx, output) {
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.26, ctx.currentTime);

  // Fundamental: 432 Hz
  const f0 = ctx.createOscillator();
  f0.type = 'sine';
  f0.frequency.setValueAtTime(432, ctx.currentTime);

  // Harmonic 2: 864 Hz
  const f1 = ctx.createOscillator();
  f1.type = 'sine';
  f1.frequency.setValueAtTime(864, ctx.currentTime);
  const g1 = ctx.createGain();
  g1.gain.setValueAtTime(0.32, ctx.currentTime);
  f1.connect(g1);
  g1.connect(master);

  // Harmonic 3: 1296 Hz
  const f2 = ctx.createOscillator();
  f2.type = 'sine';
  f2.frequency.setValueAtTime(1296, ctx.currentTime);
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.12, ctx.currentTime);
  f2.connect(g2);
  g2.connect(master);

  // Warm gentle vibrato LFO
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(4.2, ctx.currentTime);
  const lfoGain = ctx.createGain();
  lfoGain.gain.setValueAtTime(2.5, ctx.currentTime);
  lfo.connect(lfoGain);
  lfoGain.connect(f0.frequency);

  f0.connect(master);
  master.connect(output);

  f0.start();
  f1.start();
  f2.start();
  lfo.start();

  currentNodes.push(f0, f1, f2, g1, g2, lfo, lfoGain, master);
}

// 9. Vintage Rhythmic Clock
function playClockTick(ctx, output) {
  let isTick = true;
  const playStep = () => {
    if (!ctx || ctx.state !== 'running' || currentSoundType !== 'clock') return;
    try {
      const osc = ctx.createOscillator();
      const tickGain = ctx.createGain();

      osc.type = 'sine';
      const baseFreq = isTick ? 850 : 620;
      isTick = !isTick;

      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.03);

      tickGain.gain.setValueAtTime(0.38, ctx.currentTime);
      tickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

      osc.connect(tickGain);
      tickGain.connect(output);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.035);
    } catch (e) {}
  };

  playStep();
  tickTimer = setInterval(playStep, 1000);
}

// 10. Pure White Noise
function playWhiteNoise(ctx, output) {
  const noise = createNoiseBuffer(ctx, 3, 'white');
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(6500, ctx.currentTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.32, ctx.currentTime);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(output);
  noise.start();

  currentNodes.push(noise, filter, gain);
}

export const ambientSound = {
  getSound: () => currentSoundType,
  getVolume: () => volume,
  getPresets: () => SOUND_PRESETS,

  subscribe: listener => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  notify: () => {
    listeners.forEach(fn => {
      try { fn(currentSoundType); } catch (e) {}
    });
  },

  setVolume: newVol => {
    volume = Math.max(0, Math.min(1, newVol));
    if (masterGain && audioCtx) {
      masterGain.gain.setValueAtTime(volume, audioCtx.currentTime);
    }
    ghibliMusic.setVolume(volume);
    ambientSound.notify();
  },

  play: type => {
    // If clicking the currently playing sound, toggle it off!
    if (type === currentSoundType && type !== 'off') {
      ambientSound.stop();
      return 'off';
    }

    // Clean up active sound without desyncing
    ambientSound.stop();

    if (type === 'off') {
      currentSoundType = 'off';
      ambientSound.notify();
      return 'off';
    }

    currentSoundType = type;

    // Handle Ghibli tracks
    if (type.startsWith('ghibli_')) {
      ghibliMusic.setVolume(volume);
      ghibliMusic.isAutoShuffle = false;
      ghibliMusic.play(type);
      ambientSound.notify();
      return currentSoundType;
    }

    const ctx = getAudioContext();
    if (!ctx) {
      ambientSound.notify();
      return currentSoundType;
    }

    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volume, ctx.currentTime);
    masterGain.connect(ctx.destination);

    switch (type) {
      case 'brown':
        playBrownNoise(ctx, masterGain);
        break;
      case 'binaural':
        playBinauralAlpha(ctx, masterGain);
        break;
      case 'rain':
        playRainSound(ctx, masterGain);
        break;
      case 'fireplace':
        playFireplace(ctx, masterGain);
        break;
      case 'waves':
        playOceanWaves(ctx, masterGain);
        break;
      case 'forest':
        playForest(ctx, masterGain);
        break;
      case 'cafe':
        playCafe(ctx, masterGain);
        break;
      case 'bowl':
        playTibetanBowl(ctx, masterGain);
        break;
      case 'clock':
        playClockTick(ctx, masterGain);
        break;
      case 'white':
        playWhiteNoise(ctx, masterGain);
        break;
      default:
        currentSoundType = 'off';
        break;
    }

    ambientSound.notify();
    return currentSoundType;
  },

  stop: () => {
    ghibliMusic.stop();

    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
    if (secondaryTimer) {
      clearInterval(secondaryTimer);
      secondaryTimer = null;
    }

    currentNodes.forEach(node => {
      try {
        if (typeof node.stop === 'function') node.stop();
        if (typeof node.disconnect === 'function') node.disconnect();
      } catch (e) {}
    });
    currentNodes = [];

    if (masterGain) {
      try {
        masterGain.disconnect();
      } catch (e) {}
      masterGain = null;
    }

    currentSoundType = 'off';
    ambientSound.notify();
    return 'off';
  },

  toggleNext: () => {
    const ids = SOUND_PRESETS.map(p => p.id);
    const currentIndex = ids.indexOf(currentSoundType);
    const nextIndex = (currentIndex + 1) % ids.length;
    const nextType = ids[nextIndex];
    ambientSound.play(nextType);
    return nextType;
  },

  getCurrentPreset: () => {
    return SOUND_PRESETS.find(p => p.id === currentSoundType) || SOUND_PRESETS[0];
  },
};
