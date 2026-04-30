"""add admission request salaries

Revision ID: 8b2f51d4c9a1
Revises: f3c2d1b7a9e4
Create Date: 2026-04-29 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "8b2f51d4c9a1"
down_revision = "f3c2d1b7a9e4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "admission_request_salaries",
        sa.Column("admission_request_id", sa.Integer(), nullable=False),
        sa.Column("salary_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="BRL"),
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.ForeignKeyConstraint(["admission_request_id"], ["admission_requests.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_admission_request_salaries_admission_request_id",
        "admission_request_salaries",
        ["admission_request_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_admission_request_salaries_admission_request_id", table_name="admission_request_salaries")
    op.drop_table("admission_request_salaries")
