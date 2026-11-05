# Prompt ảnh / video, chọn model, chấm take

Prompt viết bằng tiếng Anh (model hiểu tốt hơn); giải thích cho anh Quang bằng tiếng Việt.

## 1. Chọn model

| | Veo (Google Flow / Gemini API) | Seedance (Dreamina, CapCut, API BytePlus / fal) |
|---|---|---|
| Mạnh | da, ánh sáng, âm thanh môi trường đi kèm clip | nhiều cảnh liền nhau trong một lần tạo, máy mượt, nhận nhiều ảnh tham chiếu |
| Giữ nhân vật | Ingredients / Frames to Video trong Flow | ảnh tham chiếu nhiều góc |
| Tự động hoá từ máy này | được: đã có `GEMINI_API_KEY` | cần tài khoản API riêng (chưa có) |
| Cả hai | vẽ sai chữ tiếng Việt, hay ra phố châu Á chung chung, tay và xe máy dễ méo | |

Không chọn theo cảm giác: chạy A/B 2 cảnh khó nhất với cùng khung hình đầu, đặt cạnh nhau.
Thông số (độ dài clip, giá, tên model) đổi theo tháng: tra tài liệu hiện hành trước khi báo giá, đừng đọc
từ trí nhớ.

## 2. Bộ ảnh tĩnh trước, video sau

1. Character sheet ảnh: mặt thẳng, 3/4, nghiêng, toàn thân; nền trung tính; đúng trang phục.
2. Mỗi cảnh AI một khung hình đầu: đúng bố cục, ánh sáng, nhân vật, bối cảnh.
3. Duyệt ảnh với anh Quang. Sửa ảnh rẻ hơn sửa video nhiều lần.
4. Ảnh → video (image-to-video / Frames to Video). Model chỉ còn việc cho chuyển động.

Ảnh tham chiếu bối cảnh tốt nhất là ảnh team tự chụp hẻm / nhà ống thật bằng điện thoại. Không dùng ảnh
phòng rổ hàng đối tác, không dùng mặt người thật.

## 3. Mẫu MASTER STYLE (sửa theo concept)

```
MASTER STYLE
Live-action, photorealistic, shot on a cinema camera, 35mm film look, subtle grain, natural lens
imperfections. Ho Chi Minh City, Vietnam: narrow alleys (hem), tall narrow tube houses, balconies with
potted plants, motorbikes parked by doors, tangled power lines, patterned cement tiles, iron window bars.
Lighting: practical and believable; warm late-afternoon sun raking in from frame left unless stated.
Color: natural, warm, moderate saturation, soft contrast, lifted shadows, no teal-and-orange, no neon,
no purple or pink tint. Camera: dolly, slider or gently stabilised handheld, organic ease-in/ease-out,
never robotic, no drone indoors. People behave naturally, never pose, never look into the lens.
No dialogue, ambient sound only.
No text, no captions, no logos, no UI text, no watermark. Phone and laptop screens are angled away or
out of focus so nothing on them is readable. Shop signs and licence plates out of focus.
```

## 4. Mẫu character sheet chữ (lặp nguyên văn trong mọi prompt có nhân vật)

```
CHARACTER: Linh, Vietnamese woman, 24, slim build, 1m58. Oval face, light-warm skin with visible pores,
natural brows, minimal makeup, small mole under left eye. Shoulder-length straight black hair, usually
tucked behind the right ear. Wears an oversized pale sage-green cotton shirt, sleeves rolled to the
elbow, beige straight trousers, white canvas sneakers, thin silver watch on left wrist, black backpack.
```
Giữ: một dấu nhận diện nhỏ (nốt ruồi, đồng hồ), một màu áo dễ nhớ, tên riêng. Đổi trang phục giữa các cảnh
chỉ khi kịch bản có nhảy thời gian, và ghi rõ trong sheet.

## 5. Mẫu prompt một cảnh

```
[MASTER STYLE]
[CHARACTER]
SHOT 03 / 8 seconds / 9:16 vertical, keep the subject centred in the middle third so a 16:9 crop works.
Location: <không gian, đồ đạc cố định, hướng nắng>
Action: <0-2s ...; 2-5s ...; 5-8s ...> (đoạn đẹp nhất đặt ở 2-6s)
Camera: <ống kính, chuyển động, điểm bắt đầu / kết thúc>
Transition in: <cảnh mở bằng gì>   Transition out: <cảnh kết bằng gì che / khớp sang cảnh sau>
Sound: <lớp môi trường gần / xa>
No text, no captions, no logos, no UI text, no watermark.
```

Viết hành động theo từng mốc giây: model làm đúng hơn khi được chia nhịp. Một cảnh một hành động chính.

## 6. Negative prompt chung

```
text, letters, subtitles, captions, logo, watermark, UI, readable screen, signage text, licence plate
text, Chinese characters, Japanese street, European apartment, showroom interior, CGI, 3D render look,
plastic skin, beauty filter, extra fingers, distorted hands, warped face, face changing between frames,
morphing objects, furniture moving, duplicated people, crowd, warped motorbike wheels, fast drone,
whip pan, speed ramp, shaky camera, lens flare overload, neon, purple, pink, oversaturated, posing,
looking at camera, talking, lip movement
```

## 7. Checklist chấm take (bước 5)

Trích khung hình đầu, giữa, cuối và mỗi 1 giây; xem từng ảnh:

- [ ] Có chữ / ký tự lạ ở đâu không (biển hiệu, áo, màn hình, biển số, bao bì)?
- [ ] Tay: đủ ngón, cầm đồ vật đúng, không dính vào đồ?
- [ ] Mặt có trôi so với character sheet giữa đầu và cuối clip?
- [ ] Trang phục, tóc, phụ kiện đúng sheet?
- [ ] Kiến trúc đúng Sài Gòn, đường thẳng không cong vênh, đồ đạc không nhảy chỗ?
- [ ] Hướng nắng khớp các cảnh cùng không gian?
- [ ] Xe máy: bánh tròn, tay lái đúng, không nhân đôi?
- [ ] Nhân vật không nhìn vào ống kính, không mấp máy môi?
- [ ] Đoạn 2-4 giây dùng được có nằm gọn, không bị chuyển động lạ cắt ngang?
- [ ] Đầu / cuối clip có đúng điểm chuyển cảnh đã thiết kế?

## 8. Sửa take lỗi

| Lỗi | Sửa |
|---|---|
| Chữ lạ trên biển hiệu / áo | thêm "out of focus background", áo trơn không hoạ tiết, đổi góc máy tránh biển hiệu; hậu kỳ làm mờ cục bộ |
| Tay méo | để tay ngoài khung hoặc tay đang cầm vật đơn giản; giảm số động tác tay; dùng khung hình đầu có tay đúng |
| Mặt trôi | dùng ảnh tham chiếu mặt, rút clip ngắn lại, tránh quay mặt mạnh; chỉ dùng đoạn mặt đúng |
| Xe máy méo | xe đứng yên, dựng chân chống; xe chạy thì để xa và mờ |
| Ra phố nước khác | thêm chi tiết Sài Gòn cụ thể (gạch bông, song sắt, dây điện), dùng ảnh tham chiếu thật |
| Đồ đạc đổi chỗ giữa cảnh | dùng chung một khung hình đầu cho các cảnh cùng phòng, liệt kê đồ cố định trong prompt |
| Chuyển động máy khựng | ghi "slow continuous dolly, ease in and ease out", bỏ bớt yêu cầu trong một cảnh |

Mỗi lần thử lại chỉ đổi một yếu tố để biết cái gì có tác dụng. Ghi prompt + kết quả vào
`video/tvc/<ten-phim>/prompts.md` để lần sau dùng lại.
