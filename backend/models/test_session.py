from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, ForeignKey, Boolean
from sqlalchemy.orm import relationship
import datetime
from backend.database_base import Base

class TestTemplate(Base):
    __tablename__ = "test_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    steps = relationship("TemplateStep", back_populates="template", cascade="all, delete-orphan")

class TemplateStep(Base):
    __tablename__ = "template_steps"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("test_templates.id"))
    step_number = Column(Integer)
    name = Column(String)
    measurement_type = Column(String) # S11, S21, VSWR, etc.
    
    start_freq_hz = Column(Float)
    stop_freq_hz = Column(Float)
    points = Column(Integer, default=401)
    
    # Simple limits (for standard steps)
    upper_limit = Column(Float, nullable=True)
    lower_limit = Column(Float, nullable=True)
    
    template = relationship("TestTemplate", back_populates="steps")
    masks = relationship("LimitMask", back_populates="step", cascade="all, delete-orphan")

class LimitMask(Base):
    """
    Supports segmented/complex limit envelopes.
    """
    __tablename__ = "limit_masks"

    id = Column(Integer, primary_key=True, index=True)
    step_id = Column(Integer, ForeignKey("template_steps.id"))
    freq_hz = Column(Float)
    upper_limit = Column(Float, nullable=True)
    lower_limit = Column(Float, nullable=True)
    
    step = relationship("TemplateStep", back_populates="masks")

class CalibrationRecord(Base):
    __tablename__ = "calibration_records"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    cal_type = Column(String) # e.g. "OSL", "SOLT"
    is_valid = Column(Boolean, default=True)
    coefficients = Column(JSON) # Stores normalized error terms
    temperature_c = Column(Float, nullable=True)

class TestSession(Base):
    __tablename__ = "test_sessions"

    id = Column(Integer, primary_key=True, index=True)
    dut_name = Column(String)
    dut_serial = Column(String)
    engineer_name = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    overall_result = Column(String)  # PASS/FAIL
    template_config = Column(JSON)
    
    steps = relationship("TestStep", back_populates="session", cascade="all, delete-orphan")

class TestStep(Base):
    __tablename__ = "test_steps"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("test_sessions.id"))
    step_number = Column(Integer)
    name = Column(String)
    measurement_type = Column(String)
    
    start_freq_hz = Column(Float)
    stop_freq_hz = Column(Float)
    points = Column(Integer)
    
    upper_limit = Column(Float)
    lower_limit = Column(Float)
    
    result_value = Column(Float) 
    pass_fail = Column(Boolean)
    
    frequencies_hz = Column(JSON)
    amplitudes_db = Column(JSON)
    
    session = relationship("TestSession", back_populates="steps")
