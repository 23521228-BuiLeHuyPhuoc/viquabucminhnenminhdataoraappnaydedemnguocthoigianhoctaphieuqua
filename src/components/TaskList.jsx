'use client';

import React from 'react';
import { Plus, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import { getRemainingSeconds, getTaskStatus, TIMER_STATUS } from '../lib/timer-engine';
import { formatDurationShort } from '../lib/time-parser';

export default function TaskList({
  tasks = [],
  selectedTaskId = '',
  onSelectTask,
  onAddTask,
  onEditTask,
  onDeleteTask,
  now = Date.now(),
}) {
  // Tính tổng thời gian đã tích lũy và tổng mục tiêu
  let totalSpent = 0;
  let totalGoal = 0;

  tasks.forEach((t) => {
    const rem = getRemainingSeconds(t, now);
    const spent = Math.max(0, t.goal - rem);
    totalSpent += spent;
    totalGoal += t.goal;
  });

  return (
    <div className="w-full flex flex-col gap-4 select-none">
      {/* 1. Các thẻ tab chọn công việc ở trên */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none px-1">
        {tasks.map((task) => {
          const isSelected = task.id === selectedTaskId;
          const isRunning = !!task.runStart;
          const status = getTaskStatus(task, now);
          const isDone = status === TIMER_STATUS.COMPLETED;

          return (
            <button
              key={task.id}
              onClick={() => onSelectTask(task.id)}
              className={`relative flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 border ${
                isSelected
                  ? 'bg-white/[0.12] text-white shadow-md'
                  : 'bg-white/[0.04] text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] border-transparent'
              }`}
              style={{
                borderColor: isSelected ? task.color : 'transparent',
                boxShadow: isSelected ? `0 0 12px ${task.color}33` : 'none',
              }}
            >
              {/* Emoji */}
              <span className="text-base">{task.emoji}</span>
              {/* Tên task */}
              <span className="max-w-[90px] truncate">{task.name}</span>

              {/* Chấm tròn báo đang chạy */}
              {isRunning && (
                <span
                  className="w-2 h-2 rounded-full animate-ping ml-0.5"
                  style={{ backgroundColor: task.color }}
                  title="Đang chạy"
                />
              )}

              {/* Icon hoàn thành */}
              {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-0.5" />}
            </button>
          );
        })}

        {/* Nút thêm công việc mới */}
        <button
          onClick={onAddTask}
          className="flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-dashed border-white/15 transition-all text-xs"
          title="Thêm công việc mới"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Danh sách tiến độ từng công việc + Tổng thời gian */}
      <div className="rounded-2xl p-3.5 border border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-3 px-1">
          <span>Tiến độ các môn / công việc</span>
          <span className="text-slate-400 tabular-nums">
            Tổng: <strong className="text-slate-200">{formatDurationShort(totalSpent)}</strong> /{' '}
            {formatDurationShort(totalGoal)}
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {tasks.map((task) => {
            const rem = getRemainingSeconds(task, now);
            const status = getTaskStatus(task, now);
            const isDone = status === TIMER_STATUS.COMPLETED;
            const percent = Math.min(100, Math.max(0, ((task.goal - rem) / task.goal) * 100));

            return (
              <div
                key={task.id}
                className="group flex items-center gap-3 text-xs p-1.5 rounded-lg hover:bg-white/[0.03] transition-colors"
              >
                {/* Emoji + Tên */}
                <div className="flex items-center gap-1.5 w-24 shrink-0 truncate">
                  <span>{task.emoji}</span>
                  <span className="font-medium text-slate-300 truncate" title={task.name}>
                    {task.name}
                  </span>
                </div>

                {/* Thanh tiến độ */}
                <div className="flex-1 h-2 rounded-full bg-white/[0.08] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300 ease-out"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: task.color,
                      boxShadow: task.runStart ? `0 0 8px ${task.color}88` : 'none',
                    }}
                  />
                </div>

                {/* Thời gian còn lại */}
                <div className="w-16 text-right tabular-nums font-semibold shrink-0">
                  {isDone ? (
                    <span className="text-emerald-400">Xong ✓</span>
                  ) : (
                    <span className="text-slate-400">còn {formatDurationShort(rem)}</span>
                  )}
                </div>

                {/* Nút Sửa / Xóa */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => onEditTask(task)}
                    className="p-1 hover:text-white text-slate-400 hover:bg-white/10 rounded"
                    title="Chỉnh sửa công việc"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteTask(task)}
                    className="p-1 hover:text-rose-400 text-slate-400 hover:bg-rose-500/10 rounded"
                    title="Xóa công việc"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
