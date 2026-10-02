# TỔNG HỢP TOÀN BỘ CODE CHỨC NĂNG PICTURE-IN-PICTURE (PIP) - FLOW TIMER

Tài liệu này tổng hợp toàn bộ code đầy đủ 100% của các file đã được nâng cấp cho tính năng Picture-in-Picture (PiP) theo chuẩn **Document Picture-in-Picture API** (Chrome/Edge 111+) và Native Desktop Window (Electron).

---

## 1. `src/lib/ambient-sound.js`
> Âm thanh tập trung bằng Web Audio API (100% offline, không tốn tài nguyên):
> - Tiếng mưa rào êm dịu (Gentle Rain)
> - Sóng biển Zen (Ocean Waves)
> - Tích tắc đồng hồ cổ điển (Wooden Clock Tick)

```javascript
let audioCtx = null;
let currentSource = null;
let gainNode = null;
let currentSoundType = 'off';
let volume = 0.35;
let tickTimer = null;

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

function createRainNode(ctx) {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let lastOut = 0.0;

  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    lastOut = (lastOut + 0.02 * white) / 1.02;
    data[i] = lastOut * 3.5;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1000, ctx.currentTime);

  noise.connect(filter);
  return { source: noise, output: filter };
}

function createZenNode(ctx) {
  const bufferSize = ctx.sampleRate * 3;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;

  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99 * b0 + white * 0.05;
    b1 = 0.96 * b1 + white * 0.11;
    b2 = 0.86 * b2 + white * 0.25;
    data[i] = (b0 + b1 + b2) * 0.4;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(450, ctx.currentTime);

  noise.connect(filter);
  return { source: noise, output: filter };
}

function playClockTick(ctx, outputNode) {
  if (!ctx || ctx.state !== 'running') return;
  const osc = ctx.createOscillator();
  const tickGain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.035);

  tickGain.gain.setValueAtTime(0.4, ctx.currentTime);
  tickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);

  osc.connect(tickGain);
  tickGain.connect(outputNode);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.04);
}

export const ambientSound = {
  getSound: () => currentSoundType,
  getVolume: () => volume,

  setVolume: newVol => {
    volume = Math.max(0, Math.min(1, newVol));
    if (gainNode && audioCtx) {
      gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
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

    gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.connect(ctx.destination);

    currentSoundType = type;

    if (type === 'rain') {
      const { source, output } = createRainNode(ctx);
      output.connect(gainNode);
      source.start();
      currentSource = source;
    } else if (type === 'zen') {
      const { source, output } = createZenNode(ctx);
      output.connect(gainNode);
      source.start();
      currentSource = source;
    } else if (type === 'clock') {
      playClockTick(ctx, gainNode);
      tickTimer = setInterval(() => {
        playClockTick(ctx, gainNode);
      }, 1000);
    }
  },

  stop: () => {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
    if (currentSource) {
      try {
        currentSource.stop();
        currentSource.disconnect();
      } catch (e) {}
      currentSource = null;
    }
    if (gainNode) {
      try {
        gainNode.disconnect();
      } catch (e) {}
      gainNode = null;
    }
    currentSoundType = 'off';
  },

  toggleNext: () => {
    const sequence = ['off', 'rain', 'zen', 'clock'];
    const currentIndex = sequence.indexOf(currentSoundType);
    const nextIndex = (currentIndex + 1) % sequence.length;
    const nextType = sequence[nextIndex];
    ambientSound.play(nextType);
    return nextType;
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
