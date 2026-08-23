import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.postgres import get_db
from app.models.user import User

_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

_CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials.",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    token: str = Depends(_oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    user_id = decode_access_token(token)
    if user_id is None:
        raise _CREDENTIALS_EXCEPTION

    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise _CREDENTIALS_EXCEPTION

    user = db.get(User, user_uuid)
    if user is None:
        raise _CREDENTIALS_EXCEPTION
    return user


def require_role(*roles: str):
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return current_user

    return dependency
