import pytest

from app import create_app
from app.extensions import db
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


def csrf_headers(client):
    cookie = client.get_cookie("csrf_token")
    return {"X-CSRF-Token": cookie.value} if cookie else {}


def register_and_login(client, username="alice", email="alice@example.com", password="correcthorse"):
    client.post("/api/register", json={"username": username, "email": email, "password": password})
    return client.post("/api/login", json={"username": username, "password": password})


def test_admin_endpoints_require_auth(client):
    assert client.get("/api/admin/users").status_code == 401


def test_non_admin_forbidden_from_admin_endpoints(client):
    register_and_login(client, username="alice", email="alice@example.com")
    register_and_login(client, username="bob", email="bob@example.com")

    response = client.get("/api/admin/users")
    assert response.status_code == 403


def test_admin_can_list_users(client):
    register_and_login(client, username="alice", email="alice@example.com")
    register_and_login(client, username="bob", email="bob@example.com")

    # alice was first, so she's admin; log back in as her.
    register_and_login(client, username="alice", email="alice@example.com")

    response = client.get("/api/admin/users")
    assert response.status_code == 200
    usernames = {u["username"] for u in response.get_json()}
    assert usernames == {"alice", "bob"}


def test_admin_can_delete_another_user(client):
    register_and_login(client, username="alice", email="alice@example.com")
    bob = register_and_login(client, username="bob", email="bob@example.com").get_json()
    register_and_login(client, username="alice", email="alice@example.com")

    response = client.delete(f"/api/admin/users/{bob['id']}", headers=csrf_headers(client))
    assert response.status_code == 204

    remaining = client.get("/api/admin/users").get_json()
    assert {u["username"] for u in remaining} == {"alice"}


def test_admin_cannot_delete_self(client):
    alice = register_and_login(client, username="alice", email="alice@example.com").get_json()

    response = client.delete(f"/api/admin/users/{alice['id']}", headers=csrf_headers(client))
    assert response.status_code == 400


def test_non_admin_cannot_delete_user(client):
    register_and_login(client, username="alice", email="alice@example.com")
    bob = register_and_login(client, username="bob", email="bob@example.com").get_json()

    response = client.delete(f"/api/admin/users/{bob['id']}", headers=csrf_headers(client))
    assert response.status_code == 403


def test_admin_user_list_includes_connection_count(client):
    register_and_login(client, username="alice", email="alice@example.com")
    client.post(
        "/api/connections",
        json={"name": "box", "host": "10.0.0.5", "port": 22, "username": "deploy", "password": "hunter2"},
        headers=csrf_headers(client),
    )

    response = client.get("/api/admin/users")
    alice = next(u for u in response.get_json() if u["username"] == "alice")
    assert alice["connection_count"] == 1


def test_get_settings_requires_auth(client):
    assert client.get("/api/admin/settings").status_code == 401


def test_non_admin_forbidden_from_settings(client):
    register_and_login(client, username="alice", email="alice@example.com")
    register_and_login(client, username="bob", email="bob@example.com")

    assert client.get("/api/admin/settings").status_code == 403
    assert (
        client.patch(
            "/api/admin/settings", json={"registration_enabled": False}, headers=csrf_headers(client)
        ).status_code
        == 403
    )


def test_admin_can_read_default_settings(client):
    register_and_login(client, username="alice", email="alice@example.com")

    response = client.get("/api/admin/settings")
    assert response.status_code == 200
    assert response.get_json() == {"registration_enabled": True, "session_timeout_minutes": None}


def test_admin_can_update_settings(client):
    register_and_login(client, username="alice", email="alice@example.com")

    response = client.patch(
        "/api/admin/settings",
        json={"registration_enabled": False, "session_timeout_minutes": 30},
        headers=csrf_headers(client),
    )
    assert response.status_code == 200
    assert response.get_json() == {"registration_enabled": False, "session_timeout_minutes": 30}

    # persisted across requests, not just echoed back
    follow_up = client.get("/api/admin/settings")
    assert follow_up.get_json() == {"registration_enabled": False, "session_timeout_minutes": 30}


def test_update_settings_rejects_invalid_timeout(client):
    register_and_login(client, username="alice", email="alice@example.com")

    response = client.patch(
        "/api/admin/settings", json={"session_timeout_minutes": -5}, headers=csrf_headers(client)
    )
    assert response.status_code == 400


def test_update_settings_can_clear_timeout(client):
    register_and_login(client, username="alice", email="alice@example.com")
    client.patch(
        "/api/admin/settings", json={"session_timeout_minutes": 30}, headers=csrf_headers(client)
    )

    response = client.patch(
        "/api/admin/settings", json={"session_timeout_minutes": None}, headers=csrf_headers(client)
    )
    assert response.status_code == 200
    assert response.get_json()["session_timeout_minutes"] is None


def test_deleting_user_cascades_their_connections(client):
    register_and_login(client, username="alice", email="alice@example.com")
    bob_login = register_and_login(client, username="bob", email="bob@example.com")
    bob = bob_login.get_json()
    client.post(
        "/api/connections",
        json={"name": "box", "host": "10.0.0.5", "port": 22, "username": "deploy", "password": "hunter2"},
        headers=csrf_headers(client),
    )
    register_and_login(client, username="alice", email="alice@example.com")

    response = client.delete(f"/api/admin/users/{bob['id']}", headers=csrf_headers(client))
    assert response.status_code == 204

    from app.models import SSHConnection

    with client.application.app_context():
        assert SSHConnection.query.filter_by(user_id=bob["id"]).count() == 0
