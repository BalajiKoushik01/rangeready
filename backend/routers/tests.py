from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from models.test_session import TestSession, TestStep, TestTemplate
from services.test_runner import TestRunner
from services.broadcast import manager
from typing import List
import datetime
import asyncio

router = APIRouter()

@router.post("/run")
async def run_test(dut_name: str, dut_serial: str, template_id: str, db: Session = Depends(get_db)):
    """
    Starts a new test session based on a persistent template or fallback.
    """
    # 1. Create a new test session
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
    elif template_id == "TTC_ANT_L":
        # Hardcoded fallback for existing demo
        steps = [
            TestStep(session_id=session.id, step_number=1, name="S11 Return Loss", measurement_type="S11", 
                     start_freq_hz=1e9, stop_freq_hz=2e9, points=401, upper_limit=-12.0),
            TestStep(session_id=session.id, step_number=2, name="VSWR Verification", measurement_type="VSWR", 
                     start_freq_hz=1e9, stop_freq_hz=2e9, points=401, upper_limit=1.5)
        ]
        db.add_all(steps)
        db.commit()

    # 3. Start the test runner in the background
    runner = TestRunner(session.id, db, websocket_manager=manager)
    asyncio.create_task(runner.run())

    return {"status": "started", "session_id": session.id}

@router.delete("/{session_id}")
async def delete_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(TestSession).filter(TestSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return {"status": "deleted"}

@router.get("/history")
def get_history(db: Session = Depends(get_db)):
    return db.query(TestSession).order_by(TestSession.timestamp.desc()).all()

@router.get("/{session_id}")
def get_session_detail(session_id: int, db: Session = Depends(get_db)):
    session = db.query(TestSession).filter(TestSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session
