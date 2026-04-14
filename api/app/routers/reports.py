from collections import defaultdict
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.models import ExerciseAnswer, ExerciseAttempt, ReviewLog, StudySessionLog, User, UserCard, UserDeck
from app.schemas import (
    DailyActivityItem,
    DeckDetailReportItem,
    ExerciseAttemptAnswerReportItem,
    ExerciseAttemptDetailReportResponse,
    ExerciseAttemptReportItem,
    ExerciseTypeBreakdownItem,
    RatingBreakdownItem,
    RecentExerciseReportItem,
    ReportDetailedResponse,
    ReportOverview,
    RetentionReportResponse,
    RetentionWeekItem,
    StreakDailyItem,
    StreakReportResponse,
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
        .filter(UserDeck.user_id == current_user.id, UserDeck.is_active.is_(True))
        .scalar()
    )

    due_cards = (
        db.query(func.count(UserCard.id))
        .join(UserDeck, UserDeck.id == UserCard.user_deck_id)
        .filter(
            UserDeck.user_id == current_user.id,
            UserDeck.is_active.is_(True),
            UserCard.due_at <= now,
        )
        .scalar()
    )

    study_sessions = (
        db.query(func.count(StudySessionLog.id))
        .filter(
            StudySessionLog.user_id == current_user.id,
            StudySessionLog.created_at >= since,
        )
        .scalar()
        or 0
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
        study_sessions=int(study_sessions or 0),
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

    user_decks = db.query(UserDeck).filter(UserDeck.user_id == current_user.id, UserDeck.is_active.is_(True)).order_by(UserDeck.created_at.desc()).all()

    deck_breakdown: list[DeckDetailReportItem] = []

    for deck in user_decks:
        total_cards = db.query(func.count(UserCard.id)).filter(UserCard.user_deck_id == deck.id).scalar() or 0
        due_cards = (
            db.query(func.count(UserCard.id))
            .filter(UserCard.user_deck_id == deck.id, UserCard.due_at <= now)
            .scalar()
            or 0
        )

        study_sessions = (
            db.query(func.count(StudySessionLog.id))
            .filter(
                StudySessionLog.user_id == current_user.id,
                StudySessionLog.user_deck_id == deck.id,
                StudySessionLog.created_at >= since,
            )
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
                study_sessions=int(study_sessions),
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
        .outerjoin(UserDeck, UserDeck.id == ExerciseAttempt.user_deck_id)
        .filter(ExerciseAttempt.user_id == current_user.id)
        .order_by(ExerciseAttempt.created_at.desc())
        .limit(10)
        .all()
    )
    recent_exercises = [
        RecentExerciseReportItem(
            attempt_id=attempt.id,
            deck_id=attempt.user_deck_id,
            deck_title=deck_title or attempt.deck_title_snapshot or "Deck đã gỡ",
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


@router.get("/streak", response_model=StreakReportResponse)
def reports_streak(
    days: int = Query(default=30, ge=7, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    since = now - timedelta(days=days - 1)

    review_rows = (
        db.query(
            func.date(ReviewLog.reviewed_at).label("day"),
            func.count(ReviewLog.id).label("review_count"),
        )
        .filter(
            ReviewLog.user_id == current_user.id,
            ReviewLog.reviewed_at >= since,
        )
        .group_by(func.date(ReviewLog.reviewed_at))
        .all()
    )

    session_rows = (
        db.query(
            func.date(StudySessionLog.created_at).label("day"),
            func.count(StudySessionLog.id).label("study_sessions"),
        )
        .filter(
            StudySessionLog.user_id == current_user.id,
            StudySessionLog.created_at >= since,
        )
        .group_by(func.date(StudySessionLog.created_at))
        .all()
    )

    exercise_rows = (
        db.query(
            func.date(ExerciseAttempt.created_at).label("day"),
            func.count(ExerciseAttempt.id).label("exercise_attempts"),
        )
        .filter(
            ExerciseAttempt.user_id == current_user.id,
            ExerciseAttempt.created_at >= since,
        )
        .group_by(func.date(ExerciseAttempt.created_at))
        .all()
    )

    review_map = {str(row.day): int(row.review_count or 0) for row in review_rows}
    session_map = {str(row.day): int(row.study_sessions or 0) for row in session_rows}
    exercise_map = {str(row.day): int(row.exercise_attempts or 0) for row in exercise_rows}

    daily_activity: list[StreakDailyItem] = []
    daily_goal = current_user.daily_goal_reviews

    for i in range(days):
        day_value = (since + timedelta(days=i)).date()
        key = day_value.isoformat()

        study_sessions = session_map.get(key, 0)
        review_count = review_map.get(key, 0)
        exercise_attempts = exercise_map.get(key, 0)
        total_lessons = study_sessions + exercise_attempts

        daily_activity.append(
            StreakDailyItem(
                date=key,
                study_sessions=study_sessions,
                review_count=review_count,
                exercise_attempts=exercise_attempts,
                total_lessons=total_lessons,
                goal_reached=review_count >= daily_goal,
            )
        )

    today_key = datetime.utcnow().date().isoformat()
    today_item = next((item for item in daily_activity if item.date == today_key), None)
    today_reviews = today_item.review_count if today_item else 0
    goal_reached = today_reviews >= daily_goal
    progress_percent = min(100.0, round((today_reviews / daily_goal) * 100, 2)) if daily_goal > 0 else 100.0

    weekly_total_lessons = sum(item.total_lessons for item in daily_activity[-7:])

    return StreakReportResponse(
        range_days=days,
        current_streak_days=_calculate_streak_days(db, current_user.id),
        today_study_sessions=today_item.study_sessions if today_item else 0,
        today_review_count=today_reviews,
        today_exercise_attempts=today_item.exercise_attempts if today_item else 0,
        today_total_lessons=today_item.total_lessons if today_item else 0,
        daily_goal_reviews=daily_goal,
        daily_goal_progress_percent=progress_percent,
        daily_goal_reached=goal_reached,
        weekly_total_lessons=weekly_total_lessons,
        daily_activity=daily_activity,
    )


@router.get("/retention", response_model=RetentionReportResponse)
def reports_retention(
    weeks: int = Query(default=8, ge=4, le=52),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    since = now - timedelta(weeks=weeks)

    # Simplified retention: % of reviews that were NOT 'again'
    rows = (
        db.query(ReviewLog.reviewed_at, ReviewLog.rating)
        .filter(
            ReviewLog.user_id == current_user.id,
            ReviewLog.reviewed_at >= since,
        )
        .all()
    )

    weekly_map: dict[str, dict[str, int]] = defaultdict(lambda: {"total": 0, "retained": 0})

    for reviewed_at, rating in rows:
        if reviewed_at is None:
            continue
        day = reviewed_at.date()
        week_start = day - timedelta(days=day.weekday())
        key = week_start.isoformat()

        weekly_map[key]["total"] += 1
        if rating != "again":
            weekly_map[key]["retained"] += 1

    weekly: list[RetentionWeekItem] = []
    total_rev = 0
    total_ret = 0

    for week_start in sorted(weekly_map.keys()):
        t = int(weekly_map[week_start]["total"])
        r = int(weekly_map[week_start]["retained"])
        total_rev += t
        total_ret += r
        weekly.append(
            RetentionWeekItem(
                week_start=week_start,
                reviewed_cards=t,
                retained_cards=r,
                retention_percent=round((r / t) * 100, 2) if t > 0 else 0.0,
            )
        )

    return RetentionReportResponse(
        range_weeks=weeks,
        overall_retention_percent=round((total_ret / total_rev) * 100, 2) if total_rev > 0 else 0.0,
        weekly=weekly,
    )


@router.get("/exercise-attempts", response_model=list[ExerciseAttemptReportItem])
def reports_exercise_attempts(
    deck_id: int | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        db.query(ExerciseAttempt, UserDeck.title)
        .outerjoin(UserDeck, UserDeck.id == ExerciseAttempt.user_deck_id)
        .filter(ExerciseAttempt.user_id == current_user.id)
    )

    if deck_id is not None:
        query = query.filter(ExerciseAttempt.user_deck_id == deck_id)

    rows = query.order_by(ExerciseAttempt.created_at.desc()).limit(limit).all()

    return [
        ExerciseAttemptReportItem(
            attempt_id=attempt.id,
            deck_id=attempt.user_deck_id,
            deck_title=deck_title or attempt.deck_title_snapshot or "Deck đã gỡ",
            score_percent=attempt.score_percent,
            correct_answers=attempt.correct_answers,
            total_questions=attempt.total_questions,
            created_at=attempt.created_at,
        )
        for attempt, deck_title in rows
    ]


@router.get("/exercise-attempts/{attempt_id}", response_model=ExerciseAttemptDetailReportResponse)
def reports_exercise_attempt_detail(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = (
        db.query(ExerciseAttempt, UserDeck.title)
        .outerjoin(UserDeck, UserDeck.id == ExerciseAttempt.user_deck_id)
        .filter(
            ExerciseAttempt.id == attempt_id,
            ExerciseAttempt.user_id == current_user.id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy attempt")

    attempt, deck_title = row

    answers = (
        db.query(ExerciseAnswer)
        .filter(ExerciseAnswer.attempt_id == attempt.id)
        .order_by(ExerciseAnswer.id.asc())
        .all()
    )

    return ExerciseAttemptDetailReportResponse(
        attempt_id=attempt.id,
        deck_id=attempt.user_deck_id,
        deck_title=deck_title or attempt.deck_title_snapshot or "Deck đã gỡ",
        score_percent=attempt.score_percent,
        correct_answers=attempt.correct_answers,
        total_questions=attempt.total_questions,
        created_at=attempt.created_at,
        answers=[
            ExerciseAttemptAnswerReportItem(
                user_card_id=item.user_card_id,
                question_type=item.question_type,
                question_text=item.question_text,
                prompt_text=item.prompt_text,
                correct_answer=item.correct_answer,
                user_answer=item.user_answer,
                is_correct=item.is_correct,
            )
            for item in answers
        ],
    )


def _calculate_streak_days(db: Session, user_id: int) -> int:
    review_days = (
        db.query(func.date(ReviewLog.reviewed_at).label("day"))
        .filter(ReviewLog.user_id == user_id)
        .group_by(func.date(ReviewLog.reviewed_at))
        .all()
    )
    exercise_days = (
        db.query(func.date(ExerciseAttempt.created_at).label("day"))
        .filter(ExerciseAttempt.user_id == user_id)
        .group_by(func.date(ExerciseAttempt.created_at))
        .all()
    )

    studied_days = {row.day for row in review_days} | {row.day for row in exercise_days}
    studied_days = {day for day in studied_days if day is not None}

    if not studied_days:
        return 0

    today = datetime.utcnow().date()
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
