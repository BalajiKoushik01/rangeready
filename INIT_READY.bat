@echo off
echo ===================================================
echo     GVB Tech RangeReady - ATE Initialization
echo ===================================================
echo.

:: Initialize Python Virtual Environment
echo [1/4] Setting up Python Environment...
if not exist ".venv" (
    python -m venv .venv
    echo Created virtual environment '.venv'
)
call .venv\Scripts\activate.bat
echo Installing backend dependencies...
pip install -r backend\requirements.txt > nul 2>&1

:: Initialize Node Environment
echo [2/4] Setting up Frontend Environment...
if not exist "node_modules" (
    npm install
)

:: Validate Hardware Config
echo [3/4] Validating Configuration Matrix...
if not exist "backend\config.json" (
    echo { "Signal Generator": "192.168.1.141", "Spectrum Analyzer": "192.168.1.142" } > backend\config.json
)

:: Ignite Dashboard
echo [4/4] Starting Global Control Hub...
python start.py

pause
