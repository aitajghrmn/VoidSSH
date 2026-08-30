import secrets

from flask import g, jsonify, request, session

CSRF_COOKIE_NAME = "csrf_token"
CSRF_HEADER_NAME = "X-CSRF-Token"

# No session exists yet when these run, so there is nothing for a forged
# cross-site request to ride on.
_EXEMPT_ENDPOINTS = {
    "auth.register",
    "auth.login",
    "auth.request_password_reset",
    "auth.confirm_password_reset",
}
_SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def _ensure_token():
    token = session.get("csrf_token")
    if not token:
        token = secrets.token_urlsafe(32)
        session["csrf_token"] = token
    return token


def register_csrf_protection(app):
    @app.before_request
    def _csrf_check():
        g.csrf_token = _ensure_token()

        if request.method in _SAFE_METHODS:
            return None
        if not request.path.startswith("/api/"):
            return None
        if request.endpoint in _EXEMPT_ENDPOINTS:
            return None
        if "user_id" not in session:
            # No authenticated session yet, so there is nothing a forged
            # request could ride on; let the route's own auth check (401)
            # be the one that rejects it.
            return None

        provided = request.headers.get(CSRF_HEADER_NAME, "")
        if not secrets.compare_digest(g.csrf_token, provided):
            return jsonify(error="CSRF token missing or invalid"), 403
        return None

    @app.after_request
    def _csrf_cookie(response):
        token = getattr(g, "csrf_token", None)
        if token:
            response.set_cookie(
                CSRF_COOKIE_NAME,
                token,
                httponly=False,
                samesite="Lax",
                secure=app.config.get("SESSION_COOKIE_SECURE", False),
            )
        return response
