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
REM    NUC cong ty (chay 24/7 bang systemd, tu 28/10/2026)
REM        -> ro hang EvoHome + HiFriendz, bot Zalo
REM        Kiem tra bot: KIEM-TRA-ZALO.bat  |  Quet QR lai: ZALO-LOGIN.bat
REM    File nay (bam tay)
REM        -> cao Facebook + day len Supabase
REM    Facebook phai chay o may vi can IP dan cu + phien dang nhap;
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

REM ---------- Cao Facebook + day len Supabase ----------
echo Cao Facebook roi day len Supabase (20-40 phut, cu de day chay)...
echo.
node --env-file=.env.local crawlerdaily.mjs --fb-only
if errorlevel 1 (
  echo.
  echo       [LOI] That bai. Xem thong bao o tren.
  echo.
  if "%1"=="/tudong" exit /b 1
  pause
  exit /b 1
)

echo.
echo   ============================================
echo     XONG. Xem web: https://nhadatradar.com
echo   ============================================
echo.
if "%1"=="/tudong" exit /b 0
pause
