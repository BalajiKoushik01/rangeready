import subprocess
import time
import webbrowser
import os
import sys

def launch():
    """
    Unified Launch Control for RangeReady Enterprise ATE.
    Automates the initialization of Backend, Frontend, and GUI Browser.
    """
    print("="*70)
    print(" RANGE READY - UNIFIED LAUNCH CONTROL (V5.1)")
    print("="*70)
    
    root_dir = os.getcwd()
    backend_dir = os.path.join(root_dir, "backend")
    frontend_dir = os.path.join(root_dir, "frontend")

    # 1. Start Backend (FastAPI)
    print("\n[1/3] INITIALIZING GVB TECH RF API BUS...")
    python_cmd = sys.executable
    backend_proc = subprocess.Popen(
        [python_cmd, "main.py"],
        cwd=backend_dir,
        creationflags=subprocess.CREATE_NEW_CONSOLE if os.name == 'nt' else 0
    )
    
    # 2. Synchronize Subsystems (Heartbeat Check)
    print("      > Establishing Bus Communication... ", end="", flush=True)
    import urllib.request
    max_retries = 30
    for i in range(max_retries):
        try:
            with urllib.request.urlopen("http://localhost:8787/health") as response:
                if response.getcode() == 200:
                    print("\n      [READY] Backend Operational")
                    break
        except:
            print(".", end="", flush=True)
            time.sleep(1)
    else:
        print("\n[TIMEOUT] Backend failed to initialize. Aborting.")
        backend_proc.terminate()
        return

    # 3. Start Frontend (Vite)
    print("\n[2/3] DEPLOYING CONTROL INTERFACE (VITE)...")
    frontend_proc = subprocess.Popen(
        "npm run dev",
        cwd=frontend_dir,
        shell=True,
        creationflags=subprocess.CREATE_NEW_CONSOLE if os.name == 'nt' else 0
    )
    
    # 4. Final Subsystem Synchronization
    print("\n[3/3] SYNCHRONIZING CONTROL MATRIX...")
    time.sleep(4) 
    
    gui_url = "http://localhost:5173"
    print(f"\n[STABLE] RANGE READY ENTERPRISE V5.1 DEPLOYED")
    print("="*70)
    print(f" INTERFACE: {gui_url}")
    print("="*70)
    
    webbrowser.open(gui_url)
    
    try:
        backend_proc.wait()
        frontend_proc.wait()
    except KeyboardInterrupt:
        print("\n\n[OFFLINE] SYSTEM SHUTDOWN INITIATED...")
        backend_proc.terminate()
        frontend_proc.terminate()
        print("[OFFLINE] ALL SUBSYSTEMS DEACTIVATED.")

if __name__ == "__main__":
    launch()
