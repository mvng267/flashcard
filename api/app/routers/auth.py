from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.models import RefreshToken, User
from app.schemas import RefreshRequest, TokenResponse, UserCreate, UserLogin, UserOut
from app.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    hash_refresh_token,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=TokenResponse)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name.strip(),
        password_hash=get_password_hash(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(str(user.id))
    refresh_token, refresh_expiry, refresh_hash = create_refresh_token(str(user.id))

    db.add(RefreshToken(user_id=user.id, token_hash=refresh_hash, expires_at=refresh_expiry))
    db.commit()

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    access_token = create_access_token(str(user.id))
    refresh_token, refresh_expiry, refresh_hash = create_refresh_token(str(user.id))

    db.add(RefreshToken(user_id=user.id, token_hash=refresh_hash, expires_at=refresh_expiry))
    db.commit()

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    try:
        decoded = decode_token(payload.refresh_token)
        token_type = decoded.get("type")
        if token_type != "refresh":
            raise ValueError("Invalid token type")
        user_id = int(decoded.get("sub"))
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    token_hash = hash_refresh_token(payload.refresh_token)
    token_record = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token_hash == token_hash,
            RefreshToken.user_id == user_id,
            RefreshToken.revoked.is_(False),
        )
        .first()
    )

    if not token_record or token_record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired or revoked")

    token_record.revoked = True

    access_token = create_access_token(str(user_id))
    new_refresh_token, refresh_expiry, refresh_hash = create_refresh_token(str(user_id))
    db.add(RefreshToken(user_id=user_id, token_hash=refresh_hash, expires_at=refresh_expiry))
    db.commit()

    return TokenResponse(access_token=access_token, refresh_token=new_refresh_token)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
