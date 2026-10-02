# Flow Timer — Đồng hồ đếm ngược tập trung & Đồng hồ nổi Desktop

Flow Timer là ứng dụng đếm ngược thời gian chuyên biệt cho học tập và làm việc cá nhân, được thiết kế với giao diện cao cấp, hiệu ứng chuyển động tinh tế và tính năng đặc biệt: **thu nhỏ thành một đồng hồ nổi (floating mini window) ghim trên mọi cửa sổ làm việc khác (VS Code, Word, trình duyệt...) trên Windows**.

---

## 1. Điểm nổi bật & Kế thừa từ phiên bản Google Apps Script

Phiên bản mới được viết lại hoàn toàn độc lập, loại bỏ phụ thuộc Google Sheets, Apps Script và Google TTS, đồng thời nâng cấp toàn diện:

- **Đồng hồ cát SVG chuyển động sống động**: Cát trên vơi dần, dòng cát chảy mềm mại, cát dưới dâng lên theo tỷ lệ thời gian thực. Bấm vào đồng hồ cát có thể chuyển đổi nhanh sang dạng **Vòng tiến độ thanh lịch (Progress Ring)**.
- **Màu sắc phản hồi có chủ đích**: Mỗi công việc có một màu accent riêng. Nền, viền phát sáng và hiệu ứng nút tự động chuyển biến nhịp nhàng theo công việc đang tập trung.
- **Đếm ngược thời gian thực chuẩn xác**: Tính toán bằng `Math.max(0, endAt - now)`, không phụ thuộc vào `setInterval`. Khi máy tính chuyển tab hoặc ngủ (sleep), timer không bị sai lệch; khi mở lại sẽ cập nhật chính xác thời gian đã trôi.
- **Chỉ 1 công việc chạy tại một thời điểm**: Xem môn B không làm dừng môn A; bắt đầu môn B sẽ tự động chốt và pause môn A, sau đó bắt đầu môn B.
- **Đồng hồ nổi Desktop (Floating Mini Window)**:
  - Ghim luôn trên cùng (*Always on top*) trên desktop Windows.
  - Hỗ trợ 2 kiểu giao diện: **Thẻ gọn (Compact Card)** và **Thanh ngang (Slim Bar)**.
  - Vùng kéo thả rõ ràng, không bị cản trở khi bấm các nút tương tác.
  - **Ghim nhanh vào 4 góc màn hình**: Tự động tính toán theo vùng làm việc khả dụng (`workArea`), không che thanh Taskbar Windows.
  - Tự động phát hiện và đưa cửa sổ về vùng hiển thị nếu người dùng tháo màn hình phụ hoặc đổi độ phân giải.
  - Đóng mini window sẽ tự động mở lại giao diện đầy đủ, **không tự hủy phiên đếm**.
- **Đơn nguồn trạng thái (Single Source of Truth)**: Cửa sổ chính và cửa sổ mini sử dụng chung một ngữ cảnh React duy nhất thông qua cơ chế chuyển đổi kích thước cửa sổ Electron, đảm bảo không bao giờ có độ trễ hay lệch thời gian.
- **Nhập thời lượng thông minh**: Chấp nhận cả số phút (`90`, `45`) hoặc định dạng giờ:phút (`1:30`, `0:45`), có gợi ý các mốc preset nhanh (15p, 25p, 45p, 60p, 90p). Kiểm tra dữ liệu chặt chẽ và báo lỗi tiếng Việt dễ hiểu.
- **Đặt lại an toàn**: Cơ chế bấm 2 bước để xác nhận đặt lại (tự hủy sau 3 giây), tránh vô tình bấm nhầm làm mất tiến độ.
- **Âm thanh chuông báo 100% Offline**: Sử dụng Web Audio API tổng hợp hợp âm C-Major trong trẻo, không phụ thuộc file MP3 ngoài, có thể bật/tắt và nghe thử trong Cài đặt.
- **Lưu trữ dữ liệu bền bỉ**: Tự động lưu trạng thái vào `AppData` (Desktop) hoặc `localStorage` (Web), có `schema version` và bộ lọc dữ liệu an toàn, không làm crash app nếu dữ liệu bị lỗi.

---

## 2. Yêu cầu môi trường

- **Hệ điều hành**: Windows 10 / 11 (hỗ trợ cả macOS và Linux).
- **Node.js**: Phiên bản 18 trở lên (đã kiểm thử và tối ưu trên Node v24).
- **npm**: Phiên bản 9 trở lên.

---

## 3. Hướng dẫn chạy và sử dụng

### Chạy giao diện Web (Development Preview)
```bash
npm run dev
```
Mở trình duyệt truy cập: `http://localhost:3000`

### Mở ứng dụng Desktop (Electron)
Đảm bảo đã build static export (`npm run build`), sau đó chạy:
```bash
npm run electron:start
```

### Chạy Desktop ở chế độ phát triển (Next.js Dev + Electron Live)
```bash
npm run electron:dev
```

### Chạy toàn bộ Unit Tests
```bash
npm test
```
Kiểm thử tự động toàn bộ 16 ca kiểm thử cho Timer Engine, Time Parser và Storage Adapter.

### Đóng gói ứng dụng Desktop Windows (.exe Installer)
```bash
npm run dist
```
File cài đặt sẽ được tạo trong thư mục `dist-electron/`.

---

## 4. Phím tắt trong ứng dụng

- `Space`: Bắt đầu / Tạm dừng công việc đang chọn hoặc đang chạy.
- `M`: Bật / tắt nhanh chế độ đồng hồ nổi mini.
- `Escape`: Đóng nhanh các hộp thoại modal đang mở (Chỉnh giờ, Thêm môn, Cài đặt).

---

## 5. Kiến trúc kỹ thuật

```
├── electron/
│   ├── main.js             # Quản lý vòng đời cửa sổ, kích thước (full <-> mini), Always-on-top, snap góc, lưu AppData
│   └── preload.js          # Cầu nối IPC an toàn, contextIsolation: true, sandbox: true
├── src/
│   ├── lib/
│   │   ├── timer-engine.js # Bộ máy đếm ngược thời gian thực, quản lý chuyển đổi trạng thái, session duy nhất
│   │   ├── time-parser.js  # Phân tích định dạng "90", "1:30", validate và định dạng chuỗi hiển thị
│   │   ├── storage.js      # Adapter lưu trữ schema versioning, debounced save, fallback an toàn
│   │   ├── sound.js        # Bộ tổng hợp âm thanh Web Audio API (C-Major Chime)
│   │   └── desktop-bridge.js # Lớp trừu tượng cách ly toàn bộ API desktop khỏi UI React
│   ├── components/
│   │   ├── TitleBar.jsx    # Thanh tiêu đề Windows kéo thả với nút điều khiển
│   │   ├── HourglassSvg.jsx# Đồng hồ cát SVG với dòng chảy cát thời gian thực
│   │   ├── ProgressRing.jsx# Vòng tiến độ thanh lịch thay thế
│   │   ├── TimerDisplay.jsx# Hiển thị số đồng hồ lớn với tabular-nums và quote
│   │   ├── Controls.jsx    # Nút Bắt đầu/Pause, nút Reset xác nhận 2 bước, nút mở đồng hồ nổi
│   │   ├── TaskList.jsx    # Tab chọn môn và danh sách thanh tiến độ các môn
│   │   ├── MiniFloatingTimer.jsx # Cửa sổ mini nổi (Card mode & Slim bar mode)
│   │   ├── DurationModal.jsx # Modal chỉnh thời lượng với presets và validation
│   │   ├── TaskEditModal.jsx # Modal thêm/sửa môn, chọn emoji và bảng màu
│   │   └── SettingsModal.jsx # Cài đặt Theme, Âm thanh, Thông báo, Giảm chuyển động
│   └── styles/
│       └── globals.css     # Thiết kế Glassmorphism, CSS variables, drag regions
├── pages/
│   ├── _app.jsx            # Cấu hình App Next.js và SEO
│   └── index.jsx           # Trang ứng dụng chính hợp nhất state
└── test/
    ├── timer-engine.test.mjs # Unit test bộ đếm thời gian thực và sự kiện hoàn thành 1 lần
    ├── time-parser.test.mjs  # Unit test phân tích chuỗi thời lượng
    └── storage.test.mjs      # Unit test bộ lưu trữ và phục hồi dữ liệu hỏng
```

---

## 6. Báo cáo nghiệm thu chức năng

| STT | Yêu cầu nghiệm thu | Kết quả kiểm tra |
|-----|-------------------|------------------|
| 1 | Bắt đầu, pause và resume không mất thời gian | ✅ Đã kiểm thử tự động (Unit test pass) |
| 2 | Đang chạy A, chọn xem B: A vẫn tiếp tục chạy | ✅ Đã kiểm thử tự động (Unit test pass) |
| 3 | Bắt đầu B: A pause, chỉ B chạy | ✅ Đã kiểm thử tự động (Unit test pass) |
| 4 | Reset cần xác nhận khi đã có tiến độ | ✅ Hoàn thành với cơ chế xác nhận 2 bước tự hủy sau 3s |
| 5 | Nhập `90`, `1:30`, `0:45` chuẩn xác | ✅ Đã kiểm thử tự động (Unit test pass) |
| 6 | Từ chối chuỗi lỗi `1:20:30`, âm, 0, >24h | ✅ Đã kiểm thử tự động (Unit test pass) |
| 7 | Timer về 0 không bị số âm | ✅ Đã kiểm thử tự động (Unit test pass) |
| 8 | Sự kiện hoàn thành chỉ bắn duy nhất 1 lần | ✅ Đã kiểm thử tự động (Unit test pass qua `sessionId`) |
| 9 | Khôi phục phiên running/paused sau sleep/đóng app | ✅ Đã kiểm thử tự động (Unit test pass) |
| 10 | Tải lại app không mất công việc và cài đặt | ✅ Hoàn thành với storage adapter đa nền tảng |
| 11 | Cửa sổ nổi desktop (Mini Floating Window) | ✅ Hoàn thành với 2 kiểu Card & Slim Bar |
| 12 | Ghim Always-on-top trên các ứng dụng khác | ✅ Hoàn thành (`setAlwaysOnTop(true, 'screen-saver')`) |
| 13 | Ghim nhanh vào 4 góc màn hình tránh Taskbar | ✅ Hoàn thành qua Electron `display.workArea` |
| 14 | Kéo thả cửa sổ không làm mất tương tác nút bấm | ✅ Phân vùng `drag-region` và `no-drag` chuẩn xác |
| 15 | Phục hồi vị trí an toàn khi tháo màn hình | ✅ Lắng nghe `display-removed` và auto reposition |
| 16 | Đồng bộ trạng thái giữa Full mode và Mini mode | ✅ Sử dụng Single Window Mode Switch, 0% lệch timer |
| 17 | Đồng hồ cát SVG và hiệu ứng phản hồi màu sắc | ✅ Hoàn thành với animation SVG và biến CSS động |
| 18 | Chuông hoàn thành và pháo hoa ăn mừng | ✅ Web Audio API C-major chime + canvas-confetti |
| 19 | Bản đóng gói static export (`out/`) không lỗi asset | ✅ Đã cấu hình `assetPrefix: './'` chuẩn xác |
