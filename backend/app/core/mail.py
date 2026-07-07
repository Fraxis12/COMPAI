"""
Servicio mínimo de correo para mensajes transaccionales.
"""
import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_password_reset_code(to_email: str, code: str) -> None:
    subject = "Tu codigo para recuperar Compa"
    body = (
        "Hola,\n\n"
        f"Tu codigo para recuperar la contrasena de Compa es: {code}\n\n"
        f"Este codigo vence en {settings.PASSWORD_RESET_CODE_EXPIRE_MINUTES} minutos. "
        "Si no lo solicitaste, puedes ignorar este correo.\n"
    )

    if not settings.SMTP_HOST:
        logger.warning("SMTP no configurado. Codigo de recuperacion para %s: %s", to_email, code)
        return

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.SMTP_FROM
    message["To"] = to_email
    message.set_content(body)

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
        if settings.SMTP_TLS:
            smtp.starttls()
        if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
            smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        smtp.send_message(message)
