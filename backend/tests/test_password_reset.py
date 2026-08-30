from urllib.parse import parse_qs, urlparse

import pytest

from app import create_app
from app.extensions import db
from app.models import PasswordResetToken, User
from config import TestingConfig


@pytest.fixture()
def app():
    application = create_app(TestingConfig)
    with application.app_context():
        db.create_all()
        yield application
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


def register(client, username="alice", email="alice@example.com", password="correcthorse"):
    return client.post(
        "/api/register",
        json={"username": username, "email": email, "password": password},
    )


def login(client, username="alice", password="correcthorse"):
    return client.post("/api/login", json={"username": username, "password": password})


def request_reset_and_get_token(client, monkeypatch, email="alice@example.com"):
    captured = {}

    def fake_send(to_email, reset_url):
        captured["to_email"] = to_email
        captured["reset_url"] = reset_url

    monkeypatch.setattr("app.routes.auth.send_password_reset_email", fake_send)

    response = client.post("/api/password-reset/request", json={"email": email})
    assert response.status_code == 200

    if "reset_url" not in captured:
        return None, response

    token = parse_qs(urlparse(captured["reset_url"]).query)["token"][0]
    return token, response


def test_request_reset_for_existing_user_creates_one_token(client, monkeypatch, app):
    register(client)

    token, response = request_reset_and_get_token(client, monkeypatch)
    assert token is not None
    assert response.get_json()["message"]

    with app.app_context():
        user = User.query.filter_by(username="alice").first()
        assert PasswordResetToken.query.filter_by(user_id=user.id).count() == 1


def test_request_reset_for_nonexistent_email_returns_same_response(client, monkeypatch, app):
    token, response = request_reset_and_get_token(client, monkeypatch, email="nobody@example.com")

    assert token is None
    assert response.status_code == 200
    with app.app_context():
        assert PasswordResetToken.query.count() == 0


def test_request_reset_replaces_previous_token(client, monkeypatch, app):
    register(client)

    first_token, _ = request_reset_and_get_token(client, monkeypatch)
    second_token, _ = request_reset_and_get_token(client, monkeypatch)

    assert first_token != second_token
    with app.app_context():
        user = User.query.filter_by(username="alice").first()
        assert PasswordResetToken.query.filter_by(user_id=user.id).count() == 1

    # the old token must no longer work
    response = client.post(
        "/api/password-reset/confirm", json={"token": first_token, "new_password": "newpassword123"}
    )
    assert response.status_code == 400


def test_confirm_with_valid_token_changes_password(client, monkeypatch):
    register(client)
    token, _ = request_reset_and_get_token(client, monkeypatch)

    response = client.post(
        "/api/password-reset/confirm", json={"token": token, "new_password": "newpassword123"}
    )
    assert response.status_code == 204

    assert login(client, password="correcthorse").status_code == 401
    assert login(client, password="newpassword123").status_code == 200


def test_confirm_consumes_the_token(client, monkeypatch):
    register(client)
    token, _ = request_reset_and_get_token(client, monkeypatch)

    first = client.post(
        "/api/password-reset/confirm", json={"token": token, "new_password": "newpassword123"}
    )
    assert first.status_code == 204

    second = client.post(
        "/api/password-reset/confirm", json={"token": token, "new_password": "anotherpassword"}
    )
    assert second.status_code == 400


def test_confirm_with_garbage_token_fails(client):
    response = client.post(
        "/api/password-reset/confirm", json={"token": "not-a-real-token", "new_password": "newpassword123"}
    )
    assert response.status_code == 400


def test_confirm_missing_fields(client):
    response = client.post("/api/password-reset/confirm", json={"token": "abc"})
    assert response.status_code == 400


def test_confirm_with_expired_token_fails(client, monkeypatch, app):
    register(client)
    token, _ = request_reset_and_get_token(client, monkeypatch)

    from datetime import datetime, timedelta, timezone

    with app.app_context():
        reset = PasswordResetToken.query.first()
        reset.expires_at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=1)
        db.session.commit()

    response = client.post(
        "/api/password-reset/confirm", json={"token": token, "new_password": "newpassword123"}
    )
    assert response.status_code == 400
