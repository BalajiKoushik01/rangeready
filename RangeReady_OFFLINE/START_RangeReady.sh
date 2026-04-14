#!/bin/bash

# RangeReady Industrial Launcher - Fedora/Linux
# ---------------------------------------------

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo "================================================="
echo "    GVB Tech RangeReady - Fedora Linux Mode    "
echo "================================================="

# 1. Environment Detection
if [ -d "./python_portable" ]; then
    PYTHON_EXE="./python_portable/bin/python3"
else
    # Fallback to system python if bundle is not present
    PYTHON_EXE="python3"
fi

# 2. Logic Engine Startup (Backend)
echo "[1/2] Starting Logic Engine (FastAPI)..."
$PYTHON_EXE "./backend/main.py" --port 8787 &
BACKEND_PID=$!

# 3. GUI Startup (Electron)
echo "[2/2] Launching Dashboard..."
# Find Electron - for portable Linux it's usually in node_modules or a pre-packaged binary
if [ -f "./RangeReady_AppImage" ]; then
    ./RangeReady_AppImage --no-sandbox
else
    # Development/Folder fallback
    ./node_modules/.bin/electron .
fi

# Cleanup
echo "Shutting down components..."
kill $BACKEND_PID
