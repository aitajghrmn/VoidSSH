"""add ssh key auth columns

Revision ID: f3f0e6e0e2a1
Revises: a629233c84d0
Create Date: 2026-08-16 21:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f3f0e6e0e2a1'
down_revision = 'a629233c84d0'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('ssh_connections', sa.Column('encrypted_private_key', sa.Text(), nullable=True))
    op.add_column('ssh_connections', sa.Column('encrypted_private_key_passphrase', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('ssh_connections', 'encrypted_private_key_passphrase')
    op.drop_column('ssh_connections', 'encrypted_private_key')
