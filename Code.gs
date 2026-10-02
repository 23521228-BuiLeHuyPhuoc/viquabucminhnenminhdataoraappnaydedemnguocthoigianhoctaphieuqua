const TZ = 'Asia/Ho_Chi_Minh';

// Mục tiêu mặc định (giây). Mục tiêu tự nhập trên giao diện sẽ được ưu tiên hơn số này.
const TASKS = [
  { id: 'english', name: 'Tiếng Anh',   emoji: '🇬🇧', goal: 1.5 * 3600 },
  { id: 'thesis',  name: 'Khóa luận',   emoji: '🎓', goal: 2.5 * 3600 },
  { id: 'android', name: 'Học Android', emoji: '🤖', goal: 3 * 3600 },
];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('📚 Học tập')
    .addItem('Mở bảng học tập', 'showApp').addToUi();
}
function showApp() { SpreadsheetApp.getUi().showSidebar(page_()); }
function doGet() { return page_(); }
function page_() {
  return HtmlService.createHtmlOutputFromFile('App')
    .setTitle('Bảng học tập')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ---------- Bộ đếm ----------
function today_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }

function getState() {
  const props = PropertiesService.getUserProperties();
  const goals = JSON.parse(props.getProperty('goals') || '{}');      // mục tiêu bạn tự nhập
  let saved = JSON.parse(props.getProperty('state') || '{}');
  if (saved.date !== today_()) saved = { date: today_(), left: {} }; // sang ngày mới thì reset
  return {
    date: saved.date,
    tasks: TASKS.map(t => {
      const goal = goals[t.id] ?? t.goal;                            // ưu tiên số tự nhập
      return { ...t, goal, left: Math.min(saved.left[t.id] ?? goal, goal) };
    }),
  };
}

function saveLeft(date, left) {
  PropertiesService.getUserProperties()
    .setProperty('state', JSON.stringify({ date: date, left: left }));
}

// Lưu mục tiêu mới của một môn (giây), dùng cho cả những ngày sau
function saveGoal(id, seconds) {
  const props = PropertiesService.getUserProperties();
  const goals = JSON.parse(props.getProperty('goals') || '{}');
  goals[id] = seconds;
  props.setProperty('goals', JSON.stringify(goals));
}

// ---------- Phát âm ----------
// Đọc ô đang chọn ở cột B (từ hàng 5)
function getGoogleAudioForSelectedCell() {
  const cell = SpreadsheetApp.getActiveSheet().getActiveCell();
  if (!cell) return { success: false, message: "Chưa chọn ô nào!" };
  if (cell.getColumn() !== 2)
    return { success: false, message: "Vui lòng chọn ô ở Cột B (từ hàng 5 trở đi)!" };
  if (cell.getRow() < 5)
    return { success: false, message: "Ô này là tiêu đề, hãy chọn từ hàng 5 trở đi!" };

  const raw = cell.getValue().toString().trim();
  if (!raw) return { success: false, message: "Ô được chọn đang trống!" };

  // Lấy từ tiếng Anh đứng trước '/' hoặc '('
  let word = raw.split('/')[0].split('(')[0].trim().replace(/^["']+|["']+$/g, '');
  return fetchTts_(word || raw);
}

// Đọc từ do người dùng gõ vào
function getGoogleAudioForWord(word) {
  word = String(word || '').trim();
  if (!word) return { success: false, message: "Bạn chưa gõ từ nào!" };
  return fetchTts_(word);
}

function fetchTts_(word) {
  try {
    const url = "https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q="
              + encodeURIComponent(word);
    const res = UrlFetchApp.fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200)
      return { success: false, message: "Google Dịch phản hồi mã: " + res.getResponseCode() };
    return { success: true, word: word, audioBase64: Utilities.base64Encode(res.getContent()) };
  } catch (err) {
    return { success: false, message: "Lỗi tải âm thanh: " + err.message };
  }
}