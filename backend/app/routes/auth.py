"""
Endpoints de autenticación para usuarios finales.
"""
import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.mail import send_password_reset_code
from app.core.security import create_access_token, get_current_user, hash_password, verify_password
from app.models.password_reset import PasswordResetCode
from app.models.usuario import Usuario
from app.schemas.auth import (
    AuthRespuesta,
    LoginUsuario,
    MensajeRespuesta,
    RegistroUsuario,
    RestablecerPassword,
    SolicitudRecuperacionPassword,
)
from app.schemas.usuario import UsuarioActualizar, UsuarioRespuesta
from app.services import usuario_service

router = APIRouter(prefix="/auth", tags=["Autenticación"])
logger = logging.getLogger(__name__)


@router.post("/register", response_model=AuthRespuesta, status_code=status.HTTP_201_CREATED)
def register(datos: RegistroUsuario, db: Session = Depends(get_db)):
    correo = datos.correo.lower()
    if db.query(Usuario).filter(Usuario.correo == correo).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una cuenta con ese correo",
        )

    usuario = Usuario(
        nombre=datos.nombre.strip(),
        correo=correo,
        password_hash=hash_password(datos.password),
        preferencias={
            "tema": "claro",
            "idioma": "es",
            "notificaciones": True,
            "objetivo_diario": "Organizar mi dia",
        },
        ultimo_acceso=datetime.now(timezone.utc),
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return {"user": usuario, "token": create_access_token(usuario.id)}


@router.post("/login", response_model=AuthRespuesta)
def login(datos: LoginUsuario, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.correo == datos.correo.lower()).first()
    if not usuario or not verify_password(datos.password, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
        )

    if not usuario.activo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cuenta desactivada")
    usuario.ultimo_acceso = datetime.now(timezone.utc)
    db.commit()
    db.refresh(usuario)
    return {"user": usuario, "token": create_access_token(usuario.id)}


@router.post("/forgot-password", response_model=MensajeRespuesta)
def forgot_password(datos: SolicitudRecuperacionPassword, db: Session = Depends(get_db)):
    correo = datos.correo.lower()
    usuario = db.query(Usuario).filter(Usuario.correo == correo).first()
    generic_message = "Si el correo existe, enviaremos un codigo para recuperar tu cuenta."

    if not usuario:
        return {"message": generic_message}

    code = f"{secrets.randbelow(1_000_000):06d}"
    now = datetime.now(timezone.utc)

    db.query(PasswordResetCode).filter(
        PasswordResetCode.usuario_id == usuario.id,
        PasswordResetCode.usado == False,  # noqa: E712
    ).update({"usado": True})

    reset_code = PasswordResetCode(
        usuario_id=usuario.id,
        codigo_hash=hash_password(code),
        expira_en=now + timedelta(minutes=settings.PASSWORD_RESET_CODE_EXPIRE_MINUTES),
    )
    db.add(reset_code)
    db.commit()

    try:
        send_password_reset_code(usuario.correo, code)
    except Exception:
        logger.exception("No se pudo enviar el codigo de recuperacion a %s", usuario.correo)

    return {"message": generic_message}


@router.post("/reset-password", response_model=MensajeRespuesta)
def reset_password(datos: RestablecerPassword, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.correo == datos.correo.lower()).first()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Codigo invalido o vencido")

    reset_code = (
        db.query(PasswordResetCode)
        .filter(PasswordResetCode.usuario_id == usuario.id, PasswordResetCode.usado == False)  # noqa: E712
        .order_by(PasswordResetCode.creado_en.desc())
        .first()
    )

    now = datetime.now(timezone.utc)
    if not reset_code or reset_code.expira_en < now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Codigo invalido o vencido")

    if reset_code.intentos >= 5:
        reset_code.usado = True
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Codigo invalido o vencido")

    if not verify_password(datos.codigo.strip(), reset_code.codigo_hash):
        reset_code.intentos += 1
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Codigo invalido o vencido")

    usuario.password_hash = hash_password(datos.nueva_password)
    reset_code.usado = True
    db.commit()

    return {"message": "Contrasena actualizada. Ya puedes iniciar sesion."}


@router.get("/me", response_model=UsuarioRespuesta)
def me(usuario: Usuario = Depends(get_current_user)):
    return usuario


@router.put("/me", response_model=UsuarioRespuesta)
def actualizar_me(
    datos: UsuarioActualizar,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    return usuario_service.actualizar_usuario(db, usuario.id, datos)
