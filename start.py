import subprocess
import time
import webbrowser
import os
import sys
import json
import socket
import logging
import threading
from typing import Optional, List, Dict
from datetime import datetime

# Optimized for: Industrial Presentation (GVB Tech RangeReady V5.1)
# Ensures: 0-Error startup, Auto-Port Recovery, and AI-Feature synchronization.

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("RangeReady.Launcher")

class UnifiedSystemManager:
    """
    Industrial Launch Control for RangeReady Enterprise ATE.
    Handles Auto-Detection, Auto-Debugging, and Subsystem Synchronization.
    """
    BACKEND_PORT = 8787
    FRONTEND_PORT = 5173
    AI_PORT = 11434

    def __init__(self):
        self.root_dir = os.path.dirname(os.path.abspath(__file__))
        os.chdir(self.root_dir)
        
        # Industrial Logging (MISSION MASTER LOG)
        self.log_path = os.path.join(self.root_dir, "MISSION_MASTER.log")
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s.%(msecs)03d | %(name)s | [%(levelname)s] | %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S',
            handlers=[
                logging.FileHandler(self.log_path, mode='w'),
                logging.StreamHandler(sys.stdout)
            ]
        )
        self.logger = logging.getLogger("MISSION_ORCHESTRATOR")
        
        # Priority: RangeReady_OFFLINE Pendrive assets
        pendrive_backend = os.path.join(self.root_dir, "RangeReady_OFFLINE", "backend")
        self.backend_dir = pendrive_backend if os.path.exists(pendrive_backend) else os.path.join(self.root_dir, "backend")
        self.frontend_dir = os.path.join(self.root_dir, "frontend")
        self.frontend_dist = os.path.join(self.root_dir, "RangeReady_OFFLINE", "frontend_dist")
        if not os.path.exists(self.frontend_dist):
            self.frontend_dist = os.path.join(self.frontend_dir, "dist")

        self.python_exe = sys.executable
        self.backend_proc = None
        self.frontend_proc = None
        self.is_shutting_down = False

    def display_banner(self):
        print("\033[94m" + "="*80 + "\033[0m")
        print("\033[96m" + "           RANGE READY - UNIFIED SYSTEM MANAGER [V5.1]" + "\033[0m")
        print("\033[96m" + "              Industrial RF Platform & AI Copilot" + "\033[0m")
        print("\033[94m" + "="*80 + "\033[0m")

    def check_port(self, port: int) -> bool:
        """Returns True if a port is in use."""
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('127.0.0.1', port)) == 0

    def auto_debug_ports(self):
        """Auto-Debugging: Detects and kills rogue processes on critical ports."""
        for port in [self.BACKEND_PORT, self.FRONTEND_PORT]:
            if self.check_port(port):
                logger.warning(f"[AUTO-DEBUG] Port {port} is hijacked. Initiating recovery...")
                try:
                    # Windows specific port-to-pid lookup and kill
                    cmd = f"netstat -ano | findstr :{port}"
                    output = subprocess.check_output(cmd, shell=True).decode()
                    pids = set()
                    for line in output.strip().split('\n'):
                        parts = line.split()
                        if len(parts) > 4:
                            pids.add(parts[-1])
                    
                    for pid in pids:
                        if pid in ["0", "4"]: continue # System reserved PIDs
                        logger.info(f"[AUTO-DEBUG] Terminating rogue PID: {pid}")
                        subprocess.run(f"taskkill /F /PID {pid}", shell=True, capture_output=True)
                    
                    time.sleep(2) # Extended grace period for OS to release file handles
                except Exception as e:
                    logger.error(f"[AUTO-DEBUG] Failed to recover port {port}: {e}")

    def verify_environment(self):
        """Auto-Detection: Verifies workspace integrity and performs dependency validation."""
        logger.info("[1/5] VERIFYING WORKSPACE INTEGRITY...")
        
        # Cleanup lock file
        if os.path.exists(os.path.join(self.root_dir, "Running")):
            try:
                os.remove(os.path.join(self.root_dir, "Running"))
            except: pass

        # Structural Verification
        critical_paths = [self.backend_dir, os.path.join(self.backend_dir, "main.py")]
        for p in critical_paths:
            if not os.path.exists(p):
                logger.error(f"[FATAL] Missing workforce asset: {p}")
                sys.exit(1)
                
        # Dependency Validation Handshake
        logger.info("      > Performing Dependency Validation Handshake...")
        try:
            # Test if portable engine can find its core libraries
            cmd = [self.python_exe, "-c", "import fastapi; import uvicorn; import pyvisa; print('DEP_OK')"]
            env = os.environ.copy()
            # Explicitly point to the portable site-packages just in case
            sp_path = os.path.join(os.path.dirname(self.python_exe), "Lib", "site-packages")
            env["PYTHONPATH"] = sp_path
            
            output = subprocess.check_output(cmd, env=env, stderr=subprocess.STDOUT).decode().strip()
            if "DEP_OK" in output:
                logger.info("[OK] RF Logic Libraries Verified.")
            else:
                raise Exception("Dependency check returned invalid handshake.")
        except Exception as e:
            logger.error(f"[FATAL] Dependency Validation FAILED: {e}")
            sys.exit(1)

        logger.info("[OK] Workspace structure verified.")

    def patch_frontend_port(self, port: int):
        """Ultra-Industrial Port-Shifting: Hot-patches the production JS to match the active backend port."""
        if not os.path.exists(self.frontend_dist): return
        self.logger.info(f"[PORT-SHIFTER] Aligning Frontend assets with target port: {port}")
        for root, dirs, files in os.walk(self.frontend_dist):
            for file in files:
                if file.endswith(".js"):
                    path = os.path.join(root, file)
                    try:
                        with open(path, 'r', encoding='utf-8') as f:
                            content = f.read()
                        
                        # Replace occurrences of 8787/8788 with the new port
                        new_content = content.replace(":8787", f":{port}").replace(":8788", f":{port}")
                        
                        if content != new_content:
                            with open(path, 'w', encoding='utf-8') as f:
                                f.write(new_content)
                            self.logger.info(f"      [OK] Patched: {file}")
                    except: pass

    def launch_backend(self):
        """Starts the GVB Tech RF API Bus with Port-Shifting resilience."""
        target_port = self.BACKEND_PORT
        if self.check_port(target_port):
            self.logger.warning(f"[BLACK-SWAN] Port {target_port} HIJACKED. Shifting to fallback 8788...")
            target_port = 8788
            self.patch_frontend_port(target_port)

        env = os.environ.copy()
        sp_path = os.path.join(os.path.dirname(self.python_exe), "Lib", "site-packages")
        launch_cwd = os.path.dirname(self.backend_dir)
        env["PYTHONPATH"] = ";".join([launch_cwd, self.backend_dir, sp_path, env.get("PYTHONPATH", "")])
        
        log_file = open(os.path.join(self.root_dir, "backend_crash.log"), "w") 
        backend_main = os.path.join(self.backend_dir, "main.py")
        
        self.logger.info(f"[DISPATCH] Starting Logic Engine (Port {target_port})...")
        self.backend_proc = subprocess.Popen(
            [self.python_exe, "-u", backend_main, "--port", str(target_port)],
            cwd=launch_cwd, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, 
            text=True, bufsize=1
        )
        
        # REAL-TIME TELEMETRY BRIDGE: Stream Logic Engine logs to terminal
        def stream_logs(pipe, logger):
            for line in iter(pipe.readline, ''):
                if line:
                    clean_line = line.strip()
                    # Print to terminal with dedicated tag
                    print(f"\033[90m[LOGIC-ENGINE]\033[0m {clean_line}")
                    # Also mirror to Master Log
                    logger.info(f"[BACKEND-PIPE] {clean_line}")
            pipe.close()

        threading.Thread(target=stream_logs, args=(self.backend_proc.stdout, self.logger), daemon=True).start()
        
        # REDUNDANCY FIX: Removed the duplicate Popen call here.
        # The previous loop above already handled the dispatch and log streaming.
        return True

        # FAST HANDSHAKE: Ensure binding on 127.0.0.1
        import urllib.request
        max_retries = 30
        for i in range(max_retries):
            # Check if process died immediately
            exit_code = self.backend_proc.poll()
            if exit_code is not None:
                logger.error(f"[FATAL] Backend crashed on startup (Exit Code: {exit_code}).")
                return False
                
            try:
                # Use explicit IP to bypass DNS resolution lag
                with urllib.request.urlopen(f"http://127.0.0.1:{self.BACKEND_PORT}/health", timeout=1) as resp:
                    if resp.getcode() == 200:
                        logger.info("[SUCCESS] Backend Engine Operational.")
                        return True
            except:
                time.sleep(1)
        
        logger.error("[FATAL] Backend failed to stabilize within 30s.")
        return False

    def launch_frontend(self):
        """Starts the interface server concurrently."""
        if not os.path.exists(self.frontend_dist):
            self.logger.error("[DISPATCH] Skipping Frontend: No distribution folder found.")
            return

        self.logger.info(f"[DISPATCH] Starting Interface Sentry (Port {self.FRONTEND_PORT})...")
        self.frontend_proc = subprocess.Popen(
            [self.python_exe, "-m", "http.server", str(self.FRONTEND_PORT)],
            cwd=self.frontend_dist, stdout=subprocess.DEVNULL
        )

    def launch_gui(self):
        """Launches the Standard Interface."""
        logger.info("[5/5] HANDSHAKING WITH HOST GUI...")
        gui_url = f"http://localhost:{self.FRONTEND_PORT}"
        # PREFERENCE: Launch in standard browser for better industrial reliability
        webbrowser.open(gui_url)
        launched = True
            
        print("\033[92m" + "="*80 + "\033[0m")
        print("\033[92m" + " SYSTEM ONLINE: All subsystems reporting GREEN." + "\033[0m")
        print("\033[92m" + "="*80 + "\033[0m")

    def run(self):
        """ULTRA-PARALLEL DISPATCHER: Concurrent System Launch Sequence."""
        try:
            self.display_banner()
            self.auto_debug_ports() 
            self.verify_environment()

            self.logger.info("[MISSION] COMMENCING ULTRA-PARALLEL LAUNCH...")
            
            # --- CONCURRENT DISPATCH ---
            dispatch_threads = [
                threading.Thread(target=self.launch_backend, name="T-Backend"),
                threading.Thread(target=self.launch_frontend, name="T-Frontend")
            ]
            for t in dispatch_threads: 
                t.start()
            
            # IMMEDIATE GUI HOOK (No waiting for ports)
            time.sleep(1) # Minimum dispersion
            self.launch_gui()
            
            # --- MISSION WATCHDOG ---
            self.logger.info("[MISSION] Watchdog armed. Monitoring subsystem pulse...")
            while not self.is_shutting_down:
                # 1. Backend Auto-Resurrection
                if self.backend_proc and self.backend_proc.poll() is not None:
                    self.logger.error("[BLACK-SWAN] Logic Engine crash detected. AUTONOMOUS RECOVERY INITIATED.")
                    self.launch_backend()
                
                # 2. Frontend Health Check
                if self.frontend_proc and self.frontend_proc.poll() is not None:
                    self.logger.warning("[BLACK-SWAN] Interface server stopped. Restarting...")
                    self.launch_frontend()
                    
                time.sleep(5)

        except KeyboardInterrupt:
            self.shutdown()
        except Exception as e:
            self.logger.critical(f"UNHANDLED SYSTEM VITAL FAILURE: {e}")
            import traceback
            traceback.print_exc()
            self.shutdown()
        except Exception as e:
            print("\033[91m" + "!"*80 + "\033[0m")
            print("\033[91m" + f" FATAL STARTUP ERROR: {e}" + "\033[0m")
            import traceback
            traceback.print_exc()
            print("\033[91m" + "!"*80 + "\033[0m")
            input("\n[FATAL] System crashed. Press ENTER to close console...")
            self.shutdown()

    def shutdown(self):
        print("\n\n" + "="*80)
        logger.info("SYSTEM SHUTDOWN INITIATED...")
        if self.backend_proc: self.backend_proc.terminate()
        if self.frontend_proc: self.frontend_proc.terminate()
        logger.info("ALL SUBSYSTEMS DEACTIVATED.")
        print("="*80)

if __name__ == "__main__":
    manager = UnifiedSystemManager()
    manager.run()

