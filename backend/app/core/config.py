"""
Configuración central de la aplicación.
Carga variables de entorno desde el archivo .env
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator, model_validator
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Base de datos
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/asistente_db"

    # App
    APP_NAME: str = "Asistente Integral API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False  # ✅ Seguro por defecto
    SECRET_KEY: str = "dev-change-me-before-production"
    AUTO_CREATE_TABLES: bool = True
    SEED_DEMO_DATA: bool = False
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    PASSWORD_RESET_CODE_EXPIRE_MINUTES: int = 15

    # Correo transaccional. En local puede quedar vacío: el código se registrará en logs.
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_FROM: str = "Compa <no-reply@compa.app>"
    SMTP_TLS: bool = True

    # Proveedores nutricionales. Las llaves viven solo en backend.
    NUTRITION_PROVIDER: str = "USDA"
    TRANSLATION_PROVIDER: str = "ARGOS_TRANSLATE"
    EDAMAM_APP_ID: str | None = None
    EDAMAM_APP_KEY: str | None = None
    NUTRITIONIX_APP_ID: str | None = None
    NUTRITIONIX_APP_KEY: str | None = None
    USDA_API_KEY: str | None = None
    USDA_FOODDATA_API_KEY: str | None = None

    # CompAI. La llave de Groq nunca debe enviarse al frontend.
    GROQ_API_KEY: str | None = None
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    # Modelo con vision (open-source, Meta Llama 4 Scout) para analizar fotos de comida.
    GROQ_VISION_MODEL: str = "meta-llama/llama-4-scout-17b-16e-instruct"
    IOT_API_KEYS: str | None = None
    ADMIN_EMAIL: str | None = None
    ADMIN_PASSWORD_HASH: str | None = None

    # Documentos academicos: almacenamiento y extraccion de texto.
    # LOCAL = disco del backend (funciona hoy, sin credenciales). S3/TEXTRACT
    # se agregan despues, cuando haya credenciales de AWS, sin tocar las rutas.
    DOCUMENT_STORAGE_PROVIDER: str = "LOCAL"
    DOCUMENT_STORAGE_LOCAL_DIR: str = "uploads"
    DOCUMENT_EXTRACTION_PROVIDER: str = "LOCAL"
    AWS_ACCESS_KEY_ID: str | None = None
    AWS_SECRET_ACCESS_KEY: str | None = None
    AWS_REGION: str | None = None
    AWS_S3_BUCKET: str | None = None

    # CORS - en desarrollo permite localhost, en producción debe ser explícito
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8080",
        "http://localhost:8081",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:8081",
    ]

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, value):
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"release", "production", "prod"}:
                return False
            if normalized in {"debug", "development", "dev"}:
                return True
        return value

    @model_validator(mode="after")
    def validate_production(self):
        if self.ENVIRONMENT.lower() not in {"production", "prod"}:
            return self
        if self.DEBUG:
            raise ValueError("DEBUG debe estar desactivado en producción")
        if self.SECRET_KEY == "dev-change-me-before-production" or len(self.SECRET_KEY) < 32:
            raise ValueError("SECRET_KEY debe ser único y tener al menos 32 caracteres en producción")
        if not self.DATABASE_URL.startswith(("postgresql://", "postgresql+psycopg2://")):
            raise ValueError("Producción requiere PostgreSQL")
        if not self.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY es obligatoria en producción")
        if not self.IOT_API_KEYS:
            raise ValueError("IOT_API_KEYS es obligatoria en producción")
        if not self.SMTP_HOST:
            raise ValueError("SMTP_HOST es obligatorio en producción")
        if not self.ADMIN_EMAIL or not self.ADMIN_PASSWORD_HASH:
            raise ValueError("ADMIN_EMAIL y ADMIN_PASSWORD_HASH son obligatorios en producción")
        if self.AUTO_CREATE_TABLES or self.SEED_DEMO_DATA:
            raise ValueError("AUTO_CREATE_TABLES y SEED_DEMO_DATA deben ser false en producción")
        if any("localhost" in origin or "127.0.0.1" in origin for origin in self.ALLOWED_ORIGINS):
            raise ValueError("ALLOWED_ORIGINS no puede contener localhost en producción")
        return self


settings = Settings()
