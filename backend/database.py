"""
FILE: database.py
ROLE: Persistence Layer (SQLite / SQLAlchemy).
TRIGGERS: Backend startup (main.py), CRUD routers (instruments.py).
TARGETS: backend/rangeready.db
DESCRIPTION: Manages the database engine and session factory for all instrumentation and test data.
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# SQLite DB path in the project root
DB_PATH = "sqlite:///./rangeready.db"

engine = create_engine(DB_PATH, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

from .database_base import Base

def init_db():
    """
    Idempotent database initializer with surgical schema migration (V5.1).
    """
    from .models.test_session import TestSession, TestStep
    from .models.instrument import Instrument, InstrumentCalibration
    from sqlalchemy import text, inspect
    
    # 1. Base table creation
    Base.metadata.create_all(bind=engine)
    
    # 2. Surgical Migration: Ensure 'command_map' exists in 'instruments'
    # Required for the new GenericSCPIDriver Profiler.
    inspector = inspect(engine)
    columns = [c['name'] for c in inspector.get_columns("instruments")]
    if "command_map" not in columns:
        print("MIGRATION: Adding 'command_map' column to 'instruments' table...")
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE instruments ADD COLUMN command_map JSON DEFAULT '{}'"))
    
    # 3. Verify Health
    db = SessionLocal()
    try:
        # We start with an empty registry; hardware must be discovered via Ethernet.
        if db.query(Instrument).count() == 0:
            print("INFO: Database initialized. Discovery service scanning for Keysight/R&S units...")
    finally:
        db.close()

def get_db():
    """
    FastAPI dependency that provides a transactional database session.
    
    Ensures that the session is properly closed after a request is completed,
    preventing connection leaks in the SQLite pool.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
