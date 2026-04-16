from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.test_session import TestTemplate, TemplateStep
from typing import List, Annotated, Optional
from pydantic import BaseModel

router = APIRouter(prefix="", tags=["Test Templates"])

class StepCreate(BaseModel):
    name: str
    measurement_type: str
    start_freq_hz: float
    stop_freq_hz: float
    points: int
    upper_limit: Optional[float] = None
    lower_limit: Optional[float] = None

class TemplateCreate(BaseModel):
    name: str
    description: str
    steps: List[StepCreate]

@router.post("/")
async def create_template(template: TemplateCreate, db: Annotated[Session, Depends(get_db)]):
    db_template = TestTemplate(name=template.name, description=template.description)
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    
    for i, step in enumerate(template.steps):
        db_step = TemplateStep(
            template_id=db_template.id,
            step_number=i+1,
            **step.dict()
        )
        db.add(db_step)
    
    db.commit()
    return db_template

@router.get("/")
async def list_templates(db: Annotated[Session, Depends(get_db)]):
    return db.query(TestTemplate).all()

@router.get("/{template_id}", responses={404: {"description": "Template not found"}})
async def get_template(template_id: int, db: Annotated[Session, Depends(get_db)]):
    template = db.query(TestTemplate).filter(TestTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@router.delete("/{template_id}", responses={404: {"description": "Template not found"}})
async def delete_template(template_id: int, db: Annotated[Session, Depends(get_db)]):
    template = db.query(TestTemplate).filter(TestTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(template)
    db.commit()
    return {"status": "deleted"}
