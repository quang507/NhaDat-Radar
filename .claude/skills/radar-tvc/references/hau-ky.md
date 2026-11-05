# Hậu kỳ: HyperFrames + giọng Matilda

Đọc skill `hyperframes:hyperframes` (hợp đồng render, vòng làm việc) và `hyperframes:media-use`
(âm thanh, footage, chỉnh màu) trước khi dựng. File này chỉ ghi phần riêng của Radar.

## Cấu trúc thư mục

```
video/tvc/<ten-phim>/
  keyframes/      ảnh tĩnh đã duyệt (bước 3)
  clips/          clip AI gốc, đặt tên theo cảnh: s01-take2.mp4
  prompts.md      prompt + kết quả từng lần thử
  index.html      gốc HyperFrames (npx hyperframes init)
  compositions/   mỗi cảnh một file
  assets/         footage đã chọn, giọng, nhạc, font Inter, logo
```

HyperFrames cần Node 22+ và FFmpeg. Máy này chưa có `ffmpeg` trên PATH: chạy `npx hyperframes doctor --json`
trước, thiếu thì báo anh Quang trước khi cài.

## Giọng đọc

- `video/scripts/long-tieng.mjs`: `longTieng(bo, [[id, chu], ...])` trả `{ id: { src, giay } }`, lưu
  `video/public/vo/<bo>/`, câu không đổi thì dùng lại file (không tốn ký tự). Giọng Matilda, `eleven_v3`,
  `language_code: vi`, cấu hình ở `video/.env`.
- Có thể thêm bộ kịch bản mới vào `KICH_BAN` rồi `node scripts/long-tieng.mjs <bo>` (chạy trong `video/`).
- Số viết bằng chữ, tên viết như đọc ("nhà đất radar chấm com"). Thẻ cảm xúc: `[warmly]`, `[softly]`.
- Ngân sách: 60-75 từ cho 30 giây. Lấy `giay` thật của từng câu để xếp mốc, đừng đoán.
- Chép file mp3 sang `assets/` của project HyperFrames, mỗi câu một `<audio id=...>`.

## Nhạc và SFX

- Nhạc: tạo bằng ElevenLabs (cùng khoá) hoặc nguồn có giấy phép thương mại rõ ràng. Ghi nguồn + giấy phép
  vào `prompts.md`. Không dùng nhạc trôi nổi trên mạng.
- SFX: tiếng môi trường bám theo hành động thấy được (quạt, xe máy, cửa, bước chân, thông báo điện thoại).
  Có sẵn vài file ở `video/public/sfx/`.
- Hạ nhạc 6-10 dB khi có lời. Kiểm tổng âm lượng đều giữa các cảnh.

## Màn giao diện Radar

Dựng bằng HTML, không chụp màn hình rồi phóng to (mờ) và không để AI vẽ:
- token ZEN Kaiz như trang thật (`tailwind.config.ts`, `src/app/globals.css`), Inter, bo góc ≤ 4px;
- ưu tiên lấy hình thật của trang (`npx hyperframes capture https://nhadatradar.com --json`) làm chuẩn rồi
  dựng lại phần cần động;
- tham khảo bố cục các màn đã làm bằng Remotion: `video/src/scenes/RadarMap.tsx`, `Costs.tsx`, `CTA.tsx`;
- số liệu trên giao diện là số mẫu, không trùng một tin thật, không đặt cạnh phòng AI;
- nút Zalo: thể hiện "Đã chép mã phòng" → dán → gửi (đúng cơ chế clipboard, không phải tin tự điền).

## Màn kết

Logo nhadatradar.com, câu "Nhắn Zalo kèm mã phòng", hotline 0387 365 020. Giữ ≥ 2,5 giây, nền mực `#0B1220`
hoặc khung hình cuối đã làm tối, chữ trong vùng an toàn 80%.

## Hai khổ hình

Dựng 9:16 (1080×1920) là chính, 16:9 (1920×1080) là phụ. Khi tạo clip đã giữ chủ thể ở dải giữa nên
cắt được. Chữ góc và màn giao diện thì dựng lại bố cục riêng cho từng khổ, không chỉ co giãn.

## Chỉnh màu

Qua `npx hyperframes media-treatment` (không dùng CSS filter). Mục tiêu: các clip từ nhiều lần tạo trông như
quay cùng một ngày: cùng nhiệt độ màu trong cùng không gian, da tự nhiên, xanh lá không gắt. Hồi 1 có thể
lạnh và tối hơn một chút, hồi 3 ấm hơn, nhưng chênh vừa phải.

## Trước khi báo xong

1. `npx hyperframes check --json` sạch lỗi.
2. `npx hyperframes snapshot` ở mỗi cú chuyển, mỗi dòng chữ, màn giao diện, màn kết, cho cả hai khổ; xem từng
   ảnh: dấu tiếng Việt, chữ không đè mặt, không lộ chữ lạ từ clip AI, logo nét.
3. Render `--quality delivery`, kiểm độ dài file khớp, xem vài khung đã giải mã.
4. Gửi anh Quang file + ảnh khung hình chính; ghi rõ cái gì chưa kiểm được.
