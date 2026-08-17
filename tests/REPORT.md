# Báo cáo kiểm thử — NhaDat Radar

**Đợt:** 17/08/2026 · **Bản test:** production `nha-dat-radar-rkyn.vercel.app` (sau merge PR #42, #43)
**Phạm vi:** unit (hàm thuần) + E2E (smoke, luồng xem tin, gallery, yêu thích, search, công cụ) trên desktop Chrome + iPhone 14.

## Kết quả

| Hạng mục | Số ca | Pass | Fail | Ghi chú |
|---|---|---|---|---|
| Unit (`tests/unit/format.spec.ts`) | 11 | **11** | 0 | fmtPrice/shortPrice/fmtPpm2/canonDistrict/fresh/hiRes/cleanImages |
| E2E desktop Chrome (CI, chạy trên production) | 20 | **19** | 0 | 1 skip (ca menu ☰ chỉ chạy mobile) |
| E2E iPhone 14 / WebKit (CI, production) | 20 | **20** | 0 | Gồm vuốt gallery (đếm 2/n, lightbox Esc), ♥, menu ☰ |
| **Tổng run CI 17/8 (lần 3)** | **51** | **50** | **0** | Run xanh: Actions run 32040043404 · báo cáo HTML trong artifact `playwright-report` |
| Test tay (TC-05..09, 17, 19..31) | 19 | **chưa chạy** | — | Cần người thật + tài khoản email/Google — checklist trong `TEST-CASES.md` |

Tốc độ đo được từ CI (runner ở Mỹ, gọi production): trang desktop 0.6–2s, mobile 1.6–3.4s; lần đầu sau cold start ~4s.
17/8 đổi region functions Vercel `hnd1` (Tokyo) → `sin1` (Singapore) để API phản hồi gần khách VN hơn.

> Môi trường CI chạy E2E trên web thật mỗi PR + mỗi sáng 09:30 VN (sau crawl 09:00) — crawl làm vỡ web sẽ phát hiện trong ngày.

## Lỗi phát hiện & trạng thái đợt này

| # | Mức | Mô tả | Trạng thái |
|---|---|---|---|
| 1 | P1 | Gallery thiếu `no-referrer` cho ảnh fbcdn → ảnh tin Facebook vỡ ở trang chi tiết | ✅ Fixed (PR #43) |
| 2 | P1 | Gallery không vuốt được trên mobile, chuyển ảnh bị màn trắng | ✅ Fixed (PR #43 — scroll-snap + preload) |

## Việc cần làm tiếp (ưu tiên)

1. **Chạy 19 ca test tay** theo `TEST-CASES.md` — nhất là TC-24 (RLS), TC-29 (seed không phá tin người dùng), TC-09 (XSS) vì là P0 bảo mật/dữ liệu.
2. Nạp dữ liệu biên `tests/fixtures/test-listings.json` vào một project Supabase **riêng cho test** (đừng nạp vào production) rồi chạy lại E2E với `BASE_URL` trỏ preview.
3. Lỗi mới phát hiện → mở GitHub Issue bằng template 🐛 Báo lỗi.

## Cách chạy

```bash
npm test                 # unit, không cần mạng
npm run test:e2e         # unit + e2e trên production
BASE_URL=<preview-url> npm run test:e2e   # test bản preview của PR
npx playwright show-report tests/report-html   # xem báo cáo HTML
```
