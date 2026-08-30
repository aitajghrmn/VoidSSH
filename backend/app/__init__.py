from flask import Flask
from flask_cors import CORS

from config import get_config

from .extensions import db, limiter, migrate, socketio
from .security.csrf import CSRF_HEADER_NAME, register_csrf_protection


def create_app(config_object=None):
    app = Flask(__name__)
    app.config.from_object(config_object or get_config())
    CORS(
        app,
        supports_credentials=True,
        origins=app.config["CORS_ORIGINS"],
        allow_headers=["Content-Type", CSRF_HEADER_NAME],
    )

    db.init_app(app)
    migrate.init_app(app, db)
    socketio.init_app(app, cors_allowed_origins=app.config["CORS_ORIGINS"], async_mode="threading")
    limiter.init_app(app)
    register_csrf_protection(app)

    from . import models  # noqa: F401  (registers models with SQLAlchemy metadata)

    from .routes.health import health_bp
    app.register_blueprint(health_bp)

    from .routes.auth import auth_bp
    app.register_blueprint(auth_bp)

    from .routes.connections import connections_bp
    app.register_blueprint(connections_bp)

    from .routes.history import history_bp
    app.register_blueprint(history_bp)

    from .routes.admin import admin_bp
    app.register_blueprint(admin_bp)

    from .sockets.ssh_session import register_ssh_namespace
    register_ssh_namespace()

    return app
