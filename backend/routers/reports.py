from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.test_session import TestSession
from ..services.report_generator import ReportGenerator
import os
import tempfile

router = APIRouter()

@router.get("/{session_id}/pdf")
async def download_pdf(session_id: int, db: Session = Depends(get_db)):
    """
    Generates and returns an ISRO-compliant PDF report.
    """
    tmp_dir = tempfile.gettempdir()
    file_path = os.path.join(tmp_dir, f"RangeReady_Report_{session_id}.pdf")
    
    report_gen = ReportGenerator(session_id, db)
    report_gen.generate_pdf(file_path)
    
    return FileResponse(file_path, media_type='application/pdf', filename=f"RangeReady_Report_{session_id}.pdf")

@router.get("/{session_id}/excel")
async def download_excel(session_id: int, db: Session = Depends(get_db)):
    """
    Generates and returns an Excel workbook with raw trace data.
    """
    tmp_dir = tempfile.gettempdir()
    file_path = os.path.join(tmp_dir, f"RangeReady_Data_{session_id}.xlsx")
    
    report_gen = ReportGenerator(session_id, db)
    report_gen.generate_excel(file_path)
    
    return FileResponse(file_path, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', filename=f"RangeReady_Data_{session_id}.xlsx")
