from sqlalchemy.orm import Session
from models.test_session import TestSession, TestStep
import datetime

class DataService:
    def __init__(self, db: Session):
        self.db = db

    def create_session(self, dut_name: str, dut_serial: str, engineer: str) -> TestSession:
        db_session = TestSession(
            dut_name=dut_name,
            dut_serial=dut_serial,
            engineer_name=engineer,
            timestamp=datetime.datetime.now(datetime.UTC),
            overall_result="PENDING"
        )
        self.db.add(db_session)
        self.db.commit()
        self.db.refresh(db_session)
        return db_session

    def log_measurement(self, session_id: int, step_number: int, name: str,
                        meas_type: str, result_val: float, pass_fail: bool,
                        freqs: list = None, amps: list = None):
        step = TestStep(
            session_id=session_id,
            step_number=step_number,
            name=name,
            measurement_type=meas_type,
            result_value=result_val,
            pass_fail=pass_fail,
            frequencies_hz=freqs or [],
            amplitudes_db=amps or []
        )
        self.db.add(step)
        self.db.commit()
        
    def end_session(self, session_id: int, overall_result: str):
        session = self.db.query(TestSession).filter(TestSession.id == session_id).first()
        if session:
            session.overall_result = overall_result
            self.db.commit()
