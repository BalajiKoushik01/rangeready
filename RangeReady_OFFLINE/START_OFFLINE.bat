@echo off
setlocal enabledelayedexpansion

:: Get the directory where this script is located
set "BASE_DIR=%~dp0"
cd /d "%BASE_DIR%"

echo ===================================================
echo     GVB Tech RangeReady - Offline Industrial Mode
echo ===================================================
echo.
echo [1/2] Starting Logic Engine...
set "PYTHON_EXE=%BASE_DIR%python\python.exe"
start /b "RangeReady_Backend" "%PYTHON_EXE%" "%BASE_DIR%backend\main.py" --port 8787

echo [2/2] Launching Dashboard...
:: Use the local electron binary
set "ELECTRON_BIN=%BASE_DIR%node_modules\.bin\electron.cmd"
call "%ELECTRON_BIN%" "%BASE_DIR%."

echo.
echo Application Closed.
pause
