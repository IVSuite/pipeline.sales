@echo off
setlocal
set PATH=C:\Program Files\nodejs;%PATH%
cd /d "%~dp0"

echo Starting Pipeline CRM server...
start "Pipeline CRM Server" cmd /k "npm run dev"

echo Opening browser in a few seconds...
timeout /t 5 /nobreak >nul
start "" "http://localhost:3000"

echo.
echo Pipeline CRM is running. Close the "Pipeline CRM Server" window to stop it.
