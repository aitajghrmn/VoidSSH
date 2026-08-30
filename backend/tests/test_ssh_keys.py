import io

import paramiko
import pytest

from app.security.ssh_keys import parse_private_key


def _generate_rsa_key(passphrase=None):
    key = paramiko.RSAKey.generate(2048)
    buf = io.StringIO()
    key.write_private_key(buf, password=passphrase)
    return buf.getvalue(), key


def test_parse_private_key_round_trip():
    key_text, original = _generate_rsa_key()
    parsed = parse_private_key(key_text)
    assert parsed.get_base64() == original.get_base64()


def test_parse_private_key_with_correct_passphrase():
    key_text, original = _generate_rsa_key(passphrase="s3cret")
    parsed = parse_private_key(key_text, "s3cret")
    assert parsed.get_base64() == original.get_base64()


def test_parse_private_key_missing_passphrase_raises():
    key_text, _ = _generate_rsa_key(passphrase="s3cret")
    with pytest.raises(paramiko.PasswordRequiredException):
        parse_private_key(key_text)


def test_parse_private_key_garbage_raises_value_error():
    with pytest.raises(ValueError):
        parse_private_key("this is not a key")
