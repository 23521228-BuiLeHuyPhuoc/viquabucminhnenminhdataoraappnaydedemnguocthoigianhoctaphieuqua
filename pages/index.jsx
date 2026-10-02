'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  DEFAULT_TASKS,
  getRemainingSeconds,
  getTaskStatus,
  toggleTaskRunning,
  resetTask,
  checkCompletion,
  reconcileRestoredTasks,
  TIMER_STATUS,
} from '../src/lib/timer-engine';
import { loadPersistedState, savePersistedState } from '../src/lib/storage';
import { playCompletionSound, playClickSound } from '../src/lib/sound';
import { desktopBridge, isDesktopApp } from '../src/lib/desktop-bridge';

import TitleBar from '../src/components/TitleBar';
import TimerDisplay from '../src/components/TimerDisplay';
import HourglassSvg from '../src/components/HourglassSvg';
import ProgressRing from '../src/components/ProgressRing';
import Controls from '../src/components/Controls';
import TaskList from '../src/components/TaskList';
import MiniFloatingTimer from '../src/components/MiniFloatingTimer';
import DurationModal from '../src/components/DurationModal';
import TaskEditModal from '../src/components/TaskEditModal';
import SettingsModal from '../src/components/SettingsModal';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [selectedTaskId, setSelectedTaskId] = useState('english');
  const [theme, setTheme] = useState('dark');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [desktopNotifications, setDesktopNotifications] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [miniDisplayMode, setMiniDisplayMode] = useState('card');
  const [isPinned, setIsPinned] = useState(true);
  const [isMiniWindow, setIsMiniWindow] = useState(false);
  const [visualMode, setVisualMode] = useState('hourglass'); // 'hourglass' | 'ring'
  const [handledSessions, setHandledSessions] = useState(() => new Set());
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [now, setNow] = useState(Date.now());

  // Trạng thái modal
  const [isDurationModalOpen, setIsDurationModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isDesktop = isDesktopApp();

  // Khởi tạo và tải dữ liệu từ LocalStorage hoặc Electron AppData
  useEffect(() => {
    async function init() {
      const saved = await loadPersistedState();
      const handledSet = new Set(saved.handledSessionIds || []);
      const { tasks: restoredTasks, expiredSessions } = reconcileRestoredTasks(
        saved.tasks,
        handledSet,
        Date.now()
      );

      // Đánh dấu các session đã hết hạn trong lúc app đóng
      expiredSessions.forEach((s) => handledSet.add(s.sessionId));

      setTasks(restoredTasks);
      setSelectedTaskId(saved.selectedTaskId);
      setTheme(saved.theme);
      setSoundEnabled(saved.soundEnabled);
      setDesktopNotifications(saved.desktopNotifications);
      setReducedMotion(saved.reducedMotion);
      setMiniDisplayMode(saved.miniDisplayMode);
      setIsPinned(saved.isPinned);
      setHandledSessions(handledSet);
      setMounted(true);
    }
    init();
  }, []);

  // Cập nhật theme và accent color CSS variables theo task đang chọn/chạy
  const runningTask = tasks.find((t) => t.runStart);
  const activeTask = runningTask || tasks.find((t) => t.id === selectedTaskId) || tasks[0];
  const activeColor = activeTask?.color || '#60a5fa';

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.style.setProperty('--accent', activeColor);
    root.classList.toggle('light', theme === 'light');
  }, [activeColor, theme, mounted]);

  // Vòng lặp cập nhật thời gian thực (Interval 250ms để bắt giây chính xác và mượt)
  useEffect(() => {
    if (!mounted) return;

    const timer = setInterval(() => {
      const currentNow = Date.now();
      setNow(currentNow);

      // Kiểm tra sự kiện hoàn thành
      const { updatedTasks, completionEvent } = checkCompletion(tasks, handledSessions, currentNow);

      if (completionEvent) {
        // Xử lý sự kiện hoàn thành một lần duy nhất cho phiên
        setHandledSessions((prev) => {
          const next = new Set(prev);
          next.add(completionEvent.sessionId);
          return next;
        });

        // Bắn pháo hoa ăn mừng
        if (!reducedMotion) {
          try {
            confetti({
              particleCount: 80,
              spread: 60,
              origin: { y: 0.65 },
              colors: [activeColor, '#4ade80', '#fbbf24', '#f472b6'],
            });
          } catch (e) {
            // ignore
          }
        }

        // Phát chuông âm thanh nếu được bật
        if (soundEnabled) {
          playCompletionSound();
        }

        // Gửi thông báo desktop nếu có quyền
        if (desktopNotifications) {
          desktopBridge.sendNotification(
            '🎉 Hoàn thành phiên tập trung!',
            `Bạn đã hoàn thành mục tiêu cho: ${completionEvent.taskName}`
          );
        }

        setTasks(updatedTasks);
      }
    }, 250);

    return () => clearInterval(timer);
  }, [mounted, tasks, handledSessions, soundEnabled, desktopNotifications, reducedMotion, activeColor]);

  // Tự động lưu trạng thái khi có thay đổi quan trọng
  const saveCurrentState = useCallback(
    (immediate = false) => {
      if (!mounted) return;
      savePersistedState(
        {
          tasks,
          selectedTaskId,
          theme,
          soundEnabled,
          desktopNotifications,
          reducedMotion,
          miniDisplayMode,
          isPinned,
          handledSessionIds: Array.from(handledSessions),
        },
        immediate
      );
    },
    [
      mounted,
      tasks,
      selectedTaskId,
      theme,
      soundEnabled,
      desktopNotifications,
      reducedMotion,
      miniDisplayMode,
      isPinned,
      handledSessions,
    ]
  );

  useEffect(() => {
    saveCurrentState(false);
  }, [saveCurrentState]);

  // Thao tác Bắt đầu / Tạm dừng
  const handleTogglePlay = (taskId = selectedTaskId) => {
    playClickSound();
    const updated = toggleTaskRunning(tasks, taskId, Date.now());
    setTasks(updated);
    // Nếu bắt đầu task khác, chuyển sang xem task đó
    setSelectedTaskId(taskId);
    setQuoteIndex((prev) => prev + 1);
  };

  // Thao tác Đặt lại (Reset)
  const handleReset = () => {
    playClickSound();
    setTasks((prev) =>
      prev.map((t) => (t.id === selectedTaskId ? resetTask(t) : t))
    );
  };

  // Chuyển đổi giữa chế độ đầy đủ và chế độ mini
  const handleToggleMini = async () => {
    playClickSound();
    const nextMini = !isMiniWindow;
    setIsMiniWindow(nextMini);

    if (isDesktop) {
      if (nextMini) {
        const mode = miniDisplayMode === 'bar' ? 'mini-bar' : 'mini-card';
        await desktopBridge.setWindowMode(mode);
      } else {
        await desktopBridge.setWindowMode('full');
      }
    }
  };

  // Đổi kiểu hiển thị mini (Card <-> Bar)
  const handleChangeMiniDisplayMode = async (mode) => {
    setMiniDisplayMode(mode);
    if (isDesktop && isMiniWindow) {
      await desktopBridge.setWindowMode(mode === 'bar' ? 'mini-bar' : 'mini-card');
    }
  };

  // Ghim Always-on-top
  const handleTogglePin = async () => {
    const nextPin = !isPinned;
    setIsPinned(nextPin);
    if (isDesktop) {
      await desktopBridge.setAlwaysOnTop(nextPin);
    }
  };

  // Ghim vào 4 góc
  const handleSnapCorner = async (corner) => {
    if (isDesktop) {
      await desktopBridge.snapToCorner(corner);
    }
  };

  // Lưu thời lượng mới cho công việc đang chọn
  const handleSaveDuration = (newSeconds) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === selectedTaskId) {
          return {
            ...t,
            goal: newSeconds,
            left: newSeconds,
            runStart: null,
            endAt: null,
            sessionId: null,
          };
        }
        return t;
      })
    );
  };

  // Thêm hoặc sửa công việc
  const handleSaveTask = (taskData) => {
    if (taskData.id) {
      // Sửa task hiện tại
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskData.id
            ? {
                ...t,
                name: taskData.name,
                emoji: taskData.emoji,
                color: taskData.color,
                goal: taskData.goal,
                left: Math.min(t.left, taskData.goal),
              }
            : t
        )
      );
    } else {
      // Thêm task mới
      const newId = `task_${Date.now()}`;
      const newTask = {
        id: newId,
        name: taskData.name,
        emoji: taskData.emoji,
        color: taskData.color,
        goal: taskData.goal,
        left: taskData.goal,
        runStart: null,
        endAt: null,
        sessionId: null,
      };
      setTasks((prev) => [...prev, newTask]);
      setSelectedTaskId(newId);
    }
  };

  // Xóa công việc
  const handleDeleteTask = (task) => {
    if (tasks.length <= 1) {
      alert('Phải giữ lại ít nhất một công việc.');
      return;
    }
    const isRunning = !!task.runStart;
    const confirmText = isRunning
      ? `Công việc "${task.name}" đang đếm giờ. Bạn có chắc muốn dừng và xóa không?`
      : `Bạn có chắc muốn xóa công việc "${task.name}" không?`;

    if (window.confirm(confirmText)) {
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      if (selectedTaskId === task.id) {
        const remaining = tasks.filter((t) => t.id !== task.id);
        setSelectedTaskId(remaining[0]?.id || 'english');
      }
    }
  };

  // Lắng nghe phím tắt: Space (bắt đầu/tạm dừng), M (bật mini), Escape (đóng modal)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        const rTask = tasks.find((t) => t.runStart);
        const targetId = rTask ? rTask.id : selectedTaskId;
        handleTogglePlay(targetId);
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleToggleMini();
      } else if (e.key === 'Escape') {
        setIsDurationModalOpen(false);
        setIsTaskModalOpen(false);
        setIsSettingsOpen(false);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedTaskId, tasks, isMiniWindow]);

  if (!mounted) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-slate-400 select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <span className="text-sm font-medium">Đang tải Flow...</span>
        </div>
      </div>
    );
  }

  // Dữ liệu task đang hiển thị ở khu trung tâm
  const currentViewTask = tasks.find((t) => t.id === selectedTaskId) || tasks[0];
  const remSec = getRemainingSeconds(currentViewTask, now);
  const taskStatus = getTaskStatus(currentViewTask, now);
  const hasProgress = currentViewTask.left < currentViewTask.goal;
  const fraction = currentViewTask.goal > 0 ? remSec / currentViewTask.goal : 1;

  // Task ưu tiên hiển thị ở Mini mode (ưu tiên task đang chạy)
  const miniTask = runningTask || currentViewTask;
  const miniRemSec = getRemainingSeconds(miniTask, now);
  const miniStatus = getTaskStatus(miniTask, now);

  // ================= NẾU ĐANG Ở CHẾ ĐỘ MINI CỬA SỔ NỔI =================
  if (isMiniWindow) {
    return (
      <div className="w-screen h-screen overflow-hidden p-1 flex items-center justify-center bg-transparent">
        <MiniFloatingTimer
          task={miniTask}
          remainingSeconds={miniRemSec}
          status={miniStatus}
          displayMode={miniDisplayMode}
          isPinned={isPinned}
          onTogglePlay={() => handleTogglePlay(miniTask.id)}
          onRestoreFull={handleToggleMini}
          onTogglePin={handleTogglePin}
          onChangeDisplayMode={handleChangeMiniDisplayMode}
          onSnapCorner={handleSnapCorner}
          isDesktop={isDesktop}
        />
      </div>
    );
  }

  // ================= CHẾ ĐỘ GIAO DIỆN ĐẦY ĐỦ =================
  return (
    <div className="h-screen w-screen flex flex-col justify-between overflow-hidden bg-background text-foreground transition-colors duration-400 select-none relative">
      {/* 1. Thanh tiêu đề trên cùng (Windows title bar drag-region) */}
      <TitleBar
        isDesktop={isDesktop}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleMiniMode={handleToggleMini}
      />

      {/* Thông báo nếu đang preview trên trình duyệt Web */}
      {!isDesktop && (
        <div className="bg-blue-950/40 border-b border-blue-500/20 px-4 py-1 text-[11px] text-blue-300 text-center flex items-center justify-center gap-1.5">
          <span>🌐 Bản xem trước Web (Khi dùng bản Desktop Electron, đồng hồ nổi sẽ ghim trên mọi cửa sổ Windows).</span>
        </div>
      )}

      {/* 2. Khu vực nội dung chính cuộn gọn gàng */}
      <main className="flex-1 w-full max-w-xl mx-auto px-4 py-3 flex flex-col justify-between overflow-y-auto">
        {/* Bộ chọn danh sách công việc ở trên */}
        <TaskList
          tasks={tasks}
          selectedTaskId={selectedTaskId}
          onSelectTask={(id) => setSelectedTaskId(id)}
          onAddTask={() => {
            setTaskToEdit(null);
            setIsTaskModalOpen(true);
          }}
          onEditTask={(task) => {
            setTaskToEdit(task);
            setIsTaskModalOpen(true);
          }}
          onDeleteTask={handleDeleteTask}
          now={now}
        />

        {/* Trung tâm: Đồng hồ cát / Vòng tiến độ + Số đếm + Nút điều khiển */}
        <div className="flex flex-col items-center justify-center my-auto py-2">
          {/* Biểu diễn trực quan (click để đổi giữa Đồng hồ cát và Vòng tiến độ) */}
          <div className="mb-2">
            {visualMode === 'hourglass' ? (
              <HourglassSvg
                fraction={fraction}
                isRunning={taskStatus === TIMER_STATUS.RUNNING}
                isCompleted={taskStatus === TIMER_STATUS.COMPLETED}
                color={currentViewTask.color}
                size={110}
                onClick={() => setVisualMode('ring')}
              />
            ) : (
              <ProgressRing
                fraction={fraction}
                isRunning={taskStatus === TIMER_STATUS.RUNNING}
                isCompleted={taskStatus === TIMER_STATUS.COMPLETED}
                color={currentViewTask.color}
                size={120}
                onClick={() => setVisualMode('hourglass')}
              />
            )}
          </div>

          {/* Hiển thị số đồng hồ */}
          <TimerDisplay
            remainingSeconds={remSec}
            goalSeconds={currentViewTask.goal}
            status={taskStatus}
            taskName={currentViewTask.name}
            taskEmoji={currentViewTask.emoji}
            taskColor={currentViewTask.color}
            quoteIndex={quoteIndex}
          />

          {/* Điều khiển chính */}
          <Controls
            status={taskStatus}
            taskColor={currentViewTask.color}
            hasProgress={hasProgress}
            onTogglePlay={() => handleTogglePlay(selectedTaskId)}
            onReset={handleReset}
            onOpenDurationModal={() => setIsDurationModalOpen(true)}
            onToggleMiniMode={handleToggleMini}
            isMiniMode={isMiniWindow}
          />
        </div>
      </main>

      {/* 3. Footer tinh tế */}
      <footer className="py-1 px-4 text-center text-[10px] text-slate-500 border-t border-white/[0.04]">
        Flow Timer • Bấm vào đồng hồ cát để đổi góc nhìn • Nhấn Space để Bắt đầu/Tạm dừng
      </footer>

      {/* ================= CÁC MODAL TIỆN ÍCH ================= */}
      <DurationModal
        isOpen={isDurationModalOpen}
        onClose={() => setIsDurationModalOpen(false)}
        currentGoalSeconds={currentViewTask.goal}
        hasProgress={hasProgress}
        onSaveDuration={handleSaveDuration}
      />

      <TaskEditModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setTaskToEdit(null);
        }}
        taskToEdit={taskToEdit}
        onSaveTask={handleSaveTask}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        desktopNotifications={desktopNotifications}
        onToggleNotifications={(granted) => setDesktopNotifications(granted)}
        reducedMotion={reducedMotion}
        onToggleReducedMotion={() => setReducedMotion(!reducedMotion)}
        miniDisplayMode={miniDisplayMode}
        onChangeMiniDisplayMode={(mode) => setMiniDisplayMode(mode)}
      />
    </div>
  );
}
