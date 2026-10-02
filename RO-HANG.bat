@echo off
chcp 65001 >nul
title NhaDat Radar - cap nhat ro hang EvoHome
cd /d "%~dp0"

REM ============================================================
REM  BAM DUP LA XONG: lay phong trong moi nhat tu EvoHome + HiFriendz -> dua len web
REM  (che so nha, lech toa do, an phong da cho thue).
REM
REM  Phai chay o MAY NHA: EvoHome co Cloudflare chan IP may chu GitHub
REM  (luot 28/9 tren GitHub Actions bi man "Just a moment...").
REM
REM  Can file .env.local o thu muc nay, co 4 dong:
REM    NEXT_PUBLIC_SUPABASE_URL=...
REM    SUPABASE_SERVICE_ROLE_KEY=...
REM    EVOHOME_PHONE=...
REM    EVOHOME_PASSWORD=...
REM ============================================================

if not exist ".env.local" (
  echo.
  echo   [THIEU] Chua co file .env.local - xem huong dan o dau file RO-HANG.bat
  echo.
  pause
  exit /b 1
)

echo.
echo [1/4] Lay phong trong tu EvoHome...
node --env-file=.env.local crawler\evohome-fetch.mjs
if errorlevel 1 goto loi

echo.
echo [2/4] Dua len web...
node --env-file=.env.local crawler\ro-hang-evohome.mjs
if errorlevel 1 goto loi

REM HiFriendz (2/10): khong can tai khoan, ~40 phut (7.400 toa nha, moi toa toi da 5 phong)
echo.
echo [3/4] Lay phong trong tu HiFriendz...
node crawler\hifriendz-fetch.mjs
if errorlevel 1 goto loi

echo.
echo [4/4] Dua phong HiFriendz len web...
set RO_HANG_PARTNER=hifriendz
node --env-file=.env.local crawler\ro-hang-evohome.mjs
if errorlevel 1 goto loi
set RO_HANG_PARTNER=

echo.
echo   XONG. Xem web: https://nhadatradar.com
echo.
if "%1"=="/tudong" exit /b 0
pause
exit /b 0

:loi
echo.
echo   [LOI] That bai. Xem thong bao o tren.
echo.
if "%1"=="/tudong" exit /b 1
pause
exit /b 1
