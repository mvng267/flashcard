from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.models import User, UserCard, UserDeck
from app.schemas import UserDeckOut

router = APIRouter(prefix="/me", tags=["Me"])


@router.get("/decks", response_model=list[UserDeckOut])
def my_decks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.utcnow()

    rows = (
        db.query(
            UserDeck.id,
            UserDeck.source_library_deck_id,
            UserDeck.title,
            UserDeck.description,
            UserDeck.level,
            UserDeck.topic,
            func.count(UserCard.id).label("total_cards"),
            func.coalesce(
                func.sum(case((UserCard.due_at <= now, 1), else_=0)),
                0,
            ).label("due_cards"),
        )
        .outerjoin(UserCard, UserCard.user_deck_id == UserDeck.id)
        .filter(UserDeck.user_id == current_user.id)
        .group_by(UserDeck.id)
        .order_by(UserDeck.created_at.desc())
        .all()
    )

    return [
        UserDeckOut(
            id=row.id,
            source_library_deck_id=row.source_library_deck_id,
            title=row.title,
            description=row.description,
            level=row.level,
            topic=row.topic,
            total_cards=int(row.total_cards or 0),
            due_cards=int(row.due_cards or 0),
        )
        for row in rows
    ]
