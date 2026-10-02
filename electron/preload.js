const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Điều khiển chế độ kích thước cửa sổ
  setWindowMode: (mode) => ipcRenderer.invoke('window:set-mode', mode),

  // Ghim cửa sổ trên cùng (Always on top)
  setAlwaysOnTop: (pinned) => ipcRenderer.invoke('window:set-always-on-top', pinned),

  // Ghim nhanh vào 4 góc màn hình
  snapToCorner: (corner) => ipcRenderer.invoke('window:snap-corner', corner),

  // Thu nhỏ cửa sổ
  minimize: () => ipcRenderer.send('window:minimize'),

  // Đóng cửa sổ
  close: () => ipcRenderer.send('window:close'),

  // Lưu trữ dữ liệu vào AppData an toàn
  saveData: (data) => ipcRenderer.invoke('storage:save', data),

  // Đọc dữ liệu từ AppData
  loadData: () => ipcRenderer.invoke('storage:load'),

  // Gửi thông báo desktop
  notify: (title, body) => ipcRenderer.send('notification:send', { title, body }),
});
