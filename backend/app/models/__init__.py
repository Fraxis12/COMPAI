"""
Importar todos los modelos para que SQLAlchemy los registre en Base.metadata.
"""
from app.models.usuario import Usuario
from app.models.curso import Curso
from app.models.tarea import Tarea, EstadoTarea, PrioridadTarea
from app.models.recordatorio import Recordatorio, TipoRecordatorio
from app.models.plan_nutricional import PlanNutricional
from app.models.comida import Comida
from app.models.rutina_bienestar import RutinaBienestar
from app.models.sensor_data import SensorData, TipoSensor
from app.models.password_reset import PasswordResetCode
from app.models.sensor_snapshot import SensorSnapshot
from app.models.reporte import Reporte
from app.models.dispositivo_vinculo import DispositivoVinculo
from app.models.documento_academico import DocumentoAcademico, EstadoDocumento

__all__ = [
    "Usuario",
    "Curso",
    "Tarea",
    "EstadoTarea",
    "PrioridadTarea",
    "Recordatorio",
    "TipoRecordatorio",
    "PlanNutricional",
    "Comida",
    "RutinaBienestar",
    "SensorData",
    "TipoSensor",
    "PasswordResetCode",
    "SensorSnapshot",
    "Reporte",
    "DispositivoVinculo",
    "DocumentoAcademico",
    "EstadoDocumento",
]
