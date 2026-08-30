import paramiko
from flask import Blueprint, g, jsonify, request

from ..extensions import db
from ..models import SSHConnection
from ..security.auth import login_required
from ..security.crypto import encrypt_value
from ..security.ssh_keys import parse_private_key

connections_bp = Blueprint("connections", __name__, url_prefix="/api")


def _parse_tags(stored):
    if not stored:
        return []
    return stored.split(",")


def _normalize_tags(raw):
    if raw is None:
        return []
    if isinstance(raw, str):
        raw = raw.split(",")
    if not isinstance(raw, list):
        return []
    tags = []
    for tag in raw:
        tag = str(tag).strip().lower()
        if tag and tag not in tags:
            tags.append(tag)
    return tags


def _connection_to_dict(connection):
    return {
        "id": connection.id,
        "name": connection.name,
        "host": connection.host,
        "port": connection.port,
        "username": connection.username,
        "auth_type": connection.auth_type,
        "tags": _parse_tags(connection.tags),
        "created_at": connection.created_at.isoformat() if connection.created_at else None,
    }


def _get_owned_connection(connection_id):
    return SSHConnection.query.filter_by(id=connection_id, user_id=g.current_user.id).first()


def _validate_private_key(private_key, passphrase):
    """Returns an error message if the key is unusable, else None."""
    try:
        parse_private_key(private_key, passphrase or None)
    except paramiko.PasswordRequiredException:
        return "private_key_passphrase is required to decrypt this key"
    except ValueError as exc:
        return str(exc)
    return None


@connections_bp.get("/connections")
@login_required
def list_connections():
    connections = (
        SSHConnection.query.filter_by(user_id=g.current_user.id)
        .order_by(SSHConnection.created_at.desc())
        .all()
    )
    tag_filter = (request.args.get("tag") or "").strip().lower()
    if tag_filter:
        connections = [c for c in connections if tag_filter in _parse_tags(c.tags)]
    return jsonify([_connection_to_dict(c) for c in connections]), 200


@connections_bp.post("/connections")
@login_required
def create_connection():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    host = (data.get("host") or "").strip()
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    private_key = data.get("private_key") or ""
    private_key_passphrase = data.get("private_key_passphrase") or ""
    port = data.get("port", 22)
    auth_type = data.get("auth_type") or "password"

    if not name or not host or not username:
        return jsonify(error="name, host, and username are required"), 400

    if auth_type not in ("password", "key"):
        return jsonify(error="auth_type must be 'password' or 'key'"), 400

    if auth_type == "password" and not password:
        return jsonify(error="password is required for auth_type 'password'"), 400

    if auth_type == "key":
        if not private_key:
            return jsonify(error="private_key is required for auth_type 'key'"), 400
        key_error = _validate_private_key(private_key, private_key_passphrase)
        if key_error:
            return jsonify(error=key_error), 400

    try:
        port = int(port)
    except (TypeError, ValueError):
        return jsonify(error="port must be an integer"), 400

    tags = _normalize_tags(data.get("tags"))

    connection = SSHConnection(
        user_id=g.current_user.id,
        name=name,
        host=host,
        port=port,
        username=username,
        auth_type=auth_type,
        encrypted_password=encrypt_value(password) if auth_type == "password" else None,
        encrypted_private_key=encrypt_value(private_key) if auth_type == "key" else None,
        encrypted_private_key_passphrase=(
            encrypt_value(private_key_passphrase) if auth_type == "key" and private_key_passphrase else None
        ),
        tags=",".join(tags) if tags else None,
    )
    db.session.add(connection)
    db.session.commit()

    return jsonify(_connection_to_dict(connection)), 201


@connections_bp.put("/connections/<int:connection_id>")
@login_required
def update_connection(connection_id):
    connection = _get_owned_connection(connection_id)
    if connection is None:
        return jsonify(error="connection not found"), 404

    data = request.get_json(silent=True) or {}

    if "name" in data:
        name = (data.get("name") or "").strip()
        if not name:
            return jsonify(error="name cannot be empty"), 400
        connection.name = name

    if "host" in data:
        host = (data.get("host") or "").strip()
        if not host:
            return jsonify(error="host cannot be empty"), 400
        connection.host = host

    if "username" in data:
        username = (data.get("username") or "").strip()
        if not username:
            return jsonify(error="username cannot be empty"), 400
        connection.username = username

    if "port" in data:
        try:
            connection.port = int(data.get("port"))
        except (TypeError, ValueError):
            return jsonify(error="port must be an integer"), 400

    if "auth_type" in data:
        auth_type = data.get("auth_type")
        if auth_type not in ("password", "key"):
            return jsonify(error="auth_type must be 'password' or 'key'"), 400
        connection.auth_type = auth_type

    if "tags" in data:
        tags = _normalize_tags(data.get("tags"))
        connection.tags = ",".join(tags) if tags else None

    if "password" in data and data.get("password"):
        connection.encrypted_password = encrypt_value(data["password"])

    if "private_key" in data and data.get("private_key"):
        private_key = data["private_key"]
        private_key_passphrase = data.get("private_key_passphrase") or ""
        key_error = _validate_private_key(private_key, private_key_passphrase)
        if key_error:
            return jsonify(error=key_error), 400
        connection.encrypted_private_key = encrypt_value(private_key)
        connection.encrypted_private_key_passphrase = (
            encrypt_value(private_key_passphrase) if private_key_passphrase else None
        )

    db.session.commit()

    return jsonify(_connection_to_dict(connection)), 200


@connections_bp.delete("/connections/<int:connection_id>")
@login_required
def delete_connection(connection_id):
    connection = _get_owned_connection(connection_id)
    if connection is None:
        return jsonify(error="connection not found"), 404

    db.session.delete(connection)
    db.session.commit()

    return "", 204
