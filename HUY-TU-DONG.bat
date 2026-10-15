@echo off
chcp 65001 >nul
title Huy lich tu dong NhaDat Radar

schtasks /delete /tn "NhadatRadar_DailyCrawl" /f
echo.
echo Đã hủy lịch tự động chạy NhaDat Radar trên máy tính này.
echo.
pause
