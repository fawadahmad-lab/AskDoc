"""add email verification and password reset

Revision ID: e5b17f9c02a8
Revises: c41a9f0b7d2e
Create Date: 2026-09-04 11:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e5b17f9c02a8"
down_revision: Union[str, Sequence[str], None] = "c41a9f0b7d2e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add email verification + password-reset columns to users."""
    op.add_column("users", sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("verify_code_hash", sa.String(), nullable=True))
    op.add_column("users", sa.Column("verify_code_expires", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("reset_token_hash", sa.String(), nullable=True))
    op.add_column("users", sa.Column("reset_token_expires", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Drop email verification + password-reset columns."""
    op.drop_column("users", "reset_token_expires")
    op.drop_column("users", "reset_token_hash")
    op.drop_column("users", "verify_code_expires")
    op.drop_column("users", "verify_code_hash")
    op.drop_column("users", "email_verified_at")