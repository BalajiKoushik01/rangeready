#!/bin/bash
echo "==================================================="
echo "    GVB Tech RangeReady - ATE Initialization"
echo "==================================================="
echo ""

# Initialize Python Virtual Environment
echo "[1/4] Setting up Python Environment..."
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    echo "Created virtual environment '.venv'"
fi
source .venv/bin/activate
echo "Installing backend dependencies..."
pip install -r backend/requirements.txt > /dev/null 2>&1

# Initialize Node Environment
echo "[2/4] Setting up Frontend Environment..."
if [ ! -d "node_modules" ]; then
    npm install
fi

# Validate Hardware Config
echo "[3/4] Validating Configuration Matrix..."
if [ ! -f "backend/config.json" ]; then
    echo '{ "Signal Generator": "192.168.1.141", "Spectrum Analyzer": "192.168.1.142" }' > backend/config.json
fi

# Ignite Dashboard
echo "[4/4] Starting Global Control Hub..."
python3 start.py
