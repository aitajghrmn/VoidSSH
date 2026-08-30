"""add ssh connection tags

Revision ID: b1c9f0a2d7e4
Revises: f3f0e6e0e2a1
Create Date: 2026-08-16 21:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b1c9f0a2d7e4'
down_revision = 'f3f0e6e0e2a1'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('ssh_connections', sa.Column('tags', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('ssh_connections', 'tags')
