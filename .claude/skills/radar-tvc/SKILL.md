---
name: radar-tvc
description: Quy trình làm TVC / video quảng cáo cho Nhà Đất Radar bằng AI video (Veo / Google Flow, Seedance) + hậu kỳ HyperFrames, lồng giọng ElevenLabs. Dùng skill này BẤT CỨ KHI NÀO anh Quang muốn làm phim quảng cáo, TVC, Reels / TikTok quảng cáo, video thương hiệu, nghĩ concept, viết kịch bản, storyboard, character sheet, viết prompt cho Veo / Flow / Seedance / Kling, tạo ảnh khung hình chính, chấm clip AI, dựng hậu kỳ, lồng tiếng Matilda, hoặc dán vào một brief / master prompt video, kể cả khi chỉ nói "làm video", "prompt cho Seedance", "ghép clip lại".
---

# Radar TVC - làm như một đạo diễn kiêm editor

Một câu cốt lõi: **AI quay hình, HTML làm chữ.** Model video giỏi ánh sáng, chất liệu, chuyển động người;
nó vẽ sai dấu tiếng Việt, bịa giao diện và chế số. Vì thế mọi chữ, logo, giao diện Radar, số hotline
đều dựng ở hậu kỳ, còn model chỉ quay người và không gian.

Phim AI trông "rời rạc" không phải do thiếu một prompt thần kỳ. Nó rời rạc vì từng cảnh được tạo riêng,
không ai thiết kế cú chuyển. Thứ làm phim liền mạch là: khoá nhân vật + khoá không gian bằng ảnh tĩnh,
chuyển cảnh có lý do, và dựng có nhịp. Skill này đi theo đúng thứ tự đó.

## Đọc gì, khi nào

| Khi | Đọc |
|---|---|
| Bắt đầu bất kỳ phim nào | `references/thuong-hieu-va-luat.md` (được nói gì, cấm gì, bảo mật rổ hàng) |
| Viết storyboard, chọn cú chuyển, chọn ống kính | `references/ngu-phap-dung.md` |
| Viết prompt ảnh / video, chọn Veo hay Seedance, sửa take lỗi | `references/prompt-video.md` |
| Dựng, lồng tiếng, nhạc, render | `references/hau-ky.md` + skill `hyperframes:hyperframes` |

Brief mẫu đã duyệt: `video/TVC-BRIEF.md`. Video Remotion cũ để tham khảo màn giao diện: `video/src/scenes/`.

## Quy trình 6 bước, dừng chờ duyệt sau mỗi bước

Anh Quang duyệt từng bước. Mỗi bước kết thúc bằng thứ cụ thể để duyệt, rồi dừng. Đừng nhảy cóc sang tạo
video khi concept chưa chốt: tạo video tốn tiền thật, còn sửa chữ trên giấy thì miễn phí.

### Bước 1. Concept
Đưa 3 concept khác hẳn nhau (không phải 3 biến thể của một ý). Mỗi concept: tên, big idea 1 dòng,
3 hồi, vì sao hợp khán giả, **rủi ro khi làm bằng AI** (cảnh nào model hay hỏng). Đề xuất 1 và nói lý do.
Ưu tiên concept có ít cảnh rủi ro: cảnh tĩnh, một nhân vật, không đám đông, không xe đang chạy, không tiền mặt.
Nghĩ trước cho người xem tắt tiếng (đa số Reels / TikTok): nhịp phải đọc được bằng hình.

### Bước 2. Kịch bản + storyboard
Bảng theo mốc giây, mỗi cảnh có: hình ảnh, góc máy + chuyển động máy + ống kính, âm thanh môi trường,
lời đọc, chữ trên màn hình (chèn hậu kỳ), **cú chuyển sang cảnh sau và vật gì gây ra cú chuyển đó**.
Mặc định nhịp 30 giây: 0-8 đồng cảm nỗi khổ, 8-20 khám phá Radar, 20-26 nhẹ nhõm, 26-30 màn kết.
Lời đọc 60-75 từ cho 30 giây, số viết bằng chữ. Ghi rõ cảnh nào là clip AI, cảnh nào là màn HTML.

### Bước 3. Bộ ảnh tĩnh (khung hình chính)
Trước khi tạo video, làm ảnh tĩnh: character sheet (mặt thẳng, nghiêng, toàn thân, đúng trang phục)
và 1 khung hình đầu cho mỗi cảnh AI. Đây là chỗ khoá mặt nhân vật, màu và chất Sài Gòn, với giá rẻ và sửa
nhanh. Ảnh tham chiếu bối cảnh nên là ảnh team tự chụp hoặc ảnh tạo mới, **không dùng ảnh phòng rổ hàng
đối tác** (lộ nguồn). Nhân vật là người do AI tạo, không dùng ảnh nhân viên thật.
Tạo ảnh: model ảnh của Gemini qua `GEMINI_API_KEY` (báo chi phí trước), hoặc anh Quang tạo trong Flow
rồi bỏ vào thư mục. Viết prompt ảnh theo cùng MASTER STYLE + character sheet của bước 4.
Giao: thư mục `video/tvc/<ten-phim>/keyframes/` + bảng cảnh ↔ ảnh để duyệt.

### Bước 4. Gói prompt video / tạo clip
Viết MASTER STYLE, character sheet bằng chữ (lặp nguyên văn trong mọi prompt), prompt từng cảnh dán thẳng
được, negative prompt, mẹo tạo lại. Mẫu và luật ở `references/prompt-video.md`.
Chưa chốt model thì chạy A/B: 2 cảnh khó nhất, cùng khung hình đầu, cả Veo và Seedance, đặt cạnh nhau.
Gọi API tạo video tốn tiền: báo số clip × số lần thử × đơn giá ước tính và chờ anh đồng ý trước khi chạy.

### Bước 5. Chấm take
Clip về `video/tvc/<ten-phim>/clips/`. Trích khung hình (đầu, giữa, cuối + mỗi 1 giây) và tự xem từng
take theo checklist ở `references/prompt-video.md` (chữ lạ, tay, mặt trôi, biển số, kiến trúc sai,
đồ đạc nhảy chỗ). Loại take hỏng, ghi lý do, đề xuất prompt sửa. Diễn xuất có "chạm" hay không là phần
anh Quang duyệt; đưa ra 1-2 take tốt nhất mỗi cảnh kèm ảnh khung hình.

### Bước 6. Hậu kỳ
Dựng bằng HyperFrames trong `video/tvc/<ten-phim>/`: cắt theo storyboard, chỉnh màu đồng đều, giọng
Matilda qua `video/scripts/long-tieng.mjs`, nhạc + SFX, chữ góc, màn giao diện Radar dựng bằng HTML theo
token ZEN Kaiz, màn kết. Render 9:16 và 16:9. **Xem lại từng khung trước khi báo xong**: trích ảnh ở mỗi
cú chuyển và mỗi dòng chữ, kiểm dấu tiếng Việt, vùng an toàn, chữ không đè mặt. Chi tiết: `references/hau-ky.md`.

## Luật không thương lượng (tóm tắt, chi tiết trong references)

- Chỉ nói tính năng có thật: gom tin về một chỗ, bóc 5 khoản phí, bản đồ + lọc quận/giá/diện tích, ảnh thật,
  nút Zalo chép sẵn mã phòng, Radar hẹn xem phòng. Không "rẻ nhất", "100% chính chủ", "miễn phí môi giới".
- Phòng trong phim là minh hoạ: không gắn giá, mã phòng, địa chỉ thật lên phòng AI tạo.
- Mọi prompt cảnh quay có câu `no text, no captions, no logos, no UI text, no watermark`. Màn hình điện thoại
  trong cảnh thì quay nghiêng / mờ. Không lời thoại trong cảnh, giọng lồng sau.
- Chất Sài Gòn thật: hẻm, nhà ống, ban công nhiều cây, xe máy, nắng chiều. Không căn hộ kiểu châu Âu.
- ZEN Kaiz: xanh ngọc `#10B981` / `#059669`, nền mực `#0B1220`, chữ `#F8FAFC`, Inter, bo góc ≤ 4px.
  Cấm tím/hồng, neon, gradient "AI rực rỡ".
- Hotline / Zalo duy nhất: **0387 365 020**. Caption đăng kèm phim đi qua bộ lọc Humanizer của
  `docs/QUY-TRINH-PHAN-PHOI-MARKETING.md` (không gạch ngang dài, không link ngoài trong caption).

## Bẫy đã gặp

- Master prompt "một prompt ra cả phim 30 giây" trên mạng là chiêu câu tương tác. Model nào cũng tạo theo
  đoạn ngắn; lấy phần ngữ pháp dựng của chúng, bỏ phần bắt model vẽ chữ.
- Master prompt villa / luxury cấm lời đọc, cấm CTA, cấm số điện thoại: trái phễu Radar. Radar luôn kết bằng
  "Nhắn Zalo kèm mã phòng" + hotline.
- `zalo.me/<số>` bỏ qua `?text=`, nên phim nói "mã phòng được chép sẵn, chỉ cần dán và gửi", không nói
  "tin nhắn tự điền".
- Máy chưa có `ffmpeg` trên PATH (Remotion có bản riêng). Cần trích khung / chỉnh màu thì cài hoặc dùng bản
  đi kèm, báo anh nếu phải cài.
- Khoá ở `video/.env` (ElevenLabs) và `.env*` gốc (`GEMINI_API_KEY`). Chỉ đọc tên biến, không in giá trị.
