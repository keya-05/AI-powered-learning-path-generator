from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role
from app.core.codes import new_join_code, normalise_code
from app.core.security import create_access_token, hash_password, verify_password
from app.db.postgres import get_db
from app.models.course import Course
from app.models.organization import Organization
from app.models.user import User
from app.schemas.auth import (
    OrganizationCreateRequest,
    OrganizationJoinRequest,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _organization_by_code(db: Session, code: str) -> Organization:
    org = db.query(Organization).filter(Organization.join_code == normalise_code(code)).first()
    if org is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No school matches that code. Check it with your teacher.",
        )
    return org


def _move_courses(db: Session, user: User) -> None:
    """A teacher's courses are listed in whichever school the teacher is in."""
    if user.role == "instructor":
        db.query(Course).filter(Course.user_id == user.id).update(
            {Course.organization_id: user.organization_id}, synchronize_session=False
        )


def _create_organization(db: Session, name: str) -> Organization:
    org = Organization(name=name.strip(), join_code=new_join_code(db, Organization.join_code))
    db.add(org)
    db.flush()
    return org


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists."
        )

    organization = None
    if payload.organization_code and payload.organization_code.strip():
        organization = _organization_by_code(db, payload.organization_code)
    elif payload.organization_name and payload.organization_name.strip():
        if payload.role != "instructor":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Only instructors can create a school."
            )
        organization = _create_organization(db, payload.organization_name)

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        organization_id=organization.id if organization else None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=access_token, user=UserResponse.from_user(user))


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    invalid_credentials = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password."
    )

    user = db.query(User).filter(User.email == payload.email).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise invalid_credentials

    access_token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=access_token, user=UserResponse.from_user(user))


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.from_user(current_user)


@router.post("/organization/join", response_model=UserResponse)
def join_organization(
    payload: OrganizationJoinRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    org = _organization_by_code(db, payload.code)
    current_user.organization_id = org.id
    _move_courses(db, current_user)
    db.commit()
    db.refresh(current_user)
    return UserResponse.from_user(current_user)


@router.post("/organization", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_organization(
    payload: OrganizationCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("instructor")),
) -> UserResponse:
    if current_user.organization_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="You already belong to a school. Leave it first."
        )
    org = _create_organization(db, payload.name)
    current_user.organization_id = org.id
    _move_courses(db, current_user)
    db.commit()
    db.refresh(current_user)
    return UserResponse.from_user(current_user)


@router.post("/organization/leave", response_model=UserResponse)
def leave_organization(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """Leaving keeps existing enrolments; the school's catalog just stops showing."""
    current_user.organization_id = None
    _move_courses(db, current_user)
    db.commit()
    db.refresh(current_user)
    return UserResponse.from_user(current_user)
