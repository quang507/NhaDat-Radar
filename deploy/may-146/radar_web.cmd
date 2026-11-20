@echo off
rem Web NhaDat Radar tren may 146 (thay Vercel tu 20/11/2026): Next.js production :3000, chi nghe 127.0.0.1
rem (Cloudflare Tunnel noi vao day). Task Scheduler "Radar Web", SYSTEM, bat luc khoi dong may; chet thi 5 s sau chay lai.
set PATH=C:\Program Files\nodejs;C:\Program Files\Git\cmd;%PATH%
set NODE_ENV=production
set NODE_OPTIONS=--max-old-space-size=2048
cd /d C:\radar-web\NhaDat-Radar
:loop
node node_modules\next\dist\bin\next start -p 3000 -H 127.0.0.1 >> C:\radar-web\logs\web.log 2>&1
timeout /t 5 /nobreak >nul
goto loop
