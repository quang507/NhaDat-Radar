@echo off
chcp 65001 >nul
title NhaDat Radar - Kiem tra trang thai Zalo Bot
cd /d "%~dp0"

echo.
echo ============================================================
echo   KIEM TRA TRANG THAI ZALO BOT VA CRAWLER
echo ============================================================
echo.

set "ZALO=%APPDATA%\npm\node_modules\zalo-agent-cli\src\index.js"
if not exist "%ZALO%" (
  echo [!] Chua cai zalo-agent-cli.
  echo     Chay lenh: npm i -g zalo-agent-cli
  echo.
  pause
  exit /b 1
)

echo [1/3] Trang thai dang nhap Zalo (tai khoan clone):
call node "%ZALO%" status
echo.
call node "%ZALO%" account list
echo.

echo [2/3] Trang thai tien trinh bot tren PM2:
set "PM2=%APPDATA%\npm\pm2.cmd"
if not exist "%PM2%" (
  echo [!] Chua cai pm2. Bot khong chay ngam duoc.
  echo     Cai dat: npm i -g pm2
) else (
  call "%PM2%" status zalo-bot
  echo.
  echo [3/3] 20 dong nhat ky moi nhat cua Bot:
  call "%PM2%" logs zalo-bot --lines 20 --nostream
)

echo.
echo ============================================================
echo   HUONG DAN:
echo   - Neu bao "Not logged in" : Chay ZALO-LOGIN.bat de quet QR.
echo   - Neu muon bat lai bot    : Chay CHAY.bat hoac ZALO-LOGIN.bat.
echo   - De xem log truc tiep   : pm2 logs zalo-bot
echo ============================================================
echo.
pause
