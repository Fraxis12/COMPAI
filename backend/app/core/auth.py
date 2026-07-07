"""
Autenticación mediante API Key para dispositivos IoT (ESP32).
Las API Keys deben ser cargadas desde variables de entorno en producción.
"""
import logging
from fastapi import Depends, Header, HTTPException, status
from typing import Dict
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db

logger = logging.getLogger(__name__)


def get_api_key_mapping() -> Dict[str, int]:
    """
    Carga el mapeo de API Keys a usuario_id desde variables de entorno.

    Formato esperado en IOT_API_KEYS: "key1:user1,key2:user2"
    Ejemplo: "esp32_sk_001:1,esp32_sk_002:2"

    En desarrollo sin env var configurada, usa valores por defecto.
    """
    keys_str = settings.IOT_API_KEYS or ""

    if not keys_str:
        logger.warning(
            "⚠️  IOT_API_KEYS no configurada. Usando defaults de desarrollo."
        )
        if settings.ENVIRONMENT.lower() in {"production", "prod"}:
            return {}
        return {"esp32_compa_sk_001": 1}

    try:
        mapping = {}
        for pair in keys_str.split(","):
            key, user_id_str = pair.strip().split(":")
            mapping[key] = int(user_id_str)
        return mapping
    except ValueError as e:
        logger.error(f"Formato inválido de IOT_API_KEYS: {e}")
        if settings.ENVIRONMENT.lower() in {"production", "prod"}:
            return {}
        return {"esp32_compa_sk_001": 1}


VALID_API_KEYS = get_api_key_mapping()


def resolver_usuario_por_api_key(api_key: str, db: Session) -> int:
    """
    Valida una API Key de un dispositivo IoT conocido y retorna el usuario_id
    al que se le deben atribuir sus lecturas.

    La app vincula el dispositivo a la cuenta activa automaticamente al abrir
    la pantalla de Sensores (tabla dispositivos_vinculados); esa vinculacion
    manda sobre el usuario por defecto de IOT_API_KEYS. Si todavia nadie lo
    vinculo (primer uso), se usa ese default.
    """
    if api_key not in VALID_API_KEYS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API Key inválida",
        )

    from app.models.dispositivo_vinculo import DispositivoVinculo

    vinculo = db.query(DispositivoVinculo).filter(DispositivoVinculo.api_key == api_key).first()
    if vinculo:
        return vinculo.usuario_id
    return VALID_API_KEYS[api_key]


async def validate_api_key(x_api_key: str = Header(...), db: Session = Depends(get_db)) -> int:
    """
    Valida API Key y retorna usuario_id asociado.
    Se utiliza como dependencia en endpoints protegidos.

    Header: X-API-Key
    """
    return resolver_usuario_por_api_key(x_api_key, db)
