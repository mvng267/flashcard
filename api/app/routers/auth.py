from datetime import datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.config import get_settings
from app.deps import get_current_user, get_db
from app.models import RefreshToken, User
from app.schemas import (
    ChangePasswordRequest,
    GoogleAuthorizeRequest,
    GoogleAuthorizeResponse,
    GoogleCallbackRequest,
    GoogleLoginRequest,
    RefreshRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserOut,
    UserProfileUpdateRequest,
)
from app.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    hash_refresh_token,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Auth"])
settings = get_settings()

_google_oauth_states: dict[str, str] = {}


def _slug_username(raw: str) -> str:
    base = "".join(ch.lower() for ch in raw if ch.isalnum() or ch in {"_", "."})
    base = base.strip("._")
    if len(base) < 3:
        base = f"user_{base}" if base else "user"
    return base[:40]


def _generate_unique_username(db: Session, seed: str, fallback_id: int | None = None) -> str:
    base = _slug_username(seed)
    candidate = base
    n = 1
    while db.query(User).filter(User.username == candidate).first():
        suffix = f"_{fallback_id}" if fallback_id and n == 1 else f"_{n}"
        candidate = f"{base[: max(1, 40 - len(suffix))]}{suffix}"
        n += 1
    return candidate


def _issue_tokens(db: Session, user: User) -> TokenResponse:
    access_token = create_access_token(str(user.id))
    refresh_token, refresh_expiry, refresh_hash = create_refresh_token(str(user.id))

    db.add(RefreshToken(user_id=user.id, token_hash=refresh_hash, expires_at=refresh_expiry))
    db.commit()

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


def _upsert_user_from_google_claims(data: dict, db: Session) -> User:
    google_sub = str(data.get("sub") or "").strip()
    email = str(data.get("email") or "").strip().lower()
    email_verified = str(data.get("email_verified") or "").lower() in {"true", "1"}
    audience = str(data.get("aud") or "").strip()

    if not google_sub or not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google token thiếu thông tin bắt buộc")

    if settings.google_client_id and audience != settings.google_client_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sai Google client id")

    if not email_verified:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email Google chưa xác minh")

    user = (
        db.query(User)
        .filter(
            or_(
                User.google_sub == google_sub,
                User.email == email,
            )
        )
        .first()
    )

    if not user:
        full_name = (str(data.get("name") or "").strip() or email.split("@")[0])
        username_seed = str(data.get("preferred_username") or "").strip() or email.split("@")[0]
        generated_username = _generate_unique_username(db, username_seed)
        user = User(
            email=email,
            username=generated_username,
            full_name=full_name,
            bio=None,
            password_hash=None,
            auth_provider="google",
            google_sub=google_sub,
            avatar_url=str(data.get("picture") or "").strip() or None,
            avatar_seed=generated_username,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        changed = False
        if not user.google_sub:
            user.google_sub = google_sub
            changed = True
        elif user.google_sub != google_sub:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email đã gắn với Google account khác")

        picture = str(data.get("picture") or "").strip()
        if picture and user.avatar_url != picture:
            user.avatar_url = picture
            changed = True

        if not user.username:
            user.username = _generate_unique_username(db, email.split("@")[0], fallback_id=user.id)
            changed = True

        if not user.avatar_seed:
            user.avatar_seed = user.username or email.split("@")[0]
            changed = True

        if user.auth_provider == "local" and user.google_sub:
            user.auth_provider = "local_google"
            changed = True
        elif not user.auth_provider:
            user.auth_provider = "google"
            changed = True

        if changed:
            db.add(user)
            db.commit()
            db.refresh(user)

    return user


@router.post("/register", response_model=TokenResponse)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    normalized_email = payload.email.lower()
    existing = db.query(User).filter(User.email == normalized_email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    username_seed = payload.username.strip() if payload.username else normalized_email.split("@")[0]
    username = _generate_unique_username(db, username_seed)

    user = User(
        email=normalized_email,
        username=username,
        full_name=payload.full_name.strip(),
        bio=None,
        password_hash=get_password_hash(payload.password),
        auth_provider="local",
        avatar_seed=username,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return _issue_tokens(db, user)


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản này dùng Google, hãy đăng nhập bằng Google",
        )

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    return _issue_tokens(db, user)


@router.post("/google", response_model=TokenResponse)
def login_with_google(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    if not settings.google_auth_enabled:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Google login chưa được bật")

    try:
        response = httpx.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": payload.id_token},
            timeout=8,
        )
    except Exception:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Không xác minh được token Google")

    if response.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google token không hợp lệ")

    user = _upsert_user_from_google_claims(response.json(), db)
    return _issue_tokens(db, user)


@router.post("/google/authorize", response_model=GoogleAuthorizeResponse)
def google_authorize(payload: GoogleAuthorizeRequest):
    if not settings.google_auth_enabled:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Google login chưa được bật")
    if not settings.google_client_id:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Thiếu GOOGLE_CLIENT_ID")

    _google_oauth_states[payload.state] = payload.code_challenge

    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": payload.redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "code_challenge": payload.code_challenge,
        "code_challenge_method": "S256",
        "state": payload.state,
        "access_type": "offline",
        "prompt": "consent",
    }

    auth_url = "https://accounts.google.com/o/oauth2/v2/auth"
    query = "&".join(f"{key}={httpx.QueryParams({key: value})[key]}" for key, value in params.items())

    return GoogleAuthorizeResponse(authorization_url=f"{auth_url}?{query}")


@router.post("/google/callback", response_model=TokenResponse)
def google_callback(payload: GoogleCallbackRequest, db: Session = Depends(get_db)):
    if not settings.google_auth_enabled:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Google login chưa được bật")
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Thiếu GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET",
        )

    stored_code_challenge = _google_oauth_states.get(payload.state)
    if not stored_code_challenge:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="State không hợp lệ hoặc đã hết hạn")

    try:
        token_resp = httpx.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": payload.code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": payload.redirect_uri,
                "grant_type": "authorization_code",
                "code_verifier": payload.code_verifier,
            },
            timeout=12,
        )
    except Exception:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Không gọi được Google OAuth token API")

    if token_resp.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google OAuth callback không hợp lệ")

    id_token = str(token_resp.json().get("id_token") or "").strip()
    if not id_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google OAuth không trả id_token")

    try:
        verify_resp = httpx.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": id_token},
            timeout=8,
        )
    except Exception:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Không xác minh được token Google")

    if verify_resp.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google token không hợp lệ")

    _google_oauth_states.pop(payload.state, None)

    user = _upsert_user_from_google_claims(verify_resp.json(), db)
    return _issue_tokens(db, user)


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


@router.patch("/me", response_model=UserOut)
def update_me(
    payload: UserProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    has_update = False

    if payload.full_name is not None:
        new_name = payload.full_name.strip()
        if not new_name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="full_name không hợp lệ")
        current_user.full_name = new_name
        has_update = True

    if payload.bio is not None:
        current_user.bio = payload.bio.strip() if payload.bio else None
        has_update = True

    if payload.username is not None:
        new_username = _slug_username(payload.username)
        if len(new_username) < 3:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username phải từ 3 ký tự")

        existing_username = (
            db.query(User)
            .filter(User.username == new_username, User.id != current_user.id)
            .first()
        )
        if existing_username:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username đã tồn tại")

        if new_username != current_user.username:
            current_user.username = new_username
            if not current_user.avatar_seed:
                current_user.avatar_seed = new_username
            has_update = True

    if payload.email is not None:
        new_email = payload.email.lower().strip()
        if new_email != current_user.email:
            existing = db.query(User).filter(User.email == new_email, User.id != current_user.id).first()
            if existing:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email đã được sử dụng")
            current_user.email = new_email
            has_update = True

    if payload.avatar_seed is not None:
        current_user.avatar_seed = payload.avatar_seed.strip()
        has_update = True

    if payload.daily_goal_reviews is not None:
        current_user.daily_goal_reviews = payload.daily_goal_reviews
        has_update = True

    if has_update:
        db.add(current_user)
        db.commit()
        db.refresh(current_user)

    return current_user


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản Google-only không có mật khẩu cũ",
        )

    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Mật khẩu hiện tại không đúng")

    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mật khẩu mới phải khác mật khẩu cũ")

    current_user.password_hash = get_password_hash(payload.new_password)
    db.add(current_user)
    db.commit()

    return {"ok": True}
