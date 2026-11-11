# 08 · Kế hoạch điều tra & sửa lỗi UX theo thứ tự Khởi nguồn -> Kéo theo (11/2026)

> Nguyên tắc cốt lõi (theo khung DAS UX Research & Strategy + Jesse James Garrett 5 Elements of UX):
> **Không sửa triệu chứng bề mặt (`Surface`) trước khi kiểm chứng gốc rễ (`Dữ liệu & Đo lường` -> `Nghiên cứu hành vi` -> `Kiến trúc thông tin` -> `User Flow`).**

---

## Sơ đồ nhân quả (Khởi nguồn -> Kéo theo)

```mermaid
flowchart TD
  S0["TẦNG 0 · KHỞI NGUỒN DỮ LIỆU & ĐO LƯỜNG<br/>• su_kien thiếu cột nguon / thiet_bi (chưa chạy migration)<br/>• 93,2% rổ hàng (HiFriendz) thiếu điện/nước/xe/cọc & có watermark<br/>• 0/500 tin rổ hàng có link video; 12 tin lỗi font specs"] --> S1["TẦNG 1 · KHỞI NGUỒN TÂM LÝ (Buổi 1–5)<br/>• Phỏng vấn thật & Affinity Map để biết khách rơi vì thiếu phí/watermark hay ngại Zalo/SĐT"]
  S1 --> S2["TẦNG 2 · KIẾN TRÚC THÔNG TIN (Buổi 7 / Structure)<br/>• Thẻ 'Có video thực tế' (?ti=video) không có bộ lọc video<br/>• /search đẩy tin xuống dưới màn đầu vì phân trang trên lưới<br/>• Dùng chung 1 bảng phí 9 ô trống 'Hỏi Radar ›' cho tin thiếu dữ liệu"]
  S2 --> S3["TẦNG 3 · USER FLOW & EDGE CASE (Buổi 6)<br/>• NutZalo 2 bước Chép + Dán dễ rơi trên Desktop & WebView<br/>• Chat AI ở trang chi tiết trễ ~14s qua Gemini<br/>• Tin crawl giấu form hỗ trợ trong thẻ thu gọn"]
  S3 --> S4["TẦNG 4 · GIAO DIỆN & KIỂM CHỨNG (Surface / PURE / Usability Test)<br/>• Mobile: nút Hỏi AI đè '1/6 · Phóng to', thanh đáy mờ giá, lặp mã 3 lần<br/>• Desktop: sidebar cuộn nội bộ cắt nút Hotline & che QR<br/>• Kiểm chứng lại bằng PURE + Usability Test 5 người dùng thật"]
```

---

## Giai đoạn 0 · KHỞI NGUỒN DỮ LIỆU & ĐO LƯỜNG (Làm trước tiên)

**Mục tiêu:** Đảm bảo công cụ đo nhìn đúng người thật và biết rõ kho dữ liệu nguồn thực sự có gì trước khi thiết kế cách hiển thị.

- [ ] **0.1. Bật đủ đo nguồn (`nguon`) & thiết bị (`thiet_bi`) trong `su_kien`:**
  - Đã kiểm tra Supabase production REST API: cả 3 migration `037_gioi_han_xem_sdt.sql` (`PGRST202 public.lay_sdt_tin`), `038_khoa_ghi_va_gioi_han.sql` (`PGRST205 public.gioi_han_luot`), và `039_su_kien_nguon.sql` (`42703 column su_kien.nguon does not exist`) **chưa được chạy trong Supabase SQL Editor**.
  - Chờ chạy `039` trước (an toàn ngay lập tức), sau khi deploy bản web mới mới chạy `037` và `038`.
- [ ] **0.2. Lọc nhiễu nội bộ & bot khỏi dữ liệu hành vi:**
  - Đã xác nhận `src/app/api/su-kien/route.ts` đã bỏ qua phiên admin (`laAdmin`).
  - Cần mở GA4 + Microsoft Clarity để tách đột biến 790 lượt/790 `khach` ngày 05/11 khỏi 10–21 khách thật/ngày.
- [x] **0.3. Rà soát & sửa nguồn gốc dữ liệu HiFriendz, Video & Mojibake (`ro_hang`):**
  - Probe live RSC `https://hifriendz.com/du-an/<id>` xác nhận `detailsById[roomId]` có đủ `fees` (Điện, Nước, Gửi xe, Dịch vụ), `regulations` (Cọc, Hợp đồng, Số người, Thú cưng, Giờ giấc), `furniture`, `amenities`. Đã cập nhật `crawler/hifriendz-fetch.mjs` và test live 3 tòa (11/11 phòng đạt 4/4 khoản phí và 4–5/5 điều khoản; chờ chạy full trên máy 146).
  - Xác nhận 3.538 tin `published` (5.371 tin mọi trạng thái) đã có link video (`.mp4`...) trong `images` nhưng thiếu khóa `"video"` trong `amenities`. Đã cập nhật `crawler/ro-hang-evohome.mjs` và backfill xong **3.538 tin `published`** trên Supabase.
  - Đã sửa dứt điểm lỗi mã hóa `?` mojibake trên toàn bộ **12 tin** `doc_quyen_270_thong_nhat_*` (`province`, `district`, `address`, `title`, `description`, `specs`, `furnishing`, `poster_reasons`, và `listing_ro_hang`: còn `0` lỗi `?`).
- [ ] **0.4. Kiểm tra Clarity Recordings & lỗi màn trắng `/dashboard/new`:**
  - Đã tạo [`src/app/error.tsx`](src/app/error.tsx) (`reset`, nút Về trang chủ, gửi GA `ndr_client_error`) và bọc `translate="no"` + keyed `<span>` trong `ListingForm.tsx` tránh xung đột DOM khi trình duyệt tự dịch.
  - Còn làm (bạn mở trực tiếp): kiểm tra tab JS errors trên Microsoft Clarity Recordings để đối chiếu ca lỗi thực tế.

**Tiêu chí hoàn thành Giai đoạn 0:** Biết rõ tỷ lệ Mobile/PC theo từng nguồn truy cập, chốt được danh sách trường dữ liệu thật sự khai thác được từ HiFriendz/EvoHome.

---

## Giai đoạn 1 · KHỞI NGUỒN HÀNH VI (Buổi 1–5: Interview -> Synthesize -> Persona & Journey Map)

**Mục tiêu:** Thay toàn bộ giả thuyết `[SUY]` / `[GIẢ ĐỊNH]` trong `docs/ux/02..06` bằng bằng chứng phỏng vấn thật.

- [x] **1.1. Sửa kịch bản phỏng vấn (`05-research-plan.md`) theo chuẩn Buổi 3:** Đã chuẩn hóa theo 5W1H (60–80% cho *How/Why*), 4 quy tắc (*Mở, Trung lập, Quá khứ, Trải nghiệm*), tách riêng kịch bản Khách thuê, Chủ trọ và 3 Task Usability Test.
- [ ] **1.2. Phỏng vấn 2 nhóm `Manage Closely` (Power × Interest, Buổi 4):**
  - **5–6 khách thuê:** Người từng xem >= 3 tin rồi thoát hoặc từng nhắn Zalo / để lại SĐT. Xác minh phản ứng thật với logo watermark `HiFriendz`, bảng `1/5 khoản phí`, nút `Zalo` (bước Dán mã) và ô SĐT 1 chạm mới.
  - **2–3 chủ trọ / đối tác rổ hàng:** Kiểm tra khả năng cung cấp bảng phí chuẩn & video quay sẵn theo tòa nhà.
- [ ] **1.3. Tổng hợp Affinity Mapping (KJ Method) & cập nhật Persona / Journey Map (Buổi 4–5):**
  - Nhóm sticky notes theo ý nghĩa (kèm mã `P01..`, giữ cả ý kiến trái chiều), tổng hợp trong 24–48h.
  - Viết lại **Problem Statement**: `[Người thuê] cần [nhu cầu] vì [insight thật]`.
  - Xác định lại **Moment of Truth** trên Journey Map -> rút ra danh sách **How Might We (HMW)** và chấm **Impact × Effort**.

---

## Giai đoạn 2 · KÉO THEO 1: KIẾN TRÚC THÔNG TIN (Buổi 7 · Information Architecture & Scope)

**Mục tiêu:** Cấu trúc danh mục, bộ lọc và phân tầng nội dung trên trang khớp 100% với dữ liệu thật, không hứa sai.

- [x] **2.1. Kiểm toán toàn bộ link & chip dẫn vào từ Trang chủ (`src/app/page.tsx`):**
  - Đã thêm `"video"` vào `TIEN_ICH` + `tienIchCua` (`src/lib/tien-ich.ts`) để `/search?deal=cho_thue&ti=video` trả đúng phòng có video thật.
  - Kiểm tra DB xác nhận 10/10 link trường ĐH & điểm neo (`HeroTimKiem.tsx`), 7/7 danh mục `CATS`, và 7/7 chip tiện ích đều trỏ đúng route/bộ lọc thật (>0 kết quả; riêng `gio_tu_do` chạy theo fallback chữ mô tả và sẽ có khóa trực tiếp sau khi chạy lại HiFriendz).
  - Làm rõ chữ trên badge Hero: `"tin cho thuê toàn quốc"` khớp route `/nha-dat-cho-thue` (phân biệt rõ với bộ lọc mặc định TP.HCM ở `HeroTimKiem`).
- [x] **2.2. Sắp xếp lại ưu tiên màn hình đầu `/search` (`src/app/search/SearchClient.tsx`):** Đã ẩn thanh phân trang phía trên lưới kết quả trên mobile (`hidden sm:block`), giữ phân trang dưới lưới để thẻ phòng hiện ngay trong màn hình đầu mobile.
- [x] **2.3. Thiết kế 3 mẫu hiển thị tin theo độ đủ dữ liệu (`src/app/listings/[id]/page.tsx`):**
  - Rổ hàng đủ phí (5/5) & thiếu phí (`!coPhiPhu` / `!coDieuKhoan`): bỏ 9 dòng `Hỏi Radar ›` trống trải, giữ `Tiền phòng` + ghi chú trung thực + 1 CTA Zalo.
  - Tin `crawl` & tin đã gỡ (`isGone`): bổ sung nút chuyển ngay về khu vực tương đương trong banner `isGone` và làm nổi thẻ mở form `"Nhờ Radar tìm & lọc căn tương tự miễn phí"` thay cho `<summary>` trơn.
- [x] **2.4. Quét kiến trúc các trang phụ:** Đã rà code các trang `/nha-dat-ban`, `/projects/[id]`, `/dinh-gia`, `/lap-phong`, `/yeu-thich`, `/auth`.

---

## Giai đoạn 3 · KÉO THEO 2: USER FLOW & EDGE CASE (Buổi 6 · Nhánh quyết định & Lối thoát)

**Mục tiêu:** Đảm bảo 5 luồng chính không còn điểm đứt gãy, không có ngõ cụt (theo checklist *Nhánh lỗi & edge case*: đủ nhánh Có/Không, mọi lỗi đều có lối ra).

- [x] **3.1. Flow Google/Ads -> Chi tiết tin -> Chuyển đổi:** Đã thêm lối thoát trực tiếp ở banner `isGone` về trang khu vực cùng quận/tỉnh; kiểm tra `/yeu-thich` đã có lỗi mạng `WifiOff + Thử lại` và bảng so sánh tối đa 4 căn.
- [x] **3.2. Flow `NutZalo` (`src/components/TheoDoi.tsx`):** Đã thêm fallback nhắc giữ mã & hướng dẫn để lại SĐT ngay trên trang khi WebView chặn clipboard, hỗ trợ chạm tắt toast.
- [x] **3.3. Flow Form SĐT gọi lại (`listings/actions.ts`):** Chuẩn hóa `chuanSdt` xử lý trọn vẹn `+84`, `84`, dấu ngoặc, dấu chấm và khoảng trắng về đầu `0` thống nhất trước khi lưu `leads` & gửi Telegram/Zalo bot 146.
- [x] **3.4. Flow Trợ lý AI (`ChatWidget.tsx`, `ChatPanel.tsx`, `/api/chat/route.ts`):** Đã thêm fast-path `traLoiNhanhTinDangXem` (<0,3s từ DB, 0 tốn Gemini) cho các câu hỏi về phòng đang xem/mã `RH`, nối ngữ cảnh tin đang xem cho `"Xem căn giá mềm hơn"`, và thêm nút `Nhắn Zalo` ngay trong bọt báo lỗi AI.
- [x] **3.5. Flow Mobile Bottom Bar (`ChatWidget.tsx`):** Đổi nền thanh đáy `Gọi ngay | Zalo | AI` sang nền đặc `bg-[var(--surface)]` có đổ bóng rõ, hết mờ xuyên nội dung.

---

## Giai đoạn 4 · KÉO THEO 3: BỀ MẶT GIAO DIỆN & KIỂM CHỨNG (Heuristic, PURE & Usability Test)

**Mục tiêu:** Sửa dứt điểm các lỗi hiển thị/che khuất trên mọi khổ màn hình và xác nhận bằng người dùng thật sau khi hoàn tất Giai đoạn 0–3.

- [ ] **4.1. Sửa các lỗi va chạm UI đã ghi nhận:**
  - Đã sửa `Gallery.tsx`, `listings/[id]/page.tsx` & `SaveSearchButton.tsx`: dời `1/6 · Phóng to` sang `bottom-3 left-3 sm:left-auto sm:right-3`, chấm slide mobile sang góc dưới phải, thanh đáy mobile đặc nền & bỏ lặp `NutChepMa` (cũng bỏ lặp trên ảnh `Gallery`), bỏ `lg:overflow-y-auto` ở cột phải desktop, thêm nhãn `"Nhận tin"` / `"Đã lưu"` rõ nghĩa cho `SaveSearchButton` bản gọn.
  - Còn làm: phương án xử lý watermark ảnh HiFriendz sau kết luận phỏng vấn Giai đoạn 1.
- [x] **4.2. Kiểm tra đa khổ & đa giao diện:** Đã kiểm tra thực tế trên Chrome DevTools ở các khổ `375×812`, `390×844`, `768×1024`, `1440×900` ở cả Light mode lẫn Dark mode (`html.dark`).
- [ ] **4.3. Chấm điểm PURE lại toàn bộ 5 Flow:** Xác nhận không còn bước nào mức điểm `3` (tắc/bỏ cuộc).
- [ ] **4.4. Usability Test (Assessment Test — 5 người dùng thật):** Chạy 3 task ngữ cảnh thực tế trên điện thoại cá nhân của người tham gia (Tìm & lọc -> Đọc tin & kiểm tra tổng chi phí -> Chốt liên hệ), chấm điểm dễ dùng **SEQ (1–5)** và đối chiếu **Clarity Dead Clicks + tỷ lệ `leads` / `xem` trong `su_kien`** sau 7 ngày.
