"""add user roles and connection logs

Revision ID: c4a8e1f3b6d2
Revises: b1c9f0a2d7e4
Create Date: 2026-08-16 22:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c4a8e1f3b6d2'
down_revision = 'b1c9f0a2d7e4'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('role', sa.String(length=20), nullable=False, server_default='user'))
    op.alter_column('users', 'role', server_default=None)
    op.create_check_constraint('ck_users_role', 'users', "role IN ('user', 'admin')")

    # The app promotes the first-ever registrant to admin at register time,
    # but that logic never runs for accounts that already existed before
    # this migration. Without this, upgrading an existing install leaves
    # zero admins and no way to reach the new admin-only endpoints at all.
    op.execute(
        "UPDATE users SET role = 'admin' WHERE id = (SELECT id FROM users ORDER BY id ASC LIMIT 1)"
    )

    op.create_table(
        'connection_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('connection_id', sa.Integer(), nullable=True),
        sa.Column('connection_name', sa.String(length=120), nullable=False),
        sa.Column('host', sa.String(length=255), nullable=False),
        sa.Column('port', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(length=80), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('ended_at', sa.DateTime(), nullable=True),
        sa.CheckConstraint("status IN ('success', 'failed')", name='ck_connection_logs_status'),
        sa.ForeignKeyConstraint(['connection_id'], ['ssh_connections.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade():
    op.drop_table('connection_logs')
    op.drop_constraint('ck_users_role', 'users', type_='check')
    op.drop_column('users', 'role')
