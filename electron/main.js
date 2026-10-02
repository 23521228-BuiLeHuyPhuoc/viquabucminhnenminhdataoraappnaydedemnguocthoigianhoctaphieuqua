const { app, BrowserWindow, ipcMain, screen, Notification, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

// Kích thước chuẩn các chế độ
const SIZES = {
  full: { width: 880, height: 640, minWidth: 480, minHeight: 480 },
  'mini-card': { width: 320, height: 180, minWidth: 280, minHeight: 160 },
  'mini-bar': { width: 330, height: 58, minWidth: 280, minHeight: 52 },
};

let currentMode = 'full';
let savedFullBounds = { width: 880, height: 640 };
let isAlwaysOnTop = false;

// Đường dẫn file lưu trữ local userData
const getDataFilePath = () => path.join(app.getPath('userData'), 'flow_timer_data.json');

/**
 * Đảm bảo vị trí cửa sổ luôn nằm trong vùng hiển thị an toàn của màn hình
 */
function ensureWindowVisible(win) {
  if (!win || win.isDestroyed()) return;

  const winBounds = win.getBounds();
  const currentDisplay = screen.getDisplayMatching(winBounds);
  const workArea = currentDisplay.workArea;

  let x = winBounds.x;
  let y = winBounds.y;
  let reposition = false;

  // Kiểm tra nếu cửa sổ lọt ra ngoài màn hình
  if (x < workArea.x) {
    x = workArea.x + 20;
    reposition = true;
  } else if (x + winBounds.width > workArea.x + workArea.width) {
    x = workArea.x + workArea.width - winBounds.width - 20;
    reposition = true;
  }

  if (y < workArea.y) {
    y = workArea.y + 20;
    reposition = true;
  } else if (y + winBounds.height > workArea.y + workArea.height) {
    y = workArea.y + workArea.height - winBounds.height - 20;
    reposition = true;
  }

  if (reposition) {
    win.setPosition(Math.round(x), Math.round(y));
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: SIZES.full.width,
    height: SIZES.full.height,
    minWidth: SIZES.full.minWidth,
    minHeight: SIZES.full.minHeight,
    frame: false, // Custom titlebar cho giao diện hiện đại
    backgroundColor: '#090d16',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: process.env.NODE_ENV === 'development',
    },
  });

  // Chặn điều hướng ngoài ý muốn và mở liên kết ngoài an toàn
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost:3000') && !url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Tải giao diện
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    // Bản đóng gói / static export
    const indexPath = path.join(__dirname, '../out/index.html');
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      mainWindow.loadURL('http://localhost:3000');
    }
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    ensureWindowVisible(mainWindow);
  });

  mainWindow.on('close', (event) => {
    // Nếu đang ở mini mode mà người dùng bấm đóng, trở lại full window
    if (currentMode !== 'full') {
      event.preventDefault();
      setWindowMode('full');
    }
  });

  // Lắng nghe sự kiện màn hình thay đổi (tháo màn phụ, đổi độ phân giải)
  screen.on('display-removed', () => ensureWindowVisible(mainWindow));
  screen.on('display-metrics-changed', () => ensureWindowVisible(mainWindow));
}

/**
 * Chuyển đổi giữa chế độ đầy đủ và chế độ mini
 */
function setWindowMode(mode) {
  if (!mainWindow || mainWindow.isDestroyed()) return { success: false };

  const targetSize = SIZES[mode] || SIZES.full;

  if (currentMode === 'full' && mode !== 'full') {
    // Lưu lại vị trí và kích thước full trước khi thu nhỏ
    savedFullBounds = mainWindow.getBounds();
  }

  currentMode = mode;

  if (mode === 'full') {
    mainWindow.setResizable(true);
    mainWindow.setMinimumSize(SIZES.full.minWidth, SIZES.full.minHeight);
    mainWindow.setBounds({
      x: savedFullBounds.x || undefined,
      y: savedFullBounds.y || undefined,
      width: Math.max(SIZES.full.minWidth, savedFullBounds.width || SIZES.full.width),
      height: Math.max(SIZES.full.minHeight, savedFullBounds.height || SIZES.full.height),
    });
    mainWindow.setAlwaysOnTop(false);
  } else {
    // Chế độ Mini (Card hoặc Bar)
    mainWindow.setResizable(false);
    mainWindow.setMinimumSize(targetSize.minWidth, targetSize.minHeight);
    mainWindow.setSize(targetSize.width, targetSize.height);

    // Ở chế độ mini, mặc định ghim trên cùng
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
  }

  ensureWindowVisible(mainWindow);
  return { success: true, mode };
}

/**
 * Ghim cửa sổ vào một trong 4 góc màn hình (tránh taskbar)
 */
function snapToCorner(corner) {
  if (!mainWindow || mainWindow.isDestroyed()) return false;

  const winBounds = mainWindow.getBounds();
  const currentDisplay = screen.getDisplayNearestPoint({ x: winBounds.x, y: winBounds.y });
  const workArea = currentDisplay.workArea; // Vùng làm việc tránh Taskbar của Windows

  const margin = 20;
  let targetX = workArea.x + margin;
  let targetY = workArea.y + margin;

  switch (corner) {
    case 'top-left':
      targetX = workArea.x + margin;
      targetY = workArea.y + margin;
      break;
    case 'top-right':
      targetX = workArea.x + workArea.width - winBounds.width - margin;
      targetY = workArea.y + margin;
      break;
    case 'bottom-left':
      targetX = workArea.x + margin;
      targetY = workArea.y + workArea.height - winBounds.height - margin;
      break;
    case 'bottom-right':
      targetX = workArea.x + workArea.width - winBounds.width - margin;
      targetY = workArea.y + workArea.height - winBounds.height - margin;
      break;
    default:
      return false;
  }

  mainWindow.setPosition(Math.round(targetX), Math.round(targetY));
  return true;
}

// ================= IPC HANDLERS =================
ipcMain.handle('window:set-mode', (event, mode) => {
  return setWindowMode(mode);
});

ipcMain.handle('window:set-always-on-top', (event, pinned) => {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  isAlwaysOnTop = !!pinned;
  mainWindow.setAlwaysOnTop(isAlwaysOnTop, isAlwaysOnTop ? 'screen-saver' : 'normal');
  return isAlwaysOnTop;
});

ipcMain.handle('window:snap-corner', (event, corner) => {
  return snapToCorner(corner);
});

ipcMain.on('window:minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize();
  }
});

ipcMain.on('window:close', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
});

// Lưu dữ liệu vào file userData
ipcMain.handle('storage:save', async (event, data) => {
  try {
    const filePath = getDataFilePath();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    console.error('[Electron Storage] Không thể lưu file:', err);
    return { success: false, error: err.message };
  }
});

// Đọc dữ liệu từ file userData
ipcMain.handle('storage:load', async () => {
  try {
    const filePath = getDataFilePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('[Electron Storage] Không thể đọc file:', err);
  }
  return null;
});

// Thông báo hệ thống
ipcMain.on('notification:send', (event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({
      title: title || 'Flow Timer',
      body: body || 'Đã hoàn thành mục tiêu tập trung!',
      silent: true, // Tránh tiếng ding của Windows vì app đã phát Web Audio chime
    }).show();
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
