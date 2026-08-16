# Chạy crawler trên máy của bạn (để Facebook lấy được bài)

> **Vì sao?** GitHub Actions dùng IP trung tâm dữ liệu → Facebook chặn, trả 0 bài.
> Máy bạn ở Việt Nam dùng IP nhà mạng (dân cư) → Facebook coi là người thật → lấy bài bình thường.
> Các nguồn khác (Chợ Tốt, Mogi, batdongsantoanquoc…) chạy ở đâu cũng được. Batdongsan.com.vn cần Playwright
> (`npm install` đã kèm, browser: `npx playwright install chromium`) — máy nhà qua Cloudflare ổn, CI thì hên xui.

## Cài 1 lần

1. **Cài Node.js**: tải bản **LTS** tại https://nodejs.org → cài (bấm Next tới hết).

2. **Tải code về máy** — mở **PowerShell** (hoặc CMD) tại thư mục bạn muốn, chạy:
   ```
   git clone https://github.com/quang507/NhaDat-Radar.git
   cd NhaDat-Radar
   ```
   *(Không có git thì bấm nút xanh **Code → Download ZIP** trên GitHub rồi giải nén.)*

3. **Tạo file `.env.local`** trong thư mục `NhaDat-Radar`:
   - Copy file `.env.local.example` → đổi tên thành `.env.local`
   - Mở bằng Notepad, điền (lấy từ Vercel → Settings → Environment Variables):
     ```
     NEXT_PUBLIC_SUPABASE_URL=https://dlpedtfmbtuxmgrdnhij.supabase.co
     SUPABASE_SERVICE_ROLE_KEY=eyJ... (key service_role)
     GEMINI_API_KEY=AIza...
     FB_GROUP_URLS=["https://facebook.com/groups/xxx","https://facebook.com/groups/yyy"]
     FB_POSTS=30
     ```

4. **Đặt cookie Facebook**: export bằng extension **Cookie-Editor** (tài khoản clone) → lưu cả mảng JSON vào file:
   ```
   crawler\fb-cookies.json
   ```

## Chạy

**Cách 1 — bấm đúp:** mở file **`crawl-local.bat`** (bấm đúp). Lần đầu nó tự cài thư viện + Chromium (~vài phút), các lần sau chạy nhanh.

**Cách 2 — gõ lệnh:**
```
node --env-file=.env.local crawler/daily.mjs
```

Chạy xong nhìn log:
- `FB: nhóm ... -> N bài` → Facebook lấy được bài ✅
- `✅ ...: làm mới N tin` → đã cập nhật lên web

Mở web bấm **Ctrl+Shift+R** để thấy tin mới.

## Tự động hằng ngày (tuỳ chọn)

Dùng **Task Scheduler** của Windows:
1. Mở **Task Scheduler** → Create Basic Task
2. Trigger: Daily, 7:00 sáng
3. Action: Start a program → chọn file `crawl-local.bat`
4. Máy phải **bật** vào giờ đó thì task mới chạy.

## Lưu ý

- **Chỉ dùng tài khoản Facebook CLONE** để cào (đừng acc chính — FB có thể khoá acc bị phát hiện cào).
- Cookie sống ~vài tuần → khi FB ngừng ra bài, export cookie mới ghi đè `crawler\fb-cookies.json`.
- Nhóm FB phải **public** (hoặc acc clone đã là thành viên được duyệt).
- Nếu chỉ muốn chạy riêng Facebook (nhanh hơn): `node --env-file=.env.local crawler/facebook.mjs --playwright`
