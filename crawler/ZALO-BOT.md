# Zalo bot (không cần OA / giấy phép kinh doanh)

Dùng tài khoản Zalo **clone** + [zalo-agent-cli](https://github.com/PhucMPham/zalo-agent-cli) để:
1. **Nghe tin trong group BĐS** → AI bóc thành tin đăng → vào DB (chờ duyệt ở `/admin`).
2. **Trợ lý chat 1-1**: khách nhắn → đăng tin / tìm nhà tự động.
3. **Đăng tin lên group** định kỳ (kèm link web).

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
ZALO_POST_GROUPS=["groupId1","groupId2"]   # id group để đăng tin (chế độ post)
ZALO_POST_COUNT=3
```

## Chạy
- **Nghe group + trợ lý 1-1** (chạy nền liên tục):
  ```
  node --env-file=.env.local crawler/zalo-bot.mjs
  ```
- **Đăng tin lên group** (chạy 1 lần, hoặc hẹn giờ):
  ```
  node --env-file=.env.local crawler/zalo-bot.mjs post
  ```

## ⚙ Adapter (đã khớp CLI thật)
Adapter trong `crawler/zalo-bot.mjs` đã viết theo cú pháp thật của `zalo-agent-cli`:
- Gửi: `zalo-agent msg send -t 0|1 <threadId> <message>` (0=chat 1-1, 1=group).
- Nghe: `zalo-agent --json listen -e message -f all --no-self` (`--json` là option toàn cục, đặt TRƯỚC `listen`).
- Field JSON của event đọc linh hoạt (`data.content/uidFrom/threadId`, ThreadType số 0/1) — nếu bản CLI mới đổi tên field, chỉ sửa khối map field trong `startListener()`.

Nếu 0 nhận/gửi được: chạy thử, dán log — chỉnh đúng khối đó, đừng viết lại file.
