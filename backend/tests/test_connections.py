import io

import paramiko
import pytest

from app import create_app
from app.extensions import db
from config import TestingConfig


def _generate_rsa_key(passphrase=None):
    key = paramiko.RSAKey.generate(2048)
    buf = io.StringIO()
    key.write_private_key(buf, password=passphrase)
    return buf.getvalue()


TEST_PRIVATE_KEY = _generate_rsa_key()
TEST_PRIVATE_KEY_ENCRYPTED = _generate_rsa_key(passphrase="key-pass")


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


def create_connection(client, **overrides):
    payload = {
        "name": "prod-box",
        "host": "10.0.0.5",
        "port": 22,
        "username": "deploy",
        "password": "hunter2",
    }
    payload.update(overrides)
    return client.post("/api/connections", json=payload, headers=csrf_headers(client))


def test_list_connections_requires_auth(client):
    response = client.get("/api/connections")
    assert response.status_code == 401


def test_create_connection_requires_auth(client):
    response = create_connection(client)
    assert response.status_code == 401


def test_create_connection_success(client):
    register_and_login(client)
    response = create_connection(client)
    assert response.status_code == 201
    body = response.get_json()
    assert body["name"] == "prod-box"
    assert body["host"] == "10.0.0.5"
    assert body["port"] == 22
    assert body["username"] == "deploy"
    assert body["auth_type"] == "password"
    assert "password" not in body
    assert "encrypted_password" not in body


def test_create_connection_missing_fields(client):
    register_and_login(client)
    response = client.post("/api/connections", json={"name": "prod-box"}, headers=csrf_headers(client))
    assert response.status_code == 400


def test_create_connection_password_auth_requires_password(client):
    register_and_login(client)
    response = create_connection(client, password="")
    assert response.status_code == 400


def test_create_connection_invalid_auth_type(client):
    register_and_login(client)
    response = create_connection(client, auth_type="totp")
    assert response.status_code == 400


def test_create_connection_invalid_port(client):
    register_and_login(client)
    response = create_connection(client, port="not-a-port")
    assert response.status_code == 400


def test_list_connections_returns_only_own(client):
    register_and_login(client)
    create_connection(client, name="alice-box")
    client.post("/api/logout", headers=csrf_headers(client))

    register_and_login(client, username="bob", email="bob@example.com", password="correcthorse")
    create_connection(client, name="bob-box")

    response = client.get("/api/connections")
    assert response.status_code == 200
    names = [c["name"] for c in response.get_json()]
    assert names == ["bob-box"]


def test_get_own_connection_via_update_ownership(client):
    register_and_login(client, username="alice", email="alice@example.com")
    created = create_connection(client).get_json()
    connection_id = created["id"]
    client.post("/api/logout", headers=csrf_headers(client))

    register_and_login(client, username="bob", email="bob@example.com")
    response = client.put(
        f"/api/connections/{connection_id}", json={"name": "hijacked"}, headers=csrf_headers(client)
    )
    assert response.status_code == 404

    delete_response = client.delete(f"/api/connections/{connection_id}", headers=csrf_headers(client))
    assert delete_response.status_code == 404


def test_update_connection_success(client):
    register_and_login(client)
    created = create_connection(client).get_json()

    response = client.put(
        f"/api/connections/{created['id']}",
        json={"name": "renamed-box", "port": 2222},
        headers=csrf_headers(client),
    )
    assert response.status_code == 200
    body = response.get_json()
    assert body["name"] == "renamed-box"
    assert body["port"] == 2222
    assert body["host"] == "10.0.0.5"


def test_update_nonexistent_connection(client):
    register_and_login(client)
    response = client.put("/api/connections/9999", json={"name": "nope"}, headers=csrf_headers(client))
    assert response.status_code == 404


def test_delete_connection_success(client):
    register_and_login(client)
    created = create_connection(client).get_json()

    response = client.delete(f"/api/connections/{created['id']}", headers=csrf_headers(client))
    assert response.status_code == 204

    list_response = client.get("/api/connections")
    assert list_response.get_json() == []


def test_delete_nonexistent_connection(client):
    register_and_login(client)
    response = client.delete("/api/connections/9999", headers=csrf_headers(client))
    assert response.status_code == 404


def test_mutating_request_without_csrf_header_is_rejected(client):
    register_and_login(client)
    response = client.post("/api/connections", json={
        "name": "prod-box", "host": "10.0.0.5", "port": 22,
        "username": "deploy", "password": "hunter2",
    })
    assert response.status_code == 403


def test_mutating_request_with_wrong_csrf_token_is_rejected(client):
    register_and_login(client)
    response = client.post(
        "/api/connections",
        json={"name": "prod-box", "host": "10.0.0.5", "port": 22, "username": "deploy", "password": "hunter2"},
        headers={"X-CSRF-Token": "not-the-real-token"},
    )
    assert response.status_code == 403


def test_create_connection_key_auth_success(client):
    register_and_login(client)
    response = create_connection(
        client, auth_type="key", password="", private_key=TEST_PRIVATE_KEY
    )
    assert response.status_code == 201
    body = response.get_json()
    assert body["auth_type"] == "key"
    assert "private_key" not in body
    assert "encrypted_private_key" not in body


def test_create_connection_key_auth_requires_private_key(client):
    register_and_login(client)
    response = create_connection(client, auth_type="key", password="")
    assert response.status_code == 400


def test_create_connection_key_auth_rejects_garbage_key(client):
    register_and_login(client)
    response = create_connection(
        client, auth_type="key", password="", private_key="not a real key"
    )
    assert response.status_code == 400


def test_create_connection_key_auth_with_passphrase_success(client):
    register_and_login(client)
    response = create_connection(
        client,
        auth_type="key",
        password="",
        private_key=TEST_PRIVATE_KEY_ENCRYPTED,
        private_key_passphrase="key-pass",
    )
    assert response.status_code == 201


def test_create_connection_key_auth_missing_passphrase_fails(client):
    register_and_login(client)
    response = create_connection(
        client, auth_type="key", password="", private_key=TEST_PRIVATE_KEY_ENCRYPTED
    )
    assert response.status_code == 400
    assert "passphrase" in response.get_json()["error"]


def test_update_connection_to_key_auth(client):
    register_and_login(client)
    created = create_connection(client).get_json()

    response = client.put(
        f"/api/connections/{created['id']}",
        json={"auth_type": "key", "private_key": TEST_PRIVATE_KEY},
        headers=csrf_headers(client),
    )
    assert response.status_code == 200
    assert response.get_json()["auth_type"] == "key"


def test_update_connection_rejects_invalid_key(client):
    register_and_login(client)
    created = create_connection(client, auth_type="key", password="", private_key=TEST_PRIVATE_KEY).get_json()

    response = client.put(
        f"/api/connections/{created['id']}",
        json={"private_key": "not a real key"},
        headers=csrf_headers(client),
    )
    assert response.status_code == 400


def test_create_connection_with_tags(client):
    register_and_login(client)
    response = create_connection(client, tags=["Prod", "web", "prod"])
    assert response.status_code == 201
    assert response.get_json()["tags"] == ["prod", "web"]


def test_create_connection_without_tags_returns_empty_list(client):
    register_and_login(client)
    response = create_connection(client)
    assert response.get_json()["tags"] == []


def test_update_connection_tags(client):
    register_and_login(client)
    created = create_connection(client).get_json()

    response = client.put(
        f"/api/connections/{created['id']}",
        json={"tags": ["staging", " db "]},
        headers=csrf_headers(client),
    )
    assert response.status_code == 200
    assert response.get_json()["tags"] == ["staging", "db"]


def test_update_connection_clears_tags_with_empty_list(client):
    register_and_login(client)
    created = create_connection(client, tags=["staging"]).get_json()

    response = client.put(
        f"/api/connections/{created['id']}",
        json={"tags": []},
        headers=csrf_headers(client),
    )
    assert response.status_code == 200
    assert response.get_json()["tags"] == []


def test_list_connections_filtered_by_tag(client):
    register_and_login(client)
    create_connection(client, name="web-box", tags=["web", "prod"])
    create_connection(client, name="db-box", tags=["db", "prod"])

    response = client.get("/api/connections?tag=web")
    assert response.status_code == 200
    names = [c["name"] for c in response.get_json()]
    assert names == ["web-box"]
