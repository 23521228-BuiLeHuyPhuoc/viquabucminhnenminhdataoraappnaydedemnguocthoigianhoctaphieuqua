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
  Volume1,
  Hourglass,
  Focus,
  Quote,
  Headphones,
  Activity,
  CloudRain,
  Flame,
  Waves,
  Trees,
  Coffee,
  Bell,
  Music,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  Repeat1,
  ListMusic,
  Wind,
} from 'lucide-react';
import { getRemainingSeconds, getTaskStatus } from '../lib/timer-engine.js';
import { formatRemaining, formatDurationShort } from '../lib/time-parser.js';
import AmbientBackground from './AmbientBackground';
import { ambientSound, SOUND_PRESETS } from '../lib/ambient-sound.js';
import { ghibliMusic, GHIBLI_TRACKS, PLAYLISTS, LOOP_MODE } from '../lib/ghibli-music.js';

function getSoundIcon(id, size = 13) {
  if (id && id.startsWith('ghibli_')) return <Music size={size} />;
  switch (id) {
    case 'brown': return <Headphones size={size} />;
    case 'binaural': return <Activity size={size} />;
    case 'rain': return <CloudRain size={size} />;
    case 'fireplace': return <Flame size={size} />;
    case 'waves': return <Waves size={size} />;
    case 'forest': return <Trees size={size} />;
    case 'cafe': return <Coffee size={size} />;
    case 'bowl': return <Bell size={size} />;
    case 'clock': return <Clock size={size} />;
    case 'white': return <Wind size={size} />;
    default: return <VolumeX size={size} />;
  }
}

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
  const [soundPicker, setSoundPicker] = useState(false);
  const [adjustMenu, setAdjustMenu] = useState(false);
  const [quoteMenu, setQuoteMenu] = useState(false);
  const [customInput, setCustomInput] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 360, height: 260 });
  const [soundTab, setSoundTab] = useState('ghibli'); // 'ghibli' | 'nature'

  // Visual, Sound & Quote states
  const [visualMode, setVisualMode] = useState('hourglass'); // 'hourglass' | 'ring' | 'digits'
  const [particleMode, setParticleMode] = useState('snow'); // 'snow' | 'stardust' | 'off'
  const [soundMode, setSoundMode] = useState(ambientSound.getSound());
  const [soundVolume, setSoundVolume] = useState(ambientSound.getVolume());
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [isFading, setIsFading] = useState(false);

  const [ghibliState, setGhibliState] = useState(ghibliMusic.getState());

  useEffect(() => {
    const unsubAmbient = ambientSound.subscribe(type => {
      setSoundMode(type);
      setSoundVolume(ambientSound.getVolume());
    });
    const unsubGhibli = ghibliMusic.subscribe(info => {
      setGhibliState(info);
    });
    return () => {
      unsubAmbient();
      unsubGhibli();
    };
  }, []);

  const currentPreset = SOUND_PRESETS.find(p => p.id === soundMode) || SOUND_PRESETS[0];

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

  // Any modal / drawer open
  const anyModal = taskPicker || soundPicker || adjustMenu || quoteMenu || confirmReset;

  // Auto-resize PiP window when sub-UI opens/closes in bar mode
  useEffect(() => {
    if (isBar && onResize) {
      if (anyModal) {
        onResize(440, 390);
      } else {
        onResize(440, 95);
      }
    }
  }, [anyModal, isBar, onResize]);

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

  const cycleVisualMode = () => {
    setVisualMode(v => (v === 'hourglass' ? 'ring' : v === 'ring' ? 'digits' : 'hourglass'));
  };

  const handleSizeSelect = mode => {
    if (mode === 'bar') {
      setCustomInput(false);
      setTaskPicker(false);
      setSoundPicker(false);
      setConfirmReset(false);
      setAdjustMenu(false);
      setQuoteMenu(false);
    }
    if (onResize) {
      if (mode === 'bar') onResize(440, 95);
      else if (mode === 'large') onResize(480, 360);
      else onResize(380, 270);
    }
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
      setAdjustMenu(false);
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

  // Filtered Ghibli tracks based on active playlist
  const filteredGhibliTracks = ghibliState.activePlaylist === 'all'
    ? GHIBLI_TRACKS
    : GHIBLI_TRACKS.filter(t => t.playlist === ghibliState.activePlaylist);

  const naturePresets = SOUND_PRESETS.filter(p => p.category === 'nature');

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
      {taskPicker && (
        <div className="pip-task-modal">
          <div className="pip-modal-header">
            <span>Đổi công việc học tập ({state.tasks.length})</span>
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

      {/* Music & Ambient Sound Hub inside PiP (Shuffle, Loop, Playlists, Nature) */}
      {soundPicker && (
        <div className="pip-task-modal pip-sound-modal">
          <div className="pip-modal-header">
            <div className="modal-title-with-icon">
              <Music size={13} className="text-amber-400" />
              <span>Âm nhạc & Tiếng ồn tập trung</span>
            </div>
            <button
              type="button"
              className="pip-icon-btn"
              onClick={() => setSoundPicker(false)}
              title="Đóng menu âm thanh"
            >
              <X size={14} />
            </button>
          </div>

          {/* Sound Tabs: Ghibli vs Nature */}
          <div className="mini-sound-tabs">
            <button
              type="button"
              className={`mini-sound-tab-btn ${soundTab === 'ghibli' ? 'active' : ''}`}
              onClick={() => setSoundTab('ghibli')}
            >
              <Music size={12} className="text-amber-400" />
              <span>Nhạc Ghibli ({GHIBLI_TRACKS.length})</span>
            </button>
            <button
              type="button"
              className={`mini-sound-tab-btn ${soundTab === 'nature' ? 'active' : ''}`}
              onClick={() => setSoundTab('nature')}
            >
              <Headphones size={12} />
              <span>Âm thiên nhiên ({naturePresets.length - 1})</span>
            </button>
          </div>

          {soundTab === 'ghibli' ? (
            <>
              {/* Currently Playing Card */}
              <div className="ghibli-now-playing">
                <div className="ghibli-now-icon">
                  <span className="flower">🌸</span>
                </div>
                <div className="ghibli-now-details">
                  <strong className="title">{ghibliState.currentTrack.title}</strong>
                  <span className="film">{ghibliState.currentTrack.film}</span>
                </div>
                <div className="ghibli-now-actions">
                  {/* Shuffle Button */}
                  <button
                    type="button"
                    className={`ghibli-ctrl-btn ${ghibliState.shuffle ? 'active' : ''}`}
                    onClick={() => ghibliMusic.toggleShuffle()}
                    title={ghibliState.shuffle ? 'Trộn bài: BẬT' : 'Trộn bài: TẮT'}
                  >
                    <Shuffle size={13} />
                  </button>

                  {/* Previous Track */}
                  <button
                    type="button"
                    className="ghibli-step-btn"
                    onClick={() => ghibliMusic.prevTrack()}
                    title="Bài trước"
                  >
                    <SkipBack size={13} />
                  </button>

                  {/* Play / Pause */}
                  <button
                    type="button"
                    className={`ghibli-toggle-btn ${ghibliState.isPlaying ? 'active' : ''}`}
                    onClick={() => ghibliMusic.toggle()}
                    title={ghibliState.isPlaying ? 'Tạm dừng nhạc' : 'Phát nhạc'}
                  >
                    {ghibliState.isPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
                  </button>

                  {/* Next Track */}
                  <button
                    type="button"
                    className="ghibli-step-btn"
                    onClick={() => ghibliMusic.nextTrack()}
                    title="Bài kế tiếp"
                  >
                    <SkipForward size={13} />
                  </button>

                  {/* Loop Mode Cycle Button */}
                  <button
                    type="button"
                    className={`ghibli-ctrl-btn ${ghibliState.loopMode !== LOOP_MODE.OFF ? 'active' : ''}`}
                    onClick={() => ghibliMusic.cycleLoopMode()}
                    title={
                      ghibliState.loopMode === LOOP_MODE.ALL
                        ? 'Lặp: Toàn bộ danh sách'
                        : ghibliState.loopMode === LOOP_MODE.ONE
                        ? 'Lặp: 1 bài hát'
                        : 'Không lặp'
                    }
                  >
                    {ghibliState.loopMode === LOOP_MODE.ONE ? (
                      <Repeat1 size={13} />
                    ) : (
                      <Repeat size={13} />
                    )}
                    <span className="ghibli-ctrl-badge">
                      {ghibliState.loopMode === LOOP_MODE.ALL
                        ? 'ALL'
                        : ghibliState.loopMode === LOOP_MODE.ONE
                        ? '1'
                        : 'OFF'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Playlist Selector Bar */}
              <div className="ghibli-playlist-bar">
                {PLAYLISTS.map(pl => {
                  const isActive = ghibliState.activePlaylist === pl.id;
                  return (
                    <button
                      key={pl.id}
                      type="button"
                      className={`ghibli-playlist-pill ${isActive ? 'active' : ''}`}
                      onClick={() => ghibliMusic.setPlaylist(pl.id)}
                    >
                      <span>{pl.icon}</span>
                      <span>{pl.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Volume Slider */}
              <div className="pip-sound-volume-bar">
                <div className="volume-info">
                  <span>Âm lượng Ghibli</span>
                  <strong>{Math.round(ghibliState.volume * 100)}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={ghibliState.volume}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    ghibliMusic.setVolume(val);
                  }}
                  className="pip-volume-slider"
                />
              </div>

              {/* Track List */}
              <div className="pip-modal-list sound-list-scroll">
                {filteredGhibliTracks.map((tr) => {
                  const isCurrent = ghibliState.currentTrack.id === tr.id;
                  return (
                    <button
                      key={tr.id}
                      type="button"
                      className={`pip-sound-row ${isCurrent ? 'active' : ''}`}
                      onClick={() => {
                        ghibliMusic.play(tr.id);
                      }}
                    >
                      <span className={`sound-icon-box ${isCurrent ? 'active' : ''}`}>
                        <Music size={13} />
                      </span>
                      <div className="sound-text-col">
                        <span className="sound-title">{tr.title}</span>
                        <span className="sound-subtitle">{tr.film}</span>
                      </div>
                      {isCurrent && ghibliState.isPlaying && (
                        <span className="mini-eq-bars">
                          <i className="b1" />
                          <i className="b2" />
                          <i className="b3" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              {/* Nature Ambient Sounds View */}
              <div className="pip-sound-volume-bar">
                <div className="volume-info">
                  <span>Âm lượng tiếng ồn nền</span>
                  <strong>{Math.round(soundVolume * 100)}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={soundVolume}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    setSoundVolume(val);
                    ambientSound.setVolume(val);
                  }}
                  className="pip-volume-slider"
                />
              </div>

              <div className="pip-modal-list sound-list-scroll">
                {naturePresets.map(preset => {
                  const isCurrent = soundMode === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={`pip-sound-row ${isCurrent ? 'active' : ''}`}
                      onClick={() => {
                        ambientSound.play(preset.id);
                      }}
                    >
                      <span className={`sound-icon-box ${isCurrent ? 'active' : ''}`}>
                        {getSoundIcon(preset.id, 14)}
                      </span>
                      <div className="sound-text-col">
                        <span className="sound-title">{preset.name}</span>
                        <span className="sound-subtitle">{preset.desc}</span>
                      </div>
                      {isCurrent && <Check size={14} className="sound-active-check" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Quote Popover */}
      {quoteMenu && (
        <div className="mini-quote-popover">
          <div className="pip-modal-header">
            <div className="modal-title-with-icon">
              <Sparkles size={13} className="text-sky-400" />
              <span>Danh ngôn truyền cảm hứng</span>
            </div>
            <button
              type="button"
              className="pip-icon-btn"
              onClick={() => setQuoteMenu(false)}
            >
              <X size={13} />
            </button>
          </div>
          <div className="quote-content">
            <span className="quote-text">“{FAMOUS_QUOTES[quoteIdx].text}”</span>
            <span className="quote-author">— {FAMOUS_QUOTES[quoteIdx].author}</span>
          </div>
          <div className="mini-quote-popover quote-footer">
            <button
              type="button"
              className="mini-quote-cycle-btn"
              onClick={handleNextQuote}
            >
              <span>↻ Đổi câu khác</span>
            </button>
          </div>
        </div>
      )}

      {/* Time Adjust Popover */}
      {adjustMenu && (
        <div className="mini-adjust-popover">
          <div className="pip-modal-header">
            <span>Chỉnh nhanh thời gian</span>
            <button
              type="button"
              className="pip-icon-btn"
              onClick={() => setAdjustMenu(false)}
            >
              <X size={13} />
            </button>
          </div>
          <div className="mini-adjust-grid">
            <button
              type="button"
              className="mini-adjust-btn"
              onClick={() => { task && onAdjustTime(task.id, -300); setAdjustMenu(false); }}
            >
              -5p
            </button>
            <button
              type="button"
              className="mini-adjust-btn"
              onClick={() => { task && onAdjustTime(task.id, -60); setAdjustMenu(false); }}
            >
              -1p
            </button>
            <button
              type="button"
              className="mini-adjust-btn"
              onClick={() => { task && onAdjustTime(task.id, 60); setAdjustMenu(false); }}
            >
              +1p
            </button>
            <button
              type="button"
              className="mini-adjust-btn"
              onClick={() => { task && onAdjustTime(task.id, 300); setAdjustMenu(false); }}
            >
              +5p
            </button>
          </div>
          <form onSubmit={handleCustomSubmit} className="mini-adjust-custom-form">
            <input
              type="number"
              min="1"
              max="1440"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder="Số phút"
            />
            <button type="submit">Đặt</button>
          </form>
        </div>
      )}

      {/* Safe Reset Confirmation Modal */}
      {confirmReset && task && (
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
        /* ======================================================== */
        /* COMPACT / BAR VIEW — TỐI ƯU TOÀN DIỆN VỚI ĐỦ TÍNH NĂNG     */
        /* ======================================================== */
        <div className="pip-bar-view">
          {confirmReset ? (
            <div className="pip-bar-confirm">
              <span className="confirm-text">Đặt lại “{task?.name}”?</span>
              <div className="confirm-actions">
                <button
                  type="button"
                  className="confirm-btn-pill cancel"
                  onClick={() => setConfirmReset(false)}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="confirm-btn-pill danger"
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
              {/* 1. Trái: Task selector chip */}
              <button
                type="button"
                className="pip-task-chip"
                onClick={() => {
                  setTaskPicker(!taskPicker);
                  setSoundPicker(false);
                  setAdjustMenu(false);
                  setQuoteMenu(false);
                }}
                disabled={!task}
                title="Bấm để đổi nhanh công việc"
              >
                <span
                  className={`status-pulse-dot ${status}`}
                  style={{ '--dot-color': task?.color || 'var(--accent)' }}
                />
                <span className="emoji">{task?.emoji || '✦'}</span>
                <span className="name">{task?.name || 'Chưa chọn'}</span>
                <ChevronDown size={11} className="chevron" />
              </button>

              {/* 2. Giữa: Visual Orb + Digits + Progress % */}
              <div className="pip-bar-center">
                {/* Visual Orb: Click to cycle Hourglass / Ring / Digits */}
                <button
                  type="button"
                  className={`mini-visual-orb ${status === 'running' ? 'running' : ''}`}
                  onClick={cycleVisualMode}
                  title={`Hiệu ứng: ${visualMode === 'hourglass' ? 'Đồng hồ cát' : visualMode === 'ring' ? 'Vòng sáng' : 'Chữ số'} (Bấm để đổi)`}
                >
                  {visualMode === 'hourglass' ? (
                    <svg className="mini-hourglass-svg-sm" viewBox="0 0 100 110" aria-hidden="true">
                      <defs>
                        <clipPath id={`${clipId}-sm`}>
                          <path d="M22 12H78V25C78 39 58 45 53 54C58 65 78 70 78 85V98H22V85C22 70 42 65 47 54C42 45 22 39 22 25Z" />
                        </clipPath>
                      </defs>
                      <g clipPath={`url(#${clipId}-sm)`}>
                        <rect x="15" y={54 - fraction * 42} width="70" height={fraction * 42} fill="var(--accent)" opacity="0.8" />
                        <rect x="15" y={98 - (1 - fraction) * 42} width="70" height={(1 - fraction) * 42} fill="var(--accent)" />
                        {status === 'running' && (
                          <path d={`M50 54V${98 - (1 - fraction) * 42}`} stroke="var(--accent)" strokeWidth="3" strokeDasharray="2 3" />
                        )}
                      </g>
                      <path d="M22 12H78V25C78 39 58 45 53 54C58 65 78 70 78 85V98H22V85C22 70 42 65 47 54C42 45 22 39 22 25Z" fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="2.5" />
                      <path d="M17 9H83M17 101H83" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                    </svg>
                  ) : visualMode === 'ring' ? (
                    <svg className="mini-ring-svg-sm" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" className="ring-track" />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        className="ring-progress"
                        stroke="var(--accent)"
                        strokeDasharray={2 * Math.PI * 40}
                        strokeDashoffset={2 * Math.PI * 40 * (1 - fraction)}
                        transform="rotate(-90 50 50)"
                      />
                    </svg>
                  ) : (
                    <Clock size={13} />
                  )}
                </button>

                {/* Main Digits */}
                <span className={`pip-digits-bar ${status === 'running' ? 'running' : ''}`}>
                  {formatRemaining(left)}
                </span>

                {/* Percentage Badge */}
                <span className={`mini-percent-badge ${status === 'running' ? 'running' : ''}`}>
                  {Math.round(percent)}%
                </span>
              </div>

              {/* 3. Phải: Music Hub, Adjust, Quote, Reset, Play/Pause, Controls */}
              <div className="pip-bar-actions">
                {/* Ghibli Music & Sound Hub Button */}
                <button
                  type="button"
                  className={`mini-ghibli-btn ${ghibliState.isPlaying ? 'playing' : ''}`}
                  onClick={() => {
                    setSoundPicker(!soundPicker);
                    setTaskPicker(false);
                    setAdjustMenu(false);
                    setQuoteMenu(false);
                  }}
                  title={
                    ghibliState.isPlaying
                      ? `Đang phát: ${ghibliState.currentTrack.title} — Bấm để chọn danh sách / trộn bài / lặp`
                      : 'Bật nhạc Ghibli Lofi & Âm tập trung'
                  }
                >
                  <Music size={12} />
                  {ghibliState.isPlaying ? (
                    <span className="mini-eq-bars">
                      <i className="b1" />
                      <i className="b2" />
                      <i className="b3" />
                    </span>
                  ) : (
                    <span>Ghibli</span>
                  )}
                </button>

                {/* Time Adjust: Quick +5p + Dropdown trigger */}
                <button
                  type="button"
                  className="adjust-pill"
                  disabled={!task}
                  onClick={() => task && onAdjustTime(task.id, 300)}
                  onContextMenu={e => {
                    e.preventDefault();
                    setAdjustMenu(!adjustMenu);
                    setSoundPicker(false);
                    setTaskPicker(false);
                    setQuoteMenu(false);
                  }}
                  title="Cộng 5 phút (Chuột phải hoặc bấm mũi tên để mở menu chỉnh giờ)"
                >
                  +5p
                </button>
                <button
                  type="button"
                  className="pip-icon-btn"
                  style={{ width: 18, height: 24, padding: 0 }}
                  onClick={() => {
                    setAdjustMenu(!adjustMenu);
                    setSoundPicker(false);
                    setTaskPicker(false);
                    setQuoteMenu(false);
                  }}
                  title="Tùy chọn chỉnh giờ (-5p, -1p, +1p, +5p, sửa phút)"
                >
                  <ChevronDown size={11} />
                </button>

                {/* Inspirational Quote Sparkle Button */}
                <button
                  type="button"
                  className={`mini-quote-btn ${quoteMenu ? 'active' : ''}`}
                  onClick={() => {
                    setQuoteMenu(!quoteMenu);
                    setSoundPicker(false);
                    setTaskPicker(false);
                    setAdjustMenu(false);
                  }}
                  title={`Danh ngôn: “${FAMOUS_QUOTES[quoteIdx].text}” — ${FAMOUS_QUOTES[quoteIdx].author}`}
                >
                  <Sparkles size={12} />
                </button>

                {/* Safe Reset Button */}
                <button
                  type="button"
                  className="pip-reset-btn sm"
                  disabled={!task}
                  onClick={handleResetClick}
                  title="Đặt lại phiên này"
                >
                  <RotateCcw size={13} />
                </button>

                {/* Master Play / Pause Button */}
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

                {/* Size Controls */}
                <div className="pip-size-controls sm">
                  <button
                    type="button"
                    className="pip-size-btn"
                    onClick={() => handleSizeSelect('card')}
                    title="Mở rộng sang Thẻ"
                  >
                    Thẻ
                  </button>
                  <button
                    type="button"
                    className="pip-size-btn"
                    onClick={() => handleSizeSelect('large')}
                    title="Mở rộng sang Lớn"
                  >
                    Lớn
                  </button>
                </div>

                {/* Close Button */}
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
        /* ======================================================== */
        /* CARD & LARGE VIEW                                        */
        /* ======================================================== */
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
                className={`pip-tool-btn ${soundMode !== 'off' || ghibliState.isPlaying ? 'active' : ''}`}
                onClick={() => {
                  setSoundPicker(!soundPicker);
                  setTaskPicker(false);
                }}
                title={
                  ghibliState.isPlaying
                    ? `Đang phát Ghibli: ${ghibliState.currentTrack.title}`
                    : soundMode === 'off'
                    ? 'Bật âm thanh tập trung & nhạc Ghibli'
                    : `Đang phát: ${currentPreset?.name}`
                }
              >
                {ghibliState.isPlaying ? <Music size={13} className="text-amber-400" /> : getSoundIcon(soundMode, 13)}
                <span className="tool-label">
                  {ghibliState.isPlaying ? 'Ghibli' : currentPreset?.label || 'Âm'}
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
