from pydantic import BaseModel, Field


class VincularDispositivoRequest(BaseModel):
    api_key: str = Field(..., min_length=1, max_length=100)


class VincularDispositivoRespuesta(BaseModel):
    vinculado: bool
    dispositivo: str
