"""add app_settings table

Revision ID: e8a1f4c2b9d3
Revises: d7e2a4c9f1b3
Create Date: 2026-08-17 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e8a1f4c2b9d3'
down_revision = 'd7e2a4c9f1b3'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'app_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('registration_enabled', sa.Boolean(), nullable=False),
        sa.Column('session_timeout_minutes', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    # Single-row config table: seed the row every request reads/writes so
    # the app never has to special-case "no settings yet".
    op.execute(
        "INSERT INTO app_settings (id, registration_enabled, session_timeout_minutes) "
        "VALUES (1, true, NULL)"
    )


def downgrade():
    op.drop_table('app_settings')
