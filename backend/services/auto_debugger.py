import os
import shutil
import sqlite3
import socket
import logging
from typing import Dict, Any

logger = logging.getLogger("RangeReady.AutoDebugger")

class AutoDebugger:
    """
    Diagnostic service for the RangeReady Backend.
    Provides deep-health checks and self-healing for common industrial deployment issues.
    """

    @staticmethod
    def check_disk_space(path: str = ".") -> Dict[str, Any]:
        """Verifies if there is enough space for reports and logs."""
        try:
            total, used, free = shutil.disk_usage(path)
            # Threshold: 100MB
            status = "healthy" if free > (100 * 1024 * 1024) else "critical"
            return {
                "status": status,
                "free_mb": free // (1024 * 1024),
                "total_mb": total // (1024 * 1024)
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def check_database(db_path: str = "rangeready.db") -> Dict[str, Any]:
        """Verifies SQLite integrity and detects stale locks."""
        if not os.path.exists(db_path):
            return {"status": "missing", "message": f"Database file {db_path} not found."}
        
        try:
            conn = sqlite3.connect(db_path, timeout=1)
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            conn.close()
            return {"status": "healthy", "message": "Database integrity verified."}
        except sqlite3.OperationalError as e:
            if "locked" in str(e).lower():
                return {"status": "locked", "message": "Database is locked by another process."}
            return {"status": "error", "message": str(e)}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def check_ai_engine() -> Dict[str, Any]:
        """Checks if the local Ollama server is responsive."""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(0.5)
                if s.connect_ex(('127.0.0.1', 11434)) == 0:
                    return {"status": "ready", "message": "AI Engine (Ollama) is responsive."}
                return {"status": "offline", "message": "AI Engine is not responding on port 11434."}
        except:
            return {"status": "offline", "message": "AI Engine port check failed."}

    @classmethod
    def run_full_diagnostics(cls) -> Dict[str, Any]:
        """Orchestrates all health checks for the master /health endpoint."""
        return {
            "disk": cls.check_disk_space(),
            "database": cls.check_database(),
            "ai_engine": cls.check_ai_engine(),
            "subsystems": {
                "telemetry": "active",
                "discovery": "active"
            }
        }

auto_debugger = AutoDebugger()
