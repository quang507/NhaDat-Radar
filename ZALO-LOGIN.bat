@echo off
chcp 65001 >nul
title NhaDat Radar - Quet QR Zalo cho bot tren NUC

REM ============================================================
REM  ZALO LOGIN - bam dup la xong.
REM  Bot Zalo chay tren NUC cong ty (systemd radar-zalo-bot, tu 28/10/2026).
REM  File nay mo ma QR cua NUC ngay tren trinh duyet may nay (qua Tailscale),
REM  quet bang Zalo CLONE tren dien thoai -> phien luu tren NUC -> bot bat lai.
REM
REM  LUU Y: file .bat PHAI luu bang line ending CRLF. Neu chi co LF
REM  thi cmd.exe doc hong, moi chu thanh 1 lenh. Xem .gitattributes.
REM ============================================================

echo.
echo   Vai giay nua trinh duyet mo trang QR: http://localhost:18927
echo   Mo Zalo CLONE tren dien thoai, bieu tuong QR o thanh tim kiem, quet ma do.
echo   API Zalo khong chinh thuc, acc co the bi khoa. Chi dung so clone.
echo.
start "" cmd /c "timeout /t 8 >nul & start http://localhost:18927"
ssh -L 18927:127.0.0.1:18927 quang@nuc "~/.local/bin/zalo-agent login --qr-url 2>&1 | grep -v unofficial && sudo systemctl restart radar-zalo-bot && echo && echo Bot da bat lai: $(systemctl is-active radar-zalo-bot)"
if errorlevel 1 (
  echo.
  echo [LOI] Dang nhap that bai hoac khong vao duoc NUC. Dong roi chay lai file nay.
  echo.
  pause
  exit /b 1
)

echo.
echo ============================================================
echo   XONG. Kiem tra bot: KIEM-TRA-ZALO.bat
echo ============================================================
pause
