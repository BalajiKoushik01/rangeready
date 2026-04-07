# RangeReady Platform Setup & Testing Guide

This guide describes how to set up the RangeReady environment for development, testing, and hardware-in-the-loop (HIL) simulation.

## 🛠️ 1. Environment Requirements

- **Python**: 3.11 or higher
- **Node.js**: 20 or higher
- **Storage**: ~2GB free space (for offline AI model weights)
- **OS**: Windows (preferred for VISA drivers)

## 📦 2. Installation

### Backend Setup
1. Open a terminal in the `backend/` directory.
2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/Scripts/activate  # Windows
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. **Offline AI Setup (Optional but Recommended)**:
   - Create a `backend/models` folder.
   - Download a quantized GGUF model (e.g., [Gemma-2-2B-it-Q4_K_M](https://huggingface.co/bartowski/gemma-2-2b-it-GGUF)) and place it in the `models/` folder.
   - Ensure the filename matches the one in `backend/services/ai_copilot.py` (Default: `gemma-2-2b-it.Q4_K_M.gguf`).

### Frontend Setup
1. Open a terminal in the `frontend/` directory.
2. Install dependencies:
   ```bash
   npm install
   ```

## 🚀 3. Running the Platform

### Start Backend
```bash
cd backend
python main.py
```
- Server will start on `http://127.0.0.1:8787`.
- Documentation available at `http://127.0.0.1:8787/docs`.

### Start HTML/React Frontend
```bash
cd frontend
npm run dev
```
- Access the GUI at `http://localhost:5173`.

## 🧪 4. Testing & Verification

### Hardware-in-the-Loop (HIL) Simulation
RangeReady includes a **Dummy Instrument Driver** for testing when physical equipment is not available.
1. Navigate to the **Instrument Registry** in the GUI.
2. The `Dummy SA` should be auto-discovered (simulating 192.168.1.100).
3. Start a **Test Session** to see live simulated telemetry in the Test Runner.

### AI Diagnostics Test
If you have the AI model installed:
1. Run a test that intentionally triggers a failure (by lowering limits).
2. The **Intelligence HUD** will show an "AI Analysis" button.
3. Click it to receive an offline diagnosis of the trace anomaly.

### S2P Data Export
1. Complete any test session.
2. Navigate to the **Results History**.
3. Click **Export Touchstone (.s2p)** to download the raw VNA-compatible data file.

---
*Developed by GVB Tech — Advanced Agentic Coding Section*
