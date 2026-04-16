@echo off
setlocal enabledelayedexpansion

:: ============================================================================
:: GVB TECH RANGEREADY: INDUSTRIAL UNIFIED BOOTSTRAP [V5.3]
:: ============================================================================
:: Optimized for: MISSION-CRITICAL AIR-GAPPED DEPLOYMENT
:: This script acts as the hardened entry point for the RangeReady platform.
:: ============================================================================

title RangeReady Industrial Launcher [BOOTSTRAP V5.3]
color 0B
cls

echo.
echo  [94m============================================================================[0m
echo  [96m           RANGE READY - INDUSTRIAL RF PLATFORM [MISSION CONTROL][0m
echo  [94m============================================================================[0m
echo  [97m [STATUS] Mode: TOTAL ISOLATION / AIR-GAPPED[0m
echo  [97m [TIME]   %DATE% %TIME%[0m
echo  [94m----------------------------------------------------------------------------[0m
echo.

:: 1. ABSOLUTE WORKSPACE SEIZURE
set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"
echo  [SYSTEM] Seizing workspace: %ROOT_DIR%
cd /d "%ROOT_DIR%"

:: 2. ISOLATED ENGINE DETECTION
echo  [SYSTEM] Detecting portable logic engines...
set "PY_DIR=%ROOT_DIR%\RangeReady_OFFLINE\python"
set "PY_EXE=%PY_DIR%\python.exe"

if exist "%PY_EXE%" (
    echo  [92m [OK] Portable Python Engine detected.[0m
    echo  [INFO] Stripping host environment variables to prevent leakage...
    set "PYTHONHOME=%PY_DIR%"
    set "PATH=%PY_DIR%;%PY_DIR%\Scripts;%PATH%"
) else (
    echo  [93m [WARN] Portable Engine missing. Falling back to System Python...[0m
    set "PY_EXE=python"
)

:: 3. BACKEND INJECTION & PATHING
echo  [SYSTEM] Injecting hardware drivers and backend services...
set PYTHONPATH=
set "PYTHONPATH=%ROOT_DIR%;%ROOT_DIR%\backend"
if exist "%ROOT_DIR%\RangeReady_OFFLINE\backend" (
    echo  [INFO] Integrating OFFLINE backend assets...
    set "PYTHONPATH=%ROOT_DIR%\RangeReady_OFFLINE;%ROOT_DIR%\RangeReady_OFFLINE\backend;%PYTHONPATH%"
)

:: 4. INDUSTRIAL CLEANUP
echo  [SYSTEM] Preparing for mission-critical boot...
if exist "Running" del /f /q "Running"

:: 5. LAUNCH INTELLIGENT SYSTEM MANAGER
echo.
echo  [94m----------------------------------------------------------------------------[0m
echo  [96m [LAUNCH] Initializing Apex System Manager...[0m
echo  [96m [INFO]   Rapid GUI deployment sequence active.[0m
echo  [96m [INFO]   Background hardware discovery will follow after GUI handshake.[0m
echo  [94m----------------------------------------------------------------------------[0m
echo.

:: Execute start.py using the portable python
"%PY_EXE%" "%ROOT_DIR%\start.py"

if %ERRORLEVEL% neq 0 (
    echo.
    echo  [91m [CRITICAL ERROR] RangeReady System Manager exited with code %ERRORLEVEL%[0m
    echo  [91m ------------------------------------------------------------[0m
    echo  [INFO] Check backend_crash.log for secondary forensics.
    echo  [91m ------------------------------------------------------------[0m
    echo.
    echo  [MISSION CONTROL] Press any key to dump diagnostics and exit...
    pause > nul
)

exit /b 0
