/**
 * Module xử lý và chuẩn hóa thời lượng
 * Hỗ trợ các định dạng:
 * - "90" -> 90 phút (5400s)
 * - "1:30" -> 1 giờ 30 phút (5400s)
 * - "0:45" -> 45 phút (2700s)
 */

export const PRESETS = [
  { label: '15p', minutes: 15, seconds: 15 * 60 },
  { label: '25p (Pomo)', minutes: 25, seconds: 25 * 60 },
  { label: '45p', minutes: 45, seconds: 45 * 60 },
  { label: '60p (1h)', minutes: 60, seconds: 60 * 60 },
  { label: '90p (1h30)', minutes: 90, seconds: 90 * 60 },
];

export const MAX_DURATION_SECONDS = 24 * 3600; // 24 giờ

/**
 * Phân tích chuỗi nhập thời lượng thành số giây
 * @param {string|number} raw 
 * @returns {{ success: boolean, seconds?: number, error?: string }}
 */
export function parseDuration(raw) {
  if (raw === null || raw === undefined) {
    return { success: false, error: 'Vui lòng nhập thời lượng.' };
  }

  const str = String(raw).trim();
  if (!str) {
    return { success: false, error: 'Thời lượng không được để trống.' };
  }

  // Không chấp nhận quá 1 dấu hai chấm (không chấp nhận định dạng 1:20:30)
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
    // Chỉ là số phút
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

  if (totalSeconds > MAX_DURATION_SECONDS) {
    return {
      success: false,
      error: 'Thời lượng không được vượt quá 24 giờ.'
    };
  }

  return {
    success: true,
    seconds: totalSeconds
  };
}

/**
 * Định dạng số giây thành chuỗi hiển thị số
 * - Nếu < 1 giờ: MM:SS
 * - Nếu >= 1 giờ: HH:MM:SS
 * Luôn làm tròn trần (Math.ceil) để tránh rơi 1 giây ngay khi bắt đầu
 */
export function formatRemaining(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  const pad = (n) => String(n).padStart(2, '0');

  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

/**
 * Định dạng thời gian ngắn gọn (dành cho thanh mini hoặc thống kê)
 * e.g. "1h30" hoặc "45p"
 */
export function formatDurationShort(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.round((s % 3600) / 60);

  if (hrs > 0 && mins > 0) {
    return `${hrs}h${String(mins).padStart(2, '0')}`;
  } else if (hrs > 0) {
    return `${hrs}h`;
  }
  return `${mins}p`;
}

/**
 * Định dạng tiếng Việt tự nhiên
 * e.g. "1 giờ 30 phút", "45 phút"
 */
export function formatDurationVietnamese(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.round((s % 3600) / 60);

  if (hrs > 0 && mins > 0) {
    return `${hrs} giờ ${mins} phút`;
  } else if (hrs > 0) {
    return `${hrs} giờ`;
  }
  return `${mins} phút`;
}
