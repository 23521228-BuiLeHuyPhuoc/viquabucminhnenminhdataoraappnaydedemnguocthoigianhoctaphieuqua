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
