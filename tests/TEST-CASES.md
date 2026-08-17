# Bộ test case NhaDat Radar

Quy ước: **P0** = chặn release (luồng kiếm tiền/dữ liệu), **P1** = quan trọng, **P2** = nên có.
Cột "Tự động" trỏ tới file spec trong `tests/e2e/` (chạy `npm run test:e2e`); ca chưa tự động thì test tay theo bước.

Dữ liệu kiểm thử: `tests/fixtures/test-listings.json` (8 ca biên: thiếu giá, thiếu ảnh, thiếu toạ độ, giá lệch, tin thuê, 12 ảnh, XSS).

## 1. Khách xem tin (chưa đăng nhập)

| ID | P | Kịch bản | Bước | Kỳ vọng | Tự động |
|---|---|---|---|---|---|
| TC-01 | P0 | Mở trang chủ | Vào `/` | Feed hiện tin, không lỗi JS | smoke.spec ✅ |
| TC-02 | P0 | Xem chi tiết tin | Trang chủ → bấm 1 card | Trang chi tiết: tiêu đề, giá, gallery, form liên hệ | listing-flow.spec ✅ |
| TC-03 | P0 | Vuốt gallery | Ở chi tiết tin nhiều ảnh, vuốt ảnh chính | Ảnh trượt mượt có quán tính, bộ đếm nhảy 2/n, không màn trắng | listing-flow.spec ✅ |
| TC-04 | P0 | Lightbox | Bấm ảnh → vuốt/phím →, Esc | Mở đúng ảnh đang xem, vuốt được, Esc đóng | listing-flow.spec ✅ |
| TC-05 | P1 | Tin không giá (test-0002) | Mở chi tiết | Hiện "Thoả thuận", không NaN | tay |
| TC-06 | P1 | Tin không ảnh (test-0003) | Xem card + chi tiết | Card hiện gradient + icon loại, chi tiết không sập | tay |
| TC-07 | P1 | Tin không toạ độ (test-0006) | Mở chi tiết | Không sập; map ẩn hoặc geocode bù | tay |
| TC-08 | P0 | Tin giá lệch (test-0005) | Xem card | Badge ⚠ giá lệch hiện | tay |
| TC-09 | P0 | XSS (test-0008) | Mở card + chi tiết | Tiêu đề hiện dạng text, KHÔNG chạy script | tay |
| TC-10 | P1 | 404 | Mở `/listings/id-không-tồn-tại` | Trang 404 thân thiện, không 500 | smoke.spec ✅ |

## 2. Tìm kiếm & công cụ

| ID | P | Kịch bản | Bước | Kỳ vọng | Tự động |
|---|---|---|---|---|---|
| TC-11 | P0 | Lọc theo tỉnh | `/search?province=Hà Nội` | Chỉ tin Hà Nội | search-tools.spec ✅ |
| TC-12 | P1 | Lọc kết hợp | Chọn quận + khoảng giá + PN | Kết quả khớp mọi điều kiện, URL share được | tay |
| TC-13 | P1 | Không có kết quả | Từ khoá vô nghĩa | Thông báo rỗng + gợi ý, không trang trắng | search-tools.spec ✅ |
| TC-14 | P1 | Bật map kết quả | Toggle map ở /search | Pin giá đúng vị trí, bấm pin ra tin | tay |
| TC-15 | P1 | Máy tính lãi vay | Đổi giá/lãi suất/năm | Số cập nhật ngay không cần bấm nút, biểu đồ vẽ lại | search-tools.spec ✅ |
| TC-16 | P2 | Thống kê giá | Mở `/thong-ke` | Map giá + bảng xếp hạng quận có dữ liệu | smoke.spec ✅ (mở được) |
| TC-17 | P2 | Chatbot | Bấm 💬 hỏi "căn hộ 2PN dưới 3 tỷ Cầu Giấy" | Trả lời + thẻ tin đúng lọc; hết quota Gemini thì fallback keyword vẫn ra tin | tay |

## 3. Yêu thích & tài khoản

| ID | P | Kịch bản | Bước | Kỳ vọng | Tự động |
|---|---|---|---|---|---|
| TC-18 | P0 | ♥ không cần login | Bấm tim trên card → mở `/yeu-thich` | Tim đỏ ngay, tin hiện trong danh sách, badge Nav tăng | listing-flow.spec ✅ |
| TC-19 | P1 | ♥ sync DB | Đăng nhập ở máy khác | Danh sách ♥ gộp 2 chiều | tay |
| TC-20 | P0 | Đăng ký/Đăng nhập email | `/auth` đăng ký → nhận mail → đăng nhập | Vào được dashboard | tay (cần mail thật) |
| TC-21 | P1 | Google OAuth | Bấm "Đăng nhập với Google" | Callback về đúng trang, có session | tay |
| TC-22 | P1 | Quên mật khẩu | `/auth` → quên mật khẩu → link mail → `/auth/doi-mat-khau` | Đổi được, đăng nhập lại OK | tay |

## 4. Người bán (cần đăng nhập)

| ID | P | Kịch bản | Bước | Kỳ vọng | Tự động |
|---|---|---|---|---|---|
| TC-23 | P0 | Đăng tin + ảnh | Dashboard → Đăng tin, upload 3 ảnh | Tin hiện ở feed nguồn "Tự đăng", ảnh hiển thị | tay |
| TC-24 | P0 | RLS: chỉ sửa tin mình | User A thử sửa/xoá tin User B (qua API) | Bị chặn bởi RLS | tay/SQL |
| TC-25 | P0 | Nhận lead | Khách gửi form liên hệ | Lead xuất hiện cho đúng người bán | tay |
| TC-26 | P1 | Nhắn tin | Khách nhắn từ chi tiết tin → `/tin-nhan` | 2 phía thấy hội thoại | tay |
| TC-27 | P1 | Đặt lịch xem nhà | Form đặt lịch ở chi tiết | Lịch được ghi, người bán thấy | tay |
| TC-28 | P2 | Admin duyệt | Tài khoản role=admin mở `/admin` | Thấy công cụ quản trị; user thường bị chặn | tay |

## 5. Pipeline dữ liệu (crawler)

| ID | P | Kịch bản | Bước | Kỳ vọng | Tự động |
|---|---|---|---|---|---|
| TC-29 | P0 | Seed không phá tin người dùng | Chạy `daily.mjs` | Chỉ xoá-chèn `source='crawl'`; tin agent/zalo_oa giữ nguyên | tay/SQL |
| TC-30 | P1 | Dedupe cross-source | Tin trùng ở 2 nguồn | Gộp 1 tin, badge "2 nguồn" | tay |
| TC-31 | P1 | Geocode bù | Tin thiếu lat/lng sau crawl | `geocode-all.mjs` điền đủ | tay |
| TC-32 | P1 | Hàm format/img | — | Đơn vị: fmtPrice, hiRes, cleanImages… | unit/format.spec ✅ |

## Quản lý lỗi

Bug ghi bằng **GitHub Issues** với template `Báo lỗi` (`.github/ISSUE_TEMPLATE/bug_report.yml`):
tiêu đề `[BUG] <trang> — <hiện tượng>`, chọn mức độ (P0 chặn release → P2), kèm bước tái hiện + ảnh chụp.
Quy trình: mở Issue → gắn nhãn `bug` + mức độ → fix trên nhánh → PR ghi `Fixes #<số>` để tự đóng khi merge.
