from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.sensor_snapshot import SensorSnapshot
from app.models.usuario import Usuario
from app.schemas.sensor_snapshot import SensorSnapshotCreate, SensorSnapshotResponse

router = APIRouter(prefix="/sensor-snapshots", tags=["Sensores IoT"])


@router.get("/", response_model=list[SensorSnapshotResponse])
def list_snapshots(db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    return (
        db.query(SensorSnapshot)
        .filter(SensorSnapshot.usuario_id == usuario.id)
        .order_by(SensorSnapshot.creado_en.desc())
        .limit(50)
        .all()
    )


@router.post("/", response_model=SensorSnapshotResponse, status_code=status.HTTP_201_CREATED)
def save_snapshot(data: SensorSnapshotCreate, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    snapshot = SensorSnapshot(usuario_id=usuario.id, lecturas=[item.model_dump() for item in data.lecturas])
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    return snapshot


@router.delete("/{snapshot_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_snapshot(snapshot_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    snapshot = db.query(SensorSnapshot).filter(SensorSnapshot.id == snapshot_id, SensorSnapshot.usuario_id == usuario.id).first()
    if not snapshot:
        raise HTTPException(status_code=404, detail="Lectura guardada no encontrada")
    db.delete(snapshot)
    db.commit()

