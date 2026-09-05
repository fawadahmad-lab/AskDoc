"""add per-user groq api key storage

Revision ID: c41a9f0b7d2e
Revises: 9eee1ed74c32
Create Date: 2026-09-04 10:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c41a9f0b7d2e"
down_revision: Union[str, Sequence[str], None] = "9eee1ed74c32"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add encrypted per-user Groq API key column."""
    op.add_column(
        "users",
        sa.Column("groq_api_key_enc", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    """Drop the encrypted Groq API key column."""
    op.drop_column("users", "groq_api_key_enc")