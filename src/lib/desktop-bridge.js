/**
 * Desktop Bridge - Cầu nối trừu tượng giữa giao diện React và Desktop (Electron)
 * Cô lập toàn bộ lời gọi IPC, không để API Electron rải rác trong các component.
 * Fallback an toàn khi chạy trên trình duyệt Web.
 */

export const isDesktopApp = () => {
  return typeof window !== 'undefined' && !!window.electronAPI;
};

export const desktopBridge = {
  /**
   * Kiểm tra xem đang chạy trong môi trường Desktop (Electron) hay Web
   */
  isDesktop: () => isDesktopApp(),

  /**
   * Chuyển đổi chế độ kích thước cửa sổ
   * @param {'full'|'mini-card'|'mini-bar'} mode 
   */
  setWindowMode: async (mode) => {
    if (isDesktopApp()) {
      return await window.electronAPI.setWindowMode(mode);
    }
    return { success: false, inBrowser: true };
  },

  /**
   * Ghim / bỏ ghim cửa sổ trên các ứng dụng khác (Always On Top)
   * @param {boolean} pinned 
   */
  setAlwaysOnTop: async (pinned) => {
    if (isDesktopApp()) {
      return await window.electronAPI.setAlwaysOnTop(pinned);
    }
    return false;
  },

  /**
   * Ghim nhanh cửa sổ vào một trong 4 góc màn hình (tránh taskbar)
   * @param {'top-left'|'top-right'|'bottom-left'|'bottom-right'} corner 
   */
  snapToCorner: async (corner) => {
    if (isDesktopApp()) {
      return await window.electronAPI.snapToCorner(corner);
    }
    return false;
  },

  /**
   * Thu nhỏ cửa sổ xuống Taskbar
   */
  minimize: () => {
    if (isDesktopApp()) {
      window.electronAPI.minimize();
    }
  },

  /**
   * Đóng cửa sổ (hoặc thoát app)
   */
  close: () => {
    if (isDesktopApp()) {
      window.electronAPI.close();
    }
  },

  /**
   * Gửi thông báo hệ thống (Desktop notification)
   */
  sendNotification: async (title, body) => {
    if (isDesktopApp() && window.electronAPI.notify) {
      window.electronAPI.notify(title, body);
      return;
    }

    // Web Notification fallback
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          new Notification(title, { body, icon: '/favicon.ico' });
        } catch (e) {
          console.warn('[Notification] Không thể hiển thị Web notification:', e);
        }
      }
    }
  },

  /**
   * Xin quyền gửi thông báo
   */
  requestNotificationPermission: async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        return perm === 'granted';
      } catch (e) {
        return false;
      }
    }
    return false;
  },

  /**
   * Hỗ trợ Document Picture-in-Picture cho bản Web nếu trình duyệt cho phép
   */
  supportsDocumentPiP: () => {
    return typeof window !== 'undefined' && 'documentPictureInPicture' in window;
  },

  requestDocumentPiP: async (options = { width: 340, height: 180 }) => {
    if (typeof window !== 'undefined' && 'documentPictureInPicture' in window) {
      try {
        const pipWindow = await window.documentPictureInPicture.requestWindow(options);
        return pipWindow;
      } catch (err) {
        console.warn('[DocumentPiP] Không thể mở PiP window:', err);
        return null;
      }
    }
    return null;
  }
};
