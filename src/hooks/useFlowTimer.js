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
    const api = typeof window !== 'undefined' ? window.electronAPI : undefined;
    const receive = value => {
      if (active && value) setWindowState(value);
    };
    const unsubscribe = api?.onWindowState(receive);
    if (api) {
      api.getWindowState().then(receive).catch(err => active && setError(err.message));
    }

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
    saveTask: values => {
      try {
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
        });
      } catch (err) {
        setError(err.message || 'Không thể lưu công việc.');
      }
    },
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
