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
