import React from 'react';
import { Check, ChevronDown, Music, Pause, Play, RotateCcw, Sparkles } from 'lucide-react';
import { formatRemaining } from '../lib/time-parser.js';
import { StackBadge } from './TaskLanes';

const STATUS_TITLE = {
  idle: 'Sẵn sàng bắt đầu',
  running: 'Đang tập trung',
  paused: 'Đang tạm dừng',
  completed: 'Đã hoàn thành',
};

const HOURGLASS_PATH = 'M22 12H78V25C78 39 58 45 53 54C58 65 78 70 78 85V98H22V85C22 70 42 65 47 54C42 45 22 39 22 25Z';
const RING_LENGTH = 2 * Math.PI * 19;

/**
 * Hàng chính của thanh nổi (dùng chung cho cửa sổ Electron và PiP trình duyệt):
 * quả cầu tiến độ · tên việc + đồng hồ + huy hiệu việc song song · cụm thao tác · cụm điều khiển cửa sổ.
 */
export default function SlimBarRow({
  className = '',
  clipId,
  task,
  status,
  left,
  percent,
  fraction,
  visualMode,
  onCycleVisual,
  lanes,
  lanesCollapsed,
  onToggleLanes,
  now,
  onOpenPicker,
  ghibliState,
  onMusic,
  onPlus5,
  onAdjustMenu,
  quoteActive,
  quoteTitle,
  onQuote,
  onReset,
  onToggle,
  confirmReset,
  onCancelReset,
  onConfirmReset,
  windowControls,
  children,
}) {
  const accent = task?.color || 'var(--accent)';

  return (
    <div className={`mini-bar-content ${status} ${className}`} style={{ '--task-accent': accent }}>
      {children}
      {confirmReset ? (
        <div className="mini-bar-confirm no-drag">
          <span className="confirm-text">Đặt lại “{task?.name}”?</span>
          <div className="confirm-actions">
            <button type="button" className="confirm-btn-pill cancel" onClick={onCancelReset}>
              Hủy
            </button>
            <button type="button" className="confirm-btn-pill danger" onClick={onConfirmReset}>
              Đặt lại
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 1. Quả cầu tiến độ (vòng sáng / đồng hồ cát) — bấm để đổi hiệu ứng */}
          <button
            type="button"
            className={`mini-bar-orb no-drag ${status}`}
            onClick={onCycleVisual}
            title={`Hiệu ứng: ${visualMode === 'hourglass' ? 'Đồng hồ cát' : 'Vòng thời gian'} (Bấm để chuyển đổi)`}
          >
            {visualMode === 'hourglass' ? (
              <svg className="mini-hourglass-svg-sm" viewBox="0 0 100 110" aria-hidden="true">
                <defs>
                  <clipPath id={clipId}>
                    <path d={HOURGLASS_PATH} />
                  </clipPath>
                </defs>
                <g clipPath={`url(#${clipId})`}>
                  <rect x="15" y={54 - fraction * 42} width="70" height={fraction * 42} fill="var(--task-accent)" opacity="0.8" />
                  <rect x="15" y={98 - (1 - fraction) * 42} width="70" height={(1 - fraction) * 42} fill="var(--task-accent)" />
                  {status === 'running' && (
                    <path
                      className="sand-stream"
                      d={`M50 54V${98 - (1 - fraction) * 42}`}
                      stroke="var(--task-accent)"
                      strokeWidth="3"
                      strokeDasharray="2 3"
                    />
                  )}
                </g>
                <path d={HOURGLASS_PATH} fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="2.5" />
                <path d="M17 9H83M17 101H83" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
              </svg>
            ) : (
              <>
                <svg className="mini-orb-ring" viewBox="0 0 44 44" aria-hidden="true">
                  <circle cx="22" cy="22" r="19" className="orb-track" />
                  <circle
                    cx="22"
                    cy="22"
                    r="19"
                    className="orb-progress"
                    strokeDasharray={RING_LENGTH}
                    strokeDashoffset={RING_LENGTH * (percent / 100)}
                    transform="rotate(-90 22 22)"
                  />
                </svg>
                <span className="mini-orb-emoji">{task?.emoji || '✦'}</span>
              </>
            )}
          </button>

          {/* 2. Tên việc + đồng hồ số + huy hiệu các việc song song */}
          <div className="mini-bar-info">
            <div className="mini-bar-info-top no-drag">
              <button
                type="button"
                className="mini-bar-task-btn"
                onClick={onOpenPicker}
                title="Bấm để đổi việc chính hoặc chạy thêm việc song song"
              >
                <span className={`status-pulse-dot ${status}`} style={{ '--dot-color': accent }} />
                {visualMode === 'hourglass' && <span className="task-emoji-sm">{task?.emoji || '✦'}</span>}
                <span className="mini-bar-task" title={task?.name}>
                  {task?.name || 'Chưa chọn việc'}
                </span>
                <ChevronDown size={12} className="chevron" />
              </button>
            </div>
            <div className="mini-bar-info-main">
              <span className={`mini-bar-time ${status}`} title={STATUS_TITLE[status]}>
                {formatRemaining(left)}
              </span>
              <StackBadge entries={lanes.entries} now={now} collapsed={lanesCollapsed} onClick={onToggleLanes} />
              <span className={`mini-percent-badge ${status === 'running' ? 'running' : ''}`}>
                {Math.round(percent)}%
              </span>
            </div>
          </div>

          {/* 3. Nhạc, chỉnh giờ, danh ngôn, đặt lại, chạy/dừng + cụm điều khiển cửa sổ */}
          <div className="mini-bar-actions no-drag">
            <button
              type="button"
              className={`mini-ghibli-btn compact ${ghibliState.isPlaying ? 'playing' : ''}`}
              onClick={onMusic}
              title={
                ghibliState.isPlaying
                  ? `Đang phát: ${ghibliState.currentTrack.title} — Bấm để chọn danh sách / trộn / lặp`
                  : 'Bật nhạc Ghibli Lofi & Âm tập trung'
              }
            >
              <Music size={13} />
              {ghibliState.isPlaying && (
                <span className="mini-eq-bars">
                  <i className="b1" />
                  <i className="b2" />
                  <i className="b3" />
                </span>
              )}
            </button>

            <div className="mini-adjust-wrap">
              <button
                type="button"
                className="adjust-pill-bar"
                disabled={!task}
                onClick={onPlus5}
                onContextMenu={event => {
                  event.preventDefault();
                  onAdjustMenu();
                }}
                title="Cộng 5 phút (Chuột phải hoặc bấm mũi tên để mở menu chỉnh giờ)"
              >
                +5p
              </button>
              <button
                type="button"
                className="adjust-chevron-bar"
                onClick={onAdjustMenu}
                title="Mở menu chỉnh giờ (-5p, -1p, +1p, +5p, sửa phút)"
              >
                <ChevronDown size={11} />
              </button>
            </div>

            <button type="button" className={`mini-quote-btn ${quoteActive ? 'active' : ''}`} onClick={onQuote} title={quoteTitle}>
              <Sparkles size={13} />
            </button>

            <button
              type="button"
              className="icon-button no-drag mini-icon-btn reset-btn"
              disabled={!task}
              onClick={onReset}
              title="Đặt lại phiên này"
              aria-label="Đặt lại phiên này"
            >
              <RotateCcw size={14} />
            </button>

            <button
              type="button"
              className={`mini-play-main ${status === 'running' ? 'running' : ''}`}
              disabled={!task || status === 'completed'}
              onClick={onToggle}
              aria-label={status === 'running' ? 'Tạm dừng' : 'Bắt đầu'}
              title={status === 'running' ? 'Tạm dừng việc chính' : 'Chạy việc chính'}
              style={{ '--btn-accent': accent }}
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

            <div className="mini-window-cluster">{windowControls}</div>
          </div>
        </>
      )}
    </div>
  );
}
