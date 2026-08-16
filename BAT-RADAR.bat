@echo off
chcp 65001 >nul
REM ============================================================
REM  BAT RADAR — bấm đúp là xong. Dùng khi:
REM   - vừa cài máy mới / vừa đổi ecosystem.config.cjs
REM   - pm2 status không thấy zalo-bot online
REM  Việc nó làm: vào đúng thư mục repo -> giao danh sách việc cho pm2
REM  -> ghi sổ (pm2 save) để lần sau bật máy tự chạy -> hiện trạng thái.
REM  (Bình thường KHÔNG cần chạy: pm2 tự dậy khi đăng nhập Windows.)
REM ============================================================
cd /d "%~dp0"
echo [1/3] Giao danh sach viec cho pm2 (zalo-bot, crawl-on-boot, daily-crawl, zalo-post)...
call pm2 start ecosystem.config.cjs
echo [2/3] Ghi so de tu chay khi bat may...
call pm2 save
echo [3/3] Trang thai:
call pm2 status
echo.
echo Xem log bot:   pm2 logs zalo-bot
echo Cao ngay:      pm2 restart daily-crawl
echo Dung tat ca:   pm2 stop all
echo.
pause
