import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from backend.models.instrument import Instrument
try:
    inst = Instrument(name="test", model="test", serial_number="123", is_active=True)
    print("SUCCESS: Model instantiated correctly.")
except Exception as e:
    print(f"FAILURE: {type(e).__name__}: {e}")
