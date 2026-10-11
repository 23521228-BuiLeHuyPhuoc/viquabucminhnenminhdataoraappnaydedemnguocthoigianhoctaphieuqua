import React from 'react';
import { Check, Pause, Play, X } from 'lucide-react';
import { getRemainingSeconds, getTaskStatus, isTaskRunning } from '../lib/timer-engine.js';
import { formatRemaining } from '../lib/time-parser.js';

const STATUS_LABEL = {
  idle: 'Sẵn sàng',
  running: 'Đang chạy',
  paused: 'Tạm dừng',
  completed: 'Hoàn thành',
};

const progressOf = (task, left) =>
  task && task.goal > 0 ? Math.min(100, Math.max(0, (1 - left / task.goal) * 100)) : 0;

/** Đường sáng "cực quang" chạy dọc mép trên thanh, pha trộn màu của mọi việc đang chạy. */
export function ParallelAurora({ tasks }) {
  if (!tasks.length) return null;
  const colors = tasks.map(t => t.color);
  const stops = [...colors, colors[0]].join(', ');
  return (
    <span
      className={`parallel-aurora ${tasks.length > 1 ? 'multi' : ''}`}
      style={{ '--aurora': `linear-gradient(90deg, ${stops})` }}
      aria-hidden="true"
    />
  );
}

/** Huy hiệu xếp chồng các chấm màu: số việc đang song song, bấm để thu gọn / mở rộng các làn. */
export function StackBadge({ entries, now, collapsed, onClick }) {
  if (!entries.length) return null;
  const runningCount = entries.filter(({ task }) => isTaskRunning(task)).length;
  return (
    <button
      type="button"
      className={`stack-badge no-drag ${collapsed ? 'collapsed' : ''} ${runningCount ? 'live' : ''}`}
      onClick={onClick}
      title={`${entries.length} việc khác ${runningCount ? `(${runningCount} đang chạy)` : ''} — bấm để ${collapsed ? 'mở rộng' : 'thu gọn'}`}
      aria-expanded={!collapsed}
    >
      <span className="stack-dots" aria-hidden="true">
        {entries.slice(0, 3).map(({ task }, i) => (
          <i
            key={task.id}
            className={getTaskStatus(task, now)}
            style={{ '--dot-color': task.color, '--i': i }}
          />
        ))}
      </span>
      <span className="stack-count">+{entries.length}</span>
    </button>
  );
}

export function TaskLane({ task, doneAt, now, index, onToggle, onFocus, onDismiss }) {
  const status = getTaskStatus(task, now);
  const left = getRemainingSeconds(task, now);
  const percent = progressOf(task, left);
  const done = status === 'completed';

  return (
    <div
      className={`task-lane ${status} ${done && doneAt ? 'celebrating' : ''}`}
      style={{ '--lane-color': task.color, '--i': index }}
      role="group"
      aria-label={`${task.name}: ${STATUS_LABEL[status]}, còn ${formatRemaining(left)}`}
    >
      <span className="lane-accent" aria-hidden="true" />
      <button
        type="button"
        className="lane-main no-drag"
        onClick={() => onFocus(task.id)}
        title={`${task.name} — bấm để đưa lên thanh chính`}
      >
        <span className={`status-pulse-dot ${status}`} style={{ '--dot-color': task.color }} />
        <span className="lane-emoji">{task.emoji}</span>
        <span className="lane-name">{task.name}</span>
      </button>
      <span className="lane-track" aria-hidden="true">
        <span style={{ width: `${percent}%` }} />
      </span>
      <span className="lane-time">{done ? 'Xong!' : formatRemaining(left)}</span>
      {done ? (
        <span className="lane-done-badge" aria-hidden="true">
          <Check size={13} strokeWidth={3} />
        </span>
      ) : (
        <button
          type="button"
          className={`lane-toggle no-drag ${status}`}
          onClick={() => onToggle(task.id)}
          aria-label={status === 'running' ? `Tạm dừng ${task.name}` : `Tiếp tục ${task.name}`}
          title={status === 'running' ? 'Tạm dừng việc này' : 'Tiếp tục việc này'}
        >
          {status === 'running' ? <Pause size={11} fill="currentColor" /> : <Play size={11} fill="currentColor" />}
        </button>
      )}
      {status !== 'running' && onDismiss && (
        <button
          type="button"
          className="lane-dismiss no-drag"
          onClick={() => onDismiss(task.id)}
          aria-label={`Ẩn ${task.name} khỏi thanh`}
          title="Ẩn khỏi thanh (không ảnh hưởng thời gian)"
        >
          <X size={11} />
        </button>
      )}
    </div>
  );
}

/** Danh sách các làn công việc phụ đang đếm ngược song song bên dưới thanh chính. */
export function TaskLanes({ lanes, now, onToggle, onFocus, onDismiss, onMore, className = '' }) {
  if (!lanes.visible.length) return null;
  return (
    <div className={`task-lanes drag-region ${className}`}>
      {lanes.visible.map(({ task, doneAt }, i) => (
        <TaskLane
          key={task.id}
          task={task}
          doneAt={doneAt}
          now={now}
          index={i}
          onToggle={onToggle}
          onFocus={onFocus}
          onDismiss={onDismiss}
        />
      ))}
      {lanes.hiddenCount > 0 && (
        <button type="button" className="lane-more no-drag" onClick={onMore} style={{ '--i': lanes.visible.length }}>
          +{lanes.hiddenCount} việc khác đang song song · Xem tất cả
        </button>
      )}
    </div>
  );
}

/** Dải chip gọn cho dạng Thẻ: mỗi việc song song một viên, bấm để đưa lên chính. */
export function LaneChips({ lanes, now, onToggle, onFocus }) {
  if (!lanes.entries.length) return null;
  return (
    <div className="lane-chips no-drag">
      {lanes.entries.map(({ task }, i) => {
        const status = getTaskStatus(task, now);
        const left = getRemainingSeconds(task, now);
        return (
          <span
            key={task.id}
            className={`lane-chip ${status}`}
            style={{ '--lane-color': task.color, '--i': i, '--p': `${progressOf(task, left)}%` }}
          >
            <button type="button" className="lane-chip-main" onClick={() => onFocus(task.id)} title={`${task.name} — bấm để đưa lên chính`}>
              <span className={`status-pulse-dot ${status}`} style={{ '--dot-color': task.color }} />
              <span className="lane-chip-emoji">{task.emoji}</span>
              <span className="lane-chip-time">{status === 'completed' ? 'Xong' : formatRemaining(left)}</span>
            </button>
            {status !== 'completed' && (
              <button
                type="button"
                className="lane-chip-toggle"
                onClick={() => onToggle(task.id)}
                aria-label={status === 'running' ? `Tạm dừng ${task.name}` : `Tiếp tục ${task.name}`}
              >
                {status === 'running' ? <Pause size={9} fill="currentColor" /> : <Play size={9} fill="currentColor" />}
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
}

/** Hàng thao tác trong menu chọn việc: chọn việc + nút chạy/dừng riêng cho từng việc. */
export function TaskPickerRow({ task, now, active, onSelect, onToggle, rowClassName }) {
  const status = getTaskStatus(task, now);
  const left = getRemainingSeconds(task, now);
  return (
    <div className={`picker-row ${rowClassName} ${active ? 'active' : ''} ${status}`} style={{ '--lane-color': task.color }}>
      <button type="button" className="picker-row-main" onClick={() => onSelect(task.id)}>
        <span className={`status-pulse-dot ${status}`} style={{ '--dot-color': task.color }} />
        <span className="item-emoji">{task.emoji}</span>
        <strong className="item-name">{task.name}</strong>
        <span className="item-time">{status === 'completed' ? 'Xong' : formatRemaining(left)}</span>
      </button>
      <button
        type="button"
        className={`picker-row-toggle ${status}`}
        disabled={status === 'completed'}
        onClick={() => onToggle(task.id)}
        aria-label={status === 'running' ? `Tạm dừng ${task.name}` : `Bắt đầu ${task.name}`}
        title={status === 'running' ? 'Tạm dừng' : status === 'completed' ? 'Đã hoàn thành' : 'Chạy song song'}
      >
        {status === 'completed' ? (
          <Check size={12} />
        ) : status === 'running' ? (
          <Pause size={11} fill="currentColor" />
        ) : (
          <Play size={11} fill="currentColor" />
        )}
      </button>
    </div>
  );
}
