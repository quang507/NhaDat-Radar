@echo off
chcp 65001 >nul
title Cai dat tu dong chay NhaDat Radar
cd /d "%~dp0"

echo.
echo ============================================================
echo   CAI DAT LICH TU DONG CHO NHADAT RADAR (Windows Task Scheduler)
echo ============================================================
echo.
echo Tác vụ sẽ tự động chạy ngầm:
echo   - 11:30 trưa mỗi ngày (tránh giờ GitHub chạy lúc 9h va 15h)
echo   - Chạy ẩn ngầm hoàn toàn (không hiện cửa sổ đen quấy rầy bạn)
echo   - Tự động cào EvoHome, HiFriendz, Facebook va bật bot Zalo
echo.

schtasks /create /tn "NhadatRadar_DailyCrawl" /tr "wscript.exe \"%~dp0CHAY-NGAM.vbs\"" /sc daily /st 11:30 /f

if errorlevel 1 (
  echo.
  echo [CANH BAO] Khong the tao lich tu dong. 
  echo Xin hay chuot phai vao file nay va chon "Run as administrator" (Chay bang quyen Admin).
  echo.
) else (
  echo.
  echo [THANH CONG] Đã cài đặt lịch tự động thành công!
  echo Từ nay mỗi ngày lúc 11:30 máy tính sẽ tự động chạy ngầm cập nhật rổ hàng.
  echo.
)
pause
