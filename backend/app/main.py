"""
Punto de entrada de la aplicación FastAPI.
Configura CORS, registra todos los routers y expone documentación Swagger en /docs.
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.seed import inicializar_bd
from app.core.database import SessionLocal
from app.core.rate_limit import SensitiveRouteRateLimitMiddleware
from app.routes import todos_routers

# Configurar logging
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    """En desarrollo puede inicializar tablas; producción usa exclusivamente Alembic."""
    if settings.AUTO_CREATE_TABLES:
        logger.info("📦 Inicializando base de datos de desarrollo...")
        inicializar_bd()
        logger.info("✅ Base de datos lista")
    else:
        logger.info("✅ Esquema administrado mediante migraciones Alembic")
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "API REST para una aplicación móvil de **asistente integral** del usuario.\n\n"
        "Incluye funcionalidades **académicas** (tareas, cursos, recordatorios de estudio) "
        "y de **nutrición y bienestar** (planes nutricionales, registro de comidas, "
        "rutinas de ejercicio, recordatorios de bienestar).\n\n"
        "📚 **Documentación interactiva**: [/docs](/docs) (Swagger UI) o [/redoc](/redoc).\n"
        "📜 **Esquema OpenAPI**: [/openapi.json](/openapi.json)."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# CORS - usar configuración desde env
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SensitiveRouteRateLimitMiddleware)

logger.info(f"🚀 Iniciando {settings.APP_NAME} v{settings.APP_VERSION}")
logger.info(f"📝 DEBUG={settings.DEBUG}")
logger.info(f"🌐 CORS origins={settings.ALLOWED_ORIGINS}")


@app.get("/", tags=["Salud"], summary="Health check")
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "estado": "ok",
        "documentacion": "/docs",
    }


@app.get("/health", tags=["Salud"], include_in_schema=False)
def health():
    with SessionLocal() as db:
        db.execute(text("SELECT 1"))
    return {"status": "ok", "version": settings.APP_VERSION}


# Registrar todos los routers
for router in todos_routers:
    app.include_router(router)
