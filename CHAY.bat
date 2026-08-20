@echo off
chcp 65001 >nul
title NhaDat Radar - dang chay
cd /d "%~dp0"

REM ============================================================
REM  BAM DUP FILE NAY LA XONG. Khong can bam gi khac.
REM
REM  Chia viec:
REM    GitHub Actions (tu chay 9h + 15h, KHONG can may nay bat)
REM        -> chotot, mogi, batdongsan, extra-sites
REM    File nay (bam tay)
REM        -> bot Zalo + cao Facebook + day len Supabase
REM    Facebook/Zalo phai chay o may vi can IP dan cu + phien dang nhap;
REM    IP cua GitHub bi Facebook chan.
REM
REM  Dung bam dung 9h/15h -- tranh trung luot cua GitHub (hai ben cung
REM  ghi vao DB mot luc co the dung unique index).
REM
REM  Muon dung giua chung: dong cua so nay.
REM ============================================================

echo.
echo   ============================================
echo     NHADAT RADAR
echo   ============================================
echo.

REM ---------- 1. Bot Zalo ----------
echo [1/2] Bat bot Zalo...
set "PM2=%APPDATA%\npm\pm2.cmd"
if not exist "%PM2%" (
  echo       [BO QUA] Chua cai pm2. Chay: npm i -g pm2
) else (
  call "%PM2%" describe zalo-bot >nul 2>&1
  if errorlevel 1 (
    call "%PM2%" start ecosystem.config.cjs >nul 2>&1
  ) else (
    call "%PM2%" restart zalo-bot >nul 2>&1
  )
  call "%PM2%" save >nul 2>&1
  echo       Bot Zalo dang chay. Tu day no tu boc tin BDS trong cac group Zalo.
)

REM ---------- 2. Cao Facebook + day len Supabase ----------
echo.
echo [2/2] Cao Facebook roi day len Supabase (20-40 phut, cu de day chay)...
echo.
node --env-file=.env.local crawler\daily.mjs --fb-only
if errorlevel 1 (
  echo.
  echo       [LOI] That bai. Xem thong bao o tren.
  echo.
  pause
  exit /b 1
)

echo.
echo   ============================================
echo     XONG. Xem web: https://nhadatradar.com
echo     Bot Zalo van chay nen (dong cua so nay khong tat bot).
echo   ============================================
echo.
pause
