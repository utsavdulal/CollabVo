@echo off
echo Stopping all Collavo services...
taskkill /FI "WINDOWTITLE eq Collavo-Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Collavo-Client*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Collavo-Admin*" /F >nul 2>&1
echo Done. All services stopped.
pause
