from datetime import datetime, timezone

from .extensions import db


class User(db.Model):
    __tablename__ = "users"
    __table_args__ = (
        db.CheckConstraint("role IN ('user', 'admin')", name="ck_users_role"),
    )

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="user")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    connections = db.relationship(
        "SSHConnection", backref="owner", cascade="all, delete-orphan"
    )
    connection_logs = db.relationship(
        "ConnectionLog", backref="user", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<User {self.username}>"


class AppSettings(db.Model):
    __tablename__ = "app_settings"

    id = db.Column(db.Integer, primary_key=True)
    registration_enabled = db.Column(db.Boolean, nullable=False, default=True)
    # None means no idle timeout, matching today's default session behavior.
    session_timeout_minutes = db.Column(db.Integer, nullable=True)

    def __repr__(self):
        return f"<AppSettings registration_enabled={self.registration_enabled}>"


class PasswordResetToken(db.Model):
    __tablename__ = "password_reset_tokens"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    # Only the hash is stored - the raw token exists solely in the emailed
    # link, so a DB leak alone can't be used to reset anyone's password.
    token_hash = db.Column(db.String(64), unique=True, nullable=False, index=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<PasswordResetToken user_id={self.user_id}>"


def get_app_settings():
    # The migration seeds row id=1, but tests build the schema via
    # db.create_all() (no migrations), so lazily create it here too rather
    # than making every caller handle a missing row.
    settings = db.session.get(AppSettings, 1)
    if settings is None:
        settings = AppSettings(id=1, registration_enabled=True, session_timeout_minutes=None)
        db.session.add(settings)
        db.session.commit()
    return settings


class SSHConnection(db.Model):
    __tablename__ = "ssh_connections"
    __table_args__ = (
        db.CheckConstraint("auth_type IN ('password', 'key')", name="ck_ssh_connections_auth_type"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    host = db.Column(db.String(255), nullable=False)
    port = db.Column(db.Integer, nullable=False, default=22)
    username = db.Column(db.String(80), nullable=False)
    auth_type = db.Column(db.String(20), nullable=False, default="password")
    encrypted_password = db.Column(db.Text, nullable=True)
    encrypted_private_key = db.Column(db.Text, nullable=True)
    encrypted_private_key_passphrase = db.Column(db.Text, nullable=True)
    tags = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<SSHConnection {self.name} ({self.host})>"


class ConnectionLog(db.Model):
    __tablename__ = "connection_logs"
    __table_args__ = (
        db.CheckConstraint("status IN ('success', 'failed')", name="ck_connection_logs_status"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    connection_id = db.Column(
        db.Integer, db.ForeignKey("ssh_connections.id", ondelete="SET NULL"), nullable=True
    )
    # Snapshot of the connection's identity at the time of the attempt, so the
    # history stays meaningful even after the connection is edited or deleted.
    connection_name = db.Column(db.String(120), nullable=False)
    host = db.Column(db.String(255), nullable=False)
    port = db.Column(db.Integer, nullable=False)
    username = db.Column(db.String(80), nullable=False)
    status = db.Column(db.String(20), nullable=False)
    error_message = db.Column(db.Text, nullable=True)
    # Raw terminal output captured for the session (bounded, see
    # sockets/ssh_session.py MAX_RECORDING_CHARS); null for failed attempts
    # and for sessions predating this feature.
    recording = db.Column(db.Text, nullable=True)
    started_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    ended_at = db.Column(db.DateTime, nullable=True)

    def __repr__(self):
        return f"<ConnectionLog {self.connection_name} ({self.status})>"
