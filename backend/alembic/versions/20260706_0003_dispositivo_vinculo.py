"""Tabla de vinculo dinamico entre dispositivo IoT (API Key) y usuario actual.

Revision ID: 20260706_0003
Revises: 20260703_0002
"""
from alembic import op
from sqlalchemy import inspect

from app.models.dispositivo_vinculo import DispositivoVinculo

revision = "20260706_0003"
down_revision = "20260703_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "dispositivos_vinculados" not in inspector.get_table_names():
        DispositivoVinculo.__table__.create(bind=bind, checkfirst=True)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "dispositivos_vinculados" in inspector.get_table_names():
        DispositivoVinculo.__table__.drop(bind=bind, checkfirst=True)
