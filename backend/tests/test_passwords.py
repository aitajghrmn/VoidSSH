from app.security.passwords import hash_password, verify_password


def test_hash_password_produces_different_hash_than_input():
    hashed = hash_password("correct-horse-battery-staple")
    assert hashed != "correct-horse-battery-staple"


def test_verify_password_round_trip_success():
    hashed = hash_password("correct-horse-battery-staple")
    assert verify_password("correct-horse-battery-staple", hashed) is True


def test_verify_password_round_trip_failure():
    hashed = hash_password("correct-horse-battery-staple")
    assert verify_password("wrong-password", hashed) is False


def test_hash_password_is_salted():
    hash_one = hash_password("same-password")
    hash_two = hash_password("same-password")
    assert hash_one != hash_two
