from datetime import datetime, timezone
from functools import wraps

from flask import g, jsonify, session

from ..extensions import db
from ..models import User, get_app_settings


def get_current_user():
    user_id = session.get("user_id")
    if user_id is None:
        return None

    timeout = get_app_settings().session_timeout_minutes
    if timeout:
        now = datetime.now(timezone.utc)
        last_seen = session.get("last_seen")
        if last_seen is not None:
            elapsed_minutes = (now - datetime.fromisoformat(last_seen)).total_seconds() / 60
            if elapsed_minutes > timeout:
                session.clear()
                return None
        session["last_seen"] = now.isoformat()

    return db.session.get(User, user_id)


def login_required(view_func):
    @wraps(view_func)
    def wrapped(*args, **kwargs):
        user = get_current_user()
        if user is None:
            return jsonify(error="authentication required"), 401
        g.current_user = user
        return view_func(*args, **kwargs)

    return wrapped


def admin_required(view_func):
    @wraps(view_func)
    def wrapped(*args, **kwargs):
        user = get_current_user()
        if user is None:
            return jsonify(error="authentication required"), 401
        if user.role != "admin":
            return jsonify(error="admin access required"), 403
        g.current_user = user
        return view_func(*args, **kwargs)

    return wrapped
