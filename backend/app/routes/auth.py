import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from flask import Blueprint, current_app, g, jsonify, request, session

from ..email import send_password_reset_email
from ..extensions import db, limiter
from ..models import PasswordResetToken, User, get_app_settings
from ..security.auth import login_required
from ..security.passwords import hash_password, verify_password

auth_bp = Blueprint("auth", __name__, url_prefix="/api")

RESET_TOKEN_TTL_MINUTES = 60


def _user_to_dict(user):
    return {"id": user.id, "username": user.username, "email": user.email, "role": user.role}


def _hash_token(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _naive_utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


@auth_bp.post("/register")
@limiter.limit("10 per minute")
def register():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip()
    password = data.get("password") or ""

    if not username or not email or not password:
        return jsonify(error="username, email, and password are required"), 400

    if not get_app_settings().registration_enabled:
        return jsonify(error="registration is currently closed"), 403

    if User.query.filter_by(username=username).first():
        return jsonify(error="username already taken"), 409

    if User.query.filter_by(email=email).first():
        return jsonify(error="email already registered"), 409

    # Bootstrap: the very first account on a fresh instance becomes admin,
    # since there's no other way to reach an admin-only endpoint yet.
    role = "admin" if User.query.count() == 0 else "user"

    user = User(username=username, email=email, password_hash=hash_password(password), role=role)
    db.session.add(user)
    db.session.commit()

    return jsonify(_user_to_dict(user)), 201


@auth_bp.post("/login")
@limiter.limit("10 per minute")
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return jsonify(error="username and password are required"), 400

    user = User.query.filter_by(username=username).first()
    if user is None or not verify_password(password, user.password_hash):
        return jsonify(error="invalid username or password"), 401

    session["user_id"] = user.id

    timeout = get_app_settings().session_timeout_minutes
    if timeout:
        session.permanent = True
        current_app.permanent_session_lifetime = timedelta(minutes=timeout)
        session["last_seen"] = datetime.now(timezone.utc).isoformat()

    return jsonify(_user_to_dict(user)), 200


@auth_bp.post("/logout")
def logout():
    session.pop("user_id", None)
    return "", 204


@auth_bp.get("/me")
@login_required
def me():
    return jsonify(_user_to_dict(g.current_user)), 200


@auth_bp.patch("/me")
@login_required
def update_me():
    data = request.get_json(silent=True) or {}
    user = g.current_user

    if "username" in data:
        username = (data.get("username") or "").strip()
        if not username:
            return jsonify(error="username cannot be empty"), 400
        if username != user.username and User.query.filter_by(username=username).first():
            return jsonify(error="username already taken"), 409
        user.username = username

    if "email" in data:
        email = (data.get("email") or "").strip()
        if not email:
            return jsonify(error="email cannot be empty"), 400
        if email != user.email and User.query.filter_by(email=email).first():
            return jsonify(error="email already registered"), 409
        user.email = email

    db.session.commit()
    return jsonify(_user_to_dict(user)), 200


@auth_bp.post("/me/password")
@login_required
def change_password():
    data = request.get_json(silent=True) or {}
    current_password = data.get("current_password") or ""
    new_password = data.get("new_password") or ""

    if not current_password or not new_password:
        return jsonify(error="current_password and new_password are required"), 400

    if not verify_password(current_password, g.current_user.password_hash):
        return jsonify(error="current password is incorrect"), 401

    g.current_user.password_hash = hash_password(new_password)
    db.session.commit()
    return "", 204


@auth_bp.delete("/me")
@login_required
def delete_me():
    data = request.get_json(silent=True) or {}
    password = data.get("password") or ""
    user = g.current_user

    if not verify_password(password, user.password_hash):
        return jsonify(error="password is incorrect"), 401

    if user.role == "admin" and User.query.filter_by(role="admin").count() <= 1:
        return jsonify(error="cannot delete the last remaining admin"), 400

    db.session.delete(user)
    db.session.commit()
    session.clear()
    return "", 204


@auth_bp.post("/password-reset/request")
@limiter.limit("5 per minute")
def request_password_reset():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip()

    if email:
        user = User.query.filter_by(email=email).first()
        if user is not None:
            PasswordResetToken.query.filter_by(user_id=user.id).delete()

            token = secrets.token_urlsafe(32)
            reset = PasswordResetToken(
                user_id=user.id,
                token_hash=_hash_token(token),
                expires_at=_naive_utc_now() + timedelta(minutes=RESET_TOKEN_TTL_MINUTES),
            )
            db.session.add(reset)
            db.session.commit()

            reset_url = f"{current_app.config['FRONTEND_URL']}/reset-password?token={token}"
            send_password_reset_email(user.email, reset_url)

    # Always the same response, whether or not the email matched an account -
    # returning a different message for "no such user" would let an attacker
    # enumerate which addresses have accounts here.
    return jsonify(message="If an account exists for that email, a reset link has been sent."), 200


@auth_bp.post("/password-reset/confirm")
@limiter.limit("10 per minute")
def confirm_password_reset():
    data = request.get_json(silent=True) or {}
    token = data.get("token") or ""
    new_password = data.get("new_password") or ""

    if not token or not new_password:
        return jsonify(error="token and new_password are required"), 400

    reset = PasswordResetToken.query.filter_by(token_hash=_hash_token(token)).first()
    if reset is None or reset.expires_at < _naive_utc_now():
        return jsonify(error="invalid or expired reset link"), 400

    user = db.session.get(User, reset.user_id)
    user.password_hash = hash_password(new_password)

    # The token just used, and any other outstanding ones for this user, are
    # no longer valid - deleting (rather than flagging) means a consumed or
    # superseded token can never be replayed.
    PasswordResetToken.query.filter_by(user_id=user.id).delete()
    db.session.commit()

    return "", 204
