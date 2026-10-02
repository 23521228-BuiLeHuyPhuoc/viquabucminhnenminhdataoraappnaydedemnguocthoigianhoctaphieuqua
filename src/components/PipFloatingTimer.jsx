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
  Quote,
} from 'lucide-react';
import { getRemainingSeconds, getTaskStatus } from '../lib/timer-engine.js';
import { formatRemaining, formatDurationShort } from '../lib/time-parser.js';
import AmbientBackground from './AmbientBackground';
import { ambientSound } from '../lib/ambient-sound.js';

export const FAMOUS_QUOTES = [
  { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "Focus is a matter of deciding what things you're not going to do.", author: "John Carmack" },
  { text: "You have power over your mind — not outside events.", author: "Marcus Aurelius" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Deep work is the superpower of the 21st century.", author: "Cal Newport" },
  { text: "You do not rise to the level of your goals. You fall to the level of your systems.", author: "James Clear" },
  { text: "The successful warrior is the average man, with laser-like focus.", author: "Bruce Lee" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "Energy flows where attention goes.", author: "Tony Robbins" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Deciding what not to do is as important as deciding what to do.", author: "Steve Jobs" },
  { text: "Small deeds done are better than great deeds planned.", author: "Peter Marshall" },
];

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

  // Visual, Sound & Quote states
  const [visualMode, setVisualMode] = useState('hourglass'); // 'hourglass' | 'ring' | 'digits'
  const [particleMode, setParticleMode] = useState('snow'); // 'snow' | 'stardust' | 'off'
  const [soundMode, setSoundMode] = useState('off'); // 'off' | 'rain' | 'clock' | 'zen'
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [isFading, setIsFading] = useState(false);

  // Responsive layout detection based on real container & PiP window dimensions
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

  // Determine actual responsive layout
  const isBar = windowSize.height <= 155;
  const isLarge = windowSize.height > 290 && windowSize.width > 400;
  const layout = isBar ? 'bar' : isLarge ? 'large' : 'card';

  // Automatically close sub-UIs when window is resized to bar mode
  useEffect(() => {
    if (isBar) {
      setCustomInput(false);
      setTaskPicker(false);
      setConfirmReset(false);
    }
  }, [isBar]);

  // Clean up sound on unmount
  useEffect(() => {
    return () => {
      ambientSound.stop();
    };
  }, []);

  const switchQuote = nextIndex => {
    if (isFading) return;
    setIsFading(true);
    setTimeout(() => {
      setQuoteIdx(nextIndex);
      setIsFading(false);
    }, 300);
  };

  const handleNextQuote = () => {
    switchQuote((quoteIdx + 1) % FAMOUS_QUOTES.length);
  };

  // Auto-cycle famous quote every 18 seconds with smooth cross-fade
  useEffect(() => {
    const timer = setInterval(() => {
      switchQuote((quoteIdx + 1) % FAMOUS_QUOTES.length);
    }, 18000);
    return () => clearInterval(timer);
  }, [quoteIdx]);

  // Null-safe timer calculations
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
      {/* Dynamic Mesh + Animated Particle Canvas (Snow / Stardust) */}
      <AmbientBackground
        visualState={visualState}
        isMini={true}
        particleMode={particleMode}
      />

      {/* Task Picker Modal inside PiP */}
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

      {/* Safe Reset Confirmation Modal inside Card/Large PiP */}
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

      {/* Layout Content */}
      {isBar ? (
        /* COMPACT / BAR VIEW */
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
        /* CARD & LARGE VIEW */
        <>
          {/* Header */}
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

            {/* Quick Controls: Weather & Ambient Sound */}
            <div className="pip-header-tools">
              <button
                type="button"
                className={`pip-tool-btn ${particleMode !== 'off' ? 'active' : ''}`}
                onClick={handleParticleCycle}
                title={
                  particleMode === 'snow'
                    ? 'Hiệu ứng: Tuyết rơi (Bấm để đổi hạt sao)'
                    : particleMode === 'stardust'
                    ? 'Hiệu ứng: Hạt sao phát sáng (Bấm để tắt)'
                    : 'Bật hiệu ứng tuyết rơi'
                }
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
                title={
                  soundMode === 'rain'
                    ? 'Âm thanh: Tiếng mưa rơi êm dịu (Bấm đổi sóng biển)'
                    : soundMode === 'zen'
                    ? 'Âm thanh: Sóng biển Zen (Bấm đổi tích tắc)'
                    : soundMode === 'clock'
                    ? 'Âm thanh: Tích tắc đồng hồ (Bấm để tắt)'
                    : 'Bật âm thanh tập trung (Mưa / Sóng biển / Đồng hồ)'
                }
              >
                {soundMode === 'off' ? <VolumeX size={13} /> : <Volume2 size={13} />}
                <span className="tool-label">
                  {soundMode === 'rain' ? 'Mưa' : soundMode === 'zen' ? 'Sóng' : soundMode === 'clock' ? 'Tắc' : 'Âm'}
                </span>
              </button>
            </div>

            {/* Size Preset Requests */}
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

          {/* Visual Mode Selector: Hourglass / Ring Orbit / Clean Digits */}
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

          {/* Main Visual Display */}
          <div className="pip-body">
            <div className="pip-display-flex">
              {visualMode === 'hourglass' && (
                /* Animated Mini Hourglass (Đồng hồ cát) */
                <div className="pip-hourglass-wrap" title="Đồng hồ cát đang chảy">
                  <svg className="pip-hourglass-svg" viewBox="0 0 100 110" aria-hidden="true">
                    <defs>
                      <clipPath id={clipId}>
                        <path d="M22 12H78V25C78 39 58 45 53 54C58 65 78 70 78 85V98H22V85C22 70 42 65 47 54C42 45 22 39 22 25Z" />
                      </clipPath>
                    </defs>
                    <g clipPath={`url(#${clipId})`}>
                      {/* Top Sand chamber decreasing */}
                      <rect
                        x="15"
                        y={54 - fraction * 42}
                        width="70"
                        height={fraction * 42}
                        fill="var(--accent)"
                        opacity="0.8"
                      />
                      {/* Bottom Sand chamber filling up */}
                      <rect
                        x="15"
                        y={98 - (1 - fraction) * 42}
                        width="70"
                        height={(1 - fraction) * 42}
                        fill="var(--accent)"
                      />
                      {/* Streaming sand trickle when running */}
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
                    {/* Hourglass glass outline */}
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
                /* Animated Mini Orbit Ring */
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

          {/* Time Adjustments Toolbar */}
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

          {/* Custom Duration Input Form */}
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

      {/* Persistent Bottom Progress Track */}
      <div className="pip-progress-track">
        <span style={{ width: `${percent}%`, background: task?.color || 'var(--accent)' }} />
      </div>
    </div>
  );
}
