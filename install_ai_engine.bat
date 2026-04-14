@echo off
REM ─────────────────────────────────────────────────────────────────────────────
REM install_ai_engine.bat
REM Installs the offline AI engine (Gemma-2-2B via llama-cpp-python) for RangeReady
REM Run this ONCE on any machine where you want AI features.
REM Requires: internet access, Python 3.12, Windows x64
REM ─────────────────────────────────────────────────────────────────────────────

echo ============================================================
echo   RangeReady AI Engine Installer
echo   This installs llama-cpp-python (offline LLM runtime)
echo   and huggingface_hub (for model download).
echo ============================================================
echo.

REM Step 1: Check if Visual Studio Build Tools are installed
where cl.exe >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Microsoft C++ Build Tools not detected.
    echo.
    echo llama-cpp-python requires C++ Build Tools to compile.
    echo Please do ONE of the following:
    echo.
    echo   OPTION A: Install Visual Studio Build Tools (Recommended)
    echo   Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
    echo   Select: "Desktop development with C++"
    echo   Then re-run this script.
    echo.
    echo   OPTION B: Use a pre-built wheel (fastest)
    echo   Download the wheel for your Python version from:
    echo   https://github.com/abetlen/llama-cpp-python/releases
    echo   Look for: llama_cpp_python-X.Y.Z-cp312-cp312-win_amd64.whl
    echo   Then run: pip install [path-to-whl-file]
    echo.
    echo   OPTION C: Use Ollama (alternative, simpler)
    echo   Download from: https://ollama.ai/
    echo   Then run at command prompt: ollama pull gemma2:2b
    echo   And update backend/services/ai_copilot.py to use Ollama mode.
    echo.
    pause
    exit /b 1
)

echo [OK] C++ Build Tools found. Proceeding with installation...
echo.

REM Step 2: Install Python dependencies
echo Installing Python packages...
pip install llama-cpp-python huggingface_hub requests -q
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] pip install failed. See error above.
    pause
    exit /b 1
)

echo.
echo [OK] AI engine packages installed successfully!
echo.
echo The Gemma-2-2B model (~1.6 GB) will be downloaded automatically
echo the first time you click "Download Model" in the Intelligence HUD.
echo.
echo To pre-download the model now (optional):
echo   python -c "from backend.services.ai_copilot import ai_copilot; ai_copilot.start_download()"
echo.
pause
