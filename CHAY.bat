@echo off
chcp 65001 >nul
title NhaDat Radar - dang chay
cd /d "%~dp0"

REM ============================================================
REM  BAM DUP FILE NAY LA XONG. Khong can bam gi khac.
REM  Viec no lam, theo thu tu:
REM    1. Bat bot Zalo (neu chua chay)
REM    2. Cao tat ca nguon -> gop -> bu toa do -> day len Supabase
REM    3. Commit + push du lieu len GitHub
REM  Muon dung giua chung: dong cua so nay.
REM ============================================================

echo.
echo   ============================================
echo     NHADAT RADAR
echo   ============================================
echo.

REM ---------- 1. Bot Zalo ----------
echo [1/3] Bat bot Zalo...
set "PM2=%APPDATA%\npm\pm2.cmd"
if not exist "%PM2%" (
  echo       [BO QUA] Chua cai pm2. Chay: npm i -g pm2
) else (
  call "%PM2%" describe zalo-bot >nul 2>&1
  if errorlevel 1 (
    call "%PM2%" start ecosystem.config.cjs --only zalo-bot >nul 2>&1
  ) else (
    call "%PM2%" restart zalo-bot >nul 2>&1
  )
  call "%PM2%" save >nul 2>&1
  echo       Bot Zalo: dang chay
)

REM ---------- 2. Cao du lieu ----------
echo.
echo [2/3] Cao du lieu (30-60 phut, cu de day chay)...
echo.
node --env-file=.env.local crawler\daily.mjs
if errorlevel 1 (
  echo.
  echo       [LOI] Cao that bai. Xem thong bao o tren.
  echo.
  pause
  exit /b 1
)

REM ---------- 3. Day len GitHub ----------
echo.
echo [3/3] Luu du lieu len GitHub...
git add crawler/batdongsan.json crawler/mogi.json >nul 2>&1
git diff --cached --quiet
if errorlevel 1 (
  git commit -q -m "data: cao ngay %DATE%"
  git push origin main
  echo       Da day len GitHub.
) else (
  echo       Du lieu khong doi, khong can day.
)

echo.
echo   ============================================
echo     XONG. Xem web: https://nha-dat-radar-rkyn.vercel.app
echo   ============================================
echo.
pause
