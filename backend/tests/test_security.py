import os
from pathlib import Path

Path("test_compai.db").unlink(missing_ok=True)
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_compai.db")
os.environ.setdefault("AUTO_CREATE_TABLES", "true")
os.environ.setdefault("SEED_DEMO_DATA", "false")
os.environ.setdefault("IOT_API_KEYS", "test-device-key:1")

from app.core.database import SessionLocal
from app.core.config import settings
from app.core.security import decode_access_token, hash_password
from app.main import app
from app.models.sensor_data import SensorData, TipoSensor
from app.models.usuario import Usuario
from app.seed import inicializar_bd
from app.services.sensor_data_service import obtener_lecturas
from app.routes.admin import admin_login, dashboard
from app.schemas.admin import AdminLoginRequest

inicializar_bd()


def test_private_users_route_is_not_exposed():
    paths = {route.path for route in app.routes}
    assert "/usuarios/" not in paths
    assert "/auth/me" in paths


def test_sensor_queries_are_isolated_by_user():
    with SessionLocal() as db:
        first = Usuario(nombre="Uno", correo="uno@example.com", password_hash="test", preferencias={})
        second = Usuario(nombre="Dos", correo="dos@example.com", password_hash="test", preferencias={})
        db.add_all([first, second])
        db.flush()
        db.add(SensorData(usuario_id=first.id, dispositivo_id="test", tipo_sensor=TipoSensor.AMBIENTE, valor=24.0, unidad="°C", metadatos={}))
        db.commit()

        assert len(obtener_lecturas(db, first.id)) == 1
        assert obtener_lecturas(db, second.id) == []


def test_admin_uses_separate_token_and_dashboard_exposes_no_passwords():
    settings.ADMIN_EMAIL = "admin@example.com"
    settings.ADMIN_PASSWORD_HASH = hash_password("StrongAdminPassword123")
    login = admin_login(AdminLoginRequest(email="admin@example.com", password="StrongAdminPassword123"))
    payload = decode_access_token(login.token)
    assert payload["role"] == "admin"

    with SessionLocal() as db:
        data = dashboard(estado="todos", db=db, _=payload)
    serialized = str(data).lower()
    assert "password" not in serialized
    assert "conversation" not in serialized
    assert data["totalUsuarios"] >= 2
