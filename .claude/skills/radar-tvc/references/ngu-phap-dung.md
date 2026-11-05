# Ngữ pháp dựng: làm phim AI không rời rạc

Phim AI "rời rạc" vì mỗi cảnh là một lần tạo độc lập: ánh sáng đổi hướng, đồ đạc đổi chỗ, cú cắt không
có lý do. Editor giỏi làm người xem *cảm* được cú cắt chứ không *thấy* nó. Ba công cụ: khoá liên tục,
chuyển cảnh có lý do, nhịp.

## 1. Khoá liên tục

Viết vào storyboard và lặp trong mọi prompt của cùng một không gian:
- cùng phòng, cùng vị trí đồ đạc chính (giường, quạt, cửa sổ), cùng vật liệu;
- **cùng hướng nắng** (ví dụ "nắng chiều xiên vào từ cửa sổ bên trái khung hình") trong cả cảnh;
- **một nguồn chuyển động chung**: cùng một làn gió làm rèm, tóc, lá cây đung đưa. Gió chung là thứ "khâu"
  các cảnh lại với nhau mà người xem không để ý;
- nhân vật: cùng trang phục, kiểu tóc, phụ kiện (xem character sheet trong `prompt-video.md`).

## 2. Chuyển cảnh có lý do

Mỗi cú chuyển dùng một thứ có thật trong khung hình. Ghi vào cột "chuyển cảnh" của storyboard:
cảnh A kết bằng gì, cảnh B mở bằng gì.

| Kiểu | Cách quay để dựng được | Hợp với |
|---|---|---|
| Che ống kính (occlusion) | cuối cảnh A: lá / rèm / tường / người đi ngang phủ kín khung; đầu cảnh B: thứ tương tự rời khỏi khung | đổi không gian |
| Khớp chuyển động (match on action) | A và B cùng một động tác, cùng hướng: tay buông điện thoại → tay đẩy cửa | đổi thời gian, giữ cảm xúc |
| Khớp hình (match cut) | A và B có hình khối giống nhau ở cùng chỗ trong khung: song cửa sắt → khung lưới bản đồ | sang màn giao diện |
| Rèm / vải trắng | máy đi qua rèm, khung trắng mờ một nhịp | tối → sáng, cũ → mới |
| Lấy nét kéo (rack focus) | bắt đầu nét tiền cảnh, kéo nét ra hậu cảnh | giới thiệu không gian |
| Tiếng đi trước (J-cut) | âm thanh cảnh B vào trước hình 0,3-0,8 giây | gần như mọi cú chuyển |
| Tiếng ở lại (L-cut) | âm thanh cảnh A kéo dài sang đầu cảnh B | hồi cảm xúc |

Tránh: chuyển cảnh trang trí (xoay, lật trang, phóng to vụt), tiếng "vút" chuyển cảnh, speed ramp, whip pan.

Với Radar, cú chuyển sang màn giao diện là cú quan trọng nhất. Gợi ý: màn hình điện thoại (đang quay
nghiêng, mờ) phóng dần tới khi phủ kín khung → cắt sang giao diện HTML phẳng; hoặc khớp hình từ song cửa
/ ô gạch sang lưới bản đồ.

## 3. Ống kính, độ sâu trường ảnh, chuyển động máy

| Ống kính | Dùng cho |
|---|---|
| 24mm | toàn cảnh không gian (phòng, hẻm) |
| 35mm | cảnh chuyển tiếp, người trong không gian |
| 50mm | người, cảm xúc vừa |
| 85mm | chi tiết tay, vật, mặt cận |

Độ sâu: toàn cảnh khoảng f/4-5.6 để còn đọc được không gian; người f/2.8-4; chi tiết f/2-2.8.
Hậu cảnh có biển hiệu / biển số xe thì cố ý để mờ (nông) vì model hay vẽ chữ lạ ở đó.
Máy: dolly, slider, cầm tay có chống rung nhẹ; bắt đầu và kết thúc chuyển động có quán tính, không đứng
khựng. Không drone trong nhà, không FPV, không rung lắc mạnh.

## 4. Nhịp

- Cảnh trung bình 1,5-3,5 giây. Cảnh cảm xúc chính được giữ lâu hơn (3-4 giây).
- Cắt rơi vào: một động tác, một thay đổi ánh sáng, một lần bị che, một nhịp nhạc. Không cắt theo phách
  kiểu MV.
- Clip AI dài 8 giây nhưng thường chỉ dùng 2-4 giây đẹp nhất. Viết prompt sao cho đoạn đẹp nằm ở giữa clip.
- Xem tắt tiếng: nỗi khổ và sự nhẹ nhõm phải đọc được bằng hình (ánh sáng, nhịp cắt, chữ góc).

## 5. Âm thanh

Lớp môi trường thật, có chiều sâu: gần máy thì rõ và thân, xa thì rộng và nhẹ. Gợi ý cho Sài Gòn:
quạt máy, xe máy chạy qua đầu hẻm, tiếng rao xa, chén muỗng, chim sẻ, mưa mái tôn, bước chân dép.
Không boom kiểu trailer, không tiếng vút.
Nhạc: tối giản, ấm, piano / guitar mộc + pad; bắt đầu gần như không nghe thấy, nâng nhẹ ở đoạn nhẹ nhõm,
khép lại ở màn kết. Không EDM, không nhạc "doanh nghiệp truyền cảm hứng", không vocal.
Giọng đọc nằm trên nhạc: hạ nhạc (ducking) 6-10 dB khi có lời.
