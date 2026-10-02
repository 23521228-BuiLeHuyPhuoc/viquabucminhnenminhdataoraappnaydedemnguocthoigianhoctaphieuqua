import React, { useEffect, useRef, useState, useId } from 'react';
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
  Pin,
  PinOff,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  SlidersHorizontal,
  Sun,
  Trash2,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';
import useFlowTimer from '../hooks/useFlowTimer';
import { getRemainingSeconds, getTaskStatus, isTaskRunning, TIMER_STATUS, PALETTE } from '../lib/timer-engine.js';
import { formatRemaining, formatDurationShort, parseDuration } from '../lib/time-parser.js';
import { desktopBridge } from '../lib/desktop-bridge.js';
import { playCompletionSound } from '../lib/sound.js';
import AmbientBackground from './AmbientBackground';

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
 * True native frameless floating window with drag-regions, no-drag buttons,
 * fluid responsive resizing, quick task picker, expand button, and ambient atmosphere.
 */
function MiniTimer({ flow, task, desktop, visualState, onToggle, onReset }) {
  const { state, now, windowState } = flow;
  const [corners, setCorners] = useState(false);
  const [taskPicker, setTaskPicker] = useState(false);
  const bar = windowState.mode === 'mini-bar';
  const status = getTaskStatus(task, now);
  const left = getRemainingSeconds(task, now);
  const percent = task ? Math.min(100, Math.max(0, (1 - left / task.goal) * 100)) : 0;

  const toggleLayout = () => {
    const value = bar ? 'card' : 'bar';
    flow.updateSettings({ miniDisplayMode: value });
    flow.setMode(`mini-${value}`);
  };

  return (
    <main className={`mini-host ${desktop ? 'native' : 'web-preview'}`}>
      {!desktop && <div className="preview-caption no-drag">Xem trước Mini Widget · Chế độ Web</div>}

      <section className={`mini-window ${bar ? 'bar' : 'card'}`}>
        <AmbientBackground visualState={visualState} isMini={true} />

        {/* Task Picker Dropdown Popover */}
        {taskPicker && (
          <div className="mini-task-menu no-drag" role="menu">
            <div className="mini-task-menu-header">
              <span>Đổi công việc</span>
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

        {bar ? (
          /* Mini Bar Layout */
          <div className="mini-bar-content drag-region">
            <div className="mini-bar-left">
              <button
                type="button"
                className="mini-bar-task-btn no-drag"
                onClick={() => setTaskPicker(!taskPicker)}
                title="Đổi công việc"
              >
                <span className="status-dot" style={{ color: task?.color }} />
                <span className="task-emoji-sm">{task?.emoji || '✦'}</span>
                <span className="mini-bar-task">{task?.name || 'Chưa chọn việc'}</span>
                <ChevronDown size={12} className="chevron" />
              </button>
            </div>

            <div className="mini-bar-time drag-region" title={STATUS[status]}>
              {formatRemaining(left)}
            </div>

            <div className="mini-bar-actions no-drag">
              <IconButton
                title="Đặt lại phiên này"
                className="mini-icon-btn"
                onClick={() => onReset(task?.id)}
              >
                <RotateCcw size={15} />
              </IconButton>

              <button
                type="button"
                className="mini-play-sm no-drag"
                disabled={!task || status === 'completed'}
                onClick={() => onToggle(task?.id)}
                aria-label={status === 'running' ? 'Tạm dừng' : 'Bắt đầu'}
              >
                {status === 'completed' ? (
                  <Check size={16} />
                ) : status === 'running' ? (
                  <Pause size={16} fill="currentColor" />
                ) : (
                  <Play size={16} fill="currentColor" />
                )}
              </button>

              <IconButton title="Dạng thẻ (Card)" onClick={toggleLayout}>
                <LayoutPanelLeft size={15} />
              </IconButton>

              {desktop && (
                <IconButton
                  title={windowState.pinned ? 'Bỏ ghim nổi' : 'Ghim nổi trên cùng'}
                  className={windowState.pinned ? 'active' : ''}
                  onClick={flow.togglePin}
                >
                  {windowState.pinned ? <Pin size={14} /> : <PinOff size={14} />}
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
                <IconButton
                  title="Đóng"
                  className="close-button"
                  onClick={desktopBridge.close}
                >
                  <X size={15} />
                </IconButton>
              )}
            </div>

            {/* Bottom mini progress bar */}
            <div className="mini-progress-bar-bottom drag-region">
              <span style={{ width: `${percent}%`, background: task?.color }} />
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
  const resetTimerRef = useRef(null);

  const desktop = typeof window !== 'undefined' && !!window.electronAPI;
  const selected = state?.tasks.find(t => t.id === state.selectedTaskId) || state?.tasks[0];
  const running = state?.tasks.find(isTaskRunning);
  const isMini = flow.windowState.mode !== 'full';
  const shown = isMini ? running || selected : selected;
  const color = shown?.color || '#a8c58a';
  const left = getRemainingSeconds(selected, now);
  const status = getTaskStatus(selected, now);
  const fraction = selected ? Math.max(0, Math.min(1, left / selected.goal)) : 1;
  const reduce = state?.reducedMotion;

  const openMini = () => flow.setMode(`mini-${state.miniDisplayMode}`);

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

  useEffect(() => {
    document.documentElement.dataset.theme = state?.theme || 'dark';
    document.documentElement.dataset.motion = reduce ? 'reduce' : 'auto';
    document.documentElement.style.setProperty('--accent', color);
  }, [color, state?.theme, reduce]);

  useEffect(() => {
    if (!state) return;
    const listener = event => {
      if (
        event.repeat ||
        event.defaultPrevented ||
        event.target.closest?.('input, textarea, select, button, [contenteditable="true"], dialog') ||
        document.querySelector('dialog[open]')
      ) {
        return;
      }

      if (event.code === 'Space' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        const target = isMini ? running || selected : selected;
        if (target) handleToggle(target.id);
      }

      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.code === 'KeyM') {
        event.preventDefault();
        flow.setMode(isMini ? 'full' : `mini-${state.miniDisplayMode}`);
      }
    };

    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [state, isMini, selected, running, flow.setMode]);

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

      {isMini ? (
        <MiniTimer
          flow={flow}
          task={shown}
          desktop={desktop}
          visualState={visualState}
          onToggle={handleToggle}
          onReset={handleReset}
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
              <span className="local-indicator"><i />Lưu trên máy</span>
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
                <button
                  type="button"
                  className="dock-button no-drag"
                  onClick={openMini}
                  title="Thu nhỏ thành cửa sổ nổi Desktop"
                >
                  <LayoutPanelLeft size={16} />
                  <span>{desktop ? 'Đồng hồ nổi Desktop' : 'Xem mini'}</span>
                  <ArrowUpRight size={14} />
                </button>
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
            <button
              className="no-drag"
              onClick={() => flow.updateSettings({ soundEnabled: !state.soundEnabled })}
            >
              {state.soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              <span>Âm thanh {state.soundEnabled ? 'bật' : 'tắt'}</span>
            </button>
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
          close={() => setSettings(false)}
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
