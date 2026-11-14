import secrets

from sqlalchemy.orm import Session

# No 0/O, 1/I/L: codes get read aloud and copied off whiteboards.
_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


def new_join_code(db: Session, column, length: int = 6) -> str:
    """A random code not yet used in `column` (a unique model column)."""
    while True:
        code = "".join(secrets.choice(_ALPHABET) for _ in range(length))
        if db.query(column).filter(column == code).first() is None:
            return code


def normalise_code(code: str) -> str:
    return "".join(code.split()).upper().replace("-", "")
