from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.models import (
    ExerciseAnswer,
    ExerciseAttempt,
    ReviewLog,
    StudySessionLog,
    User,
    UserCard,
    UserDeck,
)
from app.schemas import DeckDeleteResponse, DeckResetProgressRequest, DeckResetProgressResponse, UserDeckOut

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
        .filter(UserDeck.user_id == current_user.id, UserDeck.is_active.is_(True))
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


@router.post("/decks/{deck_id}/reset", response_model=DeckResetProgressResponse)
def reset_deck_progress(
    deck_id: int,
    payload: DeckResetProgressRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.confirm_text != "RESET":
        raise HTTPException(status_code=400, detail="Mày phải nhập 'RESET' để xác nhận")

    deck = db.query(UserDeck).filter(UserDeck.id == deck_id, UserDeck.user_id == current_user.id, UserDeck.is_active.is_(True)).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Không tìm thấy deck")

    cards = db.query(UserCard).filter(UserCard.user_deck_id == deck_id).all()
    card_ids = [c.id for c in cards]

    now = datetime.utcnow()
    for card in cards:
        card.due_at = now
        card.interval_days = 0
        card.ease_factor = 2.5
        card.repetitions = 0
        card.lapses = 0
        card.last_reviewed_at = None

    deleted_answer_count = 0
    deleted_exercise_count = 0

    attempt_ids = [
        row[0]
        for row in db.query(ExerciseAttempt.id)
        .filter(ExerciseAttempt.user_id == current_user.id, ExerciseAttempt.user_deck_id == deck_id)
        .all()
    ]

    if attempt_ids:
        deleted_answer_count = (
            db.query(ExerciseAnswer)
            .filter(ExerciseAnswer.attempt_id.in_(attempt_ids))
            .delete(synchronize_session=False)
        )
        deleted_exercise_count = (
            db.query(ExerciseAttempt)
            .filter(ExerciseAttempt.id.in_(attempt_ids))
            .delete(synchronize_session=False)
        )

    review_count = 0
    if card_ids:
        review_count = (
            db.query(ReviewLog)
            .filter(ReviewLog.user_id == current_user.id, ReviewLog.user_card_id.in_(card_ids))
            .delete(synchronize_session=False)
        )

    session_count = (
        db.query(StudySessionLog)
        .filter(StudySessionLog.user_id == current_user.id, StudySessionLog.user_deck_id == deck_id)
        .delete(synchronize_session=False)
    )

    db.commit()

    return DeckResetProgressResponse(
        deck_id=deck_id,
        reset_cards=len(cards),
        deleted_reviews=review_count,
        deleted_sessions=session_count,
        deleted_exercise_attempts=deleted_exercise_count,
    )


@router.delete("/decks/{deck_id}", response_model=DeckDeleteResponse)
def delete_user_deck(
    deck_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deck = db.query(UserDeck).filter(UserDeck.id == deck_id, UserDeck.user_id == current_user.id, UserDeck.is_active.is_(True)).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck không tồn tại hoặc không thuộc về bạn")

    deleted_cards = db.query(UserCard).filter(UserCard.user_deck_id == deck.id).count()
    affected_reviews = (
        db.query(ReviewLog)
        .join(UserCard, UserCard.id == ReviewLog.user_card_id)
        .filter(UserCard.user_deck_id == deck.id)
        .count()
    )
    affected_sessions = db.query(StudySessionLog).filter(StudySessionLog.user_deck_id == deck.id).count()
    affected_attempts = db.query(ExerciseAttempt).filter(ExerciseAttempt.user_deck_id == deck.id).count()

    deck.is_active = False
    db.commit()

    return DeckDeleteResponse(
        deck_id=deck_id,
        deleted_cards=deleted_cards,
        deleted_reviews=affected_reviews,
        deleted_sessions=affected_sessions,
        deleted_exercise_attempts=affected_attempts,
    )
