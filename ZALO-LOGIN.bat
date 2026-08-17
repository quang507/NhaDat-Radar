@echo off
chcp 65001 >nul
REM ============================================================
REM  ZALO LOGIN - bam dup la xong.
REM  Goi thang duong dan day du cua zalo-agent-cli nen KHONG phu
REM  thuoc PATH (cua so CMD mo truoc luc cai se bao 'zalo-agent'
REM  is not recognized).
REM
REM  Viec no lam: hien QR -> quet bang Zalo CLONE tren dien thoai
REM  -> luu phien vao %USERPROFILE%\.zalo-agent-cli\credentials
REM  -> bat lai bot zalo tren pm2.
REM
REM  LUU Y: file .bat PHAI luu bang line ending CRLF. Neu chi co LF
REM  thi cmd.exe doc hong, moi chu thanh 1 lenh. Xem .gitattributes.
REM ============================================================
cd /d "%~dp0"

set "ZALO=%APPDATA%\npm\node_modules\zalo-agent-cli\src\index.js"

if not exist "%ZALO%" (
  echo [LOI] Chua cai zalo-agent-cli.
  echo Chay lenh:  npm i -g zalo-agent-cli
  echo.
  pause
  exit /b 1
)

echo [1/3] Trang thai hien tai:
call node "%ZALO%" status
echo.

echo [2/3] Dang nhap. Quet QR bang Zalo CLONE tren dien thoai.
echo       Neu QR trong cua so nay bi vo, mo trinh duyet:
echo          http://localhost:18927
echo       Hoac mo file anh:
echo          %USERPROFILE%\.zalo-agent-cli\qr.png
echo.
echo       API Zalo khong chinh thuc, acc co the bi khoa. Dung so clone.
echo.
call node "%ZALO%" login
if errorlevel 1 (
  echo.
  echo [LOI] Dang nhap that bai. Dong roi chay lai file nay.
  echo.
  pause
  exit /b 1
)

echo.
echo [3/3] Bat lai bot zalo tren pm2...
REM Goi pm2 bang duong dan day du: cua so CMD mo truoc luc `npm i -g pm2` khong thay
REM lenh nay -> 'pm2' is not recognized (su co 17/8, giong het zalo-agent).
set "PM2=%APPDATA%\npm\pm2.cmd"
if not exist "%PM2%" (
  echo [BO QUA] Chua cai pm2. Bot van chua duoc bat lai.
  echo Chay lenh:  npm i -g pm2
  echo Roi chay:   pm2 start ecosystem.config.cjs ^&^& pm2 save
  echo.
  pause
  exit /b 0
)
call "%PM2%" start zalo-bot
call "%PM2%" save
call "%PM2%" status

echo.
echo ============================================================
echo   XONG. Xem log bot:  pm2 logs zalo-bot
echo ============================================================
pause
