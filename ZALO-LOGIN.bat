@echo off
chcp 65001 >nul
REM ============================================================
REM  ZALO LOGIN — bam dup la xong.
REM  Goi thang duong dan day du cua zalo-agent-cli nen KHONG phu
REM  thuoc PATH (cua so CMD mo truoc luc cai se khong thay lenh
REM  `zalo-agent` -> bao 'is not recognized').
REM
REM  Viec no lam: hien QR -> quet bang Zalo CLONE tren dien thoai
REM  -> luu phien vao %%USERPROFILE%%\.zalo-agent-cli\credentials
REM  -> bat lai bot zalo tren pm2.
REM ============================================================
cd /d "%~dp0"

set "ZALO=%APPDATA%\npm\node_modules\zalo-agent-cli\src\index.js"

if not exist "%ZALO%" (
  echo [LOI] Chua cai zalo-agent-cli.
  echo Chay:  npm i -g zalo-agent-cli
  pause
  exit /b 1
)

echo [1/3] Trang thai hien tai:
call node "%ZALO%" status
echo.

echo [2/3] Dang nhap — quet QR bang Zalo CLONE tren dien thoai...
echo       (API Zalo khong chinh thuc, acc co the bi khoa — dung so clone)
echo.
call node "%ZALO%" login
if errorlevel 1 (
  echo.
  echo [LOI] Dang nhap that bai. Thu lai, hoac xem log o tren.
  pause
  exit /b 1
)

echo.
echo [3/3] Bat lai bot zalo tren pm2...
call pm2 start zalo-bot
call pm2 save
call pm2 status

echo.
echo ============================================================
echo   XONG. Xem log bot:  pm2 logs zalo-bot
echo ============================================================
pause
