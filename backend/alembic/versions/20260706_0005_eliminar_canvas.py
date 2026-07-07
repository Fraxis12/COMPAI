"""Elimina la integracion con Canvas/Instructure (reemplazada por subida de documentos).

Revision ID: 20260706_0005
Revises: 20260706_0004
"""
from alembic import op
from sqlalchemy import inspect

revision = "20260706_0005"
down_revision = "20260706_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "canvas_integrations" in inspector.get_table_names():
        op.drop_table("canvas_integrations")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "canvas_integrations" not in inspector.get_table_names():
        from app.models.usuario import Usuario  # noqa: F401  (asegura que 'usuarios' este registrada)
        import sqlalchemy as sa

        op.create_table(
            "canvas_integrations",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("usuario_id", sa.Integer(), sa.ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, unique=True),
            sa.Column("canvas_domain", sa.String(255), nullable=False, server_default="utec.instructure.com"),
            sa.Column("estado", sa.String(50), nullable=False, server_default="no_conectado"),
            sa.Column("access_token_encrypted", sa.Text(), nullable=True),
            sa.Column("refresh_token_encrypted", sa.Text(), nullable=True),
            sa.Column("scopes", sa.Text(), nullable=True),
            sa.Column("ultimo_sync", sa.DateTime(timezone=True), nullable=True),
            sa.Column("ultimo_error", sa.Text(), nullable=True),
            sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("actualizado_en", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
