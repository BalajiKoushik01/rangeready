from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# SQLite DB path in the project root
DB_PATH = "sqlite:///./rangeready.db"

engine = create_engine(DB_PATH, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

from database_base import Base

def init_db():
    """
    Idempotent database initializer.
    
    Creates all tables and seeds default hardware if empty.
    """
    from models.test_session import TestSession, TestStep
    from models.instrument import Instrument, InstrumentCalibration
    Base.metadata.create_all(bind=engine)
    
    # Auto-seeding for first-run experience
    db = SessionLocal()
    try:
        if db.query(Instrument).count() == 0:
            print("INFO: Initializing hardware registry with default units...")
            default_units = [
                Instrument(
                    name="Siglent SSA Native", 
                    model="SSA3032X", 
                    serial_number="SSA3X-A123-009", 
                    address="192.168.1.142", 
                    connection_type="TCPIP",
                    driver_id="siglent_ssa",
                    is_active=True
                ),
                Instrument(
                    name="Dummy SA Simulator", 
                    model="DUMMY-V1", 
                    serial_number="SIM-000", 
                    address="TCPIP::127.0.0.1::INSTR", 
                    connection_type="TCPIP",
                    driver_id="dummy_sa",
                    is_active=True
                )
            ]
            db.add_all(default_units)
            db.commit()
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
