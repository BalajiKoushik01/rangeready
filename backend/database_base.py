from sqlalchemy.ext.declarative import declarative_base

# Shared declarative base to break circular dependencies between 
# database.py and models/*.py
Base = declarative_base()
