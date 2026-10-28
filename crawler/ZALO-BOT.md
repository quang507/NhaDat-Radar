# Zalo bot (không cần OA / giấy phép kinh doanh)

Dùng tài khoản Zalo **clone** + [zalo-agent-cli](https://github.com/PhucMPham/zalo-agent-cli) để:
1. **Nghe tin trong group BĐS** → AI bóc thành tin đăng → vào DB (chờ duyệt ở `/admin`).
2. ~~Trợ lý chat 1-1~~: TẮT - bot bỏ qua tin 1-1, không trả lời trong chat (`sendReply` khoá cứng).
3. **Đăng phòng rổ hàng lên nhóm CHO THUÊ theo khu vực** (`crawler/zalo-dang-nhom.mjs`, 29/10/2026): mỗi nhóm tối đa 1 tin/ngày, giờ rải ngẫu nhiên 08:30-19:30, chỉ phòng đúng khu vực nhóm, không đăng vào nhóm mua bán.

Từ 28/10/2026 bot chạy 24/7 trên NUC công ty: xem [`deploy/nuc/README.md`](../deploy/nuc/README.md).

> ⚠ API Zalo không chính thức — **chỉ dùng số clone**, có thể bị Zalo khoá. Đăng tin đừng dồn dập (dễ bị gắn cờ spam).
> Chạy trên **máy/VPS** (giữ phiên đăng nhập), KHÔNG chạy trên Vercel.

## Cài (1 lần)
```
npm i -g zalo-agent-cli
zalo-agent login          # quét QR bằng Zalo clone trên điện thoại
```
Kiểm tra tên lệnh thật: `zalo-agent --help`, `zalo-agent message --help`, `zalo-agent listen --help`.

## Cấu hình `.env.local`
Như crawler (SUPABASE + GEMINI), thêm:
```
ZALO_CLI=zalo-agent
ZALO_BO_QUA_NHOM=id1,id2      # nhóm bot KHÔNG đọc (nhóm nội bộ / riêng tư)
ZALO_DANG_TOI_DA=10           # tối đa số tin đăng nhóm mỗi ngày (mặc định 10)
ZALO_DANG_CACH_PHUT=25        # hai lượt đăng cách nhau tối thiểu (phút)
```

Nhóm nào cho thuê / mua bán và thuộc khu vực nào nằm ở `crawler/private/zalo-nhom.json` (không vào git):
```
{ "nhom": [ { "id": "<mã nhóm>", "ten": "Phòng trọ Gò Vấp", "loai": "thue", "khu_vuc": ["Gò Vấp", "Quận 12"] } ] }
```
`loai`: `thue` / `ca_hai` (được đăng), `ban` / `chua_xep` (chỉ đọc). `khu_vuc`: tên quận (`Gò Vấp`, `Quận 7`, `Thủ Đức` gồm cả Quận 2, 9 cũ, `Dĩ An`) hoặc cả tỉnh (`Hồ Chí Minh`, `Bình Dương`). `kind` tuỳ chọn, mặc định `["phong_tro", "can_ho"]`.

## Chạy
- **Nghe group + trợ lý 1-1** (chạy nền liên tục):
  ```
  node --env-file=.env.local crawler/zalo-bot.mjs
  ```
- **Đăng phòng lên nhóm cho thuê** (timer `radar-zalo-dang` trên NUC gọi 15 phút/lần, mỗi lượt tối đa 1 tin):
  ```
  node --env-file=.env.local crawler/zalo-dang-nhom.mjs nhom    # liệt kê nhóm acc đang ở, thêm nhóm mới (chua_xep)
  node --env-file=.env.local crawler/zalo-dang-nhom.mjs --thu   # xem lịch + bài sẽ đăng, KHÔNG gửi
  ```
  Gửi lỗi thì tự dừng đăng 24 giờ và báo Telegram; bot đọc tin vẫn chạy.

## ⚙ Adapter (đã khớp CLI thật)
Adapter trong `crawler/zalo-bot.mjs` đã viết theo cú pháp thật của `zalo-agent-cli`:
- Gửi: `zalo-agent msg send -t 0|1 <threadId> <message>` (0=chat 1-1, 1=group).
- Nghe: `zalo-agent --json listen -e message -f all --no-self` (`--json` là option toàn cục, đặt TRƯỚC `listen`).
- Field JSON của event đọc linh hoạt (`data.content/uidFrom/threadId`, ThreadType số 0/1) — nếu bản CLI mới đổi tên field, chỉ sửa khối map field trong `startListener()`.

Nếu 0 nhận/gửi được: chạy thử, dán log — chỉnh đúng khối đó, đừng viết lại file.
