@echo off
rem Cloudflare Tunnel cho web Radar tren may 146 (task "Radar Tunnel", SYSTEM, bat luc khoi dong)
rem Chet thi chay lai sau 5 giay. Log: C:\radar-web\logs\cloudflared.log
:loop
C:\tools\cloudflared.exe tunnel --config C:\radar-web\cf\config.yml --no-autoupdate run radar-146 >> C:\radar-web\logs\cloudflared.log 2>&1
timeout /t 5 /nobreak >nul
goto loop
