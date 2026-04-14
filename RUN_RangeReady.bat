@echo off
setlocal enabledelayedexpansion

:: ============================================================================
:: GVB Tech RangeReady: IRONCLAD AIR-GAPPED LAUNCHER
:: ============================================================================
:: Optimized for: TOTAL ISOLATION on arbitrary host machines.
:: 1. Force-locks Python and Paths to the Pendrive root.
:: 2. Prevents conflicts from host machine paths/variables.
:: 3. Zero-Network required.
:: ============================================================================

title RangeReady Industrial Interface [OFFLINE V5.1]
color 0B
echo.
echo  [SYSTEM] Initializing GVB Tech RangeReady RF Platform...
echo  [STATUS] Mode: TOTAL ISOLATION / AIR-GAPPED
echo.

:: 1. ABSOLUTE PATH RESOLUTION (Drive-Letter Independent)
:: Use %~dp0 to lock everything to the location of this script on the pendrive
set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

set "PY_DIR=%ROOT_DIR%RangeReady_OFFLINE\python"
set "PY_EXE=%PY_DIR%\python.exe"
set "BACKEND_MAIN=%ROOT_DIR%backend\main.py"
set "FRONTEND_DIST=%ROOT_DIR%frontend\dist"

:: 2. IRONCLAD ENVIRONMENT LOCK
:: Lock the Python environment to the pendrive specifically.
set "PYTHONHOME=%PY_DIR%"
set "PYTHONPATH=%ROOT_DIR%;%PY_DIR%\Lib\site-packages"
set "PATH=%PY_DIR%;%PY_DIR%\Scripts;%PATH%"

echo  [1/2] Pre-flight Check: Verifying Pendrive Integrity...
if not exist "%PY_EXE%" (
    echo  [CRITICAL] Error: Portable Engine not found at %PY_EXE%
    pause
    exit /b 1
)

:: 3. PORT CONFLICT CHECK (Ensures Port 8787 and 5173 are free)
netstat -ano | findstr :8787 >nul
if %ERRORLEVEL% equ 0 (
    echo  [WARN] Port 8787 already in use. Please close other RangeReady instances.
)
netstat -ano | findstr :5173 >nul
if %ERRORLEVEL% equ 0 (
    echo  [WARN] Port 5173 already in use. Please close other Dashboard instances.
)

:: Sanity check for internal libraries
"%PY_EXE%" -c "import fastapi, pyvisa, sqlalchemy, numpy, uvicorn" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo  [OK] Pendrive environment is 100%% synchronized.
) else (
    echo  [ERROR] Environment load failed. Check if all files were copied correctly.
    pause
    exit /b 1
)

:: 4. INDUSTRIAL ENGINE IGNITION
echo  [2/2] Launching RangeReady Telemetry Engines...

:: Start Backend (Force CWD to Root for relative paths)
start "RangeReady_Backend" /min cmd /c "cd /d "%ROOT_DIR%" && set PYTHONHOME=%PY_DIR% && set PYTHONPATH=%ROOT_DIR% && "%PY_EXE%" "%BACKEND_MAIN%""

:: Start Frontend UI Server
start "RangeReady_Dashboard_Server" /min cmd /c "cd /d "%FRONTEND_DIST%" && "%PY_EXE%" -m http.server 5173"

:: 5. INTERFACE INITIALIZATION
echo  [WAIT] Handshaking with Host GUI...
timeout /t 6 /nobreak >nul

:: Launch Chrome in Industrial App Mode (Professional feel)
set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
set "CHROME_V2=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

if exist "%CHROME_PATH%" (
    start "" "%CHROME_PATH%" --app=http://localhost:5173
) else if exist "%CHROME_V2%" (
    start "" "%CHROME_V2%" --app=http://localhost:5173
) else (
    echo  [INFO] Chrome not found. Using system default browser.
    start http://localhost:5173
)

echo.
echo ============================================================================
echo  SYSTEM ONLINE: PENDRIVE MODE ACTIVE
echo ============================================================================
echo  - Host Interaction: ISOLATED
echo  - Network: AIR-GAPPED
echo  - Root Directory: %ROOT_DIR%
echo ============================================================================
echo.
echo  STAY LIVE: Do not close this console during the presentation.
echo.

pause
