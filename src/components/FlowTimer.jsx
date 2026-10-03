import React, { useEffect, useRef, useState, useId } from 'react';
import { createPortal } from 'react-dom';
import Head from 'next/head';
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock3,
  Edit3,
  Focus,
  Grip,
  Hourglass,
  LayoutPanelLeft,
  Maximize2,
  Minus,
  Moon,
  Pause,
  PictureInPicture2,
  Pin,
  PinOff,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  SlidersHorizontal,
  Sun,
  Trash2,
  Volume1,
  Volume2,
  VolumeX,
  Music,
  SkipForward,
  SkipBack,
  Sparkles,
  Shuffle,
  Repeat,
  Repeat1,
  ListMusic,
  X
} from 'lucide-react';
import useFlowTimer from '../hooks/useFlowTimer';
import { getRemainingSeconds, getTaskStatus, isTaskRunning, TIMER_STATUS, PALETTE } from '../lib/timer-engine.js';
import { formatRemaining, formatDurationShort, parseDuration } from '../lib/time-parser.js';
import { desktopBridge } from '../lib/desktop-bridge.js';
import { playCompletionSound } from '../lib/sound.js';
import { ambientSound, SOUND_PRESETS } from '../lib/ambient-sound.js';
import { ghibliMusic, GHIBLI_TRACKS, PLAYLISTS, LOOP_MODE } from '../lib/ghibli-music.js';
import AmbientBackground from './AmbientBackground';
import PipFloatingTimer, { FAMOUS_QUOTES } from './PipFloatingTimer';

const STATUS = {
  idle: 'Sẵn sàng bắt đầu',
  running: 'Đang tập trung',
  paused: 'Đang tạm dừng',
  completed: 'Đã hoàn thành',
};

function IconButton({ title, children, className = '', ...props }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className={`icon-button no-drag ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function Dialog({ title, onClose, children, className = '' }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      previous?.focus?.();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className={`flow-dialog ${className}`}
      onCancel={event => {
        event.preventDefault();
        closeRef.current();
      }}
      onClick={event => {
        if (event.target === event.currentTarget) {
          const b = event.currentTarget.getBoundingClientRect();
          if (event.clientX < b.left || event.clientX > b.right || event.clientY < b.top || event.clientY > b.bottom) {
            onClose();
          }
        }
      }}
      aria-label={title}
    >
      <div className="dialog-heading">
        <h2>{title}</h2>
        <IconButton title="Đóng hộp thoại" onClick={onClose}><X size={19} /></IconButton>
      </div>
      {children}
    </dialog>
  );
}

function TaskEditor({ task, durationOnly, onClose, onSave, now }) {
  const [name, setName] = useState(task?.name || '');
  const [emoji, setEmoji] = useState(task?.emoji || '✦');
  const [color, setColor] = useState(task?.color || '#a8c58a');
  const [duration, setDuration] = useState(
    task
      ? (task.goal % 60 === 0
          ? `${Math.floor(task.goal / 3600)}:${String(Math.floor((task.goal % 3600) / 60)).padStart(2, '0')}`
          : String(task.goal / 60))
      : '25'
  );
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const parsed = parseDuration(duration);
  const resets =
    task &&
    parsed.success &&
    parsed.seconds !== task.goal &&
    (isTaskRunning(task) || task.sessionId || getRemainingSeconds(task, now) < task.goal);

  function submit(event) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Nhập tên công việc trước nhé.');
      return;
    }
    if (!parsed.success) {
      setError(parsed.error);
      return;
    }
    if (resets && !confirmed) {
      setError('Xác nhận đặt lại phiên khi đổi thời lượng.');
      return;
    }
    onSave({ id: task?.id, name: name.trim(), emoji, color, goal: parsed.seconds });
    onClose();
  }

  return (
    <Dialog title={durationOnly ? 'Đặt thời lượng' : task ? 'Chỉnh sửa công việc' : 'Một việc mới'} onClose={onClose}>
      <form onSubmit={submit}>
        {!durationOnly && (
          <>
            <label className="field">
              Tên công việc
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Bạn muốn tập trung vào việc gì?"
                maxLength={100}
              />
            </label>
            <div className="editor-details">
              <label className="field">
                Biểu tượng
                <input
                  aria-label="Biểu tượng"
                  value={emoji}
                  onChange={e => setEmoji(e.target.value)}
                  maxLength={12}
                />
              </label>
              <div className="field">
                Màu sắc
                <div className="swatches">
                  {['#a8c58a', ...PALETTE.slice(0, 5)].map(c => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Chọn màu ${c}`}
                      aria-pressed={color === c}
                      className="swatch"
                      style={{ background: c }}
                      onClick={() => setColor(c)}
                    >
                      {color === c && <Check size={15} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
        <label className="field">
          Thời lượng
          <input
            aria-label="Thời lượng"
            autoFocus={durationOnly}
            value={duration}
            onChange={e => {
              setDuration(e.target.value);
              setConfirmed(false);
              setError('');
            }}
            placeholder="25 hoặc 1:30"
            aria-describedby="duration-help"
            aria-invalid={!!error}
          />
        </label>
        <p className="field-help" id="duration-help">
          Nhập phút, hoặc giờ:phút. Ví dụ: 90 = 1:30.
        </p>
        <div className="preset-row">
          {[15, 25, 45, 60, 90].map(n => (
            <button
              type="button"
              key={n}
              className={parsed.seconds === n * 60 ? 'selected' : ''}
              onClick={() => {
                setDuration(String(n));
                setConfirmed(false);
                setError('');
              }}
            >
              {n}p
            </button>
          ))}
        </div>
        {resets && (
          <label className="reset-notice">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
            />
            Dừng và đặt lại phiên này theo thời lượng mới.
          </label>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="dialog-actions">
          <button type="button" className="secondary-button" onClick={onClose}>Hủy</button>
          <button className="primary-button" type="submit"><Check size={17} />Lưu thay đổi</button>
        </div>
      </form>
    </Dialog>
  );
}

function Toggle({ title, detail, value, onChange }) {
  return (
    <div className="setting-row">
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
      <button
        type="button"
        className="switch"
        role="switch"
        aria-checked={value}
        aria-label={title}
        onClick={onChange}
      >
        <span />
      </button>
    </div>
  );
}

function Settings({ state, update, close }) {
  const [message, setMessage] = useState('');
  return (
    <Dialog title="Không gian của bạn" onClose={close}>
      <Toggle
        title="Giao diện sáng"
        detail="Đổi sắc độ, giữ sự tập trung."
        value={state.theme === 'light'}
        onChange={() => update({ theme: state.theme === 'dark' ? 'light' : 'dark' })}
      />
      <Toggle
        title="Âm thanh"
        detail="Âm báo nhẹ khi hoàn thành."
        value={state.soundEnabled}
        onChange={() => update({ soundEnabled: !state.soundEnabled })}
      />
      <button className="text-button" onClick={playCompletionSound}>
        <Volume2 size={15} />Nghe thử âm báo
      </button>
      <div className="setting-row">
        <div>
          <strong>Âm thanh nền tập trung</strong>
          <p>10 loại âm thanh thiên nhiên & tần số não Alpha.</p>
        </div>
        <select
          value={ambientSound.getSound()}
          onChange={e => {
            ambientSound.play(e.target.value);
            setMessage(e.target.value === 'off' ? 'Đã tắt âm thanh nền.' : `Đang phát: ${e.target.selectedOptions[0]?.text}`);
          }}
          className="sound-select"
        >
          {SOUND_PRESETS.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <Toggle
        title="Thông báo"
        detail="Nhắc khi phiên tập trung kết thúc."
        value={state.desktopNotifications}
        onChange={async () => {
          if (state.desktopNotifications) {
            update({ desktopNotifications: false });
          } else {
            const ok = await desktopBridge.requestNotificationPermission();
            update({ desktopNotifications: ok });
            setMessage(ok ? '' : 'Thông báo chưa được cho phép trong trình duyệt.');
          }
        }}
      />
      <Toggle
        title="Giảm chuyển động"
        detail="Giữ giao diện tĩnh và nhẹ hơn."
        value={state.reducedMotion}
        onChange={() => update({ reducedMotion: !state.reducedMotion })}
      />
      {message && <p className="field-help" role="status">{message}</p>}
      <div className="dialog-actions">
        <button className="primary-button" onClick={close}>Xong<Check size={17} /></button>
      </div>
    </Dialog>
  );
}

function AmbientSoundModal({ onClose }) {
  const [current, setCurrent] = useState(ambientSound.getSound());
  const [vol, setVol] = useState(ambientSound.getVolume());
  const [activeTab, setActiveTab] = useState(current.startsWith('ghibli_') ? 'ghibli' : 'nature');
  const [ghibliState, setGhibliState] = useState(ghibliMusic.getState());

  useEffect(() => {
    const unsubAmbient = ambientSound.subscribe(newType => {
      setCurrent(newType);
      setVol(ambientSound.getVolume());
    });
    const unsubGhibli = ghibliMusic.subscribe(info => {
      setGhibliState(info);
    });
    return () => {
      unsubAmbient();
      unsubGhibli();
    };
  }, []);

  const ghibliList = ghibliState.activePlaylist === 'all'
    ? SOUND_PRESETS.filter(p => p.category === 'ghibli')
    : SOUND_PRESETS.filter(p => {
        if (p.category !== 'ghibli') return false;
        const track = GHIBLI_TRACKS.find(t => t.id === p.id);
        return track && track.playlist === ghibliState.activePlaylist;
      });

  const natureList = SOUND_PRESETS.filter(p => p.category === 'nature');

  return (
    <Dialog title="Không gian âm thanh học tập & tập trung" onClose={onClose}>
      <div className="ambient-modal-intro">
        <p>Tuyển tập 24 bản nhạc Piano Ghibli chính thức cùng âm thanh thiên nhiên chuẩn khoa học, giúp tâm trí tĩnh lặng và đạt trạng thái tập trung sâu.</p>
      </div>

      <div className="ambient-tabs no-drag">
        <button
          type="button"
          className={`ambient-tab-btn ${activeTab === 'ghibli' ? 'active' : ''}`}
          onClick={() => setActiveTab('ghibli')}
        >
          <Music size={15} />
          <span>Nhạc Ghibli ({GHIBLI_TRACKS.length})</span>
        </button>
        <button
          type="button"
          className={`ambient-tab-btn ${activeTab === 'nature' ? 'active' : ''}`}
          onClick={() => setActiveTab('nature')}
        >
          <Volume2 size={15} />
          <span>Âm thiên nhiên & Sóng não ({natureList.length})</span>
        </button>
      </div>

      {activeTab === 'ghibli' && (
        <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-surface border border-line mb-3 no-drag">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🌸</span>
              <div className="flex flex-col">
                <strong className="text-xs text-text">{ghibliState.currentTrack.title}</strong>
                <span className="text-[10px] text-muted">{ghibliState.currentTrack.film}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Shuffle button */}
              <button
                type="button"
                className={`ghibli-ctrl-btn ${ghibliState.shuffle ? 'active' : ''}`}
                onClick={() => ghibliMusic.toggleShuffle()}
                title={ghibliState.shuffle ? 'Trộn bài ngẫu nhiên: BẬT' : 'Trộn bài ngẫu nhiên: TẮT'}
              >
                <Shuffle size={13} />
              </button>

              {/* Prev */}
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

              {/* Next */}
              <button
                type="button"
                className="ghibli-step-btn"
                onClick={() => ghibliMusic.nextTrack()}
                title="Bài kế tiếp"
              >
                <SkipForward size={13} />
              </button>

              {/* Loop mode cycle */}
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
                {ghibliState.loopMode === LOOP_MODE.ONE ? <Repeat1 size={13} /> : <Repeat size={13} />}
                <span className="ghibli-ctrl-badge">
                  {ghibliState.loopMode === LOOP_MODE.ALL ? 'ALL' : ghibliState.loopMode === LOOP_MODE.ONE ? '1' : 'OFF'}
                </span>
              </button>
            </div>
          </div>

          {/* Playlist selector bar */}
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
        </div>
      )}

      <div className="ambient-volume-slider-box">
        <div className="volume-header">
          <span>Âm lượng âm thanh ({Math.round(vol * 100)}%)</span>
          <button
            type="button"
            className="text-xs text-muted hover:text-white underline cursor-pointer"
            onClick={() => {
              ambientSound.stop();
            }}
          >
            Tắt toàn bộ âm
          </button>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={vol}
          onChange={e => {
            const val = parseFloat(e.target.value);
            setVol(val);
            ambientSound.setVolume(val);
            ghibliMusic.setVolume(val);
          }}
          className="ambient-slider"
        />
      </div>

      <div className="ambient-presets-grid">
        {(activeTab === 'ghibli' ? ghibliList : natureList).map(preset => {
          const isActive = current === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              className={`ambient-preset-card ${isActive ? 'active' : ''} ${preset.category === 'ghibli' ? 'ghibli-card' : ''}`}
              onClick={() => {
                ambientSound.play(preset.id);
              }}
            >
              <div className="card-top">
                <span className={`preset-badge ${isActive ? 'active' : ''}`}>
                  {preset.label}
                </span>
                {isActive ? (
                  <span className="playing-pulse">● Đang phát</span>
                ) : (
                  preset.category === 'ghibli' && (
                    <span className="ghibli-film-tag">
                      {preset.isLive ? '🔴 LIVE' : '🌸 Ghibli'}
                    </span>
                  )
                )}
              </div>
              <strong className="preset-card-name">{preset.name}</strong>
              <p className="preset-card-desc">{preset.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="dialog-actions">
        <button className="primary-button" onClick={onClose}>
          Xong <Check size={16} />
        </button>
      </div>
    </Dialog>
  );
}

function TimerVisual({ fraction, status, mode, children }) {
  const id = useId().replace(/:/g, '');
  return (
    <div className={`timer-visual ${status}`}>
      <svg className="timer-orbit" viewBox="0 0 360 360" aria-hidden="true">
        <circle cx="180" cy="180" r="169" className="orbit-outer" />
        {Array.from({ length: 60 }, (_, i) => (
          <line
            key={i}
            x1="180"
            y1={i % 5 ? 19 : 16}
            x2="180"
            y2="23"
            transform={`rotate(${i * 6} 180 180)`}
            className={i % 5 ? 'tick' : 'tick major'}
          />
        ))}
        <circle cx="180" cy="180" r="145" className="orbit-track" />
        <circle
          cx="180"
          cy="180"
          r="145"
          className="orbit-progress"
          strokeDasharray={2 * Math.PI * 145}
          strokeDashoffset={2 * Math.PI * 145 * (1 - fraction)}
          transform="rotate(-90 180 180)"
        />
      </svg>
      <div className="timer-face">
        {mode === 'hourglass' ? (
          <svg className="hourglass-art" viewBox="0 0 100 110" aria-label="Đồng hồ cát">
            <defs>
              <clipPath id={id}>
                <path d="M22 12H78V25C78 39 58 45 53 54C58 65 78 70 78 85V98H22V85C22 70 42 65 47 54C42 45 22 39 22 25Z" />
              </clipPath>
            </defs>
            <g clipPath={`url(#${id})`}>
              <rect
                x="15"
                y={54 - fraction * 42}
                width="70"
                height={fraction * 42}
                fill="currentColor"
                opacity=".7"
              />
              <rect
                x="15"
                y={98 - (1 - fraction) * 42}
                width="70"
                height={(1 - fraction) * 42}
                fill="currentColor"
              />
              {status === 'running' && (
                <path
                  className="sand-stream"
                  d={`M50 54V${98 - (1 - fraction) * 42}`}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="2 4"
                />
              )}
            </g>
            <path
              d="M22 12H78V25C78 39 58 45 53 54C58 65 78 70 78 85V98H22V85C22 70 42 65 47 54C42 45 22 39 22 25Z"
              fill="none"
              stroke="currentColor"
              strokeOpacity=".4"
              strokeWidth="2"
            />
            <path d="M17 8H83M17 102H83" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
          </svg>
        ) : (
          <span className="face-caption">
            <span className="status-dot" />
            {status === 'running'
              ? 'CỨ TỪ TỐN, BẠN ĐANG TIẾN LÊN'
              : status === 'completed'
              ? 'THÊM MỘT BƯỚC TIẾN'
              : 'MỘT VIỆC. TRỌN SỰ CHÚ Ý.'}
          </span>
        )}
        {children}
      </div>
    </div>
  );
}

/**
 * MiniTimer - Floating desktop widget
 * Specialized for Slim Bar mode: streamlined, distraction-free, essential focus tools & Ghibli Lofi music.
 */
function MiniTimer({ flow, task, desktop, visualState, onToggle, onReset, onAdjustTime }) {
  const { state, now, windowState } = flow;
  const [corners, setCorners] = useState(false);
  const [taskPicker, setTaskPicker] = useState(false);
  const [ghibliMenu, setGhibliMenu] = useState(false);
  const [adjustMenu, setAdjustMenu] = useState(false);
  const [quoteMenu, setQuoteMenu] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const [soundTab, setSoundTab] = useState('ghibli'); // 'ghibli' | 'nature'
  const [customMinutes, setCustomMinutes] = useState('');

  const [ghibliState, setGhibliState] = useState(ghibliMusic.getState());

  useEffect(() => {
    return ghibliMusic.subscribe(info => setGhibliState(info));
  }, []);

  const bar = windowState.mode === 'mini-bar';
  const status = getTaskStatus(task, now);
  const left = getRemainingSeconds(task, now);
  const percent = task && task.goal > 0 ? Math.min(100, Math.max(0, (1 - left / task.goal) * 100)) : 0;
  const fraction = task && task.goal > 0 ? Math.max(0, Math.min(1, left / task.goal)) : 1;

  const anyMenu = taskPicker || ghibliMenu || adjustMenu || quoteMenu || confirmReset;

  // Auto-expand/collapse Electron window height in Bar mode when menus open/close
  useEffect(() => {
    if (desktop && bar) {
      desktopBridge.setHeight(anyMenu ? 420 : 76);
    }
  }, [anyMenu, desktop, bar]);

  const toggleLayout = () => {
    const value = bar ? 'card' : 'bar';
    flow.updateSettings({ miniDisplayMode: value });
    flow.setMode(`mini-${value}`);
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

  const handleCustomSubmit = e => {
    e.preventDefault();
    if (!task) return;
    const mins = parseFloat(customMinutes);
    if (!isNaN(mins) && mins > 0) {
      const targetSec = Math.round(mins * 60);
      const delta = targetSec - left;
      onAdjustTime(task.id, delta);
      setCustomMinutes('');
      setAdjustMenu(false);
    }
  };

  const toggleVisualMode = () => {
    const next = state.visualMode === 'hourglass' ? 'ring' : 'hourglass';
    flow.updateSettings({ visualMode: next });
  };

  const filteredTracks = ghibliState.activePlaylist === 'all'
    ? GHIBLI_TRACKS
    : GHIBLI_TRACKS.filter(t => t.playlist === ghibliState.activePlaylist);

  const naturePresets = SOUND_PRESETS.filter(p => p.category === 'nature');

  return (
    <main className={`mini-host ${desktop ? 'native' : 'web-preview'}`}>
      {!desktop && <div className="preview-caption no-drag">Xem trước Mini Widget · Chế độ Web</div>}

      <section className={`mini-window ${bar ? 'bar' : 'card'}`}>
        <AmbientBackground visualState={visualState} isMini={true} />

        {/* Task Picker Dropdown Popover */}
        {taskPicker && (
          <div className="mini-task-menu no-drag" role="menu">
            <div className="mini-task-menu-header">
              <span>Đổi công việc học tập ({state.tasks.length})</span>
              <IconButton title="Đóng danh sách" onClick={() => setTaskPicker(false)}>
                <X size={14} />
              </IconButton>
            </div>
            <div className="mini-task-menu-list">
              {state.tasks.map(t => {
                const isSelected = t.id === task?.id;
                const rem = getRemainingSeconds(t, now);
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`mini-task-item ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      flow.select(t.id);
                      setTaskPicker(false);
                    }}
                  >
                    <span className="item-color-dot" style={{ background: t.color }} />
                    <span className="item-emoji">{t.emoji}</span>
                    <strong className="item-name">{t.name}</strong>
                    <span className="item-time">{formatDurationShort(rem)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Ghibli Music & Ambient Sound Hub Popover */}
        {ghibliMenu && (
          <div className="mini-ghibli-popover no-drag" role="dialog">
            <div className="mini-ghibli-popover-header">
              <div className="flex items-center gap-1.5">
                <Music size={14} className="text-amber-400" />
                <strong>Âm thanh học tập & thư giãn</strong>
              </div>
              <IconButton title="Đóng" onClick={() => setGhibliMenu(false)}>
                <X size={13} />
              </IconButton>
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
                <Volume2 size={12} />
                <span>Âm thiên nhiên ({naturePresets.length - 1})</span>
              </button>
            </div>

            {soundTab === 'ghibli' ? (
              <>
                {/* Currently playing track info & transport */}
                <div className="ghibli-now-playing">
                  <div className="ghibli-now-icon">
                    <span className="flower">🌸</span>
                  </div>
                  <div className="ghibli-now-details">
                    <strong className="title">{ghibliState.currentTrack.title}</strong>
                    <span className="film">{ghibliState.currentTrack.film}</span>
                  </div>
                  <div className="ghibli-now-actions">
                    {/* Shuffle toggle button */}
                    <button
                      type="button"
                      className={`ghibli-ctrl-btn ${ghibliState.shuffle ? 'active' : ''}`}
                      onClick={() => ghibliMusic.toggleShuffle()}
                      title={ghibliState.shuffle ? 'Trộn bài ngẫu nhiên: BẬT' : 'Trộn bài ngẫu nhiên: TẮT'}
                    >
                      <Shuffle size={13} />
                    </button>

                    {/* Prev track */}
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

                    {/* Next track */}
                    <button
                      type="button"
                      className="ghibli-step-btn"
                      onClick={() => ghibliMusic.nextTrack()}
                      title="Bài kế tiếp"
                    >
                      <SkipForward size={13} />
                    </button>

                    {/* Loop mode cycle button */}
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
                      {ghibliState.loopMode === LOOP_MODE.ONE ? <Repeat1 size={13} /> : <Repeat size={13} />}
                      <span className="ghibli-ctrl-badge">
                        {ghibliState.loopMode === LOOP_MODE.ALL ? 'ALL' : ghibliState.loopMode === LOOP_MODE.ONE ? '1' : 'OFF'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Playlist selector bar */}
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

                {/* Volume slider */}
                <div className="ghibli-volume-row">
                  <Volume1 size={12} className="text-muted" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={ghibliState.volume}
                    onChange={e => ghibliMusic.setVolume(parseFloat(e.target.value))}
                    className="ghibli-volume-slider"
                    title="Âm lượng nhạc Ghibli"
                  />
                  <span className="text-[10px] text-muted">{Math.round(ghibliState.volume * 100)}%</span>
                </div>

                {/* Filtered Track list */}
                <div className="ghibli-track-list">
                  {filteredTracks.map(tr => {
                    const isThis = ghibliState.currentTrack.id === tr.id;
                    return (
                      <button
                        key={tr.id}
                        type="button"
                        className={`ghibli-track-item ${isThis ? 'active' : ''}`}
                        onClick={() => {
                          ghibliMusic.play(tr.id);
                        }}
                      >
                        <span className="track-bullet">{isThis && ghibliState.isPlaying ? '▶' : '♫'}</span>
                        <div className="track-names">
                          <strong>{tr.title}</strong>
                          <small>{tr.film}</small>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                {/* Nature ambient sounds */}
                <div className="ghibli-volume-row">
                  <Volume1 size={12} className="text-muted" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={ambientSound.getVolume()}
                    onChange={e => ambientSound.setVolume(parseFloat(e.target.value))}
                    className="ghibli-volume-slider"
                    title="Âm lượng tiếng ồn thiên nhiên"
                  />
                  <span className="text-[10px] text-muted">{Math.round(ambientSound.getVolume() * 100)}%</span>
                </div>

                <div className="ghibli-track-list">
                  {naturePresets.map(preset => {
                    const isCurrent = ambientSound.getSound() === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        className={`ghibli-track-item ${isCurrent ? 'active' : ''}`}
                        onClick={() => {
                          ambientSound.play(preset.id);
                        }}
                      >
                        <span className="track-bullet">{isCurrent ? '●' : '○'}</span>
                        <div className="track-names">
                          <strong>{preset.name}</strong>
                          <small>{preset.desc}</small>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Motivational Quote Popover in Bar */}
        {quoteMenu && (
          <div className="mini-quote-popover no-drag">
            <div className="mini-ghibli-popover-header">
              <div className="flex items-center gap-1.5">
                <Sparkles size={13} className="text-sky-400" />
                <strong>Danh ngôn truyền cảm hứng</strong>
              </div>
              <IconButton title="Đóng" onClick={() => setQuoteMenu(false)}>
                <X size={13} />
              </IconButton>
            </div>
            <div className="quote-content">
              <span className="quote-text">“{FAMOUS_QUOTES[quoteIdx].text}”</span>
              <span className="quote-author">— {FAMOUS_QUOTES[quoteIdx].author}</span>
            </div>
            <div className="quote-footer">
              <button
                type="button"
                className="mini-quote-cycle-btn"
                onClick={() => setQuoteIdx(i => (i + 1) % FAMOUS_QUOTES.length)}
              >
                <span>↻ Đổi câu khác</span>
              </button>
            </div>
          </div>
        )}

        {/* Time Adjust Popover in Bar */}
        {adjustMenu && (
          <div className="mini-adjust-popover no-drag">
            <div className="mini-ghibli-popover-header">
              <span>Chỉnh nhanh thời gian</span>
              <IconButton title="Đóng" onClick={() => setAdjustMenu(false)}>
                <X size={13} />
              </IconButton>
            </div>
            <div className="mini-adjust-grid">
              <button type="button" className="mini-adjust-btn" onClick={() => { onAdjustTime(task?.id, -300); setAdjustMenu(false); }}>-5p</button>
              <button type="button" className="mini-adjust-btn" onClick={() => { onAdjustTime(task?.id, -60); setAdjustMenu(false); }}>-1p</button>
              <button type="button" className="mini-adjust-btn" onClick={() => { onAdjustTime(task?.id, 60); setAdjustMenu(false); }}>+1p</button>
              <button type="button" className="mini-adjust-btn" onClick={() => { onAdjustTime(task?.id, 300); setAdjustMenu(false); }}>+5p</button>
            </div>
            <form onSubmit={handleCustomSubmit} className="mini-adjust-custom-form">
              <input
                type="number"
                min="1"
                max="1440"
                value={customMinutes}
                onChange={e => setCustomMinutes(e.target.value)}
                placeholder="Số phút"
              />
              <button type="submit">Đặt</button>
            </form>
          </div>
        )}

        {bar ? (
          /* ======================================================== */
          /* SLIM BAR LAYOUT: TỐI ƯU TOÀN DIỆN VỚI ĐỦ CÁC TÍNH NĂNG     */
          /* ======================================================== */
          <div className="mini-bar-content drag-region">
            {confirmReset ? (
              <div className="mini-bar-confirm no-drag">
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
                {/* 1. Trái: Task button & Status pulse */}
                <div className="mini-bar-left no-drag">
                  <button
                    type="button"
                    className="mini-bar-task-btn"
                    onClick={() => {
                      setTaskPicker(!taskPicker);
                      setGhibliMenu(false);
                      setAdjustMenu(false);
                      setQuoteMenu(false);
                    }}
                    title="Bấm để đổi nhanh công việc"
                  >
                    <span
                      className={`status-pulse-dot ${status}`}
                      style={{ '--dot-color': task?.color || 'var(--accent)' }}
                    />
                    <span className="task-emoji-sm">{task?.emoji || '✦'}</span>
                    <span className="mini-bar-task" title={task?.name}>
                      {task?.name || 'Chưa chọn việc'}
                    </span>
                    <ChevronDown size={12} className="chevron" />
                  </button>
                </div>

                {/* 2. Giữa: Visual Orb + Chữ số to rõ + % tiến độ */}
                <div className="flex items-center gap-2 no-drag">
                  {/* Interactive Visual Orb (Hourglass / Ring) */}
                  <button
                    type="button"
                    className={`mini-visual-orb ${status === 'running' ? 'running' : ''}`}
                    onClick={toggleVisualMode}
                    title={`Hiệu ứng: ${state.visualMode === 'hourglass' ? 'Đồng hồ cát' : 'Vòng thời gian'} (Bấm để chuyển đổi)`}
                  >
                    {state.visualMode === 'hourglass' ? (
                      <svg className="mini-hourglass-svg-sm" viewBox="0 0 100 110" aria-hidden="true">
                        <defs>
                          <clipPath id="mini-bar-hg-clip">
                            <path d="M22 12H78V25C78 39 58 45 53 54C58 65 78 70 78 85V98H22V85C22 70 42 65 47 54C42 45 22 39 22 25Z" />
                          </clipPath>
                        </defs>
                        <g clipPath="url(#mini-bar-hg-clip)">
                          <rect x="15" y={54 - fraction * 42} width="70" height={fraction * 42} fill="var(--accent)" opacity="0.8" />
                          <rect x="15" y={98 - (1 - fraction) * 42} width="70" height={(1 - fraction) * 42} fill="var(--accent)" />
                          {status === 'running' && (
                            <path d={`M50 54V${98 - (1 - fraction) * 42}`} stroke="var(--accent)" strokeWidth="3" strokeDasharray="2 3" />
                          )}
                        </g>
                        <path d="M22 12H78V25C78 39 58 45 53 54C58 65 78 70 78 85V98H22V85C22 70 42 65 47 54C42 45 22 39 22 25Z" fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="2.5" />
                        <path d="M17 9H83M17 101H83" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                      </svg>
                    ) : (
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
                    )}
                  </button>

                  <div
                    className={`mini-bar-time drag-region ${status === 'running' ? 'running' : ''}`}
                    title={STATUS[status]}
                  >
                    {formatRemaining(left)}
                  </div>

                  <span className={`mini-percent-badge ${status === 'running' ? 'running' : ''}`}>
                    {Math.round(percent)}%
                  </span>
                </div>

                {/* 3. Phải: Ghibli Music, Adjust, Quote, Reset, Play/Pause, Tools */}
                <div className="mini-bar-actions no-drag">
                  {/* Nút Nghe nhạc Ghibli & Âm thanh */}
                  <button
                    type="button"
                    className={`mini-ghibli-btn ${ghibliState.isPlaying ? 'playing' : ''}`}
                    onClick={() => {
                      setGhibliMenu(!ghibliMenu);
                      setTaskPicker(false);
                      setAdjustMenu(false);
                      setQuoteMenu(false);
                    }}
                    title={
                      ghibliState.isPlaying
                        ? `Đang phát: ${ghibliState.currentTrack.title} — Bấm để chọn danh sách / trộn / lặp`
                        : 'Bật nhạc Ghibli Lofi & Âm tập trung'
                    }
                  >
                    <Music size={13} />
                    {ghibliState.isPlaying ? (
                      <span className="mini-eq-bars">
                        <i className="b1" />
                        <i className="b2" />
                        <i className="b3" />
                      </span>
                    ) : (
                      <span className="mini-ghibli-text">Ghibli</span>
                    )}
                  </button>

                  {/* Nút Chỉnh nhanh thời gian */}
                  <div className="mini-adjust-wrap">
                    <button
                      type="button"
                      className="adjust-pill-bar"
                      onClick={() => onAdjustTime(task?.id, 300)}
                      onContextMenu={e => {
                        e.preventDefault();
                        setAdjustMenu(!adjustMenu);
                        setGhibliMenu(false);
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
                      style={{ width: 16, height: 26, padding: 0 }}
                      onClick={() => {
                        setAdjustMenu(!adjustMenu);
                        setGhibliMenu(false);
                        setTaskPicker(false);
                        setQuoteMenu(false);
                      }}
                      title="Mở menu chỉnh giờ (-5p, -1p, +1p, +5p, sửa phút)"
                    >
                      <ChevronDown size={11} />
                    </button>
                  </div>

                  {/* Nút Danh ngôn truyền cảm hứng */}
                  <button
                    type="button"
                    className={`mini-quote-btn ${quoteMenu ? 'active' : ''}`}
                    onClick={() => {
                      setQuoteMenu(!quoteMenu);
                      setGhibliMenu(false);
                      setTaskPicker(false);
                      setAdjustMenu(false);
                    }}
                    title={`Danh ngôn: “${FAMOUS_QUOTES[quoteIdx].text}” — ${FAMOUS_QUOTES[quoteIdx].author}`}
                  >
                    <Sparkles size={13} />
                  </button>

                  {/* Nút Đặt lại phiên (An toàn) */}
                  <IconButton
                    title="Đặt lại phiên này"
                    className="mini-icon-btn reset-btn"
                    onClick={handleResetClick}
                  >
                    <RotateCcw size={14} />
                  </IconButton>

                  {/* Nút Play / Pause chính nổi bật */}
                  <button
                    type="button"
                    className={`mini-play-main ${status === 'running' ? 'running' : ''}`}
                    disabled={!task || status === 'completed'}
                    onClick={() => onToggle(task?.id)}
                    aria-label={status === 'running' ? 'Tạm dừng' : 'Bắt đầu'}
                    style={{
                      '--btn-accent': task?.color || 'var(--accent)',
                    }}
                  >
                    {status === 'completed' ? (
                      <Check size={16} />
                    ) : status === 'running' ? (
                      <Pause size={16} fill="currentColor" />
                    ) : (
                      <Play size={16} fill="currentColor" className="ml-0.5" />
                    )}
                  </button>

                  <span className="mini-bar-divider" />

                  {/* Nút chuyển đổi sang Dạng Thẻ */}
                  <IconButton title="Chuyển sang dạng thẻ (Card)" onClick={toggleLayout}>
                    <LayoutPanelLeft size={14} />
                  </IconButton>

                  {/* Ghim nổi trên cùng */}
                  {desktop && (
                    <IconButton
                      title={windowState.pinned ? 'Bỏ ghim nổi' : 'Ghim nổi trên cùng'}
                      className={windowState.pinned ? 'active' : ''}
                      onClick={flow.togglePin}
                    >
                      {windowState.pinned ? <Pin size={13} /> : <PinOff size={13} />}
                    </IconButton>
                  )}

                  {/* Phóng to toàn màn hình */}
                  <IconButton
                    title="Mở rộng giao diện đầy đủ (Full Mode)"
                    className="expand-btn"
                    onClick={() => flow.setMode('full')}
                  >
                    <Maximize2 size={14} />
                  </IconButton>

                  {/* Đóng cửa sổ */}
                  {desktop && (
                    <IconButton
                      title="Đóng ứng dụng"
                      className="close-button"
                      onClick={desktopBridge.close}
                    >
                      <X size={14} />
                    </IconButton>
                  )}
                </div>
              </>
            )}

            {/* Thanh tiến độ viền dưới phát sáng */}
            <div className="mini-progress-bar-bottom drag-region">
              <span style={{ width: `${percent}%`, background: task?.color || 'var(--accent)' }} />
            </div>
          </div>
        ) : (
          /* Mini Card Layout */
          <>
            <header className="mini-heading drag-region">
              <button
                type="button"
                className="mini-task-btn no-drag"
                onClick={() => setTaskPicker(!taskPicker)}
                title="Bấm để đổi công việc"
              >
                <span className="task-emoji">{task?.emoji || '✦'}</span>
                <span className="task-title" title={task?.name}>{task?.name || 'Chưa chọn việc'}</span>
                <ChevronDown size={13} className="chevron" />
              </button>

              <div className="mini-tools no-drag">
                {/* Ghibli Music Button in Card mode */}
                <button
                  type="button"
                  className={`mini-ghibli-btn ${ghibliState.isPlaying ? 'playing' : ''}`}
                  onClick={() => setGhibliMenu(!ghibliMenu)}
                  title={
                    ghibliState.isPlaying
                      ? `Đang phát: ${ghibliState.track.title} - Bấm để xem danh sách / chỉnh âm lượng`
                      : 'Bật nhạc Ghibli thư giãn'
                  }
                >
                  <Music size={13} />
                  {ghibliState.isPlaying ? (
                    <span className="mini-eq-bars">
                      <i className="b1" />
                      <i className="b2" />
                      <i className="b3" />
                    </span>
                  ) : (
                    <span className="mini-ghibli-text">Ghibli</span>
                  )}
                </button>

                {desktop && (
                  <IconButton
                    title={windowState.pinned ? 'Bỏ ghim nổi' : 'Ghim nổi trên cùng'}
                    className={windowState.pinned ? 'active' : ''}
                    onClick={flow.togglePin}
                  >
                    {windowState.pinned ? <Pin size={14} /> : <PinOff size={14} />}
                  </IconButton>
                )}
                <IconButton title="Dạng thanh (Bar)" onClick={toggleLayout}>
                  <LayoutPanelLeft size={14} />
                </IconButton>
                {!bar && desktop && (
                  <IconButton title="Ghim vào góc màn hình" onClick={() => setCorners(!corners)}>
                    <Grip size={14} />
                  </IconButton>
                )}
                <IconButton
                  title="Mở rộng giao diện đầy đủ (Full Mode)"
                  className="expand-btn"
                  onClick={() => flow.setMode('full')}
                >
                  <Maximize2 size={15} />
                </IconButton>
                {desktop && (
                  <IconButton title="Đóng" className="close-button" onClick={desktopBridge.close}>
                    <X size={15} />
                  </IconButton>
                )}
              </div>
            </header>

            <div className="mini-body drag-region">
              <div className="mini-time drag-region">
                <span>{formatRemaining(left)}</span>
                <span className="mini-status-text">
                  <i className={`status-dot ${status}`} />
                  {STATUS[status]}
                </span>
              </div>

              <div className="mini-actions no-drag">
                <button
                  type="button"
                  className="mini-reset no-drag"
                  title="Đặt lại phiên này"
                  onClick={() => onReset(task?.id)}
                >
                  <RotateCcw size={17} />
                </button>

                <button
                  type="button"
                  className="mini-play no-drag"
                  disabled={!task || status === 'completed'}
                  onClick={() => onToggle(task?.id)}
                  aria-label={status === 'running' ? 'Tạm dừng' : 'Bắt đầu'}
                >
                  {status === 'completed' ? (
                    <Check size={23} />
                  ) : status === 'running' ? (
                    <Pause size={23} fill="currentColor" />
                  ) : (
                    <Play size={23} fill="currentColor" />
                  )}
                </button>
              </div>
            </div>

            {/* Quick time adjustment toolbar in Mini Card */}
            <div className="mini-adjust-bar no-drag">
              <span className="adjust-label">Chỉnh giờ:</span>
              <div className="adjust-buttons">
                <button
                  type="button"
                  className="adjust-pill"
                  onClick={() => onAdjustTime(task?.id, -300)}
                  title="Trừ 5 phút"
                >
                  -5p
                </button>
                <button
                  type="button"
                  className="adjust-pill"
                  onClick={() => onAdjustTime(task?.id, -60)}
                  title="Trừ 1 phút"
                >
                  -1p
                </button>
                <button
                  type="button"
                  className="adjust-pill plus"
                  onClick={() => onAdjustTime(task?.id, 60)}
                  title="Cộng 1 phút"
                >
                  +1p
                </button>
                <button
                  type="button"
                  className="adjust-pill plus"
                  onClick={() => onAdjustTime(task?.id, 300)}
                  title="Cộng 5 phút"
                >
                  +5p
                </button>
              </div>
            </div>

            <div className="mini-progress drag-region">
              <span style={{ width: `${percent}%`, background: task?.color }} />
            </div>

            <footer className="mini-footer drag-region">
              <span>{Math.round(percent)}% hoàn thành</span>
              <span className="brand-tag">flow<span className="brand-dot">.</span></span>
            </footer>
          </>
        )}

        {corners && (
          <div className="corner-panel no-drag">
            <div>
              <strong>Đặt ở góc màn hình</strong>
              <IconButton title="Đóng chọn góc" onClick={() => setCorners(false)}>
                <X size={16} />
              </IconButton>
            </div>
            <div className="corner-grid">
              {[
                ['top-left', '↖ Trên trái'],
                ['top-right', '↗ Trên phải'],
                ['bottom-left', '↙ Dưới trái'],
                ['bottom-right', '↘ Dưới phải'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={async () => {
                    try {
                      await desktopBridge.snapToCorner(key);
                      setCorners(false);
                    } catch (err) {
                      flow.setError(err.message);
                    }
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {flow.error && (
          <button className="mini-error no-drag" onClick={() => flow.setMode('full')}>
            Chưa lưu được · Bấm để kiểm tra
          </button>
        )}
      </section>
    </main>
  );
}

export default function FlowTimer() {
  const flow = useFlowTimer();
  const { state, now } = flow;
  const [editor, setEditor] = useState(null);
  const [settings, setSettings] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [visualState, setVisualState] = useState('idle');
  const [pipWindow, setPipWindow] = useState(null);
  const [ambientModal, setAmbientModal] = useState(false);
  const [ambientSoundType, setAmbientSoundType] = useState(ambientSound.getSound());
  const resetTimerRef = useRef(null);
  const [mainQuoteIdx, setMainQuoteIdx] = useState(0);
  const [mainQuoteFading, setMainQuoteFading] = useState(false);

  const switchMainQuote = nextIndex => {
    if (mainQuoteFading) return;
    setMainQuoteFading(true);
    setTimeout(() => {
      setMainQuoteIdx(nextIndex);
      setMainQuoteFading(false);
    }, 300);
  };

  useEffect(() => {
    return ambientSound.subscribe(type => {
      setAmbientSoundType(type);
    });
  }, []);

  const mainQuoteIdxRef = useRef(mainQuoteIdx);
  mainQuoteIdxRef.current = mainQuoteIdx;

  useEffect(() => {
    const timer = setInterval(() => {
      switchMainQuote((mainQuoteIdxRef.current + 1) % FAMOUS_QUOTES.length);
    }, 18000);
    return () => clearInterval(timer);
  }, []);

  const desktop = typeof window !== 'undefined' && !!window.electronAPI;
  const selected = state?.tasks.find(t => t.id === state.selectedTaskId) || state?.tasks[0];
  const running = state?.tasks.find(isTaskRunning);
  const isMini = flow.windowState.mode !== 'full';
  const shown = isMini ? running || selected : selected;
  const color = shown?.color || '#a8c58a';
  const left = getRemainingSeconds(selected, now);
  const status = getTaskStatus(selected, now);
  const fraction = selected && selected.goal > 0 ? Math.max(0, Math.min(1, left / selected.goal)) : 1;
  const reduce = state?.reducedMotion;

  // Sync visualState with active timer status
  useEffect(() => {
    if (visualState === 'resetting') return;
    if (status === 'running') setVisualState('running');
    else if (status === 'paused') setVisualState('paused');
    else setVisualState('idle');
  }, [status, visualState]);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  function handleToggle(id) {
    const target = state?.tasks.find(t => t.id === id);
    if (!target) return;
    const isRunning = isTaskRunning(target);
    setVisualState(isRunning ? 'paused' : 'running');
    flow.toggle(id);
  }

  function handleReset(id) {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    setVisualState('resetting');
    flow.reset(id);
    resetTimerRef.current = setTimeout(() => {
      setVisualState('idle');
    }, 600);
  }

  function copyStylesToPiP(win) {
    if (!win?.document) return;

    if (!win.document.querySelector('meta[name="viewport"]')) {
      const meta = win.document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1';
      win.document.head.appendChild(meta);
    }

    win.document.title = 'Flow — Đồng hồ nổi';

    const fontLink = win.document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.cdnfonts.com/css/google-sans';
    win.document.head.appendChild(fontLink);

    // Guaranteed Google Sans font rules & root styling
    const directFont = win.document.createElement('style');
    directFont.id = 'pip-google-sans-override';
    directFont.textContent = `
      @import url('https://fonts.cdnfonts.com/css/google-sans');
      @font-face {
        font-family: 'Google Sans';
        font-style: normal;
        font-weight: 400;
        src: local('Google Sans Regular'), local('Google Sans'), local('Product Sans'), url('https://fonts.cdnfonts.com/s/14955/ProductSans-Regular.woff') format('woff');
      }
      @font-face {
        font-family: 'Google Sans';
        font-style: italic;
        font-weight: 400;
        src: local('Google Sans Italic'), local('Product Sans Italic'), url('https://fonts.cdnfonts.com/s/14955/ProductSans-Italic.woff') format('woff');
      }
      @font-face {
        font-family: 'Google Sans';
        font-style: normal;
        font-weight: 500;
        src: local('Google Sans Medium'), local('Product Sans Medium'), url('https://fonts.cdnfonts.com/s/14955/ProductSans-Medium.woff') format('woff');
      }
      @font-face {
        font-family: 'Google Sans';
        font-style: normal;
        font-weight: 700;
        src: local('Google Sans Bold'), local('Product Sans Bold'), url('https://fonts.cdnfonts.com/s/14955/ProductSans-Bold.woff') format('woff');
      }
      *, html, body, button, input, select, textarea, .pip-root {
        font-family: 'Google Sans', 'Product Sans', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      }
    `;
    win.document.head.appendChild(directFont);

    // Traverse document.styleSheets
    Array.from(document.styleSheets).forEach(sheet => {
      try {
        if (sheet.cssRules) {
          const style = win.document.createElement('style');
          const rules = Array.from(sheet.cssRules)
            .map(r => r.cssText)
            .join('\n');
          style.textContent = rules;
          win.document.head.appendChild(style);
          return;
        }
      } catch (e) {
        // Cross-origin stylesheet access restriction
      }

      if (sheet.href) {
        const link = win.document.createElement('link');
        link.rel = 'stylesheet';
        link.href = sheet.href;
        if (sheet.media?.mediaText) link.media = sheet.media.mediaText;
        if (sheet.type) link.type = sheet.type;
        win.document.head.appendChild(link);
      }
    });

    document.querySelectorAll('style').forEach(style => {
      if (style.textContent && !win.document.head.innerHTML.includes(style.textContent.slice(0, 30))) {
        const newStyle = win.document.createElement('style');
        newStyle.textContent = style.textContent;
        win.document.head.appendChild(newStyle);
      }
    });

    // Sync future style updates (HMR in dev) into PiP
    try {
      const observer = new MutationObserver(mutations => {
        if (win.closed) {
          observer.disconnect();
          return;
        }
        for (const m of mutations) {
          m.addedNodes.forEach(node => {
            if (node.nodeName === 'STYLE' || node.nodeName === 'LINK') {
              win.document.head.appendChild(node.cloneNode(true));
            }
          });
        }
      });
      observer.observe(document.head, { childList: true });
      win.addEventListener('pagehide', () => observer.disconnect());
    } catch (e) {}
  }

  // Document Picture-in-Picture for browser (always floating on screen when opening new tabs!)
  async function togglePiP() {
    if (pipWindow && !pipWindow.closed) {
      try {
        pipWindow.close();
      } catch (e) {}
      setPipWindow(null);
      return;
    }

    // In Electron Desktop, switch window mode
    if (desktop) {
      flow.setMode(`mini-${state.miniDisplayMode}`);
      return;
    }

    // In Browser: strictly require Document Picture-in-Picture API & Secure Context
    if (typeof window === 'undefined') return;

    const isSecure = window.isSecureContext;
    const isPipSupported = 'documentPictureInPicture' in window;

    if (!isPipSupported || !isSecure) {
      const reason = !isSecure
        ? 'Cửa sổ nổi PiP yêu cầu kết nối bảo mật (HTTPS hoặc localhost).'
        : 'Trình duyệt hiện tại chưa hỗ trợ Document Picture-in-Picture. Vui lòng sử dụng Google Chrome hoặc Microsoft Edge (phiên bản 111 trở lên).';
      flow.setNotice(reason);
      return;
    }

    try {
      if (window.documentPictureInPicture.window) {
        try {
          window.documentPictureInPicture.window.close();
        } catch (e) {}
      }

      const win = await window.documentPictureInPicture.requestWindow({
        width: 360,
        height: 260,
      });

      copyStylesToPiP(win);

      win.document.documentElement.dataset.theme = state?.theme || 'dark';
      win.document.documentElement.dataset.motion = reduce ? 'reduce' : 'auto';
      win.document.documentElement.style.setProperty('--accent', color);
      win.document.body.style.margin = '0';
      win.document.body.style.padding = '0';
      win.document.body.style.width = '100vw';
      win.document.body.style.height = '100vh';
      win.document.body.style.overflow = 'hidden';
      win.document.body.style.background = 'var(--bg, #111512)';

      setPipWindow(win);

      win.addEventListener('pagehide', () => {
        setPipWindow(null);
      });
    } catch (err) {
      let message = 'Không thể mở cửa sổ PiP.';
      if (err.name === 'NotAllowedError') {
        message = 'Yêu cầu mở PiP bị từ chối hoặc cần người dùng tương tác trực tiếp.';
      } else if (err.name === 'NotSupportedError') {
        message = 'Trình duyệt không hỗ trợ Document Picture-in-Picture.';
      } else if (err.message) {
        message = `Không thể mở PiP: ${err.message}`;
      }
      flow.setNotice(message);
    }
  }

  // Update theme, reducedMotion and accent inside PiP window when changed
  useEffect(() => {
    if (!pipWindow || pipWindow.closed) return;
    try {
      pipWindow.document.documentElement.dataset.theme = state?.theme || 'dark';
      pipWindow.document.documentElement.dataset.motion = reduce ? 'reduce' : 'auto';
      pipWindow.document.documentElement.style.setProperty('--accent', color);
    } catch (e) {}
  }, [pipWindow, state?.theme, reduce, color]);

  useEffect(() => {
    document.documentElement.dataset.theme = state?.theme || 'dark';
    document.documentElement.dataset.motion = reduce ? 'reduce' : 'auto';
    document.documentElement.style.setProperty('--accent', color);
  }, [color, state?.theme, reduce]);

  useEffect(() => {
    if (!state) return;

    const handleKeyDown = event => {
      if (event.repeat || event.defaultPrevented) return;

      const target = event.target;
      const targetDoc = target?.ownerDocument || document;
      const isInteractive =
        target?.matches?.('input, textarea, select, button, [contenteditable="true"]') ||
        target?.closest?.('input, textarea, select, button, [contenteditable="true"]') ||
        target?.isContentEditable ||
        Boolean(targetDoc.querySelector('dialog[open]'));

      if (isInteractive) return;

      if (event.code === 'Space' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
        event.preventDefault();
        const targetTask = isMini ? running || selected : selected;
        if (targetTask) handleToggle(targetTask.id);
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.code === 'KeyM') {
        event.preventDefault();
        togglePiP();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    let cleanupPiP = null;
    if (pipWindow && !pipWindow.closed) {
      try {
        pipWindow.addEventListener('keydown', handleKeyDown);
        cleanupPiP = () => {
          try {
            pipWindow.removeEventListener('keydown', handleKeyDown);
          } catch (e) {}
        };
      } catch (e) {}
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      cleanupPiP?.();
    };
  }, [state, isMini, selected, running, pipWindow]);

  useEffect(() => {
    if (!flow.notice) return;
    const timeout = setTimeout(() => flow.setNotice(''), 7000);
    return () => clearTimeout(timeout);
  }, [flow.notice]);

  function confirmReset() {
    if (!selected) return;
    if (isTaskRunning(selected) || selected.sessionId || left < selected.goal) {
      setConfirm({
        title: 'Bắt đầu lại phiên này?',
        text: `Tiến độ hiện tại của “${selected.name}” sẽ trở về ban đầu.`,
        action: () => handleReset(selected.id),
      });
    } else {
      handleReset(selected.id);
    }
  }

  if (!state) {
    return (
      <div className="loading-screen">
        <span className="brand">flow<span>.</span></span>
        <p>{flow.error || 'Đang chuẩn bị không gian tập trung…'}</p>
        {flow.error && <button className="secondary-button" onClick={flow.retrySave}>Thử lại</button>}
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Flow — Một việc. Trọn sự chú ý.</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Render Document Picture-in-Picture window when active */}
      {pipWindow &&
        createPortal(
          <PipFloatingTimer
            flow={flow}
            task={shown}
            visualState={visualState}
            onToggle={handleToggle}
            onReset={handleReset}
            onAdjustTime={flow.adjustTime}
            onClose={() => {
              pipWindow.close();
              setPipWindow(null);
            }}
            onResize={(w, h) => {
              try {
                pipWindow.resizeTo(w, h);
              } catch (e) {}
            }}
          />,
          pipWindow.document.body
        )}

      {isMini ? (
        <MiniTimer
          flow={flow}
          task={shown}
          desktop={desktop}
          visualState={visualState}
          onToggle={handleToggle}
          onReset={handleReset}
          onAdjustTime={flow.adjustTime}
        />
      ) : (
        <div className="flow-app">
          {/* Dynamic Ambient Background with multi-layer mesh & blurred blobs */}
          <AmbientBackground visualState={visualState} isMini={false} />

          <header className="app-titlebar drag-region">
            <div className="brand">
              flow<span>.</span>
              <span className="brand-subtitle">không gian tập trung</span>
            </div>
            <div className="title-actions no-drag">
              <span className="local-indicator cloud" title="Đã kết nối MongoDB Atlas (dongho)">
                <i />Đồng bộ Cloud
              </span>
              <IconButton
                title={state.theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'}
                onClick={() => flow.updateSettings({ theme: state.theme === 'dark' ? 'light' : 'dark' })}
              >
                {state.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </IconButton>
              <IconButton title="Cài đặt" onClick={() => setSettings(true)}>
                <Settings2 size={18} />
              </IconButton>
              {desktop && (
                <>
                  <span className="title-divider" />
                  <IconButton title="Thu nhỏ cửa sổ" onClick={desktopBridge.minimize}>
                    <Minus size={18} />
                  </IconButton>
                  <IconButton title="Đóng ứng dụng" className="close-button" onClick={desktopBridge.close}>
                    <X size={18} />
                  </IconButton>
                </>
              )}
            </div>
          </header>

          <div className="workspace">
            <aside className="task-sidebar">
              <div className="sidebar-label">
                <span>KẾ HOẠCH CỦA BẠN</span>
                <span className="task-count">{state.tasks.length}</span>
              </div>
              <h2>Từng việc một<span>.</span></h2>
              <p className="sidebar-intro">Dành thời gian cho điều quan trọng.</p>

              <div className="task-list">
                {state.tasks.map(task => {
                  const remaining = getRemainingSeconds(task, now);
                  const taskStatus = getTaskStatus(task, now);
                  const progress = Math.max(0, Math.min(100, (1 - remaining / task.goal) * 100));
                  const isSelected = task.id === selected?.id;

                  return (
                    <div
                      className={`task-card ${isSelected ? 'selected' : ''}`}
                      key={task.id}
                      style={{ '--task-color': task.color }}
                    >
                      <button
                        className="task-select no-drag"
                        aria-pressed={isSelected}
                        onClick={() => flow.select(task.id)}
                      >
                        <span className="task-emoji">{task.emoji}</span>
                        <span className="task-info">
                          <strong title={task.name}>{task.name}</strong>
                          <span>
                            {taskStatus === 'running' ? (
                              <><i className="status-dot running" />Đang chạy</>
                            ) : taskStatus === 'completed' ? (
                              <><Check size={12} />Hoàn thành</>
                            ) : (
                              `${formatDurationShort(remaining)} còn lại`
                            )}
                          </span>
                        </span>
                        <span className="task-position">
                          {isSelected ? <ArrowUpRight size={18} /> : <span className="selection-circle" />}
                        </span>
                      </button>

                      <div className="task-under">
                        <div className="task-track">
                          <span style={{ width: `${progress}%`, background: task.color }} />
                        </div>
                        <IconButton title={`Sửa ${task.name}`} onClick={() => setEditor({ taskId: task.id })}>
                          <Edit3 size={14} />
                        </IconButton>
                        <IconButton
                          title={`Xóa ${task.name}`}
                          onClick={() =>
                            setConfirm({
                              title: 'Xóa công việc này?',
                              text: `“${task.name}” sẽ bị xóa${isTaskRunning(task) ? ' và phiên đang chạy sẽ dừng' : ''}.`,
                              action: () => flow.deleteTask(task.id),
                            })
                          }
                        >
                          <Trash2 size={14} />
                        </IconButton>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button className="add-task no-drag" onClick={() => setEditor({ taskId: null })}>
                <Plus size={17} />Thêm công việc
              </button>

              <div className="sidebar-bottom">
                <span className="small-orbit"><Focus size={23} /></span>
                <p>Không cần làm tất cả.<br /><strong>Chỉ cần bắt đầu một việc.</strong></p>
              </div>
            </aside>

            <main className="focus-panel">
              <div className="focus-header">
                <span className="eyebrow">
                  <span className={`status-dot ${status}`} />
                  {selected ? STATUS[status] : 'KHÔNG GIAN TRỐNG'}
                </span>

                {/* Quick Bar Mode & Dock / PiP Buttons */}
                <div className="flex items-center gap-2">
                  {desktop && (
                    <button
                      type="button"
                      className="dock-button no-drag bar-direct-btn"
                      onClick={() => {
                        flow.updateSettings({ miniDisplayMode: 'bar' });
                        flow.setMode('mini-bar');
                      }}
                      title="Thu nhỏ tức thì thành dạng thanh nổi mép màn hình (Bar mode)"
                    >
                      <LayoutPanelLeft size={15} />
                      <span>Dạng thanh (Bar)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className={`dock-button no-drag ${pipWindow ? 'active' : ''}`}
                    onClick={togglePiP}
                    title={
                      desktop
                        ? 'Thu nhỏ thành cửa sổ nổi Desktop'
                        : pipWindow
                        ? 'Đóng cửa sổ nổi PiP'
                        : 'Mở cửa sổ nổi Picture-in-Picture (vẫn hiện khi mở tab mới)'
                    }
                  >
                    <PictureInPicture2 size={16} />
                    <span>
                      {desktop
                        ? 'Cửa sổ nổi'
                        : pipWindow
                        ? 'Đóng PiP'
                        : 'Đồng hồ nổi (PiP)'}
                    </span>
                    <ArrowUpRight size={14} />
                  </button>
                </div>
              </div>

              {/* Luminous Frosted Glass Quote Capsule */}
              <div
                className={`flow-quote-capsule ${mainQuoteFading ? 'fading' : ''} no-drag`}
                onClick={() => switchMainQuote((mainQuoteIdx + 1) % FAMOUS_QUOTES.length)}
                role="button"
                tabIndex={0}
                title="Bấm để đổi câu danh ngôn tiếp theo (Click to switch quote)"
              >
                <div className="quote-badge-glow">
                  <span className="quote-sparkle">✦</span>
                </div>
                <div className="quote-content">
                  <span className="quote-text">“{FAMOUS_QUOTES[mainQuoteIdx].text}”</span>
                  <span className="quote-author">— {FAMOUS_QUOTES[mainQuoteIdx].author}</span>
                </div>
                <span className="quote-shimmer-sweep" />
                <div className="quote-progress-track">
                  <div className="quote-progress-fill" key={mainQuoteIdx} />
                </div>
              </div>

              {selected ? (
                <>
                  <div className="focus-task-heading">
                    <span className="eyebrow">BÂY GIỜ, CHỈ CẦN TẬP TRUNG VÀO</span>
                    <h1 title={selected.name}>{selected.name}</h1>
                    <div className="view-switch">
                      <button
                        className={state.visualMode === 'ring' ? 'active' : ''}
                        onClick={() => flow.updateSettings({ visualMode: 'ring' })}
                        aria-pressed={state.visualMode === 'ring'}
                      >
                        <Focus size={14} />Vòng thời gian
                      </button>
                      <button
                        className={state.visualMode === 'hourglass' ? 'active' : ''}
                        onClick={() => flow.updateSettings({ visualMode: 'hourglass' })}
                        aria-pressed={state.visualMode === 'hourglass'}
                      >
                        <Hourglass size={14} />Đồng hồ cát
                      </button>
                    </div>
                  </div>

                  <TimerVisual fraction={fraction} status={status} mode={state.visualMode}>
                    <div
                      className={`timer-number ${left >= 3600 ? 'long' : ''}`}
                      aria-label={`Còn ${formatRemaining(left)}`}
                    >
                      {formatRemaining(left)}
                    </div>
                    <button
                      className="duration-chip no-drag"
                      onClick={() => setEditor({ taskId: selected.id, durationOnly: true })}
                    >
                      <Clock3 size={13} />
                      <span>Mục tiêu {formatDurationShort(selected.goal)}</span>
                      <Edit3 size={12} />
                    </button>
                  </TimerVisual>

                  <div className="timer-controls">
                    <IconButton
                      title="Đặt lại phiên"
                      className="round-control"
                      onClick={confirmReset}
                    >
                      <RotateCcw size={19} />
                    </IconButton>

                    <button
                      className="start-button no-drag"
                      disabled={status === 'completed'}
                      onClick={() => handleToggle(selected.id)}
                    >
                      {status === 'running' ? (
                        <Pause size={19} fill="currentColor" />
                      ) : status === 'completed' ? (
                        <Check size={21} />
                      ) : (
                        <Play size={19} fill="currentColor" />
                      )}
                      {status === 'running'
                        ? 'Tạm dừng'
                        : status === 'completed'
                        ? 'Đã hoàn thành'
                        : status === 'paused'
                        ? 'Tiếp tục'
                        : 'Bắt đầu tập trung'}
                    </button>

                    <IconButton
                      title="Đặt thời lượng"
                      className="round-control"
                      onClick={() => setEditor({ taskId: selected.id, durationOnly: true })}
                    >
                      <SlidersHorizontal size={19} />
                    </IconButton>
                  </div>

                  {/* Quick time adjustment toolbar on Focus Panel */}
                  <div className="focus-adjust-row no-drag">
                    <span className="adjust-caption">Chỉnh nhanh thời gian:</span>
                    <button
                      type="button"
                      className="adjust-pill"
                      onClick={() => flow.adjustTime(selected.id, -300)}
                      title="Trừ 5 phút"
                    >
                      -5p
                    </button>
                    <button
                      type="button"
                      className="adjust-pill"
                      onClick={() => flow.adjustTime(selected.id, -60)}
                      title="Trừ 1 phút"
                    >
                      -1p
                    </button>
                    <button
                      type="button"
                      className="adjust-pill plus"
                      onClick={() => flow.adjustTime(selected.id, 60)}
                      title="Cộng 1 phút"
                    >
                      +1p
                    </button>
                    <button
                      type="button"
                      className="adjust-pill plus"
                      onClick={() => flow.adjustTime(selected.id, 300)}
                      title="Cộng 5 phút"
                    >
                      +5p
                    </button>
                  </div>

                  <p className="keyboard-hint">
                    <kbd>space</kbd> để {status === 'running' ? 'tạm dừng' : 'bắt đầu'}
                    <span>·</span>Thời gian dành cho riêng bạn
                  </p>

                  {running && running.id !== selected.id && (
                    <button
                      className="other-running no-drag"
                      onClick={() => flow.select(running.id)}
                    >
                      <i className="status-dot running" />
                      <span>{running.name} vẫn đang chạy</span>
                      <ArrowUpRight size={15} />
                    </button>
                  )}

                  <div className="session-summary">
                    <div>
                      <span>Thời lượng</span>
                      <strong>{formatDurationShort(selected.goal)}</strong>
                    </div>
                    <div>
                      <span>Tiến độ phiên</span>
                      <strong>{Math.round((1 - fraction) * 100)}<small>%</small></strong>
                    </div>
                    <div>
                      <span>Trạng thái</span>
                      <strong className="summary-status">
                        {status === 'idle'
                          ? 'Sẵn sàng'
                          : status === 'running'
                          ? 'Tập trung'
                          : status === 'paused'
                          ? 'Tạm dừng'
                          : 'Hoàn thành'}
                      </strong>
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <Focus size={52} />
                  <h1>Một khởi đầu mới.</h1>
                  <p>Thêm việc bạn muốn dành thời gian hôm nay.</p>
                  <button className="primary-button no-drag" onClick={() => setEditor({ taskId: null })}>
                    <Plus size={18} />Tạo công việc đầu tiên
                  </button>
                </div>
              )}
            </main>
          </div>

          <footer className="app-footer">
            <span>
              <span className="footer-spark">✳</span> Ít xao nhãng hơn. Nhiều khoảng tập trung hơn.
            </span>
            <div className="footer-sound-group no-drag">
              <button
                type="button"
                className={`footer-ambient-btn ${ambientSoundType !== 'off' ? 'active' : ''}`}
                onClick={() => setAmbientModal(true)}
                title="Chọn âm thanh tập trung hoặc nhạc Ghibli Lofi"
              >
                {ambientSoundType.startsWith('ghibli_') ? (
                  <Music size={14} className="text-amber-300 animate-pulse" />
                ) : ambientSoundType === 'off' ? (
                  <VolumeX size={14} />
                ) : (
                  <Volume2 size={14} />
                )}
                <span>
                  {ambientSoundType === 'off'
                    ? 'Âm thanh: Tắt'
                    : ambientSoundType.startsWith('ghibli_')
                    ? `🌸 Nhạc: ${SOUND_PRESETS.find(p => p.id === ambientSoundType)?.label || 'Ghibli'}`
                    : `Âm nền: ${SOUND_PRESETS.find(p => p.id === ambientSoundType)?.label || 'Bật'}`}
                </span>
              </button>

              <button
                type="button"
                className="footer-sound-toggle"
                onClick={() => flow.updateSettings({ soundEnabled: !state.soundEnabled })}
                title="Chuông báo khi hoàn thành phiên"
              >
                <span>Chuông {state.soundEnabled ? 'bật' : 'tắt'}</span>
              </button>
            </div>
          </footer>
        </div>
      )}

      {flow.error && !isMini && (
        <div className="error-toast" role="alert">
          <span>{flow.error}</span>
          <button onClick={flow.retrySave}>Thử lưu lại</button>
        </div>
      )}

      {flow.notice && !isMini && (
        <div className="notice-toast" role="status">
          <Check size={18} />
          <span>{flow.notice}</span>
          <IconButton title="Ẩn thông báo" onClick={() => flow.setNotice('')}>
            <X size={15} />
          </IconButton>
        </div>
      )}

      {editor && (
        <TaskEditor
          key={editor.taskId || 'new'}
          task={state.tasks.find(t => t.id === editor.taskId)}
          durationOnly={editor.durationOnly}
          now={now}
          onClose={() => setEditor(null)}
          onSave={flow.saveTask}
        />
      )}

      {settings && (
        <Settings
          state={state}
          update={flow.updateSettings}
          close={() => {
            setSettings(false);
            setAmbientSoundType(ambientSound.getSound());
          }}
        />
      )}

      {ambientModal && (
        <AmbientSoundModal
          onClose={() => {
            setAmbientModal(false);
            setAmbientSoundType(ambientSound.getSound());
          }}
        />
      )}

      {confirm && (
        <Dialog title={confirm.title} onClose={() => setConfirm(null)}>
          <p className="confirm-text">{confirm.text}</p>
          <div className="dialog-actions">
            <button className="secondary-button" onClick={() => setConfirm(null)}>Giữ nguyên</button>
            <button
              className="primary-button"
              onClick={() => {
                confirm.action();
                setConfirm(null);
              }}
            >
              Xác nhận
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
