@echo off
setlocal enabledelayedexpansion

:: ============================================================================
:: GVB Tech RangeReady: Industrial Startup Master v1.5
:: ============================================================================
:: This the ONLY file you need to run to start the entire system.
:: Handles: .venv activation, Backend (FastAPI), and Frontend (Electron).
:: ============================================================================

title RangeReady Industrial Launchpad
color 0B
echo.
echo  [SYSTEM] Initializing RangeReady RF Platform...
echo  [SYSTEM] Industrial Refactor V5.0 active.
echo.

:: 1. Environment Verification
echo  [1/3] Verifying Python Environment...
if exist ".venv\Scripts\python.exe" (
    set PY_EXE=.venv\Scripts\python.exe
    echo  [OK] Local .venv detected.
) else (
    set PY_EXE=python
    echo  [WARN] No .venv found. Using system Python.
)

:: 2. Backend Health Check & Startup
echo  [2/3] Starting Backend (FastAPI)...
:: We launch in a separate window to keep logs accessible but clean
start "RangeReady Backend" /min cmd /c "%PY_EXE% -m backend.main"

:: Wait for backend to initialize (approx 3-5 seconds)
echo  [WAIT] Waiting for Backend to bind to port 8787...
timeout /t 5 /nobreak >nul

:: 3. Frontend Launcher
echo  [3/3] Launching Frontend Dashboard...
if exist "node_modules\.bin\electron.cmd" (
    start "RangeReady UI" /min cmd /c "npm start"
    echo  [OK] Electron shell active.
) else (
    echo  [ERROR] node_modules not found. Please run 'npm install' first.
    pause
    exit /b
)

echo.
echo ============================================================================
echo  LAUNCH SUCCESSFUL! 
echo ============================================================================
echo  - Backend: http://localhost:8787/health
echo  - UI: Glass Dashboard active
echo.
echo  Keep this window open to manage the session.
echo ============================================================================
pause
