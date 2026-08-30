"""add connection log recording

Revision ID: d7e2a4c9f1b3
Revises: c4a8e1f3b6d2
Create Date: 2026-08-16 23:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd7e2a4c9f1b3'
down_revision = 'c4a8e1f3b6d2'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('connection_logs', sa.Column('recording', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('connection_logs', 'recording')
