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
  setHeight: height => ipcRenderer.invoke('window:set-height', height),
  notify: (title, body) => ipcRenderer.invoke('notification:send', { title, body }),
});
