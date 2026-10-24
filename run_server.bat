@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Loi: Chua cai Node.js 20 tro len.
  exit /b 1
)
if not exist "node_modules\vite\bin\vite.js" (
  echo Loi: Chua cai dependencies. Hay chay setup_account_and_database.bat truoc.
  exit /b 1
)

echo Dang khoi dong REST API va giao dien React...
start "First Press - Backend API" "%ComSpec%" /k "cd /d ""%~dp0"" && npm run dev:backend"
start "First Press - Frontend" "%ComSpec%" /k "cd /d ""%~dp0"" && npm run dev:frontend"
node -e "const c=require('./app.config.cjs');console.log('Backend: http://localhost:'+c.backend.port);console.log('Frontend: http://'+c.frontend.host+':'+c.frontend.port)"
echo Dong cac cua so First Press de dung cac server.
