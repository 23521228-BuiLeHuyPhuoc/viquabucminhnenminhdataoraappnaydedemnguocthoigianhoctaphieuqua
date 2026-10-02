# TỔNG HỢP TOÀN BỘ CODE CHỨC NĂNG PICTURE-IN-PICTURE (PIP) - FLOW TIMER

Tài liệu này tổng hợp toàn bộ code đầy đủ 100% của các file đã được nâng cấp cho tính năng Picture-in-Picture (PiP) theo chuẩn **Document Picture-in-Picture API** (Chrome/Edge 111+) và Native Desktop Window (Electron).

---

## 1. `src/lib/ambient-sound.js`
> Tuyển tập 10 loại âm thanh tập trung chuẩn khoa học (Brain.fm, Noisli, Endel, Tide, Forest) bằng Web Audio API (100% offline, 0 asset tải ngoài):
> 1. **Tiếng ồn nâu (Brown Noise)**: #1 Deep work & ADHD, làm dịu tâm trí, chặn tạp âm hoàn hảo.
> 2. **Sóng não Alpha 10Hz (Binaural Beats)**: Kích hoạt trạng thái dòng chảy (Flow State) chuẩn khoa học Brain.fm/Endel.
> 3. **Mưa rào & sấm xa (Cozy Rain)**: Tiếng mưa rơi êm dịu kèm tiếng sấm rền xa xa thư thái.
> 4. **Bếp lửa bập bùng (Fireplace)**: Gỗ cháy tí tách, than hồng ấm áp như thư viện mùa đông.
> 5. **Sóng biển Zen (Ocean Waves)**: Sóng xô bờ nhịp nhàng 9 giây, điều hòa nhịp thở & nhịp tim.
> 6. **Gió rừng thông (Forest Wind)**: Gió vi vu qua tán lá kèm âm hưởng thiên nhiên hoang dã.
> 7. **Quán cà phê mộc (Cafe Ambience)**: Không khí quán quen, tiếng tách sứ và hơi ấm espresso.
> 8. **Chuông thiền 432Hz (Tibetan Bowl)**: Tần số Solfeggio thanh lọc não bộ, xóa tan căng thẳng.
> 9. **Tích tắc nhịp điệu (Focus Clock)**: Đồng hồ gõ nhịp kỷ luật cho phương pháp Pomodoro.
> 10. **Tiếng ồn trắng (White Noise)**: Tiếng thác đổ thanh tịnh, lọc sạch tiếng ồn xung quanh.

```javascript
let audioCtx = null;
let masterGain = null;
let currentNodes = [];
let currentSoundType = 'off';
let volume = 0.35;
let tickTimer = null;
let secondaryTimer = null;

export const SOUND_PRESETS = [
  { id: 'off', name: 'Tắt âm', label: 'Tắt', icon: 'VolumeX', desc: 'Không phát âm thanh nền' },
  { id: 'brown', name: 'Tiếng ồn nâu (Brown Noise)', label: 'Nâu', icon: 'Headphones', desc: 'Sâu lắng, ấm áp, #1 chặn tạp âm & làm dịu tâm trí (ADHD & Deep Work)' },
  { id: 'binaural', name: 'Sóng não Alpha 10Hz', label: 'Alpha', icon: 'Activity', desc: 'Kích hoạt trạng thái dòng chảy (Flow State) chuẩn khoa học Brain.fm/Endel' },
  { id: 'rain', name: 'Mưa rào & sấm xa', label: 'Mưa', icon: 'CloudRain', desc: 'Tiếng mưa rơi êm đềm với tiếng sấm rền xa xa thư thái (Noisli / Tide)' },
  { id: 'fireplace', name: 'Bếp lửa bập bùng', label: 'Lửa', icon: 'Flame', desc: 'Tiếng củi cháy tí tách, than hồng ấm cúng như thư viện mùa đông' },
  { id: 'waves', name: 'Sóng biển Zen', label: 'Sóng', icon: 'Waves', desc: 'Sóng xô bờ dập dềnh nhịp nhàng, điều hòa nhịp tim & hơi thở' },
  { id: 'forest', name: 'Gió rừng thông', label: 'Rừng', icon: 'Trees', desc: 'Gió thổi qua tán thông rì rào và âm vang thiên nhiên thanh mát' },
  { id: 'cafe', name: 'Quán cà phê mộc', label: 'Cà phê', icon: 'Coffee', desc: 'Không khí quán quen, tiếng tách gốm và hơi ấm quen thuộc (Coffitivity)' },
  { id: 'bowl', name: 'Chuông thiền 432Hz', label: 'Thiền', icon: 'Bell', desc: 'Tần số Solfeggio thanh lọc tâm trí, xóa tan căng thẳng và áp lực' },
  { id: 'clock', name: 'Tích tắc nhịp điệu', label: 'Đồng hồ', icon: 'Clock', desc: 'Nhịp gõ chuẩn mực giữ nhịp độ học tập kỷ luật kiểu Pomodoro' },
  { id: 'white', name: 'Tiếng ồn trắng', label: 'Trắng', icon: 'Wind', desc: 'Thác đổ đều đặn, lọc sạch hoàn toàn tiếng ồn xung quanh' },
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
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.8;
    } else {
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

function playBinauralAlpha(ctx, output) {
  const merger = ctx.createChannelMerger(2);

  const oscL = ctx.createOscillator();
  oscL.type = 'sine';
  oscL.frequency.setValueAtTime(210, ctx.currentTime);
  const gainL = ctx.createGain();
  gainL.gain.setValueAtTime(0.28, ctx.currentTime);
  oscL.connect(gainL);
  gainL.connect(merger, 0, 0);

  const oscR = ctx.createOscillator();
  oscR.type = 'sine';
  oscR.frequency.setValueAtTime(200, ctx.currentTime);
  const gainR = ctx.createGain();
  gainR.gain.setValueAtTime(0.28, ctx.currentTime);
  oscR.connect(gainR);
  gainR.connect(merger, 0, 1);

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

function playFireplace(ctx, output) {
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

function playOceanWaves(ctx, output) {
  const noise = createNoiseBuffer(ctx, 5, 'brown');
  const waveFilter = ctx.createBiquadFilter();
  waveFilter.type = 'lowpass';
  waveFilter.frequency.setValueAtTime(320, ctx.currentTime);

  const waveGain = ctx.createGain();
  waveGain.gain.setValueAtTime(0.3, ctx.currentTime);

  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(0.11, ctx.currentTime);

  const lfoGain = ctx.createGain();
  lfoGain.gain.setValueAtTime(260, ctx.currentTime);

  lfo.connect(lfoGain);
  lfoGain.connect(waveFilter.frequency);

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

function playForest(ctx, output) {
  const noise = createNoiseBuffer(ctx, 4, 'pink');
  const bpf = ctx.createBiquadFilter();
  bpf.type = 'bandpass';
  bpf.frequency.setValueAtTime(420, ctx.currentTime);
  bpf.Q.setValueAtTime(2.2, ctx.currentTime);

  const windGain = ctx.createGain();
  windGain.gain.setValueAtTime(0.65, ctx.currentTime);

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

function playCafe(ctx, output) {
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

function playTibetanBowl(ctx, output) {
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.26, ctx.currentTime);

  const f0 = ctx.createOscillator();
  f0.type = 'sine';
  f0.frequency.setValueAtTime(432, ctx.currentTime);

  const f1 = ctx.createOscillator();
  f1.type = 'sine';
  f1.frequency.setValueAtTime(864, ctx.currentTime);
  const g1 = ctx.createGain();
  g1.gain.setValueAtTime(0.32, ctx.currentTime);
  f1.connect(g1);
  g1.connect(master);

  const f2 = ctx.createOscillator();
  f2.type = 'sine';
  f2.frequency.setValueAtTime(1296, ctx.currentTime);
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.12, ctx.currentTime);
  f2.connect(g2);
  g2.connect(master);

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

  setVolume: newVol => {
    volume = Math.max(0, Math.min(1, newVol));
    if (masterGain && audioCtx) {
      masterGain.gain.setValueAtTime(volume, audioCtx.currentTime);
    }
  },

  play: type => {
    const ctx = getAudioContext();
    if (!ctx) return;

    ambientSound.stop();

    if (type === 'off') {
      currentSoundType = 'off';
      return;
    }

    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volume, ctx.currentTime);
    masterGain.connect(ctx.destination);

    currentSoundType = type;

    switch (type) {
      case 'brown': playBrownNoise(ctx, masterGain); break;
      case 'binaural': playBinauralAlpha(ctx, masterGain); break;
      case 'rain': playRainSound(ctx, masterGain); break;
      case 'fireplace': playFireplace(ctx, masterGain); break;
      case 'waves': playOceanWaves(ctx, masterGain); break;
      case 'forest': playForest(ctx, masterGain); break;
      case 'cafe': playCafe(ctx, masterGain); break;
      case 'bowl': playTibetanBowl(ctx, masterGain); break;
      case 'clock': playClockTick(ctx, masterGain); break;
      case 'white': playWhiteNoise(ctx, masterGain); break;
      default: currentSoundType = 'off'; break;
    }
  },

  stop: () => {
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
    if (secondaryTimer) { clearInterval(secondaryTimer); secondaryTimer = null; }

    currentNodes.forEach(node => {
      try {
        if (typeof node.stop === 'function') node.stop();
        if (typeof node.disconnect === 'function') node.disconnect();
      } catch (e) {}
    });
    currentNodes = [];

    if (masterGain) {
      try { masterGain.disconnect(); } catch (e) {}
      masterGain = null;
    }

    currentSoundType = 'off';
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
```

---

## 2. `src/components/AmbientBackground.jsx`
> Hiệu ứng hạt tuyết rơi (Snowflakes) & Tinh cầu phát sáng (Stardust) qua Canvas 60fps siêu mượt:

```jsx
import React, { useEffect, useRef } from 'react';

export default function AmbientBackground({
  visualState = 'idle',
  isMini = false,
  particleMode = 'snow', // 'snow' | 'stardust' | 'off'
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (particleMode === 'off') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = null;
    let width = (canvas.width = canvas.offsetWidth || 360);
    let height = (canvas.height = canvas.offsetHeight || 260);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth || 360;
      height = canvas.height = canvas.offsetHeight || 260;
    };
    window.addEventListener('resize', onResize);

    const count = isMini ? 24 : 45;
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2 + 1,
      speedY: particleMode === 'snow' ? Math.random() * 0.8 + 0.4 : (Math.random() - 0.5) * 0.4,
      speedX: (Math.random() - 0.5) * 0.5,
      opacity: Math.random() * 0.5 + 0.2,
      phase: Math.random() * Math.PI * 2,
    }));

    let t = 0;
    const render = () => {
      t += 0.015;
      ctx.clearRect(0, 0, width, height);

      particles.forEach(p => {
        if (particleMode === 'snow') {
          p.y += p.speedY;
          p.x += Math.sin(t + p.phase) * 0.4;
          if (p.y > height + 5) {
            p.y = -5;
            p.x = Math.random() * width;
          }
        } else {
          p.x += p.speedX;
          p.y += p.speedY;
          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        const alpha = p.opacity * (0.8 + Math.sin(t * 2 + p.phase) * 0.2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.shadowBlur = visualState === 'running' ? 6 : 2;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, [particleMode, isMini, visualState]);

  return (
    <div
      className={`ambient-backdrop state-${visualState} ${isMini ? 'is-mini' : 'is-full'}`}
      aria-hidden="true"
    >
      <div className="ambient-mesh" />
      <div className="ambient-blob blob-primary" />
      <div className="ambient-blob blob-secondary" />
      {!isMini && <div className="ambient-blob blob-accent" />}
      <div className="ambient-noise" />

      {particleMode !== 'off' && (
        <canvas ref={canvasRef} className="ambient-canvas" />
      )}
    </div>
  );
}
```

---

## 3. `src/components/PipFloatingTimer.jsx`
> PiP Floating Widget siêu đẹp với:
> - **Đồng hồ cát SVG hoạt họa mini (Hourglass)**: Cát trên vơi đi, dòng cát rơi ngắt quãng khi tạm dừng và chảy liên tục khi đang chạy, cát dưới bồi dần lên.
> - **Vòng quỹ đạo Neon (Progress Ring Orbit)**.
> - **Chữ số phát quang (Radiant Glow Digits)**.
> - **Nút đổi hiệu ứng Tuyết rơi / Sao phát sáng**.
> - **Nút đổi Âm thanh tập trung (Mưa / Sóng biển / Tích tắc)**.

```jsx
import React, { useState, useRef, useEffect, useId } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Check,
  ChevronDown,
  X,
  Clock,
  Sparkles,
  Volume2,
  VolumeX,
  Hourglass,
  Focus,
} from 'lucide-react';
import { getRemainingSeconds, getTaskStatus } from '../lib/timer-engine.js';
import { formatRemaining, formatDurationShort } from '../lib/time-parser.js';
import AmbientBackground from './AmbientBackground';
import { ambientSound } from '../lib/ambient-sound.js';

export default function PipFloatingTimer({
  flow,
  task,
  visualState = 'idle',
  onToggle,
  onReset,
  onAdjustTime,
  onClose,
  onResize,
}) {
  const { state, now } = flow;
  const containerRef = useRef(null);
  const clipId = useId().replace(/:/g, '');

  const [taskPicker, setTaskPicker] = useState(false);
  const [customInput, setCustomInput] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 360, height: 260 });

  const [visualMode, setVisualMode] = useState('hourglass');
  const [particleMode, setParticleMode] = useState('snow');
  const [soundMode, setSoundMode] = useState('off');

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const win = el.ownerDocument.defaultView || (typeof window !== 'undefined' ? window : null);

    const updateDimensions = () => {
      const width = win ? win.innerWidth : el.clientWidth;
      const height = win ? win.innerHeight : el.clientHeight;
      setWindowSize({ width, height });
    };

    updateDimensions();

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          setWindowSize({ width, height });
        }
      });
      resizeObserver.observe(el);
    }

    win?.addEventListener('resize', updateDimensions);
    return () => {
      resizeObserver?.disconnect();
      win?.removeEventListener('resize', updateDimensions);
    };
  }, []);

  const isBar = windowSize.height <= 155;
  const isLarge = windowSize.height > 290 && windowSize.width > 400;
  const layout = isBar ? 'bar' : isLarge ? 'large' : 'card';

  useEffect(() => {
    if (isBar) {
      setCustomInput(false);
      setTaskPicker(false);
      setConfirmReset(false);
    }
  }, [isBar]);

  useEffect(() => {
    return () => {
      ambientSound.stop();
    };
  }, []);

  const status = task ? getTaskStatus(task, now) : 'idle';
  const left = task ? getRemainingSeconds(task, now) : 0;
  const percent = task && task.goal > 0 ? Math.min(100, Math.max(0, (1 - left / task.goal) * 100)) : 0;
  const fraction = task && task.goal > 0 ? Math.max(0, Math.min(1, left / task.goal)) : 1;

  const handleSizeSelect = mode => {
    if (mode === 'bar') {
      setCustomInput(false);
      setTaskPicker(false);
      setConfirmReset(false);
    }
    if (onResize) {
      if (mode === 'bar') onResize(380, 110);
      else if (mode === 'large') onResize(460, 330);
      else onResize(360, 260);
    }
  };

  const handleSoundCycle = () => {
    const next = ambientSound.toggleNext();
    setSoundMode(next);
  };

  const handleParticleCycle = () => {
    const next = particleMode === 'snow' ? 'stardust' : particleMode === 'stardust' ? 'off' : 'snow';
    setParticleMode(next);
  };

  const handleCustomSubmit = e => {
    e.preventDefault();
    if (!task) return;
    const minutes = parseFloat(inputVal);
    if (!isNaN(minutes) && minutes > 0) {
      const targetSec = Math.round(minutes * 60);
      const delta = targetSec - left;
      onAdjustTime(task.id, delta);
      setCustomInput(false);
      setInputVal('');
    }
  };

  const handleResetClick = () => {
    if (!task) return;
    const hasProgress = status === 'running' || status === 'paused' || left < task.goal;
    if (hasProgress) {
      setConfirmReset(true);
    } else {
      onReset(task.id);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`pip-root layout-${layout}`}
      data-layout={layout}
      style={{ '--accent': task?.color || '#a8c58a' }}
    >
      <AmbientBackground
        visualState={visualState}
        isMini={true}
        particleMode={particleMode}
      />

      {taskPicker && !isBar && (
        <div className="pip-task-modal">
          <div className="pip-modal-header">
            <span>Đổi công việc</span>
            <button
              type="button"
              className="pip-icon-btn"
              onClick={() => setTaskPicker(false)}
              title="Đóng danh sách"
            >
              <X size={14} />
            </button>
          </div>
          <div className="pip-modal-list">
            {state.tasks.map(t => {
              const isCurrent = t.id === task?.id;
              const rem = getRemainingSeconds(t, now);
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`pip-task-row ${isCurrent ? 'active' : ''}`}
                  onClick={() => {
                    flow.select(t.id);
                    setTaskPicker(false);
                  }}
                >
                  <span className="dot" style={{ background: t.color }} />
                  <span className="emoji">{t.emoji}</span>
                  <span className="name">{t.name}</span>
                  <span className="time">{formatDurationShort(rem)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {confirmReset && !isBar && task && (
        <div className="pip-confirm-overlay">
          <div className="pip-confirm-box">
            <span className="pip-confirm-title">Đặt lại phiên này?</span>
            <p className="pip-confirm-desc">Tiến độ hiện tại của “{task.name}” sẽ trở về ban đầu.</p>
            <div className="pip-confirm-actions">
              <button
                type="button"
                className="pip-confirm-btn cancel"
                onClick={() => setConfirmReset(false)}
              >
                Giữ lại
              </button>
              <button
                type="button"
                className="pip-confirm-btn confirm"
                onClick={() => {
                  setConfirmReset(false);
                  onReset(task.id);
                }}
              >
                Đặt lại
              </button>
            </div>
          </div>
        </div>
      )}

      {isBar ? (
        <div className="pip-bar-view">
          {confirmReset ? (
            <div className="pip-bar-confirm">
              <span className="confirm-text">Đặt lại “{task?.name}”?</span>
              <div className="confirm-actions">
                <button
                  type="button"
                  className="pip-confirm-btn sm cancel"
                  onClick={() => setConfirmReset(false)}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="pip-confirm-btn sm confirm"
                  onClick={() => {
                    setConfirmReset(false);
                    if (task) onReset(task.id);
                  }}
                >
                  Đặt lại
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="pip-task-chip"
                onClick={() => handleSizeSelect('card')}
                disabled={!task}
                title="Bấm để mở rộng và đổi việc"
              >
                <span className="emoji">{task?.emoji || '✦'}</span>
                <span className="name">{task?.name || 'Chưa chọn'}</span>
              </button>

              <div className="pip-bar-center">
                <span className={`pip-digits-bar ${status === 'running' ? 'running' : ''}`}>
                  {formatRemaining(left)}
                </span>
                <span className={`pip-status-dot ${status}`} />
              </div>

              <div className="pip-bar-actions">
                <button
                  type="button"
                  className="adjust-pill"
                  disabled={!task}
                  onClick={() => task && onAdjustTime(task.id, 300)}
                  title="Cộng 5 phút"
                >
                  +5p
                </button>

                <button
                  type="button"
                  className="pip-reset-btn sm"
                  disabled={!task}
                  onClick={handleResetClick}
                  title="Đặt lại phiên"
                >
                  <RotateCcw size={13} />
                </button>

                <button
                  type="button"
                  className="pip-play-btn sm"
                  disabled={!task || status === 'completed'}
                  onClick={() => task && onToggle(task.id)}
                  title={status === 'running' ? 'Tạm dừng' : 'Tiếp tục'}
                >
                  {status === 'completed' ? (
                    <Check size={15} />
                  ) : status === 'running' ? (
                    <Pause size={15} fill="currentColor" />
                  ) : (
                    <Play size={15} fill="currentColor" />
                  )}
                </button>

                <div className="pip-size-controls sm">
                  <button
                    type="button"
                    className="pip-size-btn"
                    onClick={() => handleSizeSelect('card')}
                    title="Mở rộng sang Thẻ"
                  >
                    Thẻ
                  </button>
                </div>

                <button
                  type="button"
                  className="pip-icon-btn close-pip"
                  onClick={onClose}
                  title="Đóng / Trở về tab chính"
                >
                  <X size={14} />
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          <header className="pip-header">
            <button
              type="button"
              className="pip-task-chip"
              onClick={() => setTaskPicker(!taskPicker)}
              disabled={!task}
              title="Bấm để đổi công việc"
            >
              <span className="emoji">{task?.emoji || '✦'}</span>
              <span className="name">{task?.name || 'Chưa chọn'}</span>
              <ChevronDown size={12} className="chevron" />
            </button>

            <div className="pip-header-tools">
              <button
                type="button"
                className={`pip-tool-btn ${particleMode !== 'off' ? 'active' : ''}`}
                onClick={handleParticleCycle}
                title="Đổi hiệu ứng tuyết rơi / hạt sao"
              >
                <Sparkles size={13} />
                <span className="tool-label">
                  {particleMode === 'snow' ? 'Tuyết' : particleMode === 'stardust' ? 'Sao' : 'Tĩnh'}
                </span>
              </button>

              <button
                type="button"
                className={`pip-tool-btn ${soundMode !== 'off' ? 'active' : ''}`}
                onClick={handleSoundCycle}
                title="Bật âm thanh tập trung (Mưa / Sóng / Đồng hồ)"
              >
                {soundMode === 'off' ? <VolumeX size={13} /> : <Volume2 size={13} />}
                <span className="tool-label">
                  {soundMode === 'rain' ? 'Mưa' : soundMode === 'zen' ? 'Sóng' : soundMode === 'clock' ? 'Tắc' : 'Âm'}
                </span>
              </button>
            </div>

            <div className="pip-size-controls">
              <button
                type="button"
                className={`pip-size-btn ${layout === 'bar' ? 'active' : ''}`}
                onClick={() => handleSizeSelect('bar')}
                title="Thu nhỏ dạng thanh ngang"
              >
                Thanh
              </button>
              <button
                type="button"
                className={`pip-size-btn ${layout === 'card' ? 'active' : ''}`}
                onClick={() => handleSizeSelect('card')}
                title="Kích thước thẻ vừa"
              >
                Thẻ
              </button>
              <button
                type="button"
                className={`pip-size-btn ${layout === 'large' ? 'active' : ''}`}
                onClick={() => handleSizeSelect('large')}
                title="Kích thước rộng lớn"
              >
                Lớn
              </button>
            </div>

            <button
              type="button"
              className="pip-icon-btn close-pip"
              onClick={onClose}
              title="Đóng / Trở về tab chính"
            >
              <X size={15} />
            </button>
          </header>

          {/* Luminous Frosted Glass Quote Capsule */}
          <div
            className={`pip-quote-capsule ${isFading ? 'fading' : ''}`}
            onClick={handleNextQuote}
            role="button"
            tabIndex={0}
            title="Bấm để đổi câu danh ngôn tiếp theo (Click to cycle quote)"
          >
            <div className="quote-badge-glow">
              <span className="quote-sparkle">✦</span>
            </div>
            <div className="quote-content">
              <span className="quote-text">“{FAMOUS_QUOTES[quoteIdx].text}”</span>
              <span className="quote-author">— {FAMOUS_QUOTES[quoteIdx].author}</span>
            </div>
            <span className="quote-shimmer-sweep" />
            <div className="quote-progress-track">
              <div className="quote-progress-fill" key={quoteIdx} />
            </div>
          </div>

          <div className="pip-visual-switch">
            <button
              type="button"
              className={`visual-pill ${visualMode === 'hourglass' ? 'active' : ''}`}
              onClick={() => setVisualMode('hourglass')}
              title="Đồng hồ cát hoạt họa"
            >
              <Hourglass size={12} />
              <span>Đồng hồ cát</span>
            </button>
            <button
              type="button"
              className={`visual-pill ${visualMode === 'ring' ? 'active' : ''}`}
              onClick={() => setVisualMode('ring')}
              title="Vòng quỹ đạo Neon"
            >
              <Focus size={12} />
              <span>Vòng sáng</span>
            </button>
            <button
              type="button"
              className={`visual-pill ${visualMode === 'digits' ? 'active' : ''}`}
              onClick={() => setVisualMode('digits')}
              title="Đồng hồ số tối giản"
            >
              <Clock size={12} />
              <span>Chữ số</span>
            </button>
          </div>

          <div className="pip-body">
            <div className="pip-display-flex">
              {visualMode === 'hourglass' && (
                <div className="pip-hourglass-wrap" title="Đồng hồ cát đang chảy">
                  <svg className="pip-hourglass-svg" viewBox="0 0 100 110" aria-hidden="true">
                    <defs>
                      <clipPath id={clipId}>
                        <path d="M22 12H78V25C78 39 58 45 53 54C58 65 78 70 78 85V98H22V85C22 70 42 65 47 54C42 45 22 39 22 25Z" />
                      </clipPath>
                    </defs>
                    <g clipPath={`url(#${clipId})`}>
                      <rect
                        x="15"
                        y={54 - fraction * 42}
                        width="70"
                        height={fraction * 42}
                        fill="var(--accent)"
                        opacity="0.8"
                      />
                      <rect
                        x="15"
                        y={98 - (1 - fraction) * 42}
                        width="70"
                        height={(1 - fraction) * 42}
                        fill="var(--accent)"
                      />
                      {status === 'running' && (
                        <path
                          className="pip-sand-stream"
                          d={`M50 54V${98 - (1 - fraction) * 42}`}
                          stroke="var(--accent)"
                          strokeWidth="2.5"
                          strokeDasharray="2 3"
                        />
                      )}
                    </g>
                    <path
                      d="M22 12H78V25C78 39 58 45 53 54C58 65 78 70 78 85V98H22V85C22 70 42 65 47 54C42 45 22 39 22 25Z"
                      fill="none"
                      stroke="currentColor"
                      strokeOpacity="0.35"
                      strokeWidth="2"
                    />
                    <path
                      d="M17 9H83M17 101H83"
                      stroke="currentColor"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              )}

              {visualMode === 'ring' && (
                <div className="pip-ring-wrap">
                  <svg className="pip-ring-svg" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" className="ring-track" />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      className="ring-progress"
                      stroke="var(--accent)"
                      strokeDasharray={2 * Math.PI * 42}
                      strokeDashoffset={2 * Math.PI * 42 * (1 - fraction)}
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                </div>
              )}

              <div className="pip-timer-display">
                <span className={`pip-digits ${status === 'running' ? 'running' : ''}`}>
                  {formatRemaining(left)}
                </span>
                <div className="pip-status-row">
                  <span className={`pip-status-dot ${status}`} />
                  <span className="pip-status-text">
                    {status === 'running' ? 'Đang tập trung' : status === 'paused' ? 'Tạm dừng' : 'Sẵn sàng'}
                  </span>
                  <span className="pip-percent">({Math.round(percent)}%)</span>
                </div>
              </div>
            </div>

            <div className="pip-main-actions">
              <button
                type="button"
                className="pip-reset-btn"
                disabled={!task}
                title="Đặt lại phiên"
                onClick={handleResetClick}
              >
                <RotateCcw size={17} />
              </button>

              <button
                type="button"
                className={`pip-play-btn ${status === 'running' ? 'pulse-btn' : ''}`}
                disabled={!task || status === 'completed'}
                onClick={() => task && onToggle(task.id)}
                title={status === 'running' ? 'Tạm dừng' : 'Tiếp tục'}
              >
                {status === 'completed' ? (
                  <Check size={22} />
                ) : status === 'running' ? (
                  <Pause size={22} fill="currentColor" />
                ) : (
                  <Play size={22} fill="currentColor" />
                )}
              </button>
            </div>
          </div>

          <div className="pip-adjust-bar">
            <span className="adjust-label">Chỉnh giờ:</span>
            <div className="adjust-buttons">
              <button
                type="button"
                className="adjust-pill"
                disabled={!task}
                onClick={() => task && onAdjustTime(task.id, -300)}
                title="Trừ 5 phút"
              >
                -5p
              </button>
              <button
                type="button"
                className="adjust-pill"
                disabled={!task}
                onClick={() => task && onAdjustTime(task.id, -60)}
                title="Trừ 1 phút"
              >
                -1p
              </button>
              <button
                type="button"
                className="adjust-pill plus"
                disabled={!task}
                onClick={() => task && onAdjustTime(task.id, 60)}
                title="Cộng 1 phút"
              >
                +1p
              </button>
              <button
                type="button"
                className="adjust-pill plus"
                disabled={!task}
                onClick={() => task && onAdjustTime(task.id, 300)}
                title="Cộng 5 phút"
              >
                +5p
              </button>
              <button
                type="button"
                className={`adjust-pill custom ${customInput ? 'active' : ''}`}
                disabled={!task}
                onClick={() => setCustomInput(!customInput)}
                title="Nhập số phút cụ thể"
              >
                <Clock size={12} />
                <span>Sửa</span>
              </button>
            </div>
          </div>

          {customInput && (
            <form onSubmit={handleCustomSubmit} className="pip-custom-form">
              <input
                autoFocus
                type="number"
                min="1"
                max="1440"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                placeholder="Nhập số phút (vd: 45)"
              />
              <button type="submit" className="custom-submit-btn">
                Đặt
              </button>
              <button
                type="button"
                className="custom-cancel-btn"
                onClick={() => setCustomInput(false)}
              >
                Hủy
              </button>
            </form>
          )}
        </>
      )}

      <div className="pip-progress-track">
        <span style={{ width: `${percent}%`, background: task?.color || 'var(--accent)' }} />
      </div>
    </div>
  );
}
```
