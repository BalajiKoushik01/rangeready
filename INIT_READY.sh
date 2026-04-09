#!/bin/bash
set -e

echo "==================================================="
echo "    GVB Tech RangeReady - ATE Initialization"
echo "==================================================="
echo ""

# 1. Prerequisite Check
echo "[1/5] Checking System Prerequisites..."
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] python3 could not be found. Please install it."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "[ERROR] npm could not be found. Please install it."
    exit 1
fi
echo "      [OK] Prerequisites found."

# 2. Python Environment
echo "[2/5] Setting up Python Environment..."
if [ ! -d ".venv" ]; then
    echo "      > Creating virtual environment..."
    python3 -m venv .venv
fi
source .venv/bin/activate

echo "      > Installing/Updating Backend Dependencies..."
pip install --upgrade pip > /dev/null
pip install -r backend/requirements.txt
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to install Python dependencies."
    exit 1
fi

# 3. Frontend Environment
echo "[3/5] Setting up Frontend Environment..."
# Fix for Electron download issues (Fedora/Linux)
export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
export ELECTRON_CUSTOM_DIR="{{version}}"

echo "      > Running npm install (this may take a moment)..."
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "      [SKIP] node_modules already exists."
fi

if [ $? -ne 0 ]; then
    echo "[ERROR] npm install failed."
    exit 1
fi

# 4. Hardware Matrix
echo "[4/5] Validating Configuration Matrix..."
if [ ! -f "backend/config.json" ]; then
    echo '{ "Signal Generator": "AUTO", "Spectrum Analyzer": "AUTO", "Discovery": true }' > backend/config.json
    echo "      [NEW] Config initialized with Auto-Discovery."
fi

# 5. Launch
echo "[5/5] Starting Global Control Hub..."
python3 start.py

if [ $? -ne 0 ]; then
    echo "[ERROR] System failed to start."
    exit 1
fi
