"""Campos y reportes del panel administrativo.

Revision ID: 20260703_0002
Revises: 20260703_0001
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

from app.models.reporte import Reporte

revision = "20260703_0002"
down_revision = "20260703_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    user_columns = {column["name"] for column in inspector.get_columns("usuarios")}
    if "ultimo_acceso" not in user_columns:
        op.add_column("usuarios", sa.Column("ultimo_acceso", sa.DateTime(timezone=True), nullable=True))
    if "activo" not in user_columns:
        op.add_column("usuarios", sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.true()))
    if "reportes" not in inspector.get_table_names():
        Reporte.__table__.create(bind=bind, checkfirst=True)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "reportes" in inspector.get_table_names():
        Reporte.__table__.drop(bind=bind, checkfirst=True)
    user_columns = {column["name"] for column in inspect(bind).get_columns("usuarios")}
    if "activo" in user_columns:
        op.drop_column("usuarios", "activo")
    if "ultimo_acceso" in user_columns:
        op.drop_column("usuarios", "ultimo_acceso")
