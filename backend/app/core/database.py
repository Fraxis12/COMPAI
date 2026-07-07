"""
Configuración del motor de base de datos con SQLAlchemy.
Proporciona la sesión y la base declarativa para los modelos.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from app.core.config import settings

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# Motor de SQLAlchemy
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=settings.DEBUG,
    connect_args=connect_args,
)

# Sesión local
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base declarativa para los modelos ORM
Base = declarative_base()


def get_db() -> Session:
    """
    Dependencia de FastAPI que provee una sesión de base de datos
    y la cierra automáticamente al finalizar la request.
    Realiza rollback en caso de error para mantener consistencia.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
