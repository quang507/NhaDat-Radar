# Thương hiệu, sản phẩm và luật cho phim Radar

## Sản phẩm: những gì được nói

Nhà Đất Radar (nhadatradar.com) là web tìm phòng trọ / căn hộ cho thuê ở TP.HCM.

| Điểm thật | Cách nói an toàn |
|---|---|
| Gom tin cho thuê từ nhiều nhóm Zalo, Facebook, web về một chỗ | "không cần lướt hàng chục nhóm", "tin được gom về một chỗ" |
| Giá bóc tách 5 khoản: tiền phòng, điện, nước, gửi xe, phí dịch vụ | "ghi rõ từng khoản", "không kiểu giá rẻ rồi phát sinh" |
| Bản đồ phòng quanh mình, lọc quận / giá / diện tích | "mở bản đồ là thấy phòng quanh bạn" |
| Ảnh thật của phòng | "ảnh thật" |
| Nút Zalo chép sẵn tin nhắn + mã phòng, khách dán và gửi | "mã phòng được chép sẵn, chỉ cần dán và gửi" |
| Radar hẹn đi xem phòng | "Radar hẹn bạn đi xem phòng" |
| Hotline / Zalo | 0387 365 020 (đọc: "không ba tám bảy, ba sáu năm, không hai không") |

Khán giả: 20-30 tuổi, sinh viên mới ra trường, nhân viên văn phòng mới lên Sài Gòn hoặc cần đổi phòng.
Cung cảm xúc: mệt, rối vì tìm phòng → nhẹ nhõm, tin tưởng → thấy được nhà mới.

## Không được nói / không được làm

- Không có tính năng nào ngoài bảng trên. Không "rẻ nhất", "100% chính chủ", "miễn phí môi giới",
  "cam kết", "duy nhất", "tin thật 100%". Những câu này là lời hứa pháp lý, khách bắt lỗi được.
- Không gắn giá, mã phòng, địa chỉ thật lên căn phòng do AI tạo: người xem sẽ đi tìm đúng phòng đó.
  Nếu màn giao diện cần số, dùng số mẫu tròn trịa trên giao diện HTML và không đặt cạnh cảnh phòng AI.
- Bảo mật rổ hàng (CLAUDE.md mục 4): không dùng ảnh / video phòng của đối tác (EvoHome, HiFriendz...)
  làm ảnh tham chiếu hay chèn vào phim; không lộ tên đối tác, địa chỉ chính xác, số phòng.
  Video "tin thật" từng phòng là việc khác (`video/src/tin/`), không trộn vào TVC thương hiệu.
- Không chê chủ trọ hay đối tác cho thuê: rổ hàng của Radar đến từ chính họ. Nỗi khổ trong phim là
  "tìm mệt, giá mập mờ", không phải "chủ trọ xấu".
- Nhân vật là người do AI tạo. Không dùng mặt người thật làm tham chiếu (quyền hình ảnh, và một số nền tảng
  chặn việc này).

## Nhận diện ZEN Kaiz trong phim

| Thứ | Giá trị |
|---|---|
| Màu chính | `#10B981` (trên nền tối), `#059669` (trên nền sáng) |
| Nền mực | `#0B1220` |
| Chữ | `#F8FAFC`, phụ `#94A3B8` |
| Font | Inter (có đủ dấu tiếng Việt). Kiểm "ữ ặ ỡ ổ" không nhảy font |
| Bo góc | ≤ 4px cho thẻ, nút, khung giao diện |
| Cấm | gradient tím / hồng, neon, glow, glassmorphism, phong cách "AI rực rỡ" |

Chữ trên hình nhỏ, tinh tế, đặt ở góc; màn kết được to hơn. Chữ không đè lên mặt nhân vật.

Màu trong cảnh quay không cần xanh ngọc khắp nơi. Thương hiệu nằm ở lớp chữ / giao diện; cảnh quay giữ màu
tự nhiên, ấm, độ bão hoà vừa phải, rồi chỉnh màu đồng loạt ở hậu kỳ. Một điểm xanh lá thật (cây ban công)
ở cảnh kết là đủ để "vần" với màu thương hiệu.

## Chất Sài Gòn

Đúng: hẻm hẹp, nhà ống 3-4 tầng sát nhau, ban công sắt sơn nhiều chậu cây, dây điện, cửa cuốn, gạch bông,
song cửa sắt, quạt treo tường, xe máy dựng trước cửa, nắng chiều xiên vàng, mưa chiều.
Sai (model hay tự thêm): căn hộ kiểu châu Âu, phố Nhật / Hàn / Trung, biển hiệu chữ Hán, xe hơi đầy hẻm,
nội thất showroom trắng tinh.

## Caption và bài đăng đi kèm phim

Theo `docs/QUY-TRINH-PHAN-PHOI-MARKETING.md`: qua bộ lọc Humanizer (không gạch ngang dài, không ngoặc giật tít
kiểu `[...]`), không để link ngoài trong caption (Threads thả link ở reply đầu, TikTok / Reels dẫn về bio).
