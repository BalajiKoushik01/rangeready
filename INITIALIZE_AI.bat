@echo off
setlocal enabledelayedexpansion

title RangeReady AI Initialization [V1.0]
color 0B
cls

echo.
echo   ============================================================================
echo              RANGE READY - AI INTELLIGENCE SYSTEM PREPARATION
echo   ============================================================================
echo   [STATUS] Initializing local knowledge engine...
echo.

:: 1. DETECT ENVIRONMENT
set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"
cd /d "%ROOT_DIR%"

set "PY_EXE=python"
if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" --version >nul 2>&1
    if !errorlevel! equ 0 (
        set "PY_EXE=.venv\Scripts\python.exe"
        echo [INFO] Using virtual environment: .venv
    ) else (
        echo [WARN] Virtual environment .venv is broken. Falling back to system python.
    )
) else if exist "RangeReady_OFFLINE\python\python.exe" (
    set "PY_EXE=RangeReady_OFFLINE\python\python.exe"
    echo [INFO] Using portable engine: RangeReady_OFFLINE\python
)

:: 2. EXECUTE PREPARATION ENGINE
echo [EXEC] Starting AI Brain Builder...
echo.

"%PY_EXE%" "tools\prepare_ai.py"

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] AI Initialization failed. 
    echo Please ensure:
    echo 1. You have an active internet connection (for first-time pull).
    echo 2. Ollama is installed and running (https://ollama.ai).
    echo.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [COMPLETE] AI Engine is now configured for offline use.
echo [READY] You can now run the system via RUN_RangeReady.bat
echo.
pause
exit /b 0
