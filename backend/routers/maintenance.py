from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
from models import FeatureFlag, Users, ActivityLog
from .auth import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix='/maintenance', tags=['maintenance'])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]

MAINTENANCE_FLAG_NAME = "maintenance_mode"


class MaintenanceStatus(BaseModel):
    active: bool
    message: str


class MaintenanceToggleRequest(BaseModel):
    message: Optional[str] = None


@router.get("/status", response_model=MaintenanceStatus)
async def get_maintenance_status(db: db_dependency):
    """Public endpoint - no auth required. Returns current maintenance status."""
    flag = db.query(FeatureFlag).filter(FeatureFlag.name == MAINTENANCE_FLAG_NAME).first()
    return MaintenanceStatus(
        active=flag.enabled if flag else False,
        message=flag.description if flag and flag.description else "Estamos realizando mejoras en la plataforma. Estaremos de vuelta en breve."
    )


@router.post("/toggle", response_model=MaintenanceStatus)
async def toggle_maintenance(
    user: user_dependency,
    db: db_dependency,
    body: Optional[MaintenanceToggleRequest] = None,
):
    """Developer-only endpoint. Toggles maintenance mode on/off."""
    if user is None or user.get('role') != 'developer':
        raise HTTPException(status_code=403, detail='Acceso solo para developers')

    flag = db.query(FeatureFlag).filter(FeatureFlag.name == MAINTENANCE_FLAG_NAME).first()
    if not flag:
        flag = FeatureFlag(
            name=MAINTENANCE_FLAG_NAME,
            description="Estamos realizando mejoras en la plataforma. Estaremos de vuelta en breve.",
            enabled=False,
        )
        db.add(flag)
        db.flush()

    flag.enabled = not flag.enabled
    if body and body.message:
        flag.description = body.message

    # Log the activity
    activity = ActivityLog(
        user_id=user.get('id'),
        user_name=user.get('user_name', 'developer'),
        action='maintenance_toggled',
        entity_type='system',
        details=f"Maintenance mode {'ACTIVATED' if flag.enabled else 'DEACTIVATED'} by {user.get('user_name', 'unknown')}",
    )
    db.add(activity)
    db.commit()

    # Invalidate the in-memory cache so the change takes effect immediately
    try:
        from main import invalidate_maintenance_cache
        invalidate_maintenance_cache()
    except ImportError:
        pass

    return MaintenanceStatus(
        active=flag.enabled,
        message=flag.description or "Estamos realizando mejoras en la plataforma. Estaremos de vuelta en breve."
    )
