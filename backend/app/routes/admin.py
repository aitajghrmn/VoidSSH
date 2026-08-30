from flask import Blueprint, g, jsonify, request

from ..extensions import db
from ..models import SSHConnection, User, get_app_settings
from ..security.auth import admin_required

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


def _user_to_dict(user):
    connection_count = SSHConnection.query.filter_by(user_id=user.id).count()
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "connection_count": connection_count,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


@admin_bp.get("/users")
@admin_required
def list_users():
    users = User.query.order_by(User.created_at.asc()).all()
    return jsonify([_user_to_dict(u) for u in users]), 200


@admin_bp.delete("/users/<int:user_id>")
@admin_required
def delete_user(user_id):
    if user_id == g.current_user.id:
        return jsonify(error="cannot delete your own account"), 400

    user = db.session.get(User, user_id)
    if user is None:
        return jsonify(error="user not found"), 404

    if user.role == "admin" and User.query.filter_by(role="admin").count() <= 1:
        return jsonify(error="cannot delete the last remaining admin"), 400

    db.session.delete(user)
    db.session.commit()

    return "", 204


def _settings_to_dict(settings):
    return {
        "registration_enabled": settings.registration_enabled,
        "session_timeout_minutes": settings.session_timeout_minutes,
    }


@admin_bp.get("/settings")
@admin_required
def get_settings():
    return jsonify(_settings_to_dict(get_app_settings())), 200


@admin_bp.patch("/settings")
@admin_required
def update_settings():
    data = request.get_json(silent=True) or {}
    settings = get_app_settings()

    if "registration_enabled" in data:
        value = data.get("registration_enabled")
        if not isinstance(value, bool):
            return jsonify(error="registration_enabled must be a boolean"), 400
        settings.registration_enabled = value

    if "session_timeout_minutes" in data:
        value = data.get("session_timeout_minutes")
        if value is not None and (not isinstance(value, int) or isinstance(value, bool) or value <= 0):
            return jsonify(error="session_timeout_minutes must be a positive integer or null"), 400
        settings.session_timeout_minutes = value

    db.session.commit()
    return jsonify(_settings_to_dict(settings)), 200
