@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo     GVB Tech RangeReady - Offline Bundler
echo ===================================================
echo.

:: 1. Environment Setup
echo [1/4] Preparing Build Environment...
if not exist ".venv" (
    echo [ERROR] Virtual environment not found. Please run INIT_READY.bat first.
    pause
    exit /b 1
)
call .venv\Scripts\activate.bat

:: Install Packaging Tools
pip install pyinstaller > nul
call npm install -g electron-builder > nul

:: 2. Build Backend Binary
echo [2/4] Compiling Standalone Backend...
cd backend
pyinstaller main.spec --noconfirm
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Backend compilation failed.
    pause
    exit /b 1
)
cd ..

:: 3. Build Frontend Interface
echo [3/4] Building Frontend Assets...
cd frontend
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Frontend build failed.
    pause
    exit /b 1
)
cd ..

:: 4. Package for Redistribution
echo [4/4] Generating Portable ZIP...
call npx electron-builder build --win --portable
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Electron packaging failed.
    pause
    exit /b 1
)

echo.
echo ===================================================
echo     BUILD SUCCESSFUL
echo     Location: .\release\RangeReady_Portable.exe
echo ===================================================
echo.
pause
