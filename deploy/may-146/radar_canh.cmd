@echo off
rem Chuong bao production (14/11/2026): Task Scheduler "Radar Canh production", SYSTEM, 30 phut/lan.
rem Lich GitHub Actions tre hang gio va bo luot nen chuong chay o may nay. Token Telegram nam trong .env.local (khong commit).
rem Repo duoc git pull boi cac luot ro hang (ro-hang.ps1), file nay khong pull de khoi dung mutex.
call C:\radar\radar_env.cmd
set CANH_TRANG_THAI=C:\radar\logs\canh-production.json
node --env-file=.env.local scripts\canh-production-bao.mjs >> C:\radar\logs\canh-production.log 2>&1
