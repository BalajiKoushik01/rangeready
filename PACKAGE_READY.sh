#!/bin/bash
set -e

echo "==================================================="
echo "    GVB Tech RangeReady - Offline Bundler"
echo "==================================================="
echo ""

# 1. Environment Setup
echo "[1/4] Preparing Build Environment..."
if [ ! -d ".venv" ]; then
    echo "[ERROR] Virtual environment not found. Please run ./INIT_READY.sh first."
    exit 1
fi
source .venv/bin/activate

# Install Packaging Tools
pip install pyinstaller > /dev/null
npm install -g electron-builder > /dev/null

# 2. Build Backend Binary
echo "[2/4] Compiling Standalone Backend..."
cd backend
pyinstaller main.spec --noconfirm
cd ..

# 3. Build Frontend Interface
echo "[3/4] Building Frontend Assets..."
cd frontend
npm run build
cd ..

# 4. Package for Redistribution
echo "[4/4] Generating AppImage Bundle..."
npx electron-builder build --linux AppImage

echo ""
echo "==================================================="
echo "    BUILD SUCCESSFUL"
echo "    Location: ./release/"
echo "==================================================="
echo ""
