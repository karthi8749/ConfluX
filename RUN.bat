@echo off
title ConfluX - Chartink to TradingView Automation
color 0A

echo.
echo ============================================================
echo   CONFLUX - CHARTINK TO TRADINGVIEW AUTOMATION
echo ============================================================
echo.
echo Running scans and updating watchlists...
echo.

cd /d "%~dp0"
node main.js

echo.
echo Starting ConfluX Background Server for Dashboard Button...
start /b node server.js

echo.
echo ============================================================
echo   Finished! You can also trigger runs directly inside the
echo   dashboard anytime by clicking the '▶ Run Scan' button!
echo ============================================================
pause >nul
