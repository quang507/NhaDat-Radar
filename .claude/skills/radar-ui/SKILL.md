---
name: radar-ui
description: Quy trình UI/UX cho Nhadatradar - dùng TRƯỚC khi sửa bất kỳ giao diện, màn hình, component, luồng người dùng (trang chủ, tìm kiếm, bản đồ, chi tiết tin, đăng tin, đăng nhập, định giá) hoặc khi anh Quang gửi ảnh chụp màn hình báo lỗi giao diện. Gồm token ZEN Kaiz, checklist nhiều khổ màn hình + sáng/tối, các luồng chính và cách kiểm chứng bằng bản production.
---

# Radar UI - làm như một UX/UI lead

Mỗi yêu cầu giao diện: hiểu **khách đang cố làm gì** ở màn đó → sửa ở gốc (component dùng chung) → kiểm trên
**375 / 768 / 1024 / 1440** và **sáng + tối** → báo lại bằng số đo hoặc ảnh, không bằng "chắc là ổn".

Anh Quang hay gửi ảnh chụp + một câu ngắn ("nút đã xác minh như lỗi", "cho cái này lên đầu"). Đọc ảnh kỹ:
khổ màn hình nào, component nào (grep chữ trên ảnh), lỗi là tràn chữ / đè nhau / lặp / sai thứ tự. Câu mơ hồ
thì chọn cách hiểu hợp lý nhất, làm, rồi nói rõ đã hiểu thế nào.

## Nguồn sự thật

- `tailwind.config.ts` - bo góc khoá 2-4px (rounded-lg/xl/2xl đều ra 4px), màu `brand`, `accent`, thang chữ, `shadow-zen-1..4`
- `src/app/globals.css` - biến theme sáng/tối, class popup bản đồ `.ndr-*`
- `CLAUDE.md` mục 2-4 - ISR, ZEN, nghiệp vụ (mã phòng, Zalo, che SĐT rổ hàng)

## Token phải dùng (code mới)

| Cần | Dùng | Không dùng |
|---|---|---|
| Nền trang / thẻ / ô phụ | `bg-[var(--bg)]` / `bg-[var(--surface)]` / `bg-[var(--surface-2)]` | `bg-white`, `bg-slate-*` + `dark:` tự viết |
| Chữ chính / phụ / mờ | `text-[var(--ink)]` / `text-[var(--ink-soft)]` / `text-[var(--ink-faint)]` | `text-slate-*` |
| Viền | `border-[var(--line)]`, đậm hơn `border-[var(--line-strong)]` | `border-slate-*` |
| Thương hiệu | `bg-brand`, `text-brand` (tự đạt AA ở chữ nhỏ), `bg-brand/10` | `#059669` viết cứng |
| Điểm nhấn phụ | `text-[var(--accent)]` / `accent` | cam/vàng tuỳ ý |
| Cỡ chữ | `text-overline` 11, `text-caption` 12, `text-body-sm` 14, `text-body` 16, `text-h4..h1`, `display-*` | `text-[0.65rem]`, `text-[10px]` |
| Bo góc | `rounded-sm` 2px, `rounded` / `rounded-md` 4px, `rounded-full` chỉ cho avatar/chấm/nút tròn icon | `rounded-[12px]`, viên thuốc `rounded-full` cho nhãn chữ |
| Đổ bóng | `shadow-zen-1..4` | bóng đậm, glow |

Cấm: tím/hồng/violet/fuchsia, gradient AI, glassmorphism (`backdrop-blur`), neon.
Nhãn chữ trên ảnh: nền đặc `bg-black/60` hoặc `bg-emerald-600/95`, `whitespace-nowrap`, chừa chỗ nút tim (`right-12`/`right-14`).

## Công thái học

- Vùng chạm ≥ 44px (`min-h-11`) trên điện thoại; nút chỉ icon thì `min-w-11` + `aria-label`.
- Nút Gọi/Zalo cố định đáy màn hình điện thoại - nội dung cuối trang phải chừa chỗ.
- Ô tìm kiếm phải lộ ra ở màn đầu trên 375×812 (khách vào trang chủ để tìm).
- Bản đồ kết quả chỉ có ở `lg+` (MapResults) → nút "Xem bản đồ" ẩn dưới `lg`.
- Chữ trong thẻ hẹp (~160-180px, dải 4 cột): nhãn `whitespace-nowrap`, dòng phụ được xuống hàng (`flex-wrap`), không để chữ bị bóp thành nhiều dòng.

## Luồng chính cần giữ thông

1. Trang chủ → ô tìm kiếm / chip khu vực / "Xem bản đồ" → `/search`
2. `/search` → lọc → danh sách ↔ bản đồ (cụm "N phòng" → pin giá → popup ảnh+giá) → chi tiết tin
3. Chi tiết tin → **Mã phòng** to rõ → Zalo (tự chép tin nhắn + mã) / Gọi hotline / đặt lịch xem
4. Tin web (Chợ Tốt, BĐS) → đăng nhập để xem SĐT (`PhoneReveal`) hoặc xem bài gốc
5. Đăng tin, Định giá AI, Yêu thích

Sửa một màn thì đi lại cả luồng chứa nó, không chỉ chỗ được chỉ.

## Bẫy đã gặp

- Server Component (`app/page.tsx`) **không gọi được hàm** export từ file `"use client"` → để hàm thuần ở `src/lib/`.
- Không `cookies()/headers()/searchParams` trong trang công khai (mất ISR). Build phải ra `/` = `○`, `/listings/[id]` = `●`.
- HTML popup bản đồ là chuỗi: escape bằng `escHtml`, che SĐT tin độc quyền bằng `cheSoVanBan`; class Tailwind trong chuỗi vẫn được quét nhưng ưu tiên class `.ndr-*` ở globals.css.
- MapLibre tự focus link đầu trong popup → đã tắt viền bằng `:focus:not(:focus-visible)`.
- Giữ CRLF ở file đang CRLF (`file <tệp>` để xem). Sửa bằng Edit là giữ được.

## Kiểm chứng

1. `node scripts/kiem-tra-ui.mjs <tệp đã sửa>` - không thêm vi phạm mới (hook PostToolUse cũng tự nhắc).
2. `npm run build` (chạy nền) - kiểm bảng route như trên.
3. Preview `next-prod` (cổng 3001, `.claude/launch.json`). **Build lại thì phải dừng và khởi động lại next-prod.**
4. `resize_window` 1400×900 → `mobile` → (khi cần) 900 / tablet; tối/sáng bằng `colorScheme`.
   Ảnh chụp bị co theo khung 800px: toạ độ zoom = toạ độ CSS × (800 / bề rộng viewport).
   Đè nhau / tràn chữ thì đo bằng `getBoundingClientRect` qua `javascript_tool` - chắc hơn nhìn ảnh.
5. Nhiều trang cùng lúc: `node scripts/chup-man-hinh.mjs` (cần next-prod đang chạy) → ảnh ở `scratch/ui-shots/`.
6. Trả viewport về `desktop`, dừng server.

## Giao việc

Chưa commit khi anh chưa bảo. Mỗi lần commit/push cần anh duyệt lại (duyệt lần trước không tính cho lần sau).
Commit message: tiếng Anh, nói rõ màn nào / vì sao, kèm dòng Co-Authored-By.
