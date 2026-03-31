from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, ForeignKey, Boolean
from sqlalchemy.orm import relationship
import datetime
from .database import Base

class Instrument(Base):
    """
    Registry for hardware connected to the GVB Tech platform.
    Supports VISA addresses (TCPIP, USB, GPIB).
    """
    __tablename__ = "instruments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    model = Column(String)
    serial_number = Column(String, unique=True, index=True)
    connection_type = Column(String) # TCPIP, USB, GPIB
    address = Column(String) # IP or VISA Resource String
    
    driver_id = Column(String) # Points to the Plugin ID (e.g. 'siglent_ssa')
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    calibrations = relationship("InstrumentCalibration", back_populates="instrument", cascade="all, delete-orphan")

class InstrumentCalibration(Base):
    """
    Stores 1-Port or 2-Port OSLT calibration coefficients.
    coefficients: JSON dictionary containing Error Terms (Ed, Es, Er, etc.)
    """
    __tablename__ = "instrument_calibrations"

    id = Column(Integer, primary_key=True, index=True)
    instrument_id = Column(Integer, ForeignKey("instruments.id"))
    cal_type = Column(String) # OSL, SOLT, THRU
    
    # Range for which this cal is valid
    start_freq_hz = Column(Float)
    stop_freq_hz = Column(Float)
    points = Column(Integer)
    
    coefficients = Column(JSON) # Vectorized complex error terms
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    instrument = relationship("Instrument", back_populates="calibrations")
