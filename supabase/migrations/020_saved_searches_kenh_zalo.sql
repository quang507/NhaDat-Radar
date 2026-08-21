-- 020 (21/8): đăng ký nhận tin mới QUA ZALO từ bot - khách tìm nhà trong chat, bot hỏi
-- "muốn nhận tin nhắn khi có tin mới khớp không?", gật là lưu zalo_thread; vòng quét trong
-- bot (30 phút/lượt) nhắn thẳng vào hội thoại khi có tin mới. Khách đưa kèm Gmail thì cùng
-- row đó có email -> alerts.mjs (CI) gửi mail như đăng ký từ web, có nút hủy.
-- zalo_notified_at tách khỏi last_notified_at (email) để hai kênh không giẫm mốc của nhau.
-- Hủy: khách nhắn "ngừng báo tin" (bot set active=false) hoặc bấm hủy trong email - một
-- công tắc tắt cả hai kênh.
alter table saved_searches add column if not exists zalo_thread text;
alter table saved_searches add column if not exists zalo_notified_at timestamptz;
