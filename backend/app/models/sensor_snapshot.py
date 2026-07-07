from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, func

from app.core.database import Base


class SensorSnapshot(Base):
    __tablename__ = "sensor_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)
    lecturas = Column(JSON, nullable=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

