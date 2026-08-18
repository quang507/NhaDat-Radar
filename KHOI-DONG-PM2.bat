@echo off
REM ============================================================
REM  Tu chay pm2 khi dang nhap Windows.
REM  Thay cho chuoi Run-key + pm2_resurrect.cmd cua pm2-windows-startup.
REM
REM  Su co 18/8: sang bat may luc 8:25 nhung pm2 KHONG he khoi dong;
REM  pm2.log khong co dong nao truoc 10:02 (luc chay tay). Chuoi cu goi
REM  "pm2 resurrect" tran, phu thuoc PATH, lai chay an cua so nen hong
REM  AM THAM: khong log, khong biet duong ma sua.
REM
REM  Ban nay khac 3 diem:
REM   1. Cho 60 giay -- de OneDrive mount xong (dump.pm2 tro vao OneDrive).
REM   2. Goi pm2 bang DUONG DAN DAY DU, khong phu thuoc PATH.
REM   3. Ghi log ra crawler\pm2-khoidong.log de lan sau con biet vi sao.
REM
REM  LUU Y: file .bat phai la ASCII thuan + CRLF. Dau tieng Viet hoac
REM  em-dash lam cmd.exe doc hong (da vap 18/8).
REM ============================================================
setlocal
set "LOG=%~dp0crawler\pm2-khoidong.log"
set "PM2=%APPDATA%\npm\pm2.cmd"

echo.>>"%LOG%"
echo ===== %DATE% %TIME% : bat dau>>"%LOG%"

timeout /t 60 /nobreak >nul 2>&1

if not exist "%PM2%" (
  echo [LOI] Khong thay pm2 tai %PM2%>>"%LOG%"
  echo Chay lenh: npm i -g pm2>>"%LOG%"
  exit /b 1
)

cd /d "%~dp0"
call "%PM2%" resurrect>>"%LOG%" 2>&1
REM crawl-on-boot duoc luu trong dump.pm2 o trang thai "stopped" nen resurrect KHONG bat no,
REM ma no lai la thu duy nhat cao bu khi dang nhap muon hon gio cron (18/8: dang nhap 10:00
REM thi khong co luot nao cho toi 15:00). Phai bat tay o day.
REM An toan khi goi moi lan: chinh crawl-on-boot tu kiem tra moc .last-run, chua qua 7h thi bo qua.
call "%PM2%" start crawl-on-boot>>"%LOG%" 2>&1

echo ----- trang thai sau resurrect:>>"%LOG%"
call "%PM2%" list>>"%LOG%" 2>&1
echo ===== %DATE% %TIME% : xong>>"%LOG%"
endlocal
