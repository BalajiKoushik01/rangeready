"""
FILE: models/instrument.py
ROLE: SQLAlchemy ORM schema for all registered hardware assets.
TRIGGERS: routers/instruments.py (CRUD), services/status_poller.py (status checks).
TARGETS: SQLite database via backend/database.py.
DESCRIPTION:
  Defines the 'instruments' and 'instrument_calibrations' tables.

  KEY FIELDS:
    driver_id        → Which Python driver class handles this hardware
                       (e.g. 'KeysightUniversalDriver', 'GenericSCPIDriver')
    command_map      → JSON dict of SCPI mappings for GenericSCPIDriver.
                       Set by the GUI Profiler Wizard for unknown hardware.
                       e.g. {"set_frequency": "FREQ {value}", "rf_on": "OUTP ON"}
    instrument_class → Category: signal_generator | spectrum_analyzer |
                       vector_network_analyzer | oscilloscope | power_supply | generic
    vendor           → Auto-detected during Profiler probe (Keysight, R&S, etc.)
    capabilities     → JSON dict of hardware limits (max_freq_hz, min_power_dbm, etc.)
                       Used by the SCPI Negotiation Engine to clamp values on -222 errors.
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, ForeignKey, Boolean
from sqlalchemy.orm import relationship
import datetime
from backend.database_base import Base

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
    
    # Which Python driver class handles this hardware
    # e.g. 'KeysightUniversalDriver', 'RSUniversalDriver', 'GenericSCPIDriver'
    driver_id = Column(String)

    # For GenericSCPIDriver: custom SCPI command → template mapping
    # Populated by the GUI Profiler Wizard for unknown/unregistered hardware
    # e.g. {"set_frequency": "SOUR:FREQ:CW {value}", "rf_on": "OUTP ON"}
    command_map = Column(JSON, default=dict)

    # Instrument category — drives which wizard questions are asked
    # Values: signal_generator | spectrum_analyzer | vector_network_analyzer |
    #         oscilloscope | power_supply | generic
    instrument_class = Column(String, default="generic")

    # Auto-detected vendor string from *IDN? response
    vendor = Column(String, default="Unknown")

    # Hardware operating limits (populated during probe or manual entry)
    # Used by SCPI Negotiation Engine to clamp out-of-range values (-222 errors)
    # e.g. {"max_freq_hz": 6e9, "min_power_dbm": -130, "max_power_dbm": 20}
    capabilities = Column(JSON, default=dict)

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
