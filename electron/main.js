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
