"""Documentos academicos subidos por el usuario y su vinculo con cursos.

Revision ID: 20260706_0004
Revises: 20260706_0003
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

from app.models.documento_academico import DocumentoAcademico

revision = "20260706_0004"
down_revision = "20260706_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "documentos_academicos" not in inspector.get_table_names():
        DocumentoAcademico.__table__.create(bind=bind, checkfirst=True)

    curso_columns = {column["name"] for column in inspector.get_columns("cursos")}
    if "documento_id" not in curso_columns:
        op.add_column("cursos", sa.Column("documento_id", sa.Integer(), nullable=True))
        op.create_foreign_key(
            "fk_cursos_documento_id", "cursos", "documentos_academicos", ["documento_id"], ["id"], ondelete="SET NULL"
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    curso_columns = {column["name"] for column in inspector.get_columns("cursos")}
    if "documento_id" in curso_columns:
        op.drop_constraint("fk_cursos_documento_id", "cursos", type_="foreignkey")
        op.drop_column("cursos", "documento_id")
    if "documentos_academicos" in inspector.get_table_names():
        DocumentoAcademico.__table__.drop(bind=bind, checkfirst=True)
