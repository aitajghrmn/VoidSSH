import pytest

from app import create_app
from app.extensions import db
from config import TestingConfig


class RateLimitTestConfig(TestingConfig):
    RATELIMIT_ENABLED = True


@pytest.fixture()
def app():
    application = create_app(RateLimitTestConfig)
    with application.app_context():
        db.create_all()
        yield application
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


def test_login_is_rate_limited(client):
    payload = {"username": "nobody", "password": "wrong-password"}

    responses = [client.post("/api/login", json=payload).status_code for _ in range(11)]

    assert 401 in responses
    assert 429 in responses
