"""seed local rh admin user

Revision ID: f3c2d1b7a9e4
Revises: e69b899cc6b1
Create Date: 2026-04-22 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa

from app.core.security import hash_password


# revision identifiers, used by Alembic.
revision = "f3c2d1b7a9e4"
down_revision = "e69b899cc6b1"
branch_labels = None
depends_on = None


USER_EMAIL = "wasion@local.invalid"
USER_FULL_NAME = "Wasion America"
USER_PASSWORD = "@Wasionamerica"


def upgrade() -> None:
    connection = op.get_bind()
    existing_user = connection.execute(
        sa.text("SELECT 1 FROM users WHERE email = :email"),
        {"email": USER_EMAIL},
    ).scalar_one_or_none()

    if existing_user is not None:
        return

    users_table = sa.table(
        "users",
        sa.column("email", sa.String),
        sa.column("full_name", sa.String),
        sa.column("password_hash", sa.String),
        sa.column("role", sa.String),
        sa.column("auth_source", sa.String),
        sa.column("is_active", sa.Boolean),
    )

    op.bulk_insert(
        users_table,
        [
            {
                "email": USER_EMAIL,
                "full_name": USER_FULL_NAME,
                "password_hash": hash_password(USER_PASSWORD),
                "role": "RH_ADMIN",
                "auth_source": "LOCAL",
                "is_active": True,
            }
        ],
    )


def downgrade() -> None:
    op.execute(
        sa.text("DELETE FROM users WHERE email = :email"),
        {"email": USER_EMAIL},
    )