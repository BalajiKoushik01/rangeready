import os
import sys
import subprocess
import time
import json
from pathlib import Path

# --- CONFIGURATION ---
BASE_DIR = Path(__file__).parent.parent
BACKEND_DIR = BASE_DIR / "backend"
MODELS_DIR = BACKEND_DIR / "models"
MODELFILE_PATH = MODELS_DIR / "Modelfile"
OLLAMA_STORAGE = MODELS_DIR / "ollama"

# Ensure environment isolation using a relative path to avoid Windows colon issues
os.environ["OLLAMA_MODELS"] = "backend/models/ollama"

def log(msg, level="INFO"):
    print(f"[{level}] {msg}")

def run_command(cmd, shell=False):
    try:
        result = subprocess.run(cmd, shell=shell, check=True, capture_output=True, text=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        log(f"Command failed: {' '.join(cmd) if isinstance(cmd, list) else cmd}", "ERROR")
        log(e.stderr, "DEBUG")
        return None

def verify_dependencies():
    log("Verifying Python dependencies...")
    pkgs = ["requests", "ollama", "huggingface_hub"]
    for pkg in pkgs:
        try:
            __import__(pkg)
            log(f"Found {pkg}")
        except ImportError:
            log(f"Installing {pkg}...")
            subprocess.run([sys.executable, "-m", "pip", "install", pkg, "-q"], check=True)

def setup_ollama_storage():
    if not OLLAMA_STORAGE.exists():
        log(f"Creating Ollama storage at {OLLAMA_STORAGE}")
        OLLAMA_STORAGE.mkdir(parents=True, exist_ok=True)
    
    # Mirror Engine for Portability
    bin_dir = BACKEND_DIR / "bin"
    bin_dir.mkdir(parents=True, exist_ok=True)
    target_exe = bin_dir / "ollama.exe"
    
    if not target_exe.exists():
        log("Mirroring system Ollama engine for local portability...")
        try:
            # Detect system Ollama path
            path_res = subprocess.run(["powershell", "-Command", "Get-Command ollama | Select-Object -ExpandProperty Source"], 
                                      capture_output=True, text=True)
            system_exe = path_res.stdout.strip()
            if system_exe and os.path.exists(system_exe):
                import shutil
                shutil.copy2(system_exe, target_exe)
                log(f"Engine mirrored to {target_exe}")
            else:
                log("Could not locate system Ollama to mirror. Remote fallback will be used.", "WARN")
        except Exception as e:
            log(f"Failed to mirror engine: {e}", "WARN")

def pull_base_model():
    base_model = "llama3.2:3b"
    log(f"Ensuring base model '{base_model}' is ready...")
    
    # Check if already pulled
    try:
        import requests
        resp = requests.get("http://127.0.0.1:11434/api/tags")
        if resp.status_code == 200:
            models = [m['name'] for m in resp.json().get('models', [])]
            if any(base_model in m for m in models):
                log(f"Base model '{base_model}' already exists locally.")
                return True
    except:
        pass

    log(f"Pulling {base_model} (this may take a few minutes depending on your connection)...")
    result = run_command(["ollama", "pull", base_model])
    return result is not None

def create_custom_model():
    target_model = "rangeready-v6"
    log(f"Building custom AI brain: {target_model}...")
    
    if not MODELFILE_PATH.exists():
        log(f"CRITICAL: Modelfile not found at {MODELFILE_PATH}", "ERROR")
        return False

    result = run_command(["ollama", "create", target_model, "-f", str(MODELFILE_PATH)])
    if result:
        log(f"Successfully created {target_model}")
        return True
    return False

def test_inference():
    log("Running AI Engine Health Check...")
    prompt = "VERIFY: System operational. Respond with 'ENGINE ONLINE'."
    try:
        import requests
        payload = {
            "model": "rangeready-v6",
            "prompt": prompt,
            "stream": False,
            "options": {"num_predict": 10}
        }
        resp = requests.post("http://127.0.0.1:11434/api/generate", json=payload, timeout=30)
        if resp.status_code == 200:
            answer = resp.json().get("response", "").strip()
            log(f"AI Response: {answer}", "SUCCESS")
            return "ENGINE ONLINE" in answer.upper()
    except Exception as e:
        log(f"Test failed: {e}", "WARN")
    return False

def main():
    log("=== RangeReady AI Preparation System ===")
    
    # 1. Check if Ollama is running
    log("Checking Ollama server status...")
    try:
        import requests
        requests.get("http://127.0.0.1:11434/", timeout=2)
    except:
        log("Ollama server not detected. Attempting to start 'ollama serve'...")
        subprocess.Popen(["ollama", "serve"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(5)

    # 2. Setup
    verify_dependencies()
    setup_ollama_storage()
    
    # 3. Model Logic
    if pull_base_model():
        if create_custom_model():
            if test_inference():
                log("AI SYSTEM INITIALIZED AND READY FOR AIR-GAPPED DEPLOYMENT", "SUCCESS")
            else:
                log("Setup completed but validation test failed. Please check backend logs.", "WARN")
    else:
        log("Failed to pull base model. Ensure you have internet access for the initial setup.", "ERROR")

if __name__ == "__main__":
    main()
