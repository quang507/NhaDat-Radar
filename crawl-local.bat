@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================
echo   NhaDat Radar - Cao du lieu tren may cua ban (IP Viet Nam)
echo   Facebook se lay duoc bai vi day la IP dan cu VN
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [LOI] Chua cai Node.js.
  echo Vao https://nodejs.org tai ban LTS, cai xong chay lai file nay.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo [Lan dau] Dang cai thu vien... (vai phut, chi lam 1 lan)
  call npm install
  echo [Lan dau] Dang cai trinh duyet Chromium cho Facebook...
  call npx playwright install chromium
)

if not exist ".env.local" (
  echo [LOI] Chua co file .env.local
  echo   1. Copy file .env.local.example thanh .env.local
  echo   2. Mo bang Notepad, dien: SUPABASE URL/SERVICE_ROLE_KEY, GEMINI_API_KEY, FB_GROUP_URLS
  pause
  exit /b 1
)

if not exist "crawler\fb-cookies.json" (
  echo [Chu y] Chua co crawler\fb-cookies.json - Facebook se bi bo qua.
  echo   Export cookie bang Cookie-Editor -^> luu vao crawler\fb-cookies.json
  echo   (Cac nguon khac: Cho Tot, Mogi, nhadat van chay binh thuong)
  echo.
)

echo Bat dau cao du lieu...
echo.
node --env-file=.env.local crawler/daily.mjs

echo.
echo ============================================================
echo   XONG. Data moi da duoc cap nhat len web.
echo   Mo web bam Ctrl+Shift+R de xem tin moi.
echo ============================================================
pause
