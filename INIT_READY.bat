@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo     GVB Tech RangeReady - ATE Initialization
echo ===================================================
echo.

:: 1. Prerequisite Check
echo [1/5] Checking System Prerequisites...
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    pause
    exit /b 1
)

where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js/NPM is not installed or not in PATH.
    pause
    exit /b 1
)
echo      [OK] Prerequisites found.

:: 2. Python Environment
echo [2/5] Setting up Python Environment...
if not exist ".venv" (
    echo      > Creating virtual environment...
    python -m venv .venv
)
call .venv\Scripts\activate.bat

echo      > Installing/Updating Backend Dependencies...
pip install --upgrade pip > nul
pip install -r backend\requirements.txt
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install Python dependencies.
    pause
    exit /b 1
)

:: 3. Frontend Environment
echo [3/5] Setting up Frontend Environment...
:: Fix for Electron download issues
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
set ELECTRON_CUSTOM_DIR={{version}}

echo      > Running npm install (this may take a moment)...
if not exist "node_modules" (
    call npm install
) else (
    echo      [SKIP] node_modules already exists.
)

if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
)

:: 4. Hardware Matrix
echo [4/5] Validating Configuration Matrix...
if not exist "backend\config.json" (
    echo { "Signal Generator": "AUTO", "Spectrum Analyzer": "AUTO", "Discovery": true } > backend\config.json
    echo      [NEW] Config initialized with Auto-Discovery.
)

:: 5. Launch
echo [5/5] Starting Global Control Hub...
python start.py

if %ERRORLEVEL% neq 0 (
    echo [ERROR] System failed to start.
    pause
)

endlocal
