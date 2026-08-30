import pytest

from app import create_app
from config import TestingConfig
from app.security.crypto import encrypt_value, decrypt_value


@pytest.fixture()
def app():
    application = create_app(TestingConfig)
    with application.app_context():
        yield application


def test_encrypt_value_differs_from_plaintext(app):
    cipher_text = encrypt_value("s3cr3t-ssh-password")
    assert cipher_text != "s3cr3t-ssh-password"


def test_decrypt_value_round_trip(app):
    cipher_text = encrypt_value("s3cr3t-ssh-password")
    assert decrypt_value(cipher_text) == "s3cr3t-ssh-password"


def test_encrypt_value_is_nondeterministic(app):
    first = encrypt_value("same-secret")
    second = encrypt_value("same-secret")
    assert first != second
