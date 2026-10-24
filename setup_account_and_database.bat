@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo === First Press: cai dat tai khoan va du lieu mau ===
where node >nul 2>nul
if errorlevel 1 (
  echo Loi: Chua cai Node.js. Cai Node.js 20 tro len roi chay lai.
  goto :failed
)
where npm >nul 2>nul
if errorlevel 1 (
  echo Loi: Khong tim thay npm. Kiem tra lai cai dat Node.js.
  goto :failed
)

echo.
echo [1/3] Cai dat cac goi phu thuoc...
call npm install
if errorlevel 1 (
  echo Loi: npm install that bai.
  goto :failed
)

echo.
echo [2/3] Tao tai khoan mau...
call npm run setup:accounts
if errorlevel 1 (
  echo.
  echo Khong the tao tai khoan. Kiem tra MongoDB dang chay va xem huong dan trong README.md.
  goto :failed
)

echo.
echo [3/3] Nap sach, danh gia va thao luan mau...
call npm run seed:demo
if errorlevel 1 (
  echo Loi: Nap du lieu mau that bai. Xem thong bao MongoDB o tren.
  goto :failed
)

echo.
echo Hoan tat. Hay bao mat file account.txt va chay run_server.bat de mo ung dung.
echo Nhan phim bat ky de dong cua so nay.
pause >nul
exit /b 0

:failed
echo.
echo Qua trinh cai dat that bai. Hay doc thong bao loi phia tren.
echo Nhan phim bat ky de dong cua so nay.
pause >nul
exit /b 1
