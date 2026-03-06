from collections import defaultdict
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.models import ExerciseAnswer, ExerciseAttempt, ReviewLog, User, UserCard, UserDeck
from app.schemas import (
    DailyActivityItem,
    DeckDetailReportItem,
    ExerciseTypeBreakdownItem,
    RatingBreakdownItem,
    RecentExerciseReportItem,
    ReportDetailedResponse,
    ReportOverview,
    WeakCardReportItem,
)

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/overview", response_model=ReportOverview)
def reports_overview(
    days: int = Query(default=30, ge=7, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    since = now - timedelta(days=days - 1)

    total_reviews = (
        db.query(func.count(ReviewLog.id))
        .filter(
            ReviewLog.user_id == current_user.id,
            ReviewLog.reviewed_at >= since,
        )
        .scalar()
    )
    correct_reviews = (
        db.query(func.count(ReviewLog.id))
        .filter(
            ReviewLog.user_id == current_user.id,
            ReviewLog.reviewed_at >= since,
            ReviewLog.was_correct.is_(True),
        )
        .scalar()
    )

    total_cards = (
        db.query(func.count(UserCard.id))
        .join(UserDeck, UserDeck.id == UserCard.user_deck_id)
        .filter(UserDeck.user_id == current_user.id)
        .scalar()
    )

    due_cards = (
        db.query(func.count(UserCard.id))
        .join(UserDeck, UserDeck.id == UserCard.user_deck_id)
        .filter(
            UserDeck.user_id == current_user.id,
            UserCard.due_at <= now,
        )
        .scalar()
    )

    exercise_rows = (
        db.query(ExerciseAttempt)
        .filter(
            ExerciseAttempt.user_id == current_user.id,
            ExerciseAttempt.created_at >= since,
        )
        .all()
    )
    exercise_attempts = len(exercise_rows)
    exercise_average_score = (
        round(sum(item.score_percent for item in exercise_rows) / exercise_attempts, 2)
        if exercise_attempts
        else 0.0
    )

    daily_totals = defaultdict(lambda: {"reviews": 0, "correct": 0})
    raw_rows = (
        db.query(
            func.date(ReviewLog.reviewed_at).label("day"),
            ReviewLog.was_correct,
            func.count(ReviewLog.id),
        )
        .filter(
            ReviewLog.user_id == current_user.id,
            ReviewLog.reviewed_at >= since,
        )
        .group_by(func.date(ReviewLog.reviewed_at), ReviewLog.was_correct)
        .all()
    )

    for day, was_correct, count in raw_rows:
        key = str(day)
        daily_totals[key]["reviews"] += int(count or 0)
        if was_correct:
            daily_totals[key]["correct"] += int(count or 0)

    daily_activity: list[DailyActivityItem] = []
    for i in range(days):
        day_value = (since + timedelta(days=i)).date()
        key = day_value.isoformat()
        reviews = daily_totals[key]["reviews"]
        correct = daily_totals[key]["correct"]
        acc = round((correct / reviews) * 100, 2) if reviews else 0.0
        daily_activity.append(DailyActivityItem(date=key, reviews=reviews, accuracy=acc))

    streak_days = _calculate_streak_days(db, current_user.id)

    accuracy_percent = round((int(correct_reviews or 0) / int(total_reviews or 1)) * 100, 2) if total_reviews else 0.0

    return ReportOverview(
        range_days=days,
        total_reviews=int(total_reviews or 0),
        correct_reviews=int(correct_reviews or 0),
        accuracy_percent=accuracy_percent,
        streak_days=streak_days,
        due_cards=int(due_cards or 0),
        total_cards=int(total_cards or 0),
        exercise_attempts=exercise_attempts,
        exercise_average_score=exercise_average_score,
        daily_activity=daily_activity,
    )


@router.get("/detailed", response_model=ReportDetailedResponse)
def reports_detailed(
    days: int = Query(default=30, ge=7, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    since = now - timedelta(days=days - 1)

    user_decks = db.query(UserDeck).filter(UserDeck.user_id == current_user.id).order_by(UserDeck.created_at.desc()).all()

    deck_breakdown: list[DeckDetailReportItem] = []

    for deck in user_decks:
        total_cards = db.query(func.count(UserCard.id)).filter(UserCard.user_deck_id == deck.id).scalar() or 0
        due_cards = (
            db.query(func.count(UserCard.id))
            .filter(UserCard.user_deck_id == deck.id, UserCard.due_at <= now)
            .scalar()
            or 0
        )

        review_count = (
            db.query(func.count(ReviewLog.id))
            .join(UserCard, UserCard.id == ReviewLog.user_card_id)
            .filter(
                ReviewLog.user_id == current_user.id,
                UserCard.user_deck_id == deck.id,
                ReviewLog.reviewed_at >= since,
            )
            .scalar()
            or 0
        )
        correct_count = (
            db.query(func.count(ReviewLog.id))
            .join(UserCard, UserCard.id == ReviewLog.user_card_id)
            .filter(
                ReviewLog.user_id == current_user.id,
                UserCard.user_deck_id == deck.id,
                ReviewLog.reviewed_at >= since,
                ReviewLog.was_correct.is_(True),
            )
            .scalar()
            or 0
        )

        exercise_rows = (
            db.query(ExerciseAttempt)
            .filter(
                ExerciseAttempt.user_id == current_user.id,
                ExerciseAttempt.user_deck_id == deck.id,
                ExerciseAttempt.created_at >= since,
            )
            .all()
        )
        exercise_attempts = len(exercise_rows)
        exercise_average_score = (
            round(sum(item.score_percent for item in exercise_rows) / exercise_attempts, 2)
            if exercise_attempts
            else 0.0
        )

        accuracy_percent = round((correct_count / review_count) * 100, 2) if review_count else 0.0

        deck_breakdown.append(
            DeckDetailReportItem(
                deck_id=deck.id,
                deck_title=deck.title,
                total_cards=int(total_cards),
                due_cards=int(due_cards),
                review_count=int(review_count),
                correct_count=int(correct_count),
                accuracy_percent=accuracy_percent,
                exercise_attempts=exercise_attempts,
                exercise_average_score=exercise_average_score,
            )
        )

    rating_rows = (
        db.query(ReviewLog.rating, func.count(ReviewLog.id))
        .filter(ReviewLog.user_id == current_user.id, ReviewLog.reviewed_at >= since)
        .group_by(ReviewLog.rating)
        .all()
    )
    rating_map = {row[0]: int(row[1] or 0) for row in rating_rows}
    rating_breakdown = [
        RatingBreakdownItem(rating="again", count=rating_map.get("again", 0)),
        RatingBreakdownItem(rating="hard", count=rating_map.get("hard", 0)),
        RatingBreakdownItem(rating="good", count=rating_map.get("good", 0)),
        RatingBreakdownItem(rating="easy", count=rating_map.get("easy", 0)),
    ]

    exercise_type_rows = (
        db.query(
            ExerciseAnswer.question_type,
            func.count(ExerciseAnswer.id).label("attempts"),
            func.sum(case((ExerciseAnswer.is_correct.is_(True), 1), else_=0)).label("corrects"),
        )
        .join(ExerciseAttempt, ExerciseAttempt.id == ExerciseAnswer.attempt_id)
        .filter(
            ExerciseAttempt.user_id == current_user.id,
            ExerciseAttempt.created_at >= since,
        )
        .group_by(ExerciseAnswer.question_type)
        .all()
    )

    type_map = {row.question_type: {"attempts": int(row.attempts or 0), "correct": int(row.corrects or 0)} for row in exercise_type_rows}

    exercise_type_breakdown: list[ExerciseTypeBreakdownItem] = []
    for qtype in ["multiple_choice", "hard_fill"]:
        attempts = type_map.get(qtype, {}).get("attempts", 0)
        correct = type_map.get(qtype, {}).get("correct", 0)
        accuracy = round((correct / attempts) * 100, 2) if attempts else 0.0
        exercise_type_breakdown.append(
            ExerciseTypeBreakdownItem(
                question_type=qtype,  # type: ignore[arg-type]
                attempts=attempts,
                correct=correct,
                accuracy_percent=accuracy,
            )
        )

    recent_rows = (
        db.query(ExerciseAttempt, UserDeck.title)
        .join(UserDeck, UserDeck.id == ExerciseAttempt.user_deck_id)
        .filter(ExerciseAttempt.user_id == current_user.id)
        .order_by(ExerciseAttempt.created_at.desc())
        .limit(10)
        .all()
    )
    recent_exercises = [
        RecentExerciseReportItem(
            attempt_id=attempt.id,
            deck_id=attempt.user_deck_id,
            deck_title=deck_title,
            score_percent=attempt.score_percent,
            correct_answers=attempt.correct_answers,
            total_questions=attempt.total_questions,
            created_at=attempt.created_at,
        )
        for attempt, deck_title in recent_rows
    ]

    weak_rows = (
        db.query(
            ExerciseAnswer.question_text,
            ExerciseAnswer.correct_answer,
            func.count(ExerciseAnswer.id).label("wrong_count"),
        )
        .join(ExerciseAttempt, ExerciseAttempt.id == ExerciseAnswer.attempt_id)
        .filter(
            ExerciseAttempt.user_id == current_user.id,
            ExerciseAttempt.created_at >= since,
            ExerciseAnswer.is_correct.is_(False),
        )
        .group_by(ExerciseAnswer.question_text, ExerciseAnswer.correct_answer)
        .order_by(func.count(ExerciseAnswer.id).desc())
        .limit(10)
        .all()
    )
    weak_cards = [
        WeakCardReportItem(
            question_text=row.question_text,
            correct_answer=row.correct_answer,
            wrong_count=int(row.wrong_count or 0),
        )
        for row in weak_rows
    ]

    return ReportDetailedResponse(
        range_days=days,
        deck_breakdown=deck_breakdown,
        rating_breakdown=rating_breakdown,
        exercise_type_breakdown=exercise_type_breakdown,
        recent_exercises=recent_exercises,
        weak_cards=weak_cards,
    )


def _calculate_streak_days(db: Session, user_id: int) -> int:
    rows = (
        db.query(func.date(ReviewLog.reviewed_at).label("day"))
        .filter(ReviewLog.user_id == user_id)
        .group_by(func.date(ReviewLog.reviewed_at))
        .order_by(func.date(ReviewLog.reviewed_at).desc())
        .all()
    )

    if not rows:
        return 0

    studied_days = {row.day for row in rows}

    today = date.today()
    streak = 0

    if today in studied_days:
        current_day = today
    elif (today - timedelta(days=1)) in studied_days:
        current_day = today - timedelta(days=1)
    else:
        return 0

    while current_day in studied_days:
        streak += 1
        current_day -= timedelta(days=1)

    return streak
