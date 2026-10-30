@echo off
chcp 65001 >nul
title NhaDat Radar - Tu Dong Phan Phoi & Ban Tin
cd /d "%~dp0"

echo.
echo ============================================================
echo   NHADAT RADAR - HỆ THỐNG PHÂN PHỐI TỰ ĐỘNG BĐS
echo   Số Hotline / Zalo: 0387365020
echo ============================================================
echo.

echo [1/3] Đang kiểm tra kết nối Chrome Antigravity (port 9222)...
powershell -Command "$t = Test-NetConnection -Port 9222 -ComputerName localhost -WarningAction SilentlyContinue; if (!$t.TcpTestSucceeded) { Write-Host '  [!] Chrome chua bat remote debugging port 9222. Hay mo shortcut Chrome - Antigravity tren Desktop.' -ForegroundColor Red; exit 1 } else { Write-Host '  [OK] Chrome port 9222 da san sang.' -ForegroundColor Green }"
if errorlevel 1 (
  echo.
  pause
  exit /b 1
)

echo.
echo [2/3] Đang đọc rổ hàng Supabase và sinh bài viết Spintax...
node scripts\daily-group-loop.mjs

echo.
echo ============================================================
echo   CHỌN CHẾ ĐỘ CHẠY TỰ ĐỘNG FACEBOOK
echo ============================================================
echo   1. Đăng bài rổ hàng lên Facebook cá nhân
echo   2. Săn khách thông minh (Đọc khach_tim + Ghép phòng + Tự bình luận + Báo cáo ngày Telegram)
echo   3. Chỉ gửi Báo cáo ngày về Telegram
echo   4. Bỏ qua, chỉ xem trước
echo.
set /p choice="Nhập lựa chọn (1, 2, 3 hoặc 4): "

if "%choice%"=="1" (
  echo.
  echo [3/3] Đang tiến hành đăng bài lên Facebook cá nhân...
  node scripts\daily-group-loop.mjs --post-profile
) else if "%choice%"=="2" (
  echo.
  echo [3/3] Đang chạy Săn khách thông minh & Tự động bình luận...
  node scripts\daily-group-loop.mjs --san-khach
) else if "%choice%"=="3" (
  echo.
  echo [3/3] Đang gửi Báo cáo ngày về Telegram...
  node scripts\daily-group-loop.mjs --bao-cao-ngay
) else (
  echo.
  echo Đã bỏ qua lượt đăng bài.
)

echo.
echo Hoàn tất. Bấm phím bất kỳ để thoát.
pause >nul
