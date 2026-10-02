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
