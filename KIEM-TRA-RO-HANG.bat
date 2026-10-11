@echo off
chcp 65001 >nul
title NhaDat Radar - Kiem tra ro hang
cd /d "%~dp0"

echo Dang ket noi Supabase de lay bao cao ro hang...
echo.
node scripts\bao-cao-ro-hang.mjs

echo.
pause
