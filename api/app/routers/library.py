from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.models import LibraryCard, LibraryDeck, User, UserCard, UserDeck
from app.schemas import InstallDeckResponse, LibraryDeckDetail, LibraryDeckOut

router = APIRouter(prefix="/library", tags=["Library"])


@router.get("/decks", response_model=list[LibraryDeckOut])
def list_library_decks(
    q: str | None = Query(default=None),
    level: str | None = Query(default=None),
    topic: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user

    query = (
        db.query(
            LibraryDeck.id,
            LibraryDeck.title,
            LibraryDeck.description,
            LibraryDeck.level,
            LibraryDeck.topic,
            LibraryDeck.tags,
            LibraryDeck.estimated_minutes,
            func.count(LibraryCard.id).label("card_count"),
        )
        .outerjoin(LibraryCard, LibraryCard.deck_id == LibraryDeck.id)
        .filter(LibraryDeck.is_public.is_(True))
        .group_by(LibraryDeck.id)
        .order_by(LibraryDeck.created_at.desc())
    )

    if q:
        wildcard = f"%{q.lower()}%"
        query = query.filter(
            func.lower(LibraryDeck.title).like(wildcard)
            | func.lower(LibraryDeck.description).like(wildcard)
            | func.lower(LibraryDeck.tags).like(wildcard)
        )

    if level:
        query = query.filter(func.lower(LibraryDeck.level) == level.lower())

    if topic:
        query = query.filter(func.lower(LibraryDeck.topic) == topic.lower())

    results = query.all()
    return [
        LibraryDeckOut(
            id=row.id,
            title=row.title,
            description=row.description,
            level=row.level,
            topic=row.topic,
            tags=row.tags,
            estimated_minutes=row.estimated_minutes,
            card_count=int(row.card_count or 0),
        )
        for row in results
    ]


@router.get("/decks/{deck_id}", response_model=LibraryDeckDetail)
def get_library_deck(
    deck_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user

    deck = db.query(LibraryDeck).filter(LibraryDeck.id == deck_id, LibraryDeck.is_public.is_(True)).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    cards = (
        db.query(LibraryCard)
        .filter(LibraryCard.deck_id == deck.id)
        .order_by(LibraryCard.position.asc(), LibraryCard.id.asc())
        .all()
    )

    return LibraryDeckDetail(
        id=deck.id,
        title=deck.title,
        description=deck.description,
        level=deck.level,
        topic=deck.topic,
        tags=deck.tags,
        estimated_minutes=deck.estimated_minutes,
        card_count=len(cards),
        cards_preview=[
            {
                "id": card.id,
                "front_text": card.front_text,
                "back_text": card.back_text,
            }
            for card in cards[:8]
        ],
    )


@router.post("/decks/{deck_id}/install", response_model=InstallDeckResponse)
def install_library_deck(
    deck_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deck = db.query(LibraryDeck).filter(LibraryDeck.id == deck_id, LibraryDeck.is_public.is_(True)).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    existing_user_deck = (
        db.query(UserDeck)
        .filter(
            UserDeck.user_id == current_user.id,
            UserDeck.source_library_deck_id == deck.id,
        )
        .first()
    )

    if existing_user_deck:
        installed_cards = db.query(UserCard).filter(UserCard.user_deck_id == existing_user_deck.id).count()
        return InstallDeckResponse(
            user_deck_id=existing_user_deck.id,
            installed_cards=installed_cards,
            already_installed=True,
        )

    user_deck = UserDeck(
        user_id=current_user.id,
        source_library_deck_id=deck.id,
        title=deck.title,
        description=deck.description,
        level=deck.level,
        topic=deck.topic,
    )
    db.add(user_deck)
    db.flush()

    cards = (
        db.query(LibraryCard)
        .filter(LibraryCard.deck_id == deck.id)
        .order_by(LibraryCard.position.asc(), LibraryCard.id.asc())
        .all()
    )

    now = datetime.utcnow()
    for card in cards:
        db.add(
            UserCard(
                user_deck_id=user_deck.id,
                source_library_card_id=card.id,
                front_text=card.front_text,
                back_text=card.back_text,
                example_sentence=card.example_sentence,
                phonetic=card.phonetic,
                due_at=now,
            )
        )

    db.commit()

    return InstallDeckResponse(user_deck_id=user_deck.id, installed_cards=len(cards), already_installed=False)
