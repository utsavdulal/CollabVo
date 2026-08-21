@echo off
echo ==========================================
echo   Collavo - Starting all services...
echo ==========================================
echo.

echo [1/3] Starting backend on port 4000...
cd /d "%~dp0server"
start "Collavo-Backend" cmd /c "node src/server.js"

echo [2/3] Starting client on port 5173...
cd /d "%~dp0client"
start "Collavo-Client" cmd /c "npm run dev"

echo [3/3] Starting admin panel on port 5174...
cd /d "%~dp0admin-client"
start "Collavo-Admin" cmd /c "npm run dev"

echo.
echo ==========================================
echo   All services starting...
echo.
echo   App:   http://localhost:5173
echo   Admin: http://localhost:5174
echo.
echo   Login: demo.business@collavo.app
echo   Pass:  Demo@1234
echo.
echo   Admin: admin@collavo.app
echo   Pass:  AdminPass123!
echo ==========================================
echo.
echo Close this window anytime. Services run in background.
pause
