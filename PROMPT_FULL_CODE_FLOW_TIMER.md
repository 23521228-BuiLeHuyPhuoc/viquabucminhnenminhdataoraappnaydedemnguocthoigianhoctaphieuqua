Bạn hãy áp dụng bản sửa Flow Timer dưới đây vào dự án hiện tại. Đây là yêu cầu THAY CODE theo bản đã cung cấp, không phải yêu cầu tự thiết kế lại hoặc tự diễn giải thành một phiên bản khác.

MỤC TIÊU
- Làm lại giao diện theo bố cục sidebar công việc + đồng hồ trung tâm, theme tối/sáng nhất quán, accent theo công việc đang xem, có vòng tiến độ và đồng hồ cát.
- Mini dạng thẻ và dạng thanh, dùng chung trạng thái với màn hình chính.
- Sửa lỗi đổi thời lượng khi đang chạy, hoàn thành lặp, dữ liệu khôi phục lỗi, trạng thái ghim sai và mini/full không đồng bộ giữa React và Electron.

CÁCH THỰC HIỆN
1. Đọc từng mục FILE bên dưới. Thay hoặc tạo đúng đường dẫn và dùng đầy đủ code trong mục đó. Không chỉ chép CSS, vì UI mới phụ thuộc hook và timer engine mới.
2. Giữ JavaScript + Next.js Pages Router + Electron hiện có. Không chuyển framework hoặc ngôn ngữ.
3. pages/index.jsx mới chỉ import FlowTimer. Các component cũ như TitleBar, TaskList, Controls, MiniFloatingTimer, TimerDisplay và các modal cũ không còn được entry này sử dụng; có thể giữ chúng nguyên trạng, không cần xóa file.
4. GIỮ NGUYÊN src/lib/sound.js đã có trong dự án. Bản sửa vẫn dùng playClickSound và playCompletionSound từ file này.
5. GIỮ NGUYÊN tailwind.config.js hiện có và các file không liên quan.
6. Giữ dữ liệu người dùng: không xóa localStorage key flow_timer_app_data_v1, không xóa file flow_timer_data.json trong userData. Schema vẫn tương thích bản cũ. Dữ liệu JSON không đọc được phải báo lỗi, không tự ghi mặc định đè lên.
7. Dùng cả electron/main.js và electron/preload.js mới cùng lúc: bridge và sự kiện window:state/before-close phải khớp với hook.
8. Không chạy build, cài package, khởi chạy app, test hoặc deploy trong lượt áp dụng này. Chỉ sửa file theo code. Cuối cùng ghi ngắn gọn các file đã thay; nếu cần lệnh chạy thì chỉ đưa lệnh để tôi tự chạy.
9. Không tự thêm tính năng, không sửa lại thiết kế, không thay đổi API mới hoặc cắt code thành placeholder/TODO.
10. Nếu repository khác đường dẫn đã cung cấp, xác định entry tương đương trước và chỉ điều chỉnh đường dẫn import cần thiết; không tạo hai entry cạnh tranh nhau.

CÁC THAY ĐỔI CHÍNH
- pages/index.jsx, FlowTimer.jsx, globals.css: giao diện mới; dialog có focus và Escape; chỉnh tên/màu/thời lượng; xác nhận reset; danh sách có thể rỗng; phím Space không ăn khi nhập liệu hoặc ở dialog.
- useFlowTimer.js: nguồn trạng thái dùng chung qua ref, lưu ngay khi thao tác, khôi phục phiên, xử lý hoàn thành trước thao tác mới, lắng nghe trạng thái cửa sổ thật từ Electron.
- timer-engine.js: sử dụng endAt, hỗ trợ runStart bằng 0, sửa thời lượng reset nhất quán, giữ mốc đếm khi chỉ đổi tên/màu, bảo đảm một task đang chạy khi khôi phục.
- time-parser.js: từ chối thời lượng làm tròn về 0 giây; sửa hiển thị 1h60 thành 2h.
- storage.js: kiểm tra giá trị hữu hạn, null và ID trùng; giữ danh sách trống; giữ các trường dữ liệu cũ hợp lệ; báo lỗi đọc/lưu.
- Electron: --dev rõ ràng; đồng bộ mode/pin qua IPC; nhớ vị trí từng chế độ; giới hạn theo workArea; xử lý tọa độ bằng 0; lưu file qua temp + rename; kiểm tra sender IPC; chờ lưu trước khi đóng.
- Chế độ web ghi rõ đây là xem trước mini trong trang. Không giả vờ nó ghim được trên ứng dụng desktop.

LƯU Ý PHẠM VI
Bản này không bổ sung cloud, đăng nhập, thống kê lịch sử theo ngày hoặc PiP web. “Tiến độ phiên” là tiến độ công việc hiện tại, không được đổi nhãn thành tổng thời gian tập trung hôm nay. Không hứa đồng hồ chính xác tuyệt đối khi người dùng tự đổi giờ hệ thống; máy sleep vẫn tính theo thời gian thực. Hành vi ghim thật trên Windows cần người dùng kiểm tra trên máy của họ. Không tuyên bố đã xác minh điều đó chỉ vì đọc code.

BẮT ĐẦU CODE THAY THẾ

## FILE 1: pages/index.jsx

Thao tác: Thay toàn bộ.

```jsx
import FlowTimer from '../src/components/FlowTimer';
export default FlowTimer;
```

## FILE 2: pages/_app.jsx

Thao tác: Nếu đã tồn tại, giữ các provider hiện có và bảo đảm import stylesheet bên dưới; nếu chưa có thì tạo file này.

```jsx
import '../src/styles/globals.css';
export default function App({ Component, pageProps }) { return <Component {...pageProps} />; }
```

## FILE 3: src/components/FlowTimer.jsx

Thao tác: Tạo mới hoặc thay toàn bộ.

```jsx
import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { ArrowUpRight, Check, Clock3, Edit3, Focus, Grip, Hourglass, LayoutPanelLeft, Maximize2, Minus, Moon, Pause, Pin, PinOff, Play, Plus, RotateCcw, Settings2, SlidersHorizontal, Sun, Trash2, Volume2, VolumeX, X } from 'lucide-react';
import useFlowTimer from '../hooks/useFlowTimer';
import { getRemainingSeconds, getTaskStatus, isTaskRunning, TIMER_STATUS, PALETTE } from '../lib/timer-engine.js';
import { formatRemaining, formatDurationShort, parseDuration } from '../lib/time-parser.js';
import { desktopBridge } from '../lib/desktop-bridge.js';
import { playCompletionSound } from '../lib/sound.js';

const STATUS = { idle: 'Sẵn sàng bắt đầu', running: 'Đang tập trung', paused: 'Đang tạm dừng', completed: 'Đã hoàn thành' };
function IconButton({ title, children, className = '', ...props }) {
  return <button type="button" title={title} aria-label={title} className={`icon-button no-drag ${className}`} {...props}>{children}</button>;
}
function Dialog({ title, onClose, children, className = '' }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    const dialog = ref.current, previous = document.activeElement;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus?.(); };
  }, []);
  return <dialog ref={ref} className={`flow-dialog ${className}`} onCancel={event => { event.preventDefault(); closeRef.current(); }} onClick={event => { if (event.target === event.currentTarget) { const b = event.currentTarget.getBoundingClientRect(); if (event.clientX < b.left || event.clientX > b.right || event.clientY < b.top || event.clientY > b.bottom) onClose(); } }} aria-label={title}>
    <div className="dialog-heading"><h2>{title}</h2><IconButton title="Đóng hộp thoại" onClick={onClose}><X size={19} /></IconButton></div>{children}
  </dialog>;
}
function TaskEditor({ task, durationOnly, onClose, onSave, now }) {
  const [name, setName] = useState(task?.name || '');
  const [emoji, setEmoji] = useState(task?.emoji || '✦');
  const [color, setColor] = useState(task?.color || '#a8c58a');
  const [duration, setDuration] = useState(task ? (task.goal % 60 === 0 ? `${Math.floor(task.goal / 3600)}:${String(Math.floor(task.goal % 3600 / 60)).padStart(2, '0')}` : String(task.goal / 60)) : '25');
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const parsed = parseDuration(duration);
  const resets = task && parsed.success && parsed.seconds !== task.goal && (isTaskRunning(task) || task.sessionId || getRemainingSeconds(task, now) < task.goal);
  function submit(event) {
    event.preventDefault();
    if (!name.trim()) { setError('Nhập tên công việc trước nhé.'); return; }
    if (!parsed.success) { setError(parsed.error); return; }
    if (resets && !confirmed) { setError('Xác nhận đặt lại phiên khi đổi thời lượng.'); return; }
    onSave({ id: task?.id, name: name.trim(), emoji, color, goal: parsed.seconds }); onClose();
  }
  return <Dialog title={durationOnly ? 'Đặt thời lượng' : task ? 'Chỉnh sửa công việc' : 'Một việc mới'} onClose={onClose}>
    <form onSubmit={submit}>
      {!durationOnly && <><label className="field">Tên công việc<input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Bạn muốn tập trung vào việc gì?" maxLength={100} /></label>
      <div className="editor-details"><label className="field">Biểu tượng<input aria-label="Biểu tượng" value={emoji} onChange={e => setEmoji(e.target.value)} maxLength={12} /></label><div className="field">Màu sắc<div className="swatches">{['#a8c58a', ...PALETTE.slice(0, 5)].map(c => <button key={c} type="button" aria-label={`Chọn màu ${c}`} aria-pressed={color === c} className="swatch" style={{ background: c }} onClick={() => setColor(c)}>{color === c && <Check size={15}/>}</button>)}</div></div></div></>}
      <label className="field">Thời lượng<input aria-label="Thời lượng" autoFocus={durationOnly} value={duration} onChange={e => { setDuration(e.target.value); setConfirmed(false); setError(''); }} placeholder="25 hoặc 1:30" aria-describedby="duration-help" aria-invalid={!!error} /></label>
      <p className="field-help" id="duration-help">Nhập phút, hoặc giờ:phút. Ví dụ: 90 = 1:30.</p>
      <div className="preset-row">{[15,25,45,60,90].map(n => <button type="button" key={n} className={parsed.seconds === n * 60 ? 'selected' : ''} onClick={() => { setDuration(String(n)); setConfirmed(false); setError(''); }}>{n}p</button>)}</div>
      {resets && <label className="reset-notice"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />Dừng và đặt lại phiên này theo thời lượng mới.</label>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="dialog-actions"><button type="button" className="secondary-button" onClick={onClose}>Hủy</button><button className="primary-button" type="submit"><Check size={17}/>Lưu thay đổi</button></div>
    </form>
  </Dialog>;
}
function Toggle({ title, detail, value, onChange }) {
  return <div className="setting-row"><div><strong>{title}</strong><p>{detail}</p></div><button type="button" className="switch" role="switch" aria-checked={value} aria-label={title} onClick={onChange}><span /></button></div>;
}
function Settings({ state, update, close }) {
  const [message, setMessage] = useState('');
  return <Dialog title="Không gian của bạn" onClose={close}>
    <Toggle title="Giao diện sáng" detail="Đổi sắc độ, giữ sự tập trung." value={state.theme === 'light'} onChange={() => update({ theme: state.theme === 'dark' ? 'light' : 'dark' })}/>
    <Toggle title="Âm thanh" detail="Âm báo nhẹ khi hoàn thành." value={state.soundEnabled} onChange={() => update({ soundEnabled: !state.soundEnabled })}/>
    <button className="text-button" onClick={playCompletionSound}><Volume2 size={15}/>Nghe thử âm báo</button>
    <Toggle title="Thông báo" detail="Nhắc khi phiên tập trung kết thúc." value={state.desktopNotifications} onChange={async () => { if (state.desktopNotifications) update({ desktopNotifications: false }); else { const ok = await desktopBridge.requestNotificationPermission(); update({ desktopNotifications: ok }); setMessage(ok ? '' : 'Thông báo chưa được cho phép trong trình duyệt.'); } }}/>
    <Toggle title="Giảm chuyển động" detail="Giữ giao diện tĩnh và nhẹ hơn." value={state.reducedMotion} onChange={() => update({ reducedMotion: !state.reducedMotion })}/>
    {message && <p className="field-help" role="status">{message}</p>}
    <div className="dialog-actions"><button className="primary-button" onClick={close}>Xong<Check size={17}/></button></div>
  </Dialog>;
}
function TimerVisual({ fraction, status, mode, children }) {
  const id = React.useId().replace(/:/g, '');
  return <div className={`timer-visual ${status}`}>
    <svg className="timer-orbit" viewBox="0 0 360 360" aria-hidden="true">
      <circle cx="180" cy="180" r="169" className="orbit-outer"/>
      {Array.from({ length: 60 }, (_, i) => <line key={i} x1="180" y1={i % 5 ? 19 : 16} x2="180" y2="23" transform={`rotate(${i * 6} 180 180)`} className={i % 5 ? 'tick' : 'tick major'} />)}
      <circle cx="180" cy="180" r="145" className="orbit-track"/>
      <circle cx="180" cy="180" r="145" className="orbit-progress" strokeDasharray={2 * Math.PI * 145} strokeDashoffset={2 * Math.PI * 145 * (1 - fraction)} transform="rotate(-90 180 180)"/>
    </svg>
    <div className="timer-face">
      {mode === 'hourglass' ? <svg className="hourglass-art" viewBox="0 0 100 110" aria-label="Đồng hồ cát">
        <defs><clipPath id={id}><path d="M22 12H78V25C78 39 58 45 53 54C58 65 78 70 78 85V98H22V85C22 70 42 65 47 54C42 45 22 39 22 25Z"/></clipPath></defs>
        <g clipPath={`url(#${id})`}><rect x="15" y={54 - fraction * 42} width="70" height={fraction * 42} fill="currentColor" opacity=".7"/><rect x="15" y={98 - (1-fraction)*42} width="70" height={(1-fraction)*42} fill="currentColor"/>{status === 'running' && <path className="sand-stream" d={`M50 54V${98-(1-fraction)*42}`} stroke="currentColor" strokeWidth="2" strokeDasharray="2 4"/>}</g>
        <path d="M22 12H78V25C78 39 58 45 53 54C58 65 78 70 78 85V98H22V85C22 70 42 65 47 54C42 45 22 39 22 25Z" fill="none" stroke="currentColor" strokeOpacity=".4" strokeWidth="2"/><path d="M17 8H83M17 102H83" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
      </svg> : <span className="face-caption"><span className="status-dot"/>{status === 'running' ? 'CỨ TỪ TỐN, BẠN ĐANG TIẾN LÊN' : status === 'completed' ? 'THÊM MỘT BƯỚC TIẾN' : 'MỘT VIỆC. TRỌN SỰ CHÚ Ý.'}</span>}
      {children}
    </div>
  </div>;
}
function MiniTimer({ flow, task, desktop }) {
  const { state, now, windowState } = flow;
  const [corners, setCorners] = useState(false);
  const bar = windowState.mode === 'mini-bar';
  const status = getTaskStatus(task, now);
  const left = getRemainingSeconds(task, now);
  const percent = task ? Math.min(100, Math.max(0, (1 - left / task.goal) * 100)) : 0;
  const toggleLayout = () => { const value = bar ? 'card' : 'bar'; flow.updateSettings({ miniDisplayMode: value }); flow.setMode(`mini-${value}`); };
  return <main className={`mini-host ${desktop ? 'native' : 'web-preview'}`}>
    {!desktop && <div className="preview-caption">Xem trước mini · Trong trang này</div>}
    <section className={`mini-window ${bar ? 'bar' : 'card'}`}>
      <header className="mini-heading drag-region"><span className="mini-task"><span>{task?.emoji || '✦'}</span><span title={task?.name}>{task?.name || 'Chưa có công việc'}</span></span>
        <div className="mini-tools no-drag">{desktop && <IconButton title={windowState.pinned ? 'Bỏ ghim' : 'Ghim trên cùng'} className={windowState.pinned ? 'active' : ''} onClick={flow.togglePin}>{windowState.pinned ? <Pin size={15}/> : <PinOff size={15}/>}</IconButton>}
        <IconButton title={bar ? 'Dạng thẻ' : 'Dạng thanh'} onClick={toggleLayout}><LayoutPanelLeft size={15}/></IconButton>
        {!bar && desktop && <IconButton title="Ghim vào góc màn hình" onClick={() => setCorners(!corners)}><Grip size={15}/></IconButton>}
        <IconButton title="Trở về giao diện đầy đủ" onClick={() => flow.setMode('full')}><Maximize2 size={15}/></IconButton></div>
      </header>
      <div className="mini-body"><div className="mini-time drag-region">{formatRemaining(left)}{!bar && <span><i className={`status-dot ${status}`}/>{STATUS[status]}</span>}</div>
        <button className="mini-play no-drag" disabled={!task || status === 'completed'} onClick={() => flow.toggle(task.id)} aria-label={status === 'running' ? 'Tạm dừng' : 'Bắt đầu'}>{status === 'completed' ? <Check size={22}/> : status === 'running' ? <Pause size={22} fill="currentColor"/> : <Play size={22} fill="currentColor"/>}</button>
      </div>
      <div className="mini-progress"><span style={{ width: `${percent}%` }}/></div>
      {!bar && <footer className="mini-footer"><span>{Math.round(percent)}% hoàn thành</span><span>flow<span className="brand-dot">.</span></span></footer>}
      {corners && <div className="corner-panel no-drag"><div><strong>Đặt ở góc màn hình</strong><IconButton title="Đóng chọn góc" onClick={() => setCorners(false)}><X size={16}/></IconButton></div><div className="corner-grid">{[['top-left','↖ Trên trái'],['top-right','↗ Trên phải'],['bottom-left','↙ Dưới trái'],['bottom-right','↘ Dưới phải']].map(([key,label]) => <button key={key} onClick={async () => { try { await desktopBridge.snapToCorner(key); setCorners(false); } catch (err) { flow.setError(err.message); } }}>{label}</button>)}</div></div>}
      {flow.error && <button className="mini-error" onClick={() => flow.setMode('full')}>Chưa lưu được · Mở để kiểm tra</button>}
    </section>
  </main>;
}
export default function FlowTimer() {
  const flow = useFlowTimer();
  const { state, now } = flow;
  const [editor, setEditor] = useState(null);
  const [settings, setSettings] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const desktop = typeof window !== 'undefined' && !!window.electronAPI;
  const selected = state?.tasks.find(t => t.id === state.selectedTaskId) || state?.tasks[0];
  const running = state?.tasks.find(isTaskRunning);
  const isMini = flow.windowState.mode !== 'full';
  const shown = isMini ? running || selected : selected;
  const color = shown?.color || '#a8c58a';
  const left = getRemainingSeconds(selected, now), status = getTaskStatus(selected, now);
  const fraction = selected ? Math.max(0, Math.min(1, left / selected.goal)) : 1;
  const reduce = state?.reducedMotion;
  const openMini = () => flow.setMode(`mini-${state.miniDisplayMode}`);
  useEffect(() => {
    document.documentElement.dataset.theme = state?.theme || 'dark';
    document.documentElement.dataset.motion = reduce ? 'reduce' : 'auto';
    document.documentElement.style.setProperty('--accent', color);
  }, [color, state?.theme, reduce]);
  useEffect(() => {
    if (!state) return;
    const listener = event => {
      if (event.repeat || event.defaultPrevented || event.target.closest?.('input, textarea, select, button, [contenteditable="true"], dialog') || document.querySelector('dialog[open]')) return;
      if (event.code === 'Space' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault(); const target = isMini ? running || selected : selected; if (target) flow.toggle(target.id);
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.code === 'KeyM') { event.preventDefault(); flow.setMode(isMini ? 'full' : `mini-${state.miniDisplayMode}`); }
    };
    window.addEventListener('keydown', listener); return () => window.removeEventListener('keydown', listener);
  }, [state, isMini, selected, running, flow.toggle, flow.setMode]);
  useEffect(() => { if (!flow.notice) return; const timeout = setTimeout(() => flow.setNotice(''), 7000); return () => clearTimeout(timeout); }, [flow.notice]);
  function reset() {
    if (!selected) return;
    if (isTaskRunning(selected) || selected.sessionId || left < selected.goal) setConfirm({ title: 'Bắt đầu lại phiên này?', text: `Tiến độ hiện tại của “${selected.name}” sẽ về 0.`, action: () => flow.reset(selected.id) });
    else flow.reset(selected.id);
  }
  if (!state) return <div className="loading-screen"><span className="brand">flow<span>.</span></span><p>{flow.error || 'Đang chuẩn bị không gian tập trung…'}</p>{flow.error && <button className="secondary-button" onClick={flow.retrySave}>Thử lại</button>}</div>;
  return <><Head><title>Flow — Một việc. Trọn sự chú ý.</title><meta name="viewport" content="width=device-width, initial-scale=1"/></Head>
    {isMini ? <MiniTimer flow={flow} task={shown} desktop={desktop}/> : <div className="flow-app">
      <header className="app-titlebar drag-region"><div className="brand">flow<span>.</span><span className="brand-subtitle">không gian tập trung</span></div>
        <div className="title-actions no-drag"><span className="local-indicator"><i/>Lưu trên máy</span><IconButton title={state.theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'} onClick={() => flow.updateSettings({ theme: state.theme === 'dark' ? 'light' : 'dark' })}>{state.theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</IconButton><IconButton title="Cài đặt" onClick={() => setSettings(true)}><Settings2 size={18}/></IconButton>
        {desktop && <><span className="title-divider"/><IconButton title="Thu nhỏ cửa sổ" onClick={desktopBridge.minimize}><Minus size={18}/></IconButton><IconButton title="Đóng ứng dụng" className="close-button" onClick={desktopBridge.close}><X size={18}/></IconButton></>}</div>
      </header>
      <div className="workspace">
        <aside className="task-sidebar"><div className="sidebar-label"><span>KẾ HOẠCH CỦA BẠN</span><span className="task-count">{state.tasks.length}</span></div><h2>Từng việc một<span>.</span></h2><p className="sidebar-intro">Dành thời gian cho điều quan trọng.</p>
          <div className="task-list">{state.tasks.map(task => {
            const remaining = getRemainingSeconds(task, now), taskStatus = getTaskStatus(task, now);
            const progress = Math.max(0, Math.min(100, (1 - remaining / task.goal) * 100));
            return <div className={`task-card ${task.id === selected?.id ? 'selected' : ''}`} key={task.id} style={{ '--task-color': task.color }}>
              <button className="task-select" aria-pressed={task.id === selected?.id} onClick={() => flow.select(task.id)}><span className="task-emoji">{task.emoji}</span><span className="task-info"><strong title={task.name}>{task.name}</strong><span>{taskStatus === 'running' ? <><i className="status-dot running"/>Đang chạy</> : taskStatus === 'completed' ? <><Check size={12}/>Hoàn thành</> : `${formatDurationShort(remaining)} còn lại`}</span></span><span className="task-position">{task.id === selected?.id ? <ArrowUpRight size={18}/> : <span className="selection-circle"/>}</span></button>
              <div className="task-under"><div className="task-track"><span style={{ width: `${progress}%` }}/></div><IconButton title={`Sửa ${task.name}`} onClick={() => setEditor({ taskId: task.id })}><Edit3 size={14}/></IconButton><IconButton title={`Xóa ${task.name}`} onClick={() => setConfirm({ title: 'Xóa công việc này?', text: `“${task.name}” sẽ bị xóa${isTaskRunning(task) ? ' và phiên đang chạy sẽ dừng' : ''}.`, action: () => flow.deleteTask(task.id) })}><Trash2 size={14}/></IconButton></div>
            </div>;
          })}</div>
          <button className="add-task" onClick={() => setEditor({ taskId: null })}><Plus size={17}/>Thêm công việc</button>
          <div className="sidebar-bottom"><span className="small-orbit"><Focus size={23}/></span><p>Không cần làm tất cả.<br/><strong>Chỉ cần bắt đầu một việc.</strong></p></div>
        </aside>
        <main className="focus-panel">
          <div className="focus-header"><span className="eyebrow"><span className={`status-dot ${status}`}/>{selected ? STATUS[status] : 'KHÔNG GIAN TRỐNG'}</span><button className="dock-button" onClick={openMini}><LayoutPanelLeft size={16}/><span>{desktop ? 'Đồng hồ nổi' : 'Xem mini'}</span><ArrowUpRight size={14}/></button></div>
          {selected ? <><div className="focus-task-heading"><span className="eyebrow">BÂY GIỜ, CHỈ CẦN TẬP TRUNG VÀO</span><h1 title={selected.name}>{selected.name}</h1><div className="view-switch"><button className={state.visualMode === 'ring' ? 'active' : ''} onClick={() => flow.updateSettings({ visualMode: 'ring' })} aria-pressed={state.visualMode === 'ring'}><Focus size={14}/>Vòng thời gian</button><button className={state.visualMode === 'hourglass' ? 'active' : ''} onClick={() => flow.updateSettings({ visualMode: 'hourglass' })} aria-pressed={state.visualMode === 'hourglass'}><Hourglass size={14}/>Đồng hồ cát</button></div></div>
          <TimerVisual fraction={fraction} status={status} mode={state.visualMode}><div className={`timer-number ${left >= 3600 ? 'long' : ''}`} aria-label={`Còn ${formatRemaining(left)}`}>{formatRemaining(left)}</div><button className="duration-chip" onClick={() => setEditor({ taskId: selected.id, durationOnly: true })}><Clock3 size={13}/><span>Mục tiêu {formatDurationShort(selected.goal)}</span><Edit3 size={12}/></button></TimerVisual>
          <div className="timer-controls"><IconButton title="Đặt lại phiên" className="round-control" onClick={reset}><RotateCcw size={19}/></IconButton><button className="start-button" disabled={status === 'completed'} onClick={() => flow.toggle(selected.id)}>{status === 'running' ? <Pause size={19} fill="currentColor"/> : status === 'completed' ? <Check size={21}/> : <Play size={19} fill="currentColor"/>}{status === 'running' ? 'Tạm dừng' : status === 'completed' ? 'Đã hoàn thành' : status === 'paused' ? 'Tiếp tục' : 'Bắt đầu tập trung'}</button><IconButton title="Đặt thời lượng" className="round-control" onClick={() => setEditor({ taskId: selected.id, durationOnly: true })}><SlidersHorizontal size={19}/></IconButton></div>
          <p className="keyboard-hint"><kbd>space</kbd> để {status === 'running' ? 'tạm dừng' : 'bắt đầu'}<span>·</span>Thời gian dành cho riêng bạn</p>
          {running && running.id !== selected.id && <button className="other-running" onClick={() => flow.select(running.id)}><i className="status-dot running"/><span>{running.name} vẫn đang chạy</span><ArrowUpRight size={15}/></button>}
          <div className="session-summary"><div><span>Thời lượng</span><strong>{formatDurationShort(selected.goal)}</strong></div><div><span>Tiến độ phiên</span><strong>{Math.round((1 - fraction) * 100)}<small>%</small></strong></div><div><span>Trạng thái</span><strong className="summary-status">{status === 'idle' ? 'Sẵn sàng' : status === 'running' ? 'Tập trung' : status === 'paused' ? 'Tạm dừng' : 'Hoàn thành'}</strong></div></div>
          </> : <div className="empty-state"><Focus size={52}/><h1>Một khởi đầu mới.</h1><p>Thêm việc bạn muốn dành thời gian hôm nay.</p><button className="primary-button" onClick={() => setEditor({ taskId: null })}><Plus size={18}/>Tạo công việc đầu tiên</button></div>}
        </main>
      </div>
      <footer className="app-footer"><span><span className="footer-spark">✳</span> Ít xao nhãng hơn. Nhiều khoảng tập trung hơn.</span><button onClick={() => flow.updateSettings({ soundEnabled: !state.soundEnabled })}>{state.soundEnabled ? <Volume2 size={14}/> : <VolumeX size={14}/>}<span>Âm thanh {state.soundEnabled ? 'bật' : 'tắt'}</span></button></footer>
    </div>}
    {flow.error && !isMini && <div className="error-toast" role="alert"><span>{flow.error}</span><button onClick={flow.retrySave}>Thử lưu lại</button></div>}
    {flow.notice && !isMini && <div className="notice-toast" role="status"><Check size={18}/><span>{flow.notice}</span><IconButton title="Ẩn thông báo" onClick={() => flow.setNotice('')}><X size={15}/></IconButton></div>}
    {editor && <TaskEditor key={editor.taskId || 'new'} task={state.tasks.find(t => t.id === editor.taskId)} durationOnly={editor.durationOnly} now={now} onClose={() => setEditor(null)} onSave={flow.saveTask}/>}
    {settings && <Settings state={state} update={flow.updateSettings} close={() => setSettings(false)}/>}
    {confirm && <Dialog title={confirm.title} onClose={() => setConfirm(null)}><p className="confirm-text">{confirm.text}</p><div className="dialog-actions"><button className="secondary-button" onClick={() => setConfirm(null)}>Giữ nguyên</button><button className="primary-button" onClick={() => { confirm.action(); setConfirm(null); }}>Xác nhận</button></div></Dialog>}
  </>;
}
```

## FILE 4: src/hooks/useFlowTimer.js

Thao tác: Tạo mới hoặc thay toàn bộ.

```javascript
import { useEffect, useRef, useState, useCallback } from 'react';
import { checkCompletion, reconcileRestoredTasks, toggleTaskRunning, resetTask, editTask, generateSessionId } from '../lib/timer-engine.js';
import { loadPersistedState, savePersistedState } from '../lib/storage.js';
import { playCompletionSound, playClickSound } from '../lib/sound.js';
import { desktopBridge } from '../lib/desktop-bridge.js';

function settle(state, now) {
  const result = checkCompletion(state.tasks, new Set(state.handledSessionIds), now);
  if (result.updatedTasks === state.tasks) return { state, events: [] };
  return { state: { ...state, tasks: result.updatedTasks,
    handledSessionIds: [...new Set([...state.handledSessionIds, ...result.completionEvents.map(e => e.sessionId)])].slice(-500) },
    events: result.completionEvents };
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
    if (current.current?.desktopNotifications) desktopBridge.sendNotification('Một phiên tập trung đã hoàn thành', events[0].taskName).catch(() => {});
  }, []);
  const persist = useCallback(next => {
    const token = ++serial.current;
    // Desktop IPC writes are serialized by main; browser localStorage writes synchronously.
    const operation = savePersistedState(next).then(() => {
      lastSaved.current = next;
      if (mounted.current && token === serial.current) setError('');
    }).catch(err => {
      if (mounted.current && token === serial.current) setError(`Chưa lưu được: ${err.message}`);
      throw err;
    });
    saving.current = operation;
    operation.catch(() => {});
    return operation;
  }, []);
  const publish = useCallback(next => {
    current.current = next;
    setState(next);
    persist(next);
  }, [persist]);
  const act = useCallback(transform => {
    if (!current.current) return;
    const time = Date.now();
    const result = settle(current.current, time);
    const next = transform(result.state, time);
    publish(next);
    setNow(time);
    notify(result.events);
  }, [publish, notify]);

  useEffect(() => {
    let active = true;
    mounted.current = true;
    const api = window.electronAPI;
    const receive = value => { if (active && value) setWindowState(value); };
    const unsubscribe = api?.onWindowState(receive);
    api?.getWindowState().then(receive).catch(err => active && setError(err.message));
    loadPersistedState().then(saved => {
      if (!active) return;
      const result = reconcileRestoredTasks(saved.tasks, new Set(saved.handledSessionIds), Date.now());
      const next = { ...saved, tasks: result.tasks,
        handledSessionIds: [...new Set([...saved.handledSessionIds, ...result.expiredSessions.map(e => e.sessionId)])].slice(-500) };
      current.current = next; setState(next); setNow(Date.now()); persist(next);
      if (result.expiredSessions.length) setNotice('Phiên trước đã hết giờ trong lúc ứng dụng đóng.');
    }).catch(err => { if (active) setError(`Không mở được dữ liệu. Dữ liệu cũ được giữ nguyên. ${err.message}`); });
    const beforeClose = api?.onBeforeClose(async () => {
      try {
        if (current.current) await persist(current.current);
        api.confirmClose(true);
      } catch { api.confirmClose(false); }
    });
    const flush = () => { if (current.current !== lastSaved.current && current.current) persist(current.current); };
    window.addEventListener('pagehide', flush);
    return () => { active = false; mounted.current = false; unsubscribe?.(); beforeClose?.(); window.removeEventListener('pagehide', flush); };
  }, [persist]);
  useEffect(() => {
    const tick = () => {
      if (!current.current) return;
      const time = Date.now();
      const result = settle(current.current, time);
      if (result.state !== current.current) { publish(result.state); notify(result.events); }
      setNow(previous => Math.floor(previous / 1000) === Math.floor(time / 1000) ? previous : time);
    };
    const interval = setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', tick); window.removeEventListener('focus', tick); };
  }, [publish, notify]);
  const setMode = useCallback(async mode => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.setWindowMode(mode);
        if (!result?.success) throw new Error('Không đổi được cửa sổ.');
        setWindowState(result);
      } else setWindowState(previous => ({ ...previous, mode }));
    } catch (err) { setError(err.message); }
  }, []);
  const toggle = useCallback(id => {
    if (current.current?.soundEnabled) playClickSound();
    act((s, time) => ({ ...s, tasks: toggleTaskRunning(s.tasks, id, time) }));
  }, [act]);
  return { state, now, error, notice, windowState, setNotice, setError, setMode,
    select: id => act(s => ({ ...s, selectedTaskId: id })),
    toggle,
    reset: id => act(s => ({ ...s, tasks: s.tasks.map(t => t.id === id ? resetTask(t) : t) })),
    updateSettings: changes => act(s => ({ ...s, ...changes })),
    saveTask: values => act(s => {
      const exists = s.tasks.some(t => t.id === values.id);
      const task = exists ? null : { ...values, id: generateSessionId().replace('sess_', 'task_'), left: values.goal, runStart: null, endAt: null, sessionId: null };
      return { ...s, tasks: exists ? s.tasks.map(t => t.id === values.id ? editTask(t, values) : t) : [...s.tasks, task],
        selectedTaskId: exists ? s.selectedTaskId : task.id };
    }),
    deleteTask: id => act(s => {
      const tasks = s.tasks.filter(t => t.id !== id);
      return { ...s, tasks, selectedTaskId: s.selectedTaskId === id ? tasks[0]?.id ?? null : s.selectedTaskId };
    }),
    retrySave: () => current.current ? persist(current.current).catch(() => {}) : window.location.reload(),
    togglePin: async () => {
      try {
        const result = await window.electronAPI?.setAlwaysOnTop(!windowState.pinned);
        if (result?.success) { setWindowState(result); act(s => ({ ...s, isPinned: result.pinned })); }
      } catch (err) { setError(err.message); }
    },
  };
}
```

## FILE 5: src/styles/globals.css

Thao tác: Thay toàn bộ CSS cho ứng dụng Flow Timer.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root{color-scheme:dark;--accent:#a8c58a;--bg:#141815;--sidebar:#181d19;--surface:#202621;--raised:#282f29;--text:#ecefe8;--muted:#a2ada0;--subtle:#748171;--line:#ffffff12;--track:#303a30;--shadow:0 24px 70px #0005}
:root[data-theme=light]{color-scheme:light;--bg:#f7f7ef;--sidebar:#efefe5;--surface:#fffef7;--raised:#e7e9dc;--text:#283125;--muted:#596652;--subtle:#6b7862;--line:#23391b1c;--track:#dce1d1;--shadow:0 24px 70px #34412724}
*{box-sizing:border-box}html,body,#__next{margin:0;min-height:100%;width:100%}body{font-family:"Segoe UI",-apple-system,BlinkMacSystemFont,Arial,sans-serif;background:var(--bg);color:var(--text);font-size:14px;line-height:1.5}button,input,select{font:inherit}button{color:inherit;cursor:pointer;border:0;background:none}button,input{-webkit-app-region:no-drag}button{transition:background .2s,color .2s,transform .2s,border-color .2s}button:active:not(:disabled){transform:translateY(1px)}button:disabled{cursor:default;opacity:.6}button:focus-visible,input:focus-visible{outline:2px solid var(--accent);outline-offset:4px}input{min-width:0}h1,h2,p{margin:0}svg{flex-shrink:0}.drag-region{-webkit-app-region:drag;user-select:none}.no-drag{-webkit-app-region:no-drag}::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-thumb{background:var(--track);border-radius:10px}.icon-button{width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;color:var(--muted);border-radius:9px;flex-shrink:0}.icon-button:hover{background:var(--raised);color:var(--text)}.icon-button.active{color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,transparent)}.close-button:hover{background:#c551512b;color:#e47878}
.flow-app{height:100dvh;min-height:360px;display:flex;flex-direction:column;overflow:hidden;background:var(--bg)}.app-titlebar{height:69px;min-height:69px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 28px;gap:12px}.brand{font-size:31px;font-weight:700;letter-spacing:-1.7px;display:flex;align-items:baseline;line-height:1}.brand>span:first-child,.brand-dot{color:var(--accent)}.brand-subtitle{font-weight:400;font-size:11px;letter-spacing:.5px;color:var(--subtle);margin-left:16px}.title-actions{display:flex;align-items:center;gap:7px}.local-indicator{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--subtle);margin-right:15px}.local-indicator i{width:5px;height:5px;background:var(--muted);border-radius:50%}.title-divider{height:18px;width:1px;background:var(--line);margin:0 6px}.workspace{display:grid;grid-template-columns:280px minmax(0,1fr);flex:1;min-height:0}.task-sidebar{background:var(--sidebar);border-right:1px solid var(--line);padding:31px 22px 22px;display:flex;flex-direction:column;min-height:0;overflow:auto}.sidebar-label{display:flex;align-items:center;justify-content:space-between;font-size:9px;letter-spacing:1.7px;font-weight:600;color:var(--subtle)}.task-count{background:var(--surface);color:var(--muted);padding:1px 7px;border:1px solid var(--line);border-radius:5px;letter-spacing:0}.task-sidebar h2{font-size:22px;font-weight:500;letter-spacing:-.6px;margin-top:12px}.task-sidebar h2>span{color:var(--accent)}.sidebar-intro{font-size:11px;color:var(--subtle);margin-top:6px}.task-list{display:flex;flex-direction:column;gap:10px;margin-top:27px}.task-card{border:1px solid var(--line);border-radius:13px;background:color-mix(in srgb,var(--bg) 25%,transparent);transition:border-color .3s,background .3s;flex-shrink:0}.task-card.selected{border-color:color-mix(in srgb,var(--task-color) 48%,var(--line));background:color-mix(in srgb,var(--task-color) 6%,var(--sidebar))}.task-card:hover{background:var(--surface)}.task-select{width:100%;padding:14px 12px 5px;display:flex;align-items:center;text-align:left;gap:10px}.task-emoji{width:34px;height:36px;background:var(--surface);border:1px solid var(--line);border-radius:9px;display:grid;place-items:center;font-size:17px;flex-shrink:0}.task-info{min-width:0;flex:1;display:flex;flex-direction:column;gap:3px}.task-info strong{font-size:13px;font-weight:550;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.task-info>span{font-size:10px;color:var(--muted);display:flex;align-items:center;gap:5px}.task-position{color:var(--task-color)}.selection-circle{display:block;width:12px;height:12px;border:1px solid var(--track);border-radius:50%}.task-under{display:flex;align-items:center;gap:2px;padding:0 9px 7px 13px}.task-track{height:3px;background:var(--track);border-radius:5px;overflow:hidden;flex:1;margin-right:10px}.task-track>span{display:block;background:var(--task-color);height:100%;border-radius:5px;transition:width .4s linear}.task-under .icon-button{width:25px;height:25px;color:var(--subtle)}.task-under .icon-button:hover{color:var(--text)}.add-task{display:flex;align-items:center;justify-content:center;gap:8px;border:1px dashed var(--track);border-radius:11px;min-height:42px;color:var(--muted);font-size:12px;margin-top:14px}.add-task:hover{border-color:var(--accent);color:var(--text);background:var(--surface)}.sidebar-bottom{padding-top:35px;margin-top:auto;display:flex;align-items:center;gap:12px;color:var(--subtle);font-size:10px;line-height:1.9}.sidebar-bottom strong{font-weight:400;color:var(--muted)}.small-orbit{color:var(--subtle)}
.focus-panel{position:relative;padding:25px 35px 24px;overflow:auto;display:flex;flex-direction:column;align-items:center;background:radial-gradient(ellipse at 50% 43%,color-mix(in srgb,var(--accent) 5%,transparent),transparent 62%);transition:background .6s;min-width:0}.focus-header{display:flex;align-items:center;justify-content:space-between;width:100%;gap:10px;margin-bottom:17px}.eyebrow{font-size:9px;letter-spacing:1.4px;font-weight:600;color:var(--subtle);display:flex;align-items:center;gap:7px}.focus-header>.eyebrow{letter-spacing:.6px;font-size:10px}.status-dot{display:inline-block;width:5px;height:5px;background:currentColor;border-radius:50%;color:var(--subtle);flex-shrink:0}.status-dot.running,.running .status-dot{color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 10%,transparent)}.status-dot.completed{color:var(--accent)}.dock-button{display:flex;align-items:center;gap:7px;color:var(--muted);font-size:11px;border:1px solid var(--line);border-radius:8px;padding:7px 10px;background:var(--sidebar)}.dock-button:hover{border-color:var(--accent);color:var(--text)}.focus-task-heading{text-align:center;margin-top:3px}.focus-task-heading>.eyebrow{justify-content:center;font-size:8px;letter-spacing:1.9px}.focus-task-heading h1{font-size:29px;font-weight:500;letter-spacing:-.6px;line-height:1.3;margin:8px 0 15px;max-width:480px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.view-switch{display:inline-flex;padding:3px;border-radius:8px;background:var(--sidebar);border:1px solid var(--line);gap:3px}.view-switch button{display:flex;align-items:center;gap:6px;padding:5px 8px;font-size:9px;color:var(--subtle);border-radius:5px}.view-switch button.active{background:var(--raised);color:var(--text)}.timer-visual{position:relative;width:min(100%,340px);aspect-ratio:1;flex-shrink:0;margin:13px auto 10px}.timer-orbit{position:absolute;inset:0;width:100%;height:100%;fill:none}.orbit-outer{stroke:var(--line);stroke-width:1}.tick{stroke:var(--track);stroke-width:1}.tick.major{stroke:var(--subtle)}.orbit-track{stroke:var(--track);stroke-width:2}.orbit-progress{stroke:var(--accent);stroke-width:3;stroke-linecap:round;transition:stroke-dashoffset .65s linear,stroke .6s;filter:drop-shadow(0 0 5px color-mix(in srgb,var(--accent) 20%,transparent))}.timer-face{position:absolute;inset:17%;display:flex;align-items:center;justify-content:center;flex-direction:column}.face-caption{font-size:6.7px;letter-spacing:1.35px;color:var(--subtle);display:flex;align-items:center;gap:6px;white-space:nowrap;margin-bottom:15px}.face-caption .status-dot{width:4px;height:4px}.timer-number{font-variant-numeric:tabular-nums;font-size:71px;letter-spacing:-4px;font-weight:300;line-height:1.15;color:var(--text);white-space:nowrap}.timer-number.long{font-size:48px;letter-spacing:-2.3px}.duration-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 8px;margin-top:14px;font-size:9px;color:var(--muted);border-radius:20px;background:var(--sidebar);border:1px solid var(--line)}.duration-chip:hover{color:var(--text);border-color:var(--accent)}.timer-controls{display:flex;align-items:center;justify-content:center;gap:15px}.round-control{width:43px;height:43px;border:1px solid var(--line);border-radius:50%;background:var(--sidebar)}.start-button{display:flex;align-items:center;justify-content:center;gap:10px;min-width:207px;height:48px;background:var(--accent);color:#152315;border-radius:25px;font-size:13px;font-weight:600;box-shadow:0 4px 22px color-mix(in srgb,var(--accent) 10%,transparent);transition:background .45s,box-shadow .3s,transform .2s}.start-button:hover:not(:disabled){box-shadow:0 5px 28px color-mix(in srgb,var(--accent) 22%,transparent);transform:translateY(-1px)}.keyboard-hint{display:flex;align-items:center;gap:6px;color:var(--subtle);font-size:9px;margin-top:16px}.keyboard-hint>span{margin:0 3px}kbd{font:inherit;font-size:8px;background:var(--sidebar);border:1px solid var(--line);padding:1px 5px;border-radius:4px}.session-summary{margin-top:27px;display:grid;grid-template-columns:repeat(3,1fr);width:min(100%,430px);border-top:1px solid var(--line);padding-top:19px;flex-shrink:0}.session-summary>div{text-align:center;border-right:1px solid var(--line)}.session-summary>div:last-child{border:0}.session-summary span{display:block;color:var(--subtle);font-size:9px;margin-bottom:5px}.session-summary strong{font-size:19px;font-weight:400;letter-spacing:-.4px}.session-summary strong small{font-size:12px;margin-left:2px;color:var(--muted)}.session-summary strong.summary-status{font-size:13px;letter-spacing:0;color:var(--muted);line-height:28px}.other-running{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:11px;background:var(--surface);border-radius:8px;padding:8px 13px;margin-top:13px;max-width:100%}.other-running>span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.app-footer{height:39px;min-height:39px;border-top:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 26px;color:var(--subtle);font-size:9px;gap:8px}.footer-spark{color:var(--accent);font-size:13px;margin-right:5px}.app-footer button{display:flex;align-items:center;gap:6px;font-size:9px}.app-footer button:hover{color:var(--text)}.hourglass-art{width:52px;height:57px;color:var(--accent);margin-bottom:6px}.hourglass-art~.timer-number{font-size:43px;letter-spacing:-2px}.hourglass-art~.timer-number.long{font-size:35px}.hourglass-art~.duration-chip{margin-top:7px}.sand-stream{animation:sand-fall 1s linear infinite}@keyframes sand-fall{to{stroke-dashoffset:-18}}.completed .timer-face{animation:finish .6s ease-out}@keyframes finish{from{transform:scale(.96);opacity:.6}to{transform:scale(1);opacity:1}}.empty-state{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;text-align:center;min-height:320px;color:var(--muted)}.empty-state>svg{color:var(--accent)}.empty-state h1{font-size:28px;font-weight:400;color:var(--text)}.empty-state p{font-size:12px}.loading-screen{height:100dvh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:24px;padding:25px}.loading-screen p{color:var(--muted);max-width:480px;text-align:center}
/* Dialogs keep native keyboard focus, Escape and return-focus behavior. */
.flow-dialog{width:min(460px,calc(100vw - 32px));max-height:calc(100dvh - 36px);overflow:auto;margin:auto;padding:25px;border:1px solid var(--line);border-radius:18px;background:var(--sidebar);color:var(--text);box-shadow:var(--shadow)}.flow-dialog::backdrop{background:#070c09a8;backdrop-filter:blur(6px)}.flow-dialog[open]{animation:dialog-enter .18s ease-out}@keyframes dialog-enter{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}.dialog-heading{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:23px}.dialog-heading h2{font-size:21px;letter-spacing:-.4px;font-weight:500}.field{display:flex;flex-direction:column;gap:8px;font-size:11px;color:var(--muted);margin-top:17px}.field input{width:100%;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--text);padding:11px 12px;font-size:14px}.field input::placeholder{color:var(--subtle);font-size:12px}.field-help{font-size:10px;color:var(--subtle);margin-top:8px}.editor-details{display:grid;grid-template-columns:90px 1fr;gap:20px}.swatches{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-height:43px}.swatch{width:26px;height:26px;border-radius:50%;color:#172415;display:grid;place-items:center;border:2px solid transparent}.swatch[aria-pressed=true]{box-shadow:0 0 0 2px var(--sidebar),0 0 0 3px var(--muted)}.preset-row{display:flex;gap:7px;margin-top:16px}.preset-row button{flex:1;padding:7px 4px;font-size:11px;border:1px solid var(--line);border-radius:7px;color:var(--muted)}.preset-row button:hover,.preset-row button.selected{border-color:var(--accent);color:var(--text);background:color-mix(in srgb,var(--accent) 8%,transparent)}.dialog-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:25px}.primary-button,.secondary-button{padding:10px 16px;border-radius:9px;font-size:12px;font-weight:500;display:inline-flex;align-items:center;justify-content:center;gap:8px}.primary-button{background:var(--accent);color:#152315}.secondary-button{border:1px solid var(--line);color:var(--muted);background:var(--surface)}.secondary-button:hover{color:var(--text)}.reset-notice{display:flex;align-items:flex-start;gap:9px;margin-top:17px;font-size:11px;color:var(--muted);background:var(--surface);padding:12px;border-radius:8px}.reset-notice input{margin-top:2px;accent-color:var(--accent)}.form-error{margin-top:12px;font-size:11px;color:#ef8b81}.setting-row{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:18px 0;border-bottom:1px solid var(--line)}.setting-row strong{font-size:12px;font-weight:500}.setting-row p{font-size:10px;color:var(--subtle);margin-top:4px}.switch{height:24px;width:43px;border-radius:15px;background:var(--track);padding:3px;flex-shrink:0}.switch span{display:block;width:18px;height:18px;background:var(--muted);border-radius:50%;transition:transform .2s}.switch[aria-checked=true]{background:var(--accent)}.switch[aria-checked=true] span{background:#172415;transform:translateX(19px)}.text-button{display:flex;align-items:center;gap:7px;color:var(--muted);font-size:10px;padding:9px 0}.confirm-text{color:var(--muted);line-height:1.8;font-size:13px}.notice-toast,.error-toast{position:fixed;z-index:100;bottom:52px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:12px;max-width:calc(100vw - 36px);background:var(--raised);border:1px solid var(--line);border-radius:13px;padding:10px 15px;color:var(--text);box-shadow:var(--shadow);font-size:12px}.notice-toast>svg{color:var(--accent)}.error-toast{border-color:#d77a70;z-index:110}.error-toast button{white-space:nowrap;text-decoration:underline;font-size:11px}
/* Mini uses exactly the same task state as full. Dimensions match electron/main.js. */
.mini-host{height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--bg);overflow:hidden}.mini-host.native{padding:0}.mini-host.web-preview{background:radial-gradient(circle at 50% 45%,color-mix(in srgb,var(--accent) 8%,var(--bg)),var(--bg) 65%);padding:12px}.preview-caption{font-size:10px;color:var(--subtle);margin-bottom:20px}.mini-window{position:relative;background:var(--sidebar);border:1px solid var(--line);border-radius:15px;overflow:hidden;display:flex;flex-direction:column;padding:14px 17px;box-shadow:var(--shadow)}.mini-window.card{width:344px;height:224px;max-width:100%}.mini-window.bar{width:390px;height:84px;max-width:100%;border-radius:12px;padding:10px 13px}.native .mini-window{width:100%;height:100%;border-radius:0;box-shadow:none}.mini-heading{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-shrink:0}.mini-task{display:flex;align-items:center;gap:8px;font-size:11px;min-width:0}.mini-task>span:first-child{font-size:17px}.mini-task>span:last-child{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mini-tools{display:flex;gap:1px;flex-shrink:0}.mini-tools .icon-button{width:26px;height:26px;border-radius:7px}.mini-body{display:flex;align-items:center;justify-content:space-between;flex:1;gap:15px;padding:12px 0}.mini-time{font-size:46px;line-height:1;letter-spacing:-2px;font-weight:350;font-variant-numeric:tabular-nums}.mini-time>span{display:flex;align-items:center;gap:7px;font-size:10px;letter-spacing:.1px;color:var(--muted);margin-top:12px}.mini-play{width:45px;height:45px;border-radius:50%;display:grid;place-items:center;background:var(--accent);color:#142314;flex-shrink:0}.mini-play:hover{filter:brightness(1.07)}.mini-progress{height:3px;background:var(--track);width:100%;border-radius:4px;overflow:hidden;flex-shrink:0}.mini-progress>span{display:block;background:var(--accent);height:100%;transition:width .7s linear}.mini-footer{display:flex;align-items:center;justify-content:space-between;margin-top:12px;color:var(--subtle);font-size:9px}.mini-footer>span:last-child{font-size:17px;font-weight:650;letter-spacing:-1px;color:var(--muted)}.bar .mini-heading{position:absolute;top:7px;left:13px;right:55px}.bar .mini-task{font-size:9px;max-width:175px}.bar .mini-task>span:first-child{font-size:12px}.bar .mini-tools{position:absolute;right:0;top:16px}.bar .mini-body{padding:16px 0 5px}.bar .mini-time{font-size:29px;letter-spacing:-1px}.bar .mini-play{width:33px;height:33px}.bar .mini-play svg{width:17px}.bar .mini-progress{height:2px}.corner-panel{position:absolute;inset:0;background:var(--sidebar);z-index:5;padding:16px}.corner-panel>div:first-child{display:flex;align-items:center;justify-content:space-between;font-size:11px;margin-bottom:13px}.corner-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.corner-grid button{padding:14px 5px;border:1px solid var(--line);border-radius:8px;font-size:11px;color:var(--muted)}.corner-grid button:hover{background:var(--raised);color:var(--text)}.mini-error{position:absolute;bottom:0;left:0;right:0;background:#713b34;color:white;font-size:10px;padding:4px;z-index:6}
@media(min-height:850px) and (min-width:760px){.focus-panel{justify-content:center}.focus-header{position:absolute;top:25px;left:35px;width:calc(100% - 70px)}.timer-visual{width:380px;margin-top:22px;margin-bottom:18px}.timer-number{font-size:82px}.timer-number.long{font-size:55px}.focus-task-heading h1{font-size:35px}.session-summary{margin-top:34px}.task-sidebar{padding-top:38px}}
@media(max-width:850px){.workspace{grid-template-columns:230px minmax(0,1fr)}.task-sidebar{padding:25px 15px}.focus-panel{padding:20px}.timer-visual{width:300px}.timer-number{font-size:62px}.timer-number.long{font-size:43px}.focus-task-heading h1{max-width:320px}.face-caption{font-size:5.8px;letter-spacing:1px}.start-button{min-width:175px}.timer-controls{gap:10px}.brand-subtitle{display:none}.local-indicator{margin-right:5px}.session-summary{margin-top:22px}}
@media(max-width:640px){.app-titlebar{padding:0 17px;height:56px;min-height:56px}.brand{font-size:28px}.local-indicator{display:none}.workspace{display:flex;flex-direction:column;overflow:auto;flex:1}.task-sidebar{border-right:0;border-bottom:1px solid var(--line);padding:16px;overflow:visible;flex-shrink:0}.sidebar-label{font-size:8px}.task-sidebar h2,.sidebar-intro,.sidebar-bottom{display:none}.task-list{display:grid;grid-auto-flow:column;grid-auto-columns:200px;gap:8px;margin-top:11px;overflow:auto;padding-bottom:3px}.task-select{padding:10px 10px 3px}.task-under{padding-bottom:4px}.task-info strong{font-size:12px}.add-task{min-height:32px;font-size:10px;margin-top:8px}.focus-panel{flex-shrink:0;overflow:visible;min-height:590px;padding:18px 20px 24px}.focus-header{margin-bottom:20px}.timer-visual{width:300px}.focus-task-heading h1{font-size:26px;max-width:calc(100vw - 50px)}.app-footer{padding:0 14px;min-height:32px;height:32px;font-size:8px}.app-footer button{font-size:8px}.timer-number.long{font-size:43px}.session-summary{max-width:340px}.flow-dialog{padding:20px}.mini-host .mini-window.bar{min-width:0}.keyboard-hint{font-size:8px}}
@media(max-height:690px) and (min-width:641px){.app-titlebar{height:54px;min-height:54px}.focus-panel{padding-top:16px}.focus-header{margin-bottom:9px}.focus-task-heading h1{font-size:25px;margin:5px 0 9px}.timer-visual{width:260px;margin:8px auto}.timer-number{font-size:56px}.timer-number.long{font-size:37px}.face-caption{font-size:5px;letter-spacing:.9px;margin-bottom:10px}.duration-chip{font-size:8px;margin-top:10px}.start-button{height:43px}.keyboard-hint{margin-top:10px}.session-summary{margin-top:18px;padding-top:12px}.app-footer{height:32px;min-height:32px}}
:root[data-motion=reduce] *, :root[data-motion=reduce] *::before, :root[data-motion=reduce] *::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
```

## FILE 6: src/lib/timer-engine.js

Thao tác: Thay toàn bộ.

```javascript
/**
 * Timer Engine - Bộ máy đếm ngược thời gian thực
 */

export const TIMER_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
};

export const DEFAULT_TASKS = [
  { id: 'english', name: 'Tiếng Anh', emoji: '🇬🇧', color: '#60a5fa', goal: 90 * 60, left: 90 * 60, runStart: null, endAt: null, sessionId: null, completedSessions: [] },
  { id: 'thesis',  name: 'Khóa luận', emoji: '🎓', color: '#c084fc', goal: 150 * 60, left: 150 * 60, runStart: null, endAt: null, sessionId: null, completedSessions: [] },
  { id: 'coding',  name: 'Lập trình', emoji: '💻', color: '#4ade80', goal: 120 * 60, left: 120 * 60, runStart: null, endAt: null, sessionId: null, completedSessions: [] },
  { id: 'reading', name: 'Đọc sách',  emoji: '📖', color: '#fb923c', goal: 45 * 60, left: 45 * 60, runStart: null, endAt: null, sessionId: null, completedSessions: [] },
];

export const PALETTE = [
  '#60a5fa', // Blue
  '#c084fc', // Purple
  '#4ade80', // Green
  '#fb923c', // Orange
  '#f472b6', // Pink
  '#38bdf8', // Sky
  '#e879f9', // Fuchsia
  '#a3e635', // Lime
];

export function generateSessionId() {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getTodayDateString() {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(new Date());
  } catch (e) {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

export const isTaskRunning = task => Number.isFinite(task?.runStart);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function getRemainingSeconds(task, now = Date.now()) {
  if (!task) return 0;
  const goal = Number.isFinite(task.goal) && task.goal > 0 ? task.goal : 0;
  const left = Number.isFinite(task.left) ? clamp(task.left, 0, goal) : goal;
  if (!isTaskRunning(task)) return left;
  const deadline = Number.isFinite(task.endAt) ? task.endAt : task.runStart + left * 1000;
  // Prevent a backwards system-clock jump from adding more time than this segment began with.
  return clamp((deadline - now) / 1000, 0, left);
}
export function getTaskStatus(task, now = Date.now()) {
  if (!task) return TIMER_STATUS.IDLE;
  if (getRemainingSeconds(task, now) <= 0) return TIMER_STATUS.COMPLETED;
  if (isTaskRunning(task)) return TIMER_STATUS.RUNNING;
  return task.left < task.goal || task.sessionId ? TIMER_STATUS.PAUSED : TIMER_STATUS.IDLE;
}
export function pauseTask(task, now = Date.now()) {
  if (!isTaskRunning(task)) return task;
  return { ...task, left: getRemainingSeconds(task, now), runStart: null, endAt: null };
}
export function startTask(task, now = Date.now()) {
  if (!task || isTaskRunning(task)) return task;
  const left = getRemainingSeconds(task, now);
  if (left <= 0) return task;
  return { ...task, left, runStart: now, endAt: now + left * 1000,
    sessionId: task.sessionId || generateSessionId() };
}
export function resetTask(task) {
  return task ? { ...task, left: task.goal, runStart: null, endAt: null, sessionId: null } : task;
}
export function editTask(task, changes) {
  if (!task) return task;
  const goal = changes.goal ?? task.goal;
  if (!Number.isFinite(goal) || goal < 1 || goal > 86400) throw new Error('Thời lượng không hợp lệ.');
  const updated = { ...task, ...changes, id: task.id, goal };
  return goal === task.goal ? updated : resetTask(updated);
}
export function toggleTaskRunning(tasks, targetTaskId, now = Date.now()) {
  const target = tasks.find(t => t.id === targetTaskId);
  // Starting a completed task must not pause another task.
  if (!target || getRemainingSeconds(target, now) <= 0) return tasks;
  if (isTaskRunning(target)) return tasks.map(t => t.id === targetTaskId ? pauseTask(t, now) : t);
  return tasks.map(t => t.id === targetTaskId ? startTask(t, now) : pauseTask(t, now));
}
export function checkCompletion(tasks, handledSessionIds = new Set(), now = Date.now()) {
  const completionEvents = [];
  let changed = false;
  const seen = new Set(handledSessionIds);
  const updatedTasks = tasks.map(t => {
    if (!isTaskRunning(t) || getRemainingSeconds(t, now) > 0) return t;
    changed = true;
    if (t.sessionId && !seen.has(t.sessionId)) {
      seen.add(t.sessionId);
      completionEvents.push({ taskId: t.id, taskName: t.name, sessionId: t.sessionId,
        timestamp: t.endAt ?? (t.runStart + t.left * 1000) });
    }
    return { ...t, left: 0, runStart: null, endAt: null };
  });
  return { updatedTasks: changed ? updatedTasks : tasks,
    completionEvent: completionEvents[0] || null, completionEvents };
}
export function reconcileRestoredTasks(savedTasks, handledSessionIds = new Set(), now = Date.now()) {
  const result = checkCompletion(savedTasks || [], handledSessionIds, now);
  let hasRunning = false;
  const tasks = result.updatedTasks.map(t => {
    if (!isTaskRunning(t)) return t;
    if (hasRunning) return pauseTask(t, now);
    hasRunning = true;
    const left = getRemainingSeconds(t, now);
    return { ...t, left, runStart: now, endAt: now + left * 1000 };
  });
  return { tasks, expiredSessions: result.completionEvents.map(e => ({ ...e, completedWhileClosed: true })) };
}
```

## FILE 7: src/lib/time-parser.js

Thao tác: Thay toàn bộ.

```javascript
export const PRESETS = [
  { label: '15p', minutes: 15, seconds: 15 * 60 },
  { label: '25p (Pomo)', minutes: 25, seconds: 25 * 60 },
  { label: '45p', minutes: 45, seconds: 45 * 60 },
  { label: '60p (1h)', minutes: 60, seconds: 60 * 60 },
  { label: '90p (1h30)', minutes: 90, seconds: 90 * 60 },
];

export const MAX_DURATION_SECONDS = 24 * 3600;

export function parseDuration(raw) {
  if (raw === null || raw === undefined) {
    return { success: false, error: 'Vui lòng nhập thời lượng.' };
  }

  const str = String(raw).trim();
  if (!str) {
    return { success: false, error: 'Thời lượng không được để trống.' };
  }

  const colonCount = (str.match(/:/g) || []).length;
  if (colonCount > 1) {
    return {
      success: false,
      error: 'Định dạng không hợp lệ. Vui lòng nhập số phút (vd: 90) hoặc giờ:phút (vd: 1:30).'
    };
  }

  let totalMinutes = 0;

  if (colonCount === 1) {
    const parts = str.split(':');
    const hStr = parts[0].trim();
    const mStr = parts[1].trim();

    if (!/^\d+$/.test(hStr) || !/^\d+$/.test(mStr)) {
      return {
        success: false,
        error: 'Giờ và phút chỉ được chứa chữ số (vd: 1:30 hoặc 0:45).'
      };
    }

    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);

    if (m < 0 || m > 59) {
      return {
        success: false,
        error: 'Phút phải từ 00 đến 59.'
      };
    }

    totalMinutes = h * 60 + m;
  } else {
    if (!/^\d+(\.\d+)?$/.test(str)) {
      return {
        success: false,
        error: 'Vui lòng chỉ nhập số phút (vd: 90) hoặc giờ:phút (vd: 1:30).'
      };
    }

    totalMinutes = parseFloat(str);
  }

  if (isNaN(totalMinutes) || totalMinutes <= 0) {
    return {
      success: false,
      error: 'Thời lượng phải lớn hơn 0.'
    };
  }

  const totalSeconds = Math.round(totalMinutes * 60);

  if (!Number.isFinite(totalSeconds) || totalSeconds < 1 || totalSeconds > MAX_DURATION_SECONDS) {
    return {
      success: false,
      error: 'Thời lượng phải từ 1 giây đến 24 giờ.'
    };
  }

  return {
    success: true,
    seconds: totalSeconds
  };
}

export function formatRemaining(seconds) {
  const s = Math.max(0, Math.ceil(Number.isFinite(seconds) ? seconds : 0));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  const pad = (n) => String(n).padStart(2, '0');

  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

export function formatDurationShort(seconds) {
  const minutes = Math.max(0, Math.round((Number.isFinite(seconds) ? seconds : 0) / 60));
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hrs > 0 && mins > 0) {
    return `${hrs}h${String(mins).padStart(2, '0')}`;
  } else if (hrs > 0) {
    return `${hrs}h`;
  }
  return `${mins}p`;
}

export function formatDurationVietnamese(seconds) {
  const minutes = Math.max(0, Math.round((Number.isFinite(seconds) ? seconds : 0) / 60));
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hrs > 0 && mins > 0) {
    return `${hrs} giờ ${mins} phút`;
  } else if (hrs > 0) {
    return `${hrs} giờ`;
  }
  return `${mins} phút`;
}
```

## FILE 8: src/lib/storage.js

Thao tác: Thay toàn bộ.

```javascript
import { DEFAULT_TASKS, getTodayDateString, generateSessionId } from './timer-engine.js';
export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'flow_timer_app_data_v1';
export const DEFAULT_STATE = {
  version: SCHEMA_VERSION, tasks: DEFAULT_TASKS, selectedTaskId: 'english', theme: 'dark',
  soundEnabled: true, desktopNotifications: false, reducedMotion: false,
  miniDisplayMode: 'card', isPinned: true, handledSessionIds: [], visualMode: 'ring',
};
const text = (value, fallback, max = 100) => typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export function sanitizeLoadedState(raw) {
  raw = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const ids = new Set();
  const tasks = (Array.isArray(raw.tasks) ? raw.tasks : DEFAULT_TASKS).map((value, i) => {
    const t = value && typeof value === 'object' ? value : {};
    let id = text(t.id, `task_recovered_${i}`);
    while (ids.has(id)) id += '_copy';
    ids.add(id);
    const goal = Number.isFinite(t.goal) && t.goal >= 1 ? clamp(t.goal, 1, 86400) : 1500;
    const left = Number.isFinite(t.left) ? clamp(t.left, 0, goal) : goal;
    const runStart = Number.isFinite(t.runStart) && t.runStart >= 0 ? t.runStart : null;
    return { ...t, id, name: text(t.name, 'Công việc'), emoji: text(t.emoji, '◷', 12),
      color: /^#[0-9a-f]{6}$/i.test(t.color) ? t.color : '#a8c58a', goal, left, runStart,
      endAt: runStart !== null ? (Number.isFinite(t.endAt) ? t.endAt : runStart + left * 1000) : null,
      sessionId: text(t.sessionId, runStart !== null ? generateSessionId() : null) };
  });
  return { ...raw, version: SCHEMA_VERSION, date: text(raw.date, getTodayDateString()), tasks,
    selectedTaskId: ids.has(raw.selectedTaskId) ? raw.selectedTaskId : tasks[0]?.id ?? null,
    theme: raw.theme === 'light' ? 'light' : 'dark', soundEnabled: raw.soundEnabled !== false,
    desktopNotifications: raw.desktopNotifications === true, reducedMotion: raw.reducedMotion === true,
    miniDisplayMode: raw.miniDisplayMode === 'bar' ? 'bar' : 'card', isPinned: raw.isPinned !== false,
    visualMode: raw.visualMode === 'hourglass' ? 'hourglass' : 'ring',
    handledSessionIds: Array.isArray(raw.handledSessionIds) ? raw.handledSessionIds.filter(x => typeof x === 'string').slice(-500) : [] };
}
export async function loadPersistedState() {
  if (typeof window === 'undefined') return sanitizeLoadedState(null);
  if (window.electronAPI) {
    const result = await window.electronAPI.loadData();
    if (result?.success === false) throw new Error(result.error || 'Không thể đọc dữ liệu.');
    return sanitizeLoadedState(result?.success === true ? result.data : result);
  }
  const value = window.localStorage.getItem(STORAGE_KEY);
  return sanitizeLoadedState(value ? JSON.parse(value) : null);
}
// Each mutation is persisted immediately. No trailing debounce that can lose the last action.
export async function savePersistedState(state) {
  if (typeof window === 'undefined') return;
  const data = sanitizeLoadedState(state);
  if (window.electronAPI) {
    const result = await window.electronAPI.saveData(data);
    if (!result?.success) throw new Error(result?.error || 'Không thể lưu dữ liệu.');
  } else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
```

## FILE 9: src/lib/desktop-bridge.js

Thao tác: Thay toàn bộ.

```javascript
export const isDesktopApp = () => typeof window !== 'undefined' && !!window.electronAPI;
export const desktopBridge = {
  isDesktop: isDesktopApp,
  setWindowMode: mode => window.electronAPI?.setWindowMode(mode),
  setAlwaysOnTop: pinned => window.electronAPI?.setAlwaysOnTop(pinned),
  snapToCorner: corner => window.electronAPI?.snapToCorner(corner),
  minimize: () => window.electronAPI?.minimize(),
  close: () => window.electronAPI?.close(),
  async sendNotification(title, body) {
    if (isDesktopApp()) return window.electronAPI.notify(title, body);
    if ('Notification' in window && Notification.permission === 'granted') {
      try { new Notification(title, { body }); } catch { /* optional browser capability */ }
    }
  },
  async requestNotificationPermission() {
    if (isDesktopApp()) return true;
    if (!('Notification' in window)) return false;
    try { return await Notification.requestPermission() === 'granted'; } catch { return false; }
  }
};
```

## FILE 10: src/lib/package.json

Thao tác: Tạo file này để xác định các module JS trong src/lib là ESM; nếu đã có package.json ở đây, chỉ hợp nhất type: module.

```json
{"type":"module"}
```

## FILE 11: electron/main.js

Thao tác: Thay toàn bộ.

```javascript
const { app, BrowserWindow, ipcMain, screen, Notification, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { fitBounds, cornerBounds } = require('./window-geometry.cjs');
const DEV_URL = 'http://127.0.0.1:3000';
const isDev = !app.isPackaged && process.argv.includes('--dev');
const indexPath = path.join(__dirname, '../out/index.html');
const indexURL = pathToFileURL(indexPath).href;
const SIZES = {
  full: { width: 1080, height: 760, minWidth: 520, minHeight: 480 },
  'mini-card': { width: 344, height: 224, minWidth: 344, minHeight: 224 },
  'mini-bar': { width: 390, height: 84, minWidth: 390, minHeight: 84 },
};
let win, mode = 'full', pinned = true, bounds = {}, quitting = false, closePending = false, allowClose = false;
let moveTimer;
const file = name => path.join(app.getPath('userData'), name);
function readJSON(name) {
  const target = file(name);
  if (!fs.existsSync(target)) return null;
  return JSON.parse(fs.readFileSync(target, 'utf8'));
}
function atomicWrite(name, data) {
  const target = file(name), temp = target + '.tmp';
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(temp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(temp, target);
}
function allowedURL(value) {
  try {
    const url = new URL(value);
    if (isDev) return url.origin === DEV_URL && url.pathname === '/';
    url.hash = ''; url.search = '';
    return url.href === indexURL;
  } catch { return false; }
}
function trusted(event) {
  return win && !win.isDestroyed() && event.sender === win.webContents &&
    event.senderFrame === win.webContents.mainFrame && allowedURL(event.senderFrame.url);
}
function snapshot() { return { mode, pinned, alwaysOnTop: !!win?.isAlwaysOnTop() }; }
function broadcast() {
  if (win && !win.isDestroyed()) win.webContents.send('window:state', snapshot());
}
function remember() {
  if (!win || win.isDestroyed()) return;
  bounds[mode] = win.getBounds();
  try { atomicWrite('flow_window_state.json', { mode, pinned, bounds }); }
  catch (error) { console.error('Không thể lưu vị trí cửa sổ:', error.message); }
}
function clampWindow() {
  if (!win || win.isDestroyed()) return;
  const area = screen.getDisplayMatching(win.getBounds()).workArea;
  const size = SIZES[mode];
  win.setMinimumSize(Math.min(size.minWidth, area.width), Math.min(size.minHeight, area.height));
  win.setBounds(fitBounds(win.getBounds(), area, size));
}
function setWindowMode(nextMode) {
  if (!Object.hasOwn(SIZES, nextMode)) throw new Error('Chế độ cửa sổ không hợp lệ.');
  if (!win || win.isDestroyed()) throw new Error('Cửa sổ đã đóng.');
  if (nextMode !== mode) {
    bounds[mode] = win.getBounds();
    const old = win.getBounds();
    mode = nextMode;
    const size = SIZES[mode];
    const proposed = bounds[mode] || { ...old, width: size.width, height: size.height };
    const area = screen.getDisplayMatching(proposed).workArea;
    win.setResizable(true);
    win.setMinimumSize(Math.min(size.minWidth, area.width), Math.min(size.minHeight, area.height));
    win.setBounds(fitBounds(proposed, area, size));
    win.setResizable(mode === 'full');
  }
  win.setAlwaysOnTop(mode !== 'full' && pinned);
  remember(); broadcast();
  return { success: true, ...snapshot() };
}
function handle(channel, fn) {
  ipcMain.handle(channel, (event, ...args) => {
    if (!trusted(event)) throw new Error('Nguồn yêu cầu không hợp lệ.');
    return fn(...args);
  });
}
handle('window:get-state', snapshot);
handle('window:set-mode', setWindowMode);
handle('window:set-always-on-top', value => {
  if (typeof value !== 'boolean') throw new Error('Trạng thái ghim không hợp lệ.');
  pinned = value;
  win.setAlwaysOnTop(mode !== 'full' && pinned);
  remember(); broadcast();
  return { success: true, ...snapshot() };
});
handle('window:snap-corner', corner => {
  const current = win.getBounds();
  const area = screen.getDisplayMatching(current).workArea;
  win.setBounds(cornerBounds(current, area, corner)); remember();
  return { success: true };
});
handle('storage:load', () => {
  try { return { success: true, data: readJSON('flow_timer_data.json') }; }
  catch (error) { return { success: false, error: `Không đọc được dữ liệu đã lưu: ${error.message}` }; }
});
handle('storage:save', data => {
  try {
    if (!data || !Array.isArray(data.tasks) || data.version !== 1) throw new Error('Dữ liệu không hợp lệ.');
    const serialized = JSON.stringify(data);
    if (Buffer.byteLength(serialized) > 5 * 1024 * 1024) throw new Error('Dữ liệu quá lớn.');
    atomicWrite('flow_timer_data.json', data);
    return { success: true };
  } catch (error) { return { success: false, error: error.message }; }
});
handle('notification:send', ({ title, body } = {}) => {
  if (!Notification.isSupported()) return false;
  new Notification({ title: String(title || 'Flow').slice(0, 120), body: String(body || '').slice(0, 500), silent: true }).show();
  return true;
});
ipcMain.on('window:minimize', event => { if (trusted(event)) win.minimize(); });
ipcMain.on('window:close', event => { if (trusted(event)) win.close(); });
ipcMain.on('window:close-ready', (event, success) => {
  if (!trusted(event) || !closePending) return;
  closePending = false;
  if (success !== true) { quitting = false; return; }
  allowClose = true; remember(); win.close();
});
function createWindow() {
  try {
    const saved = readJSON('flow_window_state.json');
    if (saved) {
      mode = Object.hasOwn(SIZES, saved.mode) ? saved.mode : 'full';
      pinned = saved.pinned !== false;
      bounds = saved.bounds && typeof saved.bounds === 'object' ? saved.bounds : {};
    }
  } catch { /* Window placement can be recovered without modifying timer data. */ }
  const size = SIZES[mode];
  const proposed = bounds[mode] || size;
  const area = Number.isFinite(proposed.x) && Number.isFinite(proposed.y)
    ? screen.getDisplayNearestPoint({ x: proposed.x, y: proposed.y }).workArea : screen.getPrimaryDisplay().workArea;
  win = new BrowserWindow({ ...fitBounds(proposed, area, size),
    minWidth: Math.min(size.minWidth, area.width), minHeight: Math.min(size.minHeight, area.height),
    frame: false, resizable: mode === 'full', backgroundColor: '#141815', show: false,
    alwaysOnTop: mode !== 'full' && pinned,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true,
      nodeIntegration: false, sandbox: true, devTools: isDev } });
  win.webContents.setWindowOpenHandler(({ url }) => {
    try { if (new URL(url).protocol === 'https:') shell.openExternal(url).catch(console.error); } catch {}
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => { if (!allowedURL(url)) event.preventDefault(); });
  win.once('ready-to-show', () => { win.show(); clampWindow(); });
  win.webContents.on('did-finish-load', broadcast);
  win.on('move', () => { clearTimeout(moveTimer); moveTimer = setTimeout(remember, 200); });
  win.on('resize', () => { clearTimeout(moveTimer); moveTimer = setTimeout(remember, 200); });
  win.on('close', event => {
    if (allowClose) return;
    event.preventDefault();
    if (mode !== 'full' && !quitting) { setWindowMode('full'); return; }
    if (closePending) return;
    closePending = true;
    win.webContents.send('window:before-close');
    // Do not silently throw away unsaved work when the renderer is unresponsive.
    setTimeout(async () => {
      if (!closePending || !win || win.isDestroyed()) return;
      const { response } = await dialog.showMessageBox(win, { type: 'warning',
        message: 'Ứng dụng chưa xác nhận lưu dữ liệu.', buttons: ['Tiếp tục chờ', 'Thoát ngay'], defaultId: 0, cancelId: 0 });
      if (response === 1) { allowClose = true; remember(); win.close(); }
      else { closePending = false; quitting = false; }
    }, 6000);
  });
  win.on('closed', () => { clearTimeout(moveTimer); win = null; });
  if (isDev) win.loadURL(DEV_URL).catch(error => dialog.showErrorBox('Không mở được Flow', error.message));
  else if (fs.existsSync(indexPath)) win.loadFile(indexPath);
  else { dialog.showErrorBox('Chưa có bản build', 'Chạy npm run build trước npm start; hoặc npm run electron:dev để phát triển.'); allowClose = true; app.quit(); }
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (win) { win.restore(); win.show(); win.focus(); } });
  app.whenReady().then(() => {
    createWindow();
    screen.on('display-removed', clampWindow);
    screen.on('display-metrics-changed', clampWindow);
    app.on('activate', () => { if (!win) { allowClose = false; quitting = false; createWindow(); } });
  });
  app.on('before-quit', () => { quitting = true; });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
```

## FILE 12: electron/preload.js

Thao tác: Thay toàn bộ.

```javascript
const { contextBridge, ipcRenderer } = require('electron');
const subscribe = (channel, callback) => {
  const listener = (_event, data) => callback(data);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};
contextBridge.exposeInMainWorld('electronAPI', {
  getWindowState: () => ipcRenderer.invoke('window:get-state'),
  onWindowState: callback => subscribe('window:state', callback),
  onBeforeClose: callback => subscribe('window:before-close', callback),
  confirmClose: success => ipcRenderer.send('window:close-ready', success),
  setWindowMode: mode => ipcRenderer.invoke('window:set-mode', mode),
  setAlwaysOnTop: pinned => ipcRenderer.invoke('window:set-always-on-top', pinned),
  snapToCorner: corner => ipcRenderer.invoke('window:snap-corner', corner),
  minimize: () => ipcRenderer.send('window:minimize'),
  close: () => ipcRenderer.send('window:close'),
  saveData: data => ipcRenderer.invoke('storage:save', data),
  loadData: () => ipcRenderer.invoke('storage:load'),
  notify: (title, body) => ipcRenderer.invoke('notification:send', { title, body }),
});
```

## FILE 13: electron/window-geometry.cjs

Thao tác: Tạo mới hoặc thay toàn bộ.

```javascript
const valid = (n, fallback) => Number.isFinite(n) ? n : fallback;
function fitBounds(bounds, area, size) {
  const width = Math.min(area.width, Math.max(Math.min(size.minWidth || 1, area.width), valid(bounds.width, size.width)));
  const height = Math.min(area.height, Math.max(Math.min(size.minHeight || 1, area.height), valid(bounds.height, size.height)));
  return { width: Math.round(width), height: Math.round(height),
    x: Math.round(Math.max(area.x, Math.min(area.x + area.width - width, valid(bounds.x, area.x + (area.width - width) / 2)))),
    y: Math.round(Math.max(area.y, Math.min(area.y + area.height - height, valid(bounds.y, area.y + (area.height - height) / 2)))) };
}
function cornerBounds(bounds, area, corner) {
  if (!['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(corner)) throw new Error('Góc không hợp lệ.');
  const fitted = fitBounds(bounds, area, bounds);
  const mx = Math.min(16, (area.width - fitted.width) / 2), my = Math.min(16, (area.height - fitted.height) / 2);
  return { ...fitted,
    x: Math.round(corner.endsWith('right') ? area.x + area.width - fitted.width - mx : area.x + mx),
    y: Math.round(corner.startsWith('bottom') ? area.y + area.height - fitted.height - my : area.y + my) };
}
module.exports = { fitBounds, cornerBounds };
```

## FILE 14: next.config.js

Thao tác: Thay toàn bộ nếu cấu hình hiện tại đúng như bản code tham khảo; nếu có cấu hình ngoài phạm vi timer thì giữ cấu hình đó.

```javascript
module.exports = {
  output: 'export',
  assetPrefix: process.env.NODE_ENV === 'production' ? './' : undefined,
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,
};
```

## FILE 15: postcss.config.js

Thao tác: Tạo nếu chưa có; nếu đã có thì bảo đảm giữ tailwindcss và autoprefixer.

```javascript
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

## FILE 16: package.json

Thao tác: Giữ dependency và metadata riêng nếu repo có thêm; thay scripts tương ứng theo bản dưới đây.

```json
{
  "name": "flow-timer",
  "version": "1.0.0",
  "private": true,
  "description": "Flow Timer - Ứng dụng đếm ngược học tập & làm việc với đồng hồ nổi Desktop",
  "main": "electron/main.js",
  "scripts": {
    "dev": "next dev --hostname 127.0.0.1",
    "build": "next build",
    "start": "electron . --production",
    "test": "node --test test/*.test.mjs",
    "electron:dev": "concurrently -k \"next dev --hostname 127.0.0.1\" \"wait-on http://127.0.0.1:3000 && electron . --dev\"",
    "electron:start": "electron . --production",
    "dist": "next build && electron-builder"
  },
  "keywords": [
    "timer",
    "countdown",
    "focus",
    "pomodoro",
    "electron",
    "nextjs",
    "study"
  ],
  "build": {
    "appId": "com.vibecode.flowtimer",
    "productName": "Flow Timer",
    "directories": {
      "output": "dist-electron"
    },
    "files": [
      "electron/**/*",
      "out/**/*",
      "package.json"
    ],
    "win": {
      "target": "nsis"
    }
  },
  "author": "",
  "license": "MIT",
  "dependencies": {
    "canvas-confetti": "^1.9.4",
    "clsx": "^2.1.1",
    "framer-motion": "^11.11.17",
    "lucide-react": "^0.460.0",
    "next": "^14.2.18",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tailwind-merge": "^2.5.4"
  },
  "devDependencies": {
    "autoprefixer": "^10.4.20",
    "concurrently": "^9.1.0",
    "electron": "^33.2.0",
    "electron-builder": "^25.1.8",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.15",
    "wait-on": "^8.0.1"
  }
}
```

KẾT THÚC CODE THAY THẾ

Sau khi áp dụng, chỉ phản hồi:
- Các file đã tạo/thay.
- Có giữ nguyên dữ liệu người dùng không.
- Có điểm nào trong repo khác với đường dẫn giả định không.

Không tiếp tục build/test/cài đặt/chạy app hoặc triển khai. Nếu tôi yêu cầu chạy sau, lệnh dự kiến là npm run electron:dev cho desktop development; npm run dev chỉ là bản web.
