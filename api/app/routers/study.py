import random
import re
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai_hint import generate_hint
from app.deps import get_current_user, get_db
from app.models import (
    ExerciseAnswer,
    ExerciseAttempt,
    ReviewLog,
    User,
    UserCard,
    UserDeck,
)
from app.schemas import (
    ExerciseAttemptOut,
    ExerciseHintRequest,
    ExerciseHintResponse,
    ExerciseHistoryResponse,
    ExerciseStartRequest,
    ExerciseStartResponse,
    ExerciseSubmitRequest,
    ExerciseSubmitResponse,
    ReviewRequest,
    ReviewResponse,
    StudyCardOut,
    StudySessionStartRequest,
    StudySessionStartResponse,
)

router = APIRouter(prefix="/study", tags=["Study"])


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def _mask_word(word: str) -> str:
    parts = word.split(" ")
    masked_parts: list[str] = []

    for part in parts:
        token = part.strip()
        if not token:
            continue

        if len(token) <= 2:
            masked_parts.append(token[0] + "_" * (len(token) - 1))
        else:
            masked_parts.append(token[0] + "_" * (len(token) - 2) + token[-1])

    return " ".join(masked_parts) if masked_parts else word


def _pick_practice_cards(cards: list[UserCard], limit: int) -> list[UserCard]:
    if not cards:
        return []
    if len(cards) <= limit:
        random.shuffle(cards)
        return cards
    return random.sample(cards, k=limit)


def _next_schedule(rating: str, repetitions: int, interval_days: int, ease_factor: float):
    now = datetime.utcnow()

    if rating == "again":
        repetitions = 0
        interval_days = 0
        ease_factor = max(1.3, ease_factor - 0.2)
        next_due_at = now + timedelta(minutes=10)
    elif rating == "hard":
        repetitions += 1
        if repetitions <= 1:
            interval_days = 1
        else:
            interval_days = max(1, round(max(1, interval_days) * 1.2))
        ease_factor = max(1.3, ease_factor - 0.15)
        next_due_at = now + timedelta(days=interval_days)
    elif rating == "good":
        repetitions += 1
        if repetitions == 1:
            interval_days = 1
        elif repetitions == 2:
            interval_days = 3
        else:
            interval_days = max(1, round(max(1, interval_days) * ease_factor))
        next_due_at = now + timedelta(days=interval_days)
    else:  # easy
        repetitions += 1
        if repetitions == 1:
            interval_days = 4
        elif repetitions == 2:
            interval_days = 7
        else:
            interval_days = max(2, round(max(1, interval_days) * ease_factor * 1.3))
        ease_factor = ease_factor + 0.1
        next_due_at = now + timedelta(days=interval_days)

    return next_due_at, repetitions, interval_days, round(ease_factor, 2)


def _build_mcq_options(target_card: UserCard, all_cards: list[UserCard]) -> list[str]:
    correct = target_card.back_text.strip()

    distractor_candidates = []
    for card in all_cards:
        if card.id == target_card.id:
            continue
        value = card.back_text.strip()
        if _normalize_text(value) == _normalize_text(correct):
            continue
        distractor_candidates.append(value)

    seen = set()
    unique_distractors: list[str] = []
    for item in distractor_candidates:
        key = _normalize_text(item)
        if key in seen:
            continue
        seen.add(key)
        unique_distractors.append(item)

    if len(unique_distractors) < 3:
        raise HTTPException(
            status_code=400,
            detail="Deck chưa đủ dữ liệu để tạo câu trắc nghiệm 4 đáp án (cần >= 4 đáp án khác nhau)",
        )

    options = [correct, *random.sample(unique_distractors, k=3)]
    random.shuffle(options)
    return options


@router.post("/session/start", response_model=StudySessionStartResponse)
def start_study_session(
    payload: StudySessionStartRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deck = db.query(UserDeck).filter(UserDeck.id == payload.deck_id, UserDeck.user_id == current_user.id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    now = datetime.utcnow()

    total_due = (
        db.query(func.count(UserCard.id))
        .filter(UserCard.user_deck_id == deck.id, UserCard.due_at <= now)
        .scalar()
    )

    due_cards = (
        db.query(UserCard)
        .filter(UserCard.user_deck_id == deck.id, UserCard.due_at <= now)
        .order_by(UserCard.due_at.asc(), UserCard.id.asc())
        .limit(payload.limit)
        .all()
    )

    if payload.mode == "due":
        selected_cards = due_cards
        session_mode = "due"
    elif payload.mode == "practice":
        all_cards = db.query(UserCard).filter(UserCard.user_deck_id == deck.id).all()
        selected_cards = _pick_practice_cards(all_cards, payload.limit)
        session_mode = "practice"
    else:  # mixed
        if due_cards:
            selected_cards = due_cards
            session_mode = "due"
        else:
            all_cards = db.query(UserCard).filter(UserCard.user_deck_id == deck.id).all()
            selected_cards = _pick_practice_cards(all_cards, payload.limit)
            session_mode = "practice"

    return StudySessionStartResponse(
        deck_id=deck.id,
        total_due=int(total_due or 0),
        session_mode=session_mode,
        cards=[
            StudyCardOut(
                user_card_id=card.id,
                front_text=card.front_text,
                back_text=card.back_text,
                example_sentence=card.example_sentence,
                phonetic=card.phonetic,
            )
            for card in selected_cards
        ],
    )


@router.post("/review", response_model=ReviewResponse)
def review_card(
    payload: ReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card = (
        db.query(UserCard)
        .join(UserDeck, UserDeck.id == UserCard.user_deck_id)
        .filter(UserCard.id == payload.user_card_id, UserDeck.user_id == current_user.id)
        .first()
    )

    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    next_due_at, repetitions, interval_days, ease_factor = _next_schedule(
        rating=payload.rating,
        repetitions=card.repetitions,
        interval_days=card.interval_days,
        ease_factor=card.ease_factor,
    )

    if payload.rating == "again":
        card.lapses += 1

    card.repetitions = repetitions
    card.interval_days = interval_days
    card.ease_factor = ease_factor
    card.last_reviewed_at = datetime.utcnow()
    card.due_at = next_due_at

    db.add(
        ReviewLog(
            user_id=current_user.id,
            user_card_id=card.id,
            rating=payload.rating,
            was_correct=payload.rating in {"hard", "good", "easy"},
            next_due_at=next_due_at,
        )
    )

    db.commit()

    return ReviewResponse(
        user_card_id=card.id,
        rating=payload.rating,
        next_due_at=next_due_at,
        interval_days=interval_days,
        repetitions=repetitions,
        ease_factor=ease_factor,
    )


@router.post("/exercise/start", response_model=ExerciseStartResponse)
def start_exercise(
    payload: ExerciseStartRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deck = db.query(UserDeck).filter(UserDeck.id == payload.deck_id, UserDeck.user_id == current_user.id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    cards = db.query(UserCard).filter(UserCard.user_deck_id == deck.id).all()
    if len(cards) < 4:
        raise HTTPException(status_code=400, detail="Deck needs at least 4 cards for exercise")

    question_count = min(payload.question_count, len(cards))
    selected_cards = random.sample(cards, k=question_count)

    questions = []

    for idx, card in enumerate(selected_cards):
        question_type = "multiple_choice" if idx % 2 == 0 else "hard_fill"

        if question_type == "multiple_choice":
            questions.append(
                {
                    "user_card_id": card.id,
                    "question_type": "multiple_choice",
                    "question_text": card.front_text,
                    "prompt_text": "Chọn nghĩa tiếng Việt đúng (4 đáp án)",
                    "options": _build_mcq_options(card, cards),
                    "answer_mask": None,
                }
            )
        else:
            questions.append(
                {
                    "user_card_id": card.id,
                    "question_type": "hard_fill",
                    "question_text": card.back_text,
                    "prompt_text": "Điền từ tiếng Anh khó tương ứng",
                    "options": [],
                    "answer_mask": _mask_word(card.front_text),
                }
            )

    random.shuffle(questions)

    return ExerciseStartResponse(
        deck_id=deck.id,
        deck_title=deck.title,
        questions=questions,
    )


@router.post("/exercise/hint", response_model=ExerciseHintResponse)
def exercise_hint(
    payload: ExerciseHintRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deck = db.query(UserDeck).filter(UserDeck.id == payload.deck_id, UserDeck.user_id == current_user.id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    card = (
        db.query(UserCard)
        .filter(UserCard.id == payload.user_card_id, UserCard.user_deck_id == deck.id)
        .first()
    )
    if not card:
        raise HTTPException(status_code=404, detail="Card not found in deck")

    hint_text, source = generate_hint(
        question_type=payload.question_type,
        question_text=payload.question_text,
        prompt_text=payload.prompt_text,
        options=payload.options,
        answer_mask=payload.answer_mask,
        user_answer=payload.user_answer,
    )

    return ExerciseHintResponse(hint=hint_text, source=source)


@router.post("/exercise/submit", response_model=ExerciseSubmitResponse)
def submit_exercise(
    payload: ExerciseSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deck = db.query(UserDeck).filter(UserDeck.id == payload.deck_id, UserDeck.user_id == current_user.id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    if not payload.answers:
        raise HTTPException(status_code=400, detail="answers cannot be empty")

    card_ids = [item.user_card_id for item in payload.answers]
    cards = (
        db.query(UserCard)
        .filter(UserCard.user_deck_id == deck.id, UserCard.id.in_(card_ids))
        .all()
    )
    card_map = {card.id: card for card in cards}

    if len(card_map) != len(set(card_ids)):
        raise HTTPException(status_code=400, detail="Some answers reference invalid cards")

    answer_results = []
    correct_count = 0

    for item in payload.answers:
        card = card_map[item.user_card_id]
        user_ans = item.answer.strip()

        if item.question_type == "multiple_choice":
            question_text = card.front_text
            prompt_text = "Chọn nghĩa tiếng Việt đúng (4 đáp án)"
            correct_ans = card.back_text.strip()
        elif item.question_type == "hard_fill":
            question_text = card.back_text
            prompt_text = "Điền từ tiếng Anh khó tương ứng"
            correct_ans = card.front_text.strip()
        else:
            raise HTTPException(status_code=400, detail="Invalid question_type")

        is_correct = _normalize_text(user_ans) == _normalize_text(correct_ans)
        if is_correct:
            correct_count += 1

        answer_results.append(
            {
                "user_card_id": card.id,
                "question_type": item.question_type,
                "question_text": question_text,
                "prompt_text": prompt_text,
                "correct_answer": correct_ans,
                "user_answer": user_ans,
                "is_correct": is_correct,
            }
        )

    total = len(answer_results)
    score_percent = round((correct_count / total) * 100, 2) if total else 0

    attempt = ExerciseAttempt(
        user_id=current_user.id,
        user_deck_id=deck.id,
        total_questions=total,
        correct_answers=correct_count,
        score_percent=score_percent,
    )
    db.add(attempt)
    db.flush()

    for result in answer_results:
        db.add(
            ExerciseAnswer(
                attempt_id=attempt.id,
                user_card_id=result["user_card_id"],
                question_type=result["question_type"],
                question_text=result["question_text"],
                prompt_text=result["prompt_text"],
                correct_answer=result["correct_answer"],
                user_answer=result["user_answer"],
                is_correct=result["is_correct"],
            )
        )

    db.commit()

    return ExerciseSubmitResponse(
        attempt_id=attempt.id,
        deck_id=deck.id,
        total_questions=total,
        correct_answers=correct_count,
        score_percent=score_percent,
        answers=answer_results,
    )


@router.get("/exercise/history/{deck_id}", response_model=ExerciseHistoryResponse)
def exercise_history(
    deck_id: int,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deck = db.query(UserDeck).filter(UserDeck.id == deck_id, UserDeck.user_id == current_user.id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    attempts = (
        db.query(ExerciseAttempt)
        .filter(ExerciseAttempt.user_id == current_user.id, ExerciseAttempt.user_deck_id == deck.id)
        .order_by(ExerciseAttempt.created_at.desc())
        .limit(max(1, min(limit, 100)))
        .all()
    )

    all_attempts = (
        db.query(ExerciseAttempt)
        .filter(ExerciseAttempt.user_id == current_user.id, ExerciseAttempt.user_deck_id == deck.id)
        .all()
    )

    total_attempts = len(all_attempts)
    avg_score = round(sum(a.score_percent for a in all_attempts) / total_attempts, 2) if total_attempts else 0.0
    best_score = round(max((a.score_percent for a in all_attempts), default=0.0), 2)
    latest_score = attempts[0].score_percent if attempts else None

    return ExerciseHistoryResponse(
        attempts=[
            ExerciseAttemptOut(
                id=item.id,
                user_deck_id=item.user_deck_id,
                total_questions=item.total_questions,
                correct_answers=item.correct_answers,
                score_percent=item.score_percent,
                created_at=item.created_at,
            )
            for item in attempts
        ],
        summary={
            "total_attempts": total_attempts,
            "average_score_percent": avg_score,
            "best_score_percent": best_score,
            "latest_score_percent": latest_score,
        },
    )
