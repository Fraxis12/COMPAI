"""Agrupación de todos los routers."""
from app.routes import (
    auth,
    cursos,
    tareas,
    recordatorios,
    planes_nutricionales,
    comidas,
    rutinas,
    sensores,
    nutrition,
    chat,
    sensor_snapshots,
    admin,
    documentos_academicos,
)

todos_routers = [
    auth.router,
    cursos.router,
    tareas.router,
    recordatorios.router,
    planes_nutricionales.router,
    comidas.router,
    rutinas.router,
    sensores.router,
    nutrition.router,
    chat.router,
    sensor_snapshots.router,
    admin.router,
    documentos_academicos.router,
]
