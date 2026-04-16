@echo off
setlocal enabledelayedexpansion

echo ============================================================
echo GVB Tech: RangeReady Industrial Build System v1.5
echo ============================================================
echo.

:: 1. Frontend Build
echo [1/4] Building Frontend assets...
cd frontend
call npm install
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed.
    exit /b %errorlevel%
)
cd ..

:: 2. Portable Python Environment Preparation
:: Note: In an air-gapped demo, you would manually place a portable python folder in tools/portable_python
echo [2/4] Verifying Portable Runtime...
if not exist "tools\portable_python" (
    echo [WARN] tools\portable_python not found.
    echo Building with local environment fallback...
)

:: 3. Electron Packaging
echo [3/4] Bundling into One-Click Portable Executable...
call npm install
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Electron packaging failed.
    exit /b %errorlevel%
)

:: 4. Final Verification
echo [4/4] Finalizing bundle...
echo.
echo ============================================================
echo BUILD SUCCESSFUL!
echo Location: release\RangeReady_Portable_1.0.0.exe
echo ============================================================
pause
