@echo off
chcp 65001 >nul
title NhaDat Radar - Kiem tra bot Zalo tren May 146 (NguyetTu)

REM Bot Zalo chay tren May 146 cong ty (Task Scheduler "Radar Zalo bot", tu 05/11/2026), khong chay o may nay.
REM Can Tailscale dang bat.

echo.
echo ============================================================
echo   KIEM TRA BOT ZALO TREN MAY 146 (NGUYETTU)
echo ============================================================
echo.
ssh quang@nuc "echo [1/3] Task Scheduler: & schtasks /Query /TN \"Radar Zalo bot\" /FO LIST | findstr /I \"Status Task\" & echo. & echo [2/3] Dang nhap Zalo: & call C:\radar\radar_env.cmd & node C:\radar\tools\node_modules\zalo-agent-cli\src\index.js status 2>&1 | findstr /V \"unofficial\" & echo. & echo [3/3] 20 dong log moi nhat: & powershell -NoProfile -Command \"Get-Content C:\radar\logs\zalo-bot.log -Tail 20\""
if errorlevel 1 echo [LOI] Khong vao duoc May 146. Kiem tra Tailscale tren may nay.

echo.
echo ============================================================
echo   Neu bao "Not logged in": chay ZALO-LOGIN.bat de quet QR.
echo ============================================================
echo.
pause
