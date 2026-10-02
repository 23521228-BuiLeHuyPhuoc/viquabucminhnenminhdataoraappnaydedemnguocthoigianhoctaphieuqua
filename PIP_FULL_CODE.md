# TỔNG HỢP TOÀN BỘ CODE CHỨC NĂNG PICTURE-IN-PICTURE (PIP) - FLOW TIMER

Tài liệu này tổng hợp toàn bộ code đầy đủ 100% của các file đã được nâng cấp cho tính năng Picture-in-Picture (PiP) theo chuẩn **Document Picture-in-Picture API** (Chrome/Edge 111+) và Native Desktop Window (Electron).

---

## 1. `src/hooks/useFlowTimer.js`
> Đã sửa hoàn chỉnh công thức `adjustTime` theo đúng nguyên tắc:
> - `elapsed = max(0, oldGoal - currentLeft)`
> - `newLeft = clamp(currentLeft + deltaSeconds, 0, 86400 - elapsed)`
> - `newGoal = max(1, elapsed + newLeft)`
> - Giữ nguyên tiến độ đã trôi qua, cập nhật `runStart` và `endAt`, huỷ `running` khi `newLeft === 0`.

```javascript
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  checkCompletion,
  reconcileRestoredTasks,
  toggleTaskRunning,
  resetTask,
  editTask,
  generateSessionId,
  isTaskRunning,
  getRemainingSeconds
} from '../lib/timer-engine.js';
import { loadPersistedState, savePersistedState } from '../lib/storage.js';
import { playCompletionSound, playClickSound } from '../lib/sound.js';
import { desktopBridge } from '../lib/desktop-bridge.js';

function settle(state, now) {
  const result = checkCompletion(state.tasks, new Set(state.handledSessionIds), now);
  if (result.updatedTasks === state.tasks) return { state, events: [] };
  return {
    state: {
      ...state,
      tasks: result.updatedTasks,
      handledSessionIds: [
        ...new Set([...state.handledSessionIds, ...result.completionEvents.map(e => e.sessionId)])
      ].slice(-500),
    },
    events: result.completionEvents,
  };
}

export default function useFlowTimer() {
  const [state, setState] = useState(null);
  const [now, setNow] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [windowState, setWindowState] = useState({ mode: 'full', pinned: true });
  const current = useRef(null);
  const lastSaved = useRef(null);
  const saving = useRef(Promise.resolve());
  const mounted = useRef(false);
  const serial = useRef(0);

  const notify = useCallback(events => {
    if (!events.length) return;
    setNotice(`Hoàn thành ${events[0].taskName}. Nghỉ một chút nhé!`);
    if (current.current?.soundEnabled) playCompletionSound();
    if (current.current?.desktopNotifications) {
      desktopBridge.sendNotification('Một phiên tập trung đã hoàn thành', events[0].taskName).catch(() => {});
    }
  }, []);

  const persist = useCallback(next => {
    const token = ++serial.current;
    const operation = savePersistedState(next)
      .then(() => {
        lastSaved.current = next;
        if (mounted.current && token === serial.current) setError('');
      })
      .catch(err => {
        if (mounted.current && token === serial.current) setError(`Chưa lưu được: ${err.message}`);
        throw err;
      });
    saving.current = operation;
    operation.catch(() => {});
    return operation;
  }, []);

  const publish = useCallback(
    next => {
      current.current = next;
      setState(next);
      persist(next);
    },
    [persist]
  );

  const act = useCallback(
    transform => {
      if (!current.current) return;
      const time = Date.now();
      const result = settle(current.current, time);
      const next = transform(result.state, time);
      publish(next);
      setNow(time);
      notify(result.events);
    },
    [publish, notify]
  );

  useEffect(() => {
    let active = true;
    mounted.current = true;
    const api = window.electronAPI;
    const receive = value => {
      if (active && value) setWindowState(value);
    };
    const unsubscribe = api?.onWindowState(receive);
    api?.getWindowState().then(receive).catch(err => active && setError(err.message));

    loadPersistedState()
      .then(saved => {
        if (!active) return;
        const result = reconcileRestoredTasks(saved.tasks, new Set(saved.handledSessionIds), Date.now());
        const next = {
          ...saved,
          tasks: result.tasks,
          handledSessionIds: [
            ...new Set([...saved.handledSessionIds, ...result.expiredSessions.map(e => e.sessionId)])
          ].slice(-500),
        };
        current.current = next;
        setState(next);
        setNow(Date.now());
        persist(next);
        if (result.expiredSessions.length) setNotice('Phiên trước đã hết giờ trong lúc ứng dụng đóng.');
      })
      .catch(err => {
        if (active) setError(`Không mở được dữ liệu. Dữ liệu cũ được giữ nguyên. ${err.message}`);
      });

    const beforeClose = api?.onBeforeClose(async () => {
      try {
        if (current.current) await persist(current.current);
        api.confirmClose(true);
      } catch {
        api.confirmClose(false);
      }
    });

    const flush = () => {
      if (current.current !== lastSaved.current && current.current) persist(current.current);
    };

    window.addEventListener('pagehide', flush);
    return () => {
      active = false;
      mounted.current = false;
      unsubscribe?.();
      beforeClose?.();
      window.removeEventListener('pagehide', flush);
    };
  }, [persist]);

  useEffect(() => {
    const tick = () => {
      if (!current.current) return;
      const time = Date.now();
      const result = settle(current.current, time);
      if (result.state !== current.current) {
        publish(result.state);
        notify(result.events);
      }
      setNow(previous => (Math.floor(previous / 1000) === Math.floor(time / 1000) ? previous : time));
    };

    const interval = setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, [publish, notify]);

  const setMode = useCallback(async mode => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.setWindowMode(mode);
        if (!result?.success) throw new Error('Không đổi được cửa sổ.');
        setWindowState(result);
      } else {
        setWindowState(previous => ({ ...previous, mode }));
      }
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const toggle = useCallback(
    id => {
      if (current.current?.soundEnabled) playClickSound();
      act((s, time) => ({ ...s, tasks: toggleTaskRunning(s.tasks, id, time) }));
    },
    [act]
  );

  return {
    state,
    now,
    error,
    notice,
    windowState,
    setNotice,
    setError,
    setMode,
    select: id => act(s => ({ ...s, selectedTaskId: id })),
    toggle,
    reset: id => act(s => ({ ...s, tasks: s.tasks.map(t => (t.id === id ? resetTask(t) : t)) })),
    adjustTime: (id, deltaSeconds) =>
      act((s, time) => {
        return {
          ...s,
          tasks: s.tasks.map(t => {
            if (t.id !== id) return t;
            const running = isTaskRunning(t);
            const currentLeft = getRemainingSeconds(t, time);
            const oldGoal = t.goal || 0;
            const elapsed = Math.max(0, oldGoal - currentLeft);
            const newLeft = Math.max(0, Math.min(86400 - elapsed, currentLeft + deltaSeconds));
            const newGoal = Math.max(1, elapsed + newLeft);
            const stillRunning = running && newLeft > 0;
            return {
              ...t,
              goal: newGoal,
              left: newLeft,
              runStart: stillRunning ? time : null,
              endAt: stillRunning ? time + newLeft * 1000 : null,
            };
          }),
        };
      }),
    updateSettings: changes => act(s => ({ ...s, ...changes })),
    saveTask: values =>
      act(s => {
        const exists = s.tasks.some(t => t.id === values.id);
        const task = exists
          ? null
          : {
              ...values,
              id: generateSessionId().replace('sess_', 'task_'),
              left: values.goal,
              runStart: null,
              endAt: null,
              sessionId: null,
            };
        return {
          ...s,
          tasks: exists ? s.tasks.map(t => (t.id === values.id ? editTask(t, values) : t)) : [...s.tasks, task],
          selectedTaskId: exists ? s.selectedTaskId : task.id,
        };
      }),
    deleteTask: id =>
      act(s => {
        const tasks = s.tasks.filter(t => t.id !== id);
        return {
          ...s,
          tasks,
          selectedTaskId: s.selectedTaskId === id ? tasks[0]?.id ?? null : s.selectedTaskId,
        };
      }),
    retrySave: () => (current.current ? persist(current.current).catch(() => {}) : window.location.reload()),
    togglePin: async () => {
      try {
        const result = await window.electronAPI?.setAlwaysOnTop(!windowState.pinned);
        if (result?.success) {
          setWindowState(result);
          act(s => ({ ...s, isPinned: result.pinned }));
        }
      } catch (err) {
        setError(err.message);
      }
    },
  };
}
```

---

## 2. `src/components/PipFloatingTimer.jsx`
> - Tự động thích ứng kích thước thực tế qua `ResizeObserver` (Bar: <= 155px, Card: 156-290px, Large: > 290px).
> - Hoàn toàn null-safe khi danh sách công việc trống hoặc chưa chọn task.
> - Tự động đóng sub-UI (form tùy chỉnh, danh sách task) khi chuyển về dạng thanh (Bar).
> - Xác nhận đặt lại an toàn (Safe Reset Confirmation) tránh việc click nhầm làm mất tiến độ.
> - Xóa bỏ toàn bộ import dư thừa.

```jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Check,
  ChevronDown,
  X,
  Clock,
} from 'lucide-react';
import { getRemainingSeconds, getTaskStatus } from '../lib/timer-engine.js';
import { formatRemaining, formatDurationShort } from '../lib/time-parser.js';
import AmbientBackground from './AmbientBackground';

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

  const [taskPicker, setTaskPicker] = useState(false);
  const [customInput, setCustomInput] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 360, height: 260 });

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

  // Null-safe timer calculations
  const status = task ? getTaskStatus(task, now) : 'idle';
  const left = task ? getRemainingSeconds(task, now) : 0;
  const percent = task && task.goal > 0 ? Math.min(100, Math.max(0, (1 - left / task.goal) * 100)) : 0;

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
    >
      <AmbientBackground visualState={visualState} isMini={true} />

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
                <span className="pip-digits-bar">{formatRemaining(left)}</span>
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

          {/* Main Countdown Body */}
          <div className="pip-body">
            <div className="pip-timer-display">
              <span className="pip-digits">{formatRemaining(left)}</span>
              <div className="pip-status-row">
                <span className={`pip-status-dot ${status}`} />
                <span className="pip-status-text">
                  {status === 'running' ? 'Đang chạy' : status === 'paused' ? 'Tạm dừng' : 'Sẵn sàng'}
                </span>
                <span className="pip-percent">({Math.round(percent)}%)</span>
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
                className="pip-play-btn"
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
```

---

## 3. Phần cập nhật trong `src/components/FlowTimer.jsx`
> - Kiểm tra `window.isSecureContext` & `'documentPictureInPicture' in window`.
> - Không fallback sang web mini mode khi PiP không hỗ trợ; hiện thông báo rõ ràng cho người dùng.
> - Bắt lỗi `requestWindow()` (`NotAllowedError`, `NotSupportedError`) và hiển thị thông báo thay vì `console.warn`.
> - Hàm `copyStylesToPiP(win)` đọc `cssRules` và copy các thẻ link an toàn.
> - Đồng bộ document state (`dataset.theme`, `dataset.motion`, `--accent`, `body` margin/overflow).
> - Keyboard listener gắn đồng thời vào `window` và `pipWindow`, không kích hoạt khi focus ở ô nhập liệu.

```javascript
  function copyStylesToPiP(win) {
    if (!win?.document) return;

    if (!win.document.querySelector('meta[name="viewport"]')) {
      const meta = win.document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1';
      win.document.head.appendChild(meta);
    }

    win.document.title = 'Flow — Đồng hồ nổi';

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
```

---

## 4. `src/styles/globals.css` (Phần CSS cho PiP)

```css
/* ==========================================================================
   DOCUMENT PICTURE-IN-PICTURE (PIP) FLOATING STYLES
   ========================================================================== */

.pip-root {
  position: relative;
  width: 100vw;
  height: 100vh;
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 10px 14px;
  background: color-mix(in srgb, var(--sidebar) 88%, transparent);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  user-select: none;
}

/* Responsive Layout Variations */
.pip-root.layout-bar {
  padding: 6px 10px;
  justify-content: space-between;
}

.pip-root.layout-large {
  padding: 16px 20px;
}

.pip-bar-view {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  flex: 1;
  min-height: 0;
  position: relative;
  z-index: 5;
}

.pip-bar-center {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pip-digits-bar {
  font-size: clamp(20px, 6.5vw, 28px);
  font-weight: 400;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  letter-spacing: -1px;
  color: var(--text);
}

.pip-bar-actions {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}

.pip-bar-actions .adjust-pill {
  padding: 2px 6px;
  font-size: 10px;
}

.pip-bar-confirm {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 8px;
}

.pip-bar-confirm .confirm-text {
  font-size: 11px;
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pip-bar-confirm .confirm-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.pip-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  position: relative;
  z-index: 5;
}

.pip-task-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 7px;
  background: color-mix(in srgb, var(--surface) 75%, transparent);
  border: 1px solid var(--line);
  font-size: 11px;
  font-weight: 550;
  max-width: 140px;
  color: var(--text);
}

.pip-task-chip:disabled {
  opacity: 0.5;
  cursor: default;
}

.pip-task-chip .emoji {
  font-size: 13px;
}

.pip-task-chip .name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pip-size-controls {
  display: inline-flex;
  padding: 2px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 6px;
  gap: 2px;
}

.pip-size-controls.sm {
  padding: 1px;
}

.pip-size-btn {
  font-size: 9px;
  padding: 3px 6px;
  border-radius: 4px;
  color: var(--muted);
}

.pip-size-btn:hover,
.pip-size-btn.active {
  background: var(--raised);
  color: var(--text);
  font-weight: 550;
}

.pip-icon-btn {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  color: var(--muted);
}

.pip-icon-btn:hover {
  background: var(--raised);
  color: var(--text);
}

.pip-icon-btn.close-pip:hover {
  background: rgba(220, 38, 38, 0.2);
  color: #f87171;
}

.pip-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  position: relative;
  z-index: 5;
  margin: 4px 0;
}

.pip-root.layout-large .pip-body {
  margin: 12px 0;
}

.pip-timer-display {
  display: flex;
  flex-direction: column;
}

.pip-digits {
  font-size: clamp(26px, 8.5vw, 44px);
  font-weight: 350;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  letter-spacing: -1.5px;
  color: var(--text);
}

.pip-root.layout-large .pip-digits {
  font-size: clamp(36px, 12vw, 56px);
  letter-spacing: -2px;
}

.pip-status-row {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  color: var(--muted);
  margin-top: 4px;
}

.pip-root.layout-large .pip-status-row {
  font-size: 12px;
  margin-top: 8px;
}

.pip-status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--muted);
}

.pip-status-dot.running {
  background: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent);
}

.pip-main-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pip-reset-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--surface);
  color: var(--muted);
  border: 1px solid var(--line);
  transition: transform 0.2s, color 0.2s;
}

.pip-reset-btn.sm {
  width: 25px;
  height: 25px;
}

.pip-reset-btn:hover:not(:disabled) {
  color: var(--text);
  transform: scale(1.05);
}

.pip-reset-btn:disabled,
.pip-play-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}

.pip-play-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--accent);
  color: #122013;
  box-shadow: 0 3px 12px color-mix(in srgb, var(--accent) 30%, transparent);
  transition: transform 0.2s, filter 0.2s;
}

.pip-play-btn.sm {
  width: 28px;
  height: 28px;
}

.pip-root.layout-large .pip-play-btn {
  width: 48px;
  height: 48px;
}

.pip-play-btn:hover:not(:disabled) {
  transform: scale(1.05);
  filter: brightness(1.1);
}

.pip-adjust-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  position: relative;
  z-index: 5;
  padding: 4px 0;
  border-top: 1px solid var(--line);
}

.pip-root.layout-large .pip-adjust-bar {
  padding: 8px 0;
}

.pip-custom-form {
  display: flex;
  align-items: center;
  gap: 5px;
  position: relative;
  z-index: 10;
  padding: 4px 0;
}

.pip-custom-form input {
  flex: 1;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--text);
  font-size: 11px;
}

.custom-submit-btn {
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--accent);
  color: #122013;
  font-size: 11px;
  font-weight: 550;
}

.custom-cancel-btn {
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--surface);
  color: var(--muted);
  font-size: 11px;
}

.pip-progress-track {
  height: 3px;
  width: 100%;
  background: var(--track);
  border-radius: 3px;
  overflow: hidden;
  position: relative;
  z-index: 5;
  margin-top: 4px;
}

.pip-progress-track > span {
  display: block;
  height: 100%;
  transition: width 0.6s linear;
}

.pip-task-modal {
  position: absolute;
  inset: 6px;
  background: var(--surface);
  border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--line));
  border-radius: 10px;
  padding: 8px;
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: var(--shadow);
}

.pip-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  border-bottom: 1px solid var(--line);
  padding-bottom: 4px;
}

.pip-modal-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow-y: auto;
  flex: 1;
}

.pip-task-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border-radius: 6px;
  font-size: 11px;
  color: var(--text);
  text-align: left;
  width: 100%;
}

.pip-task-row:hover,
.pip-task-row.active {
  background: var(--raised);
}

.pip-task-row .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.pip-task-row .name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 550;
}

.pip-task-row .time {
  font-size: 9px;
  color: var(--muted);
}

/* Safe Reset Confirmation Modal for PiP */
.pip-confirm-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.68);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  z-index: 100;
  padding: 12px;
  border-radius: inherit;
}

.pip-confirm-box {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 14px 16px;
  width: 100%;
  max-width: 260px;
  text-align: center;
  box-shadow: var(--shadow);
}

.pip-confirm-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  display: block;
  margin-bottom: 4px;
}

.pip-confirm-desc {
  font-size: 11px;
  color: var(--muted);
  margin: 0 0 12px 0;
  line-height: 1.4;
}

.pip-confirm-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.pip-confirm-btn {
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 550;
  cursor: pointer;
  transition: background 0.15s;
}

.pip-confirm-btn.cancel {
  background: var(--raised);
  color: var(--muted);
  border: 1px solid var(--line);
}

.pip-confirm-btn.cancel:hover {
  color: var(--text);
}

.pip-confirm-btn.confirm {
  background: rgba(220, 38, 38, 0.9);
  color: #fff;
  border: 1px solid rgba(220, 38, 38, 1);
}

.pip-confirm-btn.confirm:hover {
  background: rgb(220, 38, 38);
}

.pip-confirm-btn.sm {
  padding: 3px 8px;
  font-size: 10px;
  border-radius: 5px;
}
```
