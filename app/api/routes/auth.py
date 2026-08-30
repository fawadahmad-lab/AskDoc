"""Authentication routes."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.security import verify_password, create_access_token
from app.core.deps import get_current_user
from app.db.base import get_db
from app.db import models
from app.db.repos import user as user_repo
from app.schemas import UserCreate, UserResponse, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=UserResponse, status_code=201)
def signup(
    user_data: UserCreate,
    db: Session = Depends(get_db),
):
    existing_user = user_repo.get_user_by_email_or_username(
        db, user_data.email, user_data.username
    )

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Email or username already registered",
        )

    return user_repo.create_user(
        db,
        email=user_data.email,
        username=user_data.username,
        password=user_data.password,
    )


@router.post("/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = user_repo.get_user_by_username(db, form_data.username)

    if user is None or not verify_password(
        form_data.password,
        user.hashed_password,
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password",
        )

    access_token = create_access_token(data={"sub": str(user.id)})

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: models.User = Depends(get_current_user),
):
    """Return the currently authenticated user."""
    return current_user
