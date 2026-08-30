import os


def _parse_origins(value):
    return [origin.strip() for origin in value.split(",") if origin.strip()]


def _bool_env(name, default):
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in ("1", "true", "yes", "on")


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY")
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    ENCRYPTION_KEY = os.environ.get("ENCRYPTION_KEY")
    CORS_ORIGINS = _parse_origins(os.environ.get("CORS_ORIGINS", "http://localhost:5173"))

    # Cookies are HttpOnly + SameSite=Lax by default; Secure requires HTTPS,
    # which only the M6 reverse-proxy ("prod" compose profile) provides, so
    # it's opt-out via env rather than hardcoded per environment.
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = _bool_env("SESSION_COOKIE_SECURE", True)

    RATELIMIT_ENABLED = True
    RATELIMIT_STORAGE_URI = "memory://"

    # Email is optional: SMTP_HOST unset means password-reset links are
    # logged instead of sent, so the feature works out of the box on a
    # fresh self-hosted install with no mail server configured.
    SMTP_HOST = os.environ.get("SMTP_HOST")
    SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
    SMTP_USERNAME = os.environ.get("SMTP_USERNAME")
    SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")
    SMTP_FROM_ADDRESS = os.environ.get("SMTP_FROM_ADDRESS", "webmius@localhost")
    SMTP_USE_TLS = _bool_env("SMTP_USE_TLS", True)

    # Origin the backend puts into emailed links (password reset, etc.)
    # since it has no other way to know the frontend's real address.
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")


class DevelopmentConfig(Config):
    DEBUG = True
    SESSION_COOKIE_SECURE = _bool_env("SESSION_COOKIE_SECURE", False)


class ProductionConfig(Config):
    DEBUG = False


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get("TEST_DATABASE_URL", "sqlite:///:memory:")
    SECRET_KEY = os.environ.get("SECRET_KEY", "test-secret-key")
    ENCRYPTION_KEY = os.environ.get("ENCRYPTION_KEY", "test-encryption-key")
    SESSION_COOKIE_SECURE = False
    RATELIMIT_ENABLED = False


config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}


def get_config():
    env = os.environ.get("FLASK_ENV", "development")
    return config_by_name.get(env, DevelopmentConfig)
