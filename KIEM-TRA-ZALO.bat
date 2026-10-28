@echo off
chcp 65001 >nul
title NhaDat Radar - Kiem tra bot Zalo tren NUC

REM Bot Zalo chay tren NUC cong ty (systemd radar-zalo-bot, tu 28/10/2026), khong chay o may nay.
REM Can Tailscale dang bat. Lan dau Tailscale co the hoi xac nhan qua trinh duyet.

echo.
echo ============================================================
echo   KIEM TRA BOT ZALO TREN NUC
echo ============================================================
echo.
ssh quang@nuc "echo [1/3] Dich vu: $(systemctl is-active radar-zalo-bot), khoi dong lai $(systemctl show radar-zalo-bot -p NRestarts --value) lan; echo; echo [2/3] Dang nhap Zalo:; ~/.local/bin/zalo-agent status 2>&1 | grep -v unofficial; echo; echo [3/3] 20 dong log moi nhat:; tail -n 20 ~/radar/logs/zalo-bot.log"
if errorlevel 1 echo [LOI] Khong vao duoc NUC. Kiem tra Tailscale tren may nay.

echo.
echo ============================================================
echo   Neu bao "Not logged in": chay ZALO-LOGIN.bat de quet QR.
echo ============================================================
echo.
pause
