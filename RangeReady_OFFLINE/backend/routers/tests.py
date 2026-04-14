from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from models.test_session import TestSession, TestStep, TestTemplate
from services.test_runner import TestRunner
from services.broadcast import manager
from services.sequence_engine import SequenceEngine
from services.config_service import config_service
from typing import List
import datetime
import asyncio

router = APIRouter()

@router.post("/run")
async def run_test(dut_name: str, dut_serial: str, template_id: str, db: Session = Depends(get_db)):
    """
    Initiates an automated test session.
    
    This endpoint:
    1. Records the session in the database.
    2. Resolves test steps from a template or hardcoded fallback.
    3. Triggers the SequenceEngine in a background task to perform actual hardware
       orchestration and telemetry broadcasting.
    
    Args:
        dut_name: Name of the Device Under Test.
        dut_serial: Serial number for reporting.
        template_id: ID or Name of the test template to follow.
        db: Database session injection.
    """
    # 1. Create a new test session record
    session = TestSession(
        dut_name=dut_name,
        dut_serial=dut_serial,
        engineer_name="A. Joshi", 
        template_config={"template_id": template_id}
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # 2. Resolve template steps from database
    db_template = db.query(TestTemplate).filter(TestTemplate.id == template_id).first() if template_id.isdigit() else \
                  db.query(TestTemplate).filter(TestTemplate.name == template_id).first()
    
    if db_template:
        # Clone template steps into session-specific steps
        steps = [
            TestStep(
                session_id=session.id, 
                step_number=ts.step_number, 
                name=ts.name, 
                measurement_type=ts.measurement_type,
                start_freq_hz=ts.start_freq_hz, 
                stop_freq_hz=ts.stop_freq_hz, 
                points=ts.points, 
                upper_limit=ts.upper_limit,
                lower_limit=ts.lower_limit
            ) for ts in db_template.steps
        ]
        db.add_all(steps)
        db.commit()
    elif template_id == "TTC_ANT_L" or template_id == "INDUSTRIAL_SUITE" or template_id == "KEYSIGHT_TEK_SUITE":
        # Comprehensive fallback for real-world hardware testing preparation (Keysight/Tektronix Suite)
        steps = [
            # Signal Generator Setup
            TestStep(session_id=session.id, step_number=1, name="Source Initialization", measurement_type="SIGGEN_SETUP", 
                     start_freq_hz=1e9, stop_freq_hz=1e9, points=1, upper_limit=0.0),
            
            # Spectrum Analyzer: Signal Quality metrics
            TestStep(session_id=session.id, step_number=2, name="Spectral Data Acquisition", measurement_type="TRACE", 
                     start_freq_hz=1e9, stop_freq_hz=1e9, points=1001, upper_limit=0.0)
        ]
        db.add_all(steps)
        db.commit()

    # 3. Start the test sequence in the background
    # Fetch from dynamic configuration service
    instruments = {
        "Signal Generator": config_service.get_instrument_ip("Signal Generator"),
        "Spectrum Analyzer": config_service.get_instrument_ip("Spectrum Analyzer")
    }
    
    # Map high-level TestSteps into the execution format for the SequenceEngine
    sequence = []
    source_steps = db_template.steps if db_template else steps
    
    for s in source_steps:
        # Resolve Industry-Standard SCPI commands based on Measurement Type
        m_type = s.measurement_type.upper()
        target_role = "Spectrum Analyzer" # Default fallback
        cmd = "TRAC:DATA? TRACE1" # Fallback
        
        if m_type == "SIGGEN_SETUP":
            target_role = "Signal Generator"
            # Keysight/Agilent SCPI for setup
            cmd = f":FREQ:CW {s.start_freq_hz}; :POW 0 dBm; :OUTP ON"
        elif m_type == "TRACE":
            target_role = "Spectrum Analyzer"
            # Tektronix/RSA SCPI for fetching spectrum trace
            cmd = f":FREQ:CENT {s.start_freq_hz}; :TRAC:DATA?"
            
        sequence.append({
            "name": s.name,
            "type": "MEASURE",
            "target_role": target_role,
            "command": cmd
        })
        
    engine = SequenceEngine(sequence=sequence, instruments=instruments, trm_ip="192.168.1.50", ws_manager=manager)
    # Fire and forget: run the engine in an async background task
    asyncio.create_task(engine.execute())

    return {"status": "started", "session_id": session.id}

@router.delete("/{session_id}")
async def delete_session(session_id: int, db: Session = Depends(get_db)):
    """Deletes a specific test session and its historical results."""
    session = db.query(TestSession).filter(TestSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return {"status": "deleted"}

@router.get("/history")
def get_history(db: Session = Depends(get_db)):
    """Retrieves all past test sessions sorted by recency."""
    return db.query(TestSession).order_by(TestSession.timestamp.desc()).all()

@router.get("/{session_id}")
def get_session_detail(session_id: int, db: Session = Depends(get_db)):
    """Fetches full details and measured trace results for a single test session."""
    session = db.query(TestSession).filter(TestSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session
