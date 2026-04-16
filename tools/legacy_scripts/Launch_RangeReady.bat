@echo off
setlocal enabledelayedexpansion

title RangeReady - Industrial RF Control Platform
echo ===================================================
echo     GVB Tech RangeReady - Master Launcher
echo ===================================================
echo.

:: 1. Verify Environment
echo [1/3] Verifying Offline Environment...
if not exist ".venv" (
    echo [ERROR] Python environment (.venv) missing.
    echo Please ensure you copied the entire folder to your pendrive.
    pause
    exit /b 1
)

if not exist "frontend\dist" (
    echo [ERROR] Frontend assets (dist) missing.
    echo Please build the project before redistribution.
    pause
    exit /b 1
)
echo      [OK] Environment Validated.

:: 2. Launch Backend
echo [2/3] Starting Backend Control Engine...
start "RangeReady Backend" /min ".venv\Scripts\python.exe" backend\main.py --port 8787
timeout /t 3 /nobreak > nul

:: 3. Launch Interface
echo [3/3] Launching Control Interface...
start "RangeReady" "node_modules\.bin\electron" .

echo.
echo ===================================================
echo     SYSTEM RUNNING (OFFLINE MODE)
echo     Close this window to terminate all processes.
echo ===================================================
echo.

:: Keep window alive to catch errors, but we can also use a polling loop
:loop
tasklist /fi "windowtitle eq RangeReady*" | find ":" > nul
if errorlevel 1 (
    timeout /t 2 > nul
    goto loop
)

:: Cleanup on exit
echo Terminating Backend...
taskkill /f /fi "windowtitle eq RangeReady Backend" > nul 2>&1
echo Goodbye.
pause
