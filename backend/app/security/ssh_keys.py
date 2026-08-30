import io

import paramiko

_KEY_CLASSES = (paramiko.Ed25519Key, paramiko.RSAKey, paramiko.ECDSAKey, paramiko.DSSKey)


def parse_private_key(key_text: str, passphrase: str | None = None) -> paramiko.PKey:
    """Parse a PEM/OpenSSH private key, trying each supported key type in turn.

    Raises paramiko.PasswordRequiredException if the key is encrypted and no
    passphrase was given, or ValueError if the text isn't a recognized key.
    """
    last_error: Exception | None = None
    for key_class in _KEY_CLASSES:
        try:
            return key_class.from_private_key(io.StringIO(key_text), password=passphrase or None)
        except paramiko.PasswordRequiredException:
            raise
        except (paramiko.SSHException, ValueError) as exc:
            last_error = exc
            continue
    raise ValueError(f"unrecognized or invalid private key format: {last_error}")
