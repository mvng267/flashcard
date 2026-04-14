from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, desc, func, or_
from sqlalchemy.orm import Session, aliased

from app.deps import get_current_user, get_db
from app.models import (
    DirectMessage,
    ExerciseAttempt,
    FeedComment,
    FeedPost,
    FeedReaction,
    Friendship,
    ReviewLog,
    StudySessionLog,
    User,
    UserCard,
    UserDeck,
)
from app.schemas import (
    FeedCommentCreateRequest,
    FeedCommentOut,
    FeedPostCreateRequest,
    FeedPostOut,
    FeedReactionToggleRequest,
    FriendshipActionRequest,
    FriendshipActionResponse,
    PublicStreakActivityItem,
    UserPublicProfile,
    UserPublicProfileDetailResponse,
    UserStudyOverview,
)

router = APIRouter(prefix="/social", tags=["Social"])


def _friend_status(db: Session, me_id: int, other_id: int) -> tuple[bool, bool, bool]:
    relation = (
        db.query(Friendship)
        .filter(
            or_(
                and_(Friendship.requester_id == me_id, Friendship.addressee_id == other_id),
                and_(Friendship.requester_id == other_id, Friendship.addressee_id == me_id),
            )
        )
        .first()
    )

    if not relation:
        return False, False, False

    if relation.status == "accepted":
        return True, False, False

    if relation.status == "pending" and relation.requester_id == me_id:
        return False, True, False

    if relation.status == "pending" and relation.addressee_id == me_id:
        return False, False, True

    return False, False, False


def _get_progress(db: Session, owner_id: int, user_deck_id: int) -> tuple[int, int, float]:
    total_cards = db.query(func.count(UserCard.id)).filter(UserCard.user_deck_id == user_deck_id).scalar() or 0
    if total_cards == 0:
        return 0, 0, 0.0

    reviewed_distinct = (
        db.query(func.count(func.distinct(ReviewLog.user_card_id)))
        .join(UserCard, UserCard.id == ReviewLog.user_card_id)
        .filter(ReviewLog.user_id == owner_id, UserCard.user_deck_id == user_deck_id)
        .scalar()
        or 0
    )

    percent = round((reviewed_distinct / total_cards) * 100, 2) if total_cards else 0.0
    return int(reviewed_distinct), int(total_cards), percent


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


@router.get("/users/search", response_model=list[UserPublicProfile])
def search_users(
    q: str = Query(default="", min_length=0, max_length=80),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(User).filter(User.id != current_user.id)
    term = q.strip().lower()

    if term:
        wildcard = f"%{term}%"
        query = query.filter(
            or_(
                func.lower(User.username).like(wildcard),
                func.lower(User.full_name).like(wildcard),
                func.lower(User.email).like(wildcard),
            )
        )

    users = query.order_by(User.username.asc()).limit(limit).all()

    results: list[UserPublicProfile] = []
    for user in users:
        is_friend, requested_by_me, requested_me = _friend_status(db, current_user.id, user.id)
        results.append(
            UserPublicProfile(
                id=user.id,
                username=user.username,
                full_name=user.full_name,
                bio=user.bio,
                avatar_url=user.avatar_url,
                avatar_seed=user.avatar_seed or user.username,
                is_friend=is_friend,
                requested_by_me=requested_by_me,
                requested_me=requested_me,
            )
        )

    return results


@router.get("/friends", response_model=list[UserPublicProfile])
def my_friends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(Friendship)
        .filter(
            Friendship.status == "accepted",
            or_(Friendship.requester_id == current_user.id, Friendship.addressee_id == current_user.id),
        )
        .all()
    )

    friend_ids = [
        row.addressee_id if row.requester_id == current_user.id else row.requester_id
        for row in rows
    ]

    if not friend_ids:
        return []

    users = db.query(User).filter(User.id.in_(friend_ids)).order_by(User.username.asc()).all()
    return [
        UserPublicProfile(
            id=u.id,
            username=u.username,
            full_name=u.full_name,
            bio=u.bio,
            avatar_url=u.avatar_url,
            avatar_seed=u.avatar_seed or u.username,
            is_friend=True,
            requested_by_me=False,
            requested_me=False,
        )
        for u in users
    ]


@router.post("/friends/request", response_model=FriendshipActionResponse)
def send_friend_request(
    payload: FriendshipActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Không thể kết bạn với chính mình")

    target = db.query(User).filter(User.id == payload.user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy user")

    relation = (
        db.query(Friendship)
        .filter(
            or_(
                and_(Friendship.requester_id == current_user.id, Friendship.addressee_id == payload.user_id),
                and_(Friendship.requester_id == payload.user_id, Friendship.addressee_id == current_user.id),
            )
        )
        .first()
    )

    if relation:
        if relation.status == "accepted":
            return FriendshipActionResponse(ok=True, status="accepted")
        if relation.status == "pending" and relation.addressee_id == current_user.id:
            relation.status = "accepted"
            relation.responded_at = datetime.utcnow()
            db.add(relation)
            db.commit()
            return FriendshipActionResponse(ok=True, status="accepted")
        return FriendshipActionResponse(ok=True, status=relation.status)

    relation = Friendship(
        requester_id=current_user.id,
        addressee_id=payload.user_id,
        status="pending",
    )
    db.add(relation)
    db.commit()

    return FriendshipActionResponse(ok=True, status="pending")


@router.post("/friends/accept", response_model=FriendshipActionResponse)
def accept_friend_request(
    payload: FriendshipActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    relation = (
        db.query(Friendship)
        .filter(
            Friendship.requester_id == payload.user_id,
            Friendship.addressee_id == current_user.id,
            Friendship.status == "pending",
        )
        .first()
    )
    if not relation:
        raise HTTPException(status_code=404, detail="Không có lời mời kết bạn phù hợp")

    relation.status = "accepted"
    relation.responded_at = datetime.utcnow()
    db.add(relation)
    db.commit()

    return FriendshipActionResponse(ok=True, status="accepted")


@router.post("/friends/remove", response_model=FriendshipActionResponse)
def remove_friend(
    payload: FriendshipActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    relation = (
        db.query(Friendship)
        .filter(
            or_(
                and_(Friendship.requester_id == current_user.id, Friendship.addressee_id == payload.user_id),
                and_(Friendship.requester_id == payload.user_id, Friendship.addressee_id == current_user.id),
            )
        )
        .first()
    )
    if not relation:
        return FriendshipActionResponse(ok=True, status="none")

    db.delete(relation)
    db.commit()
    return FriendshipActionResponse(ok=True, status="removed")


@router.get("/users/{user_id}/profile", response_model=UserPublicProfileDetailResponse)
def get_user_public_profile(
    user_id: int,
    days: int = Query(default=30, ge=7, le=180),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Không tìm thấy user")

    is_friend, requested_by_me, requested_me = _friend_status(db, current_user.id, target_user.id)

    user_profile = UserPublicProfile(
        id=target_user.id,
        username=target_user.username,
        full_name=target_user.full_name,
        bio=target_user.bio,
        avatar_url=target_user.avatar_url,
        avatar_seed=target_user.avatar_seed or target_user.username,
        is_friend=is_friend,
        requested_by_me=requested_by_me,
        requested_me=requested_me,
    )

    total_decks = db.query(func.count(UserDeck.id)).filter(UserDeck.user_id == target_user.id).scalar() or 0
    total_cards = (
        db.query(func.count(UserCard.id))
        .join(UserDeck, UserDeck.id == UserCard.user_deck_id)
        .filter(UserDeck.user_id == target_user.id)
        .scalar()
        or 0
    )
    reviewed_cards = (
        db.query(func.count(func.distinct(ReviewLog.user_card_id)))
        .filter(ReviewLog.user_id == target_user.id)
        .scalar()
        or 0
    )
    due_cards = (
        db.query(func.count(UserCard.id))
        .join(UserDeck, UserDeck.id == UserCard.user_deck_id)
        .filter(UserDeck.user_id == target_user.id, UserCard.due_at <= datetime.utcnow())
        .scalar()
        or 0
    )

    since = datetime.utcnow() - timedelta(days=days - 1)
    total_reviews_30d = (
        db.query(func.count(ReviewLog.id))
        .filter(ReviewLog.user_id == target_user.id, ReviewLog.reviewed_at >= since)
        .scalar()
        or 0
    )
    correct_reviews_30d = (
        db.query(func.count(ReviewLog.id))
        .filter(
            ReviewLog.user_id == target_user.id,
            ReviewLog.reviewed_at >= since,
            ReviewLog.was_correct.is_(True),
        )
        .scalar()
        or 0
    )
    accuracy_percent_30d = round((correct_reviews_30d / total_reviews_30d) * 100, 2) if total_reviews_30d else 0.0

    study_sessions_30d = (
        db.query(func.count(StudySessionLog.id))
        .filter(StudySessionLog.user_id == target_user.id, StudySessionLog.created_at >= since)
        .scalar()
        or 0
    )
    exercise_attempts_30d = (
        db.query(func.count(ExerciseAttempt.id))
        .filter(ExerciseAttempt.user_id == target_user.id, ExerciseAttempt.created_at >= since)
        .scalar()
        or 0
    )

    review_rows = (
        db.query(
            func.date(ReviewLog.reviewed_at).label("day"),
            func.count(ReviewLog.id).label("review_count"),
        )
        .filter(
            ReviewLog.user_id == target_user.id,
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
            StudySessionLog.user_id == target_user.id,
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
            ExerciseAttempt.user_id == target_user.id,
            ExerciseAttempt.created_at >= since,
        )
        .group_by(func.date(ExerciseAttempt.created_at))
        .all()
    )

    review_map = {str(row.day): int(row.review_count or 0) for row in review_rows}
    session_map = {str(row.day): int(row.study_sessions or 0) for row in session_rows}
    exercise_map = {str(row.day): int(row.exercise_attempts or 0) for row in exercise_rows}

    streak_activity: list[PublicStreakActivityItem] = []
    for i in range(days):
        day_value = (since + timedelta(days=i)).date()
        key = day_value.isoformat()

        study_sessions = session_map.get(key, 0)
        review_count = review_map.get(key, 0)
        exercise_attempts = exercise_map.get(key, 0)
        total_lessons = study_sessions + exercise_attempts

        streak_activity.append(
            PublicStreakActivityItem(
                date=key,
                study_sessions=study_sessions,
                review_count=review_count,
                exercise_attempts=exercise_attempts,
                total_lessons=total_lessons,
            )
        )

    overview = UserStudyOverview(
        total_decks=int(total_decks),
        total_cards=int(total_cards),
        reviewed_cards=int(reviewed_cards),
        due_cards=int(due_cards),
        total_reviews_30d=int(total_reviews_30d),
        accuracy_percent_30d=accuracy_percent_30d,
        study_sessions_30d=int(study_sessions_30d),
        exercise_attempts_30d=int(exercise_attempts_30d),
        current_streak_days=_calculate_streak_days(db, target_user.id),
    )

    return UserPublicProfileDetailResponse(
        user=user_profile,
        overview=overview,
        streak_range_days=days,
        streak_activity=streak_activity,
    )


@router.post("/feed/posts", response_model=FeedPostOut)
def create_feed_post(
    payload: FeedPostCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deck = (
        db.query(UserDeck)
        .filter(UserDeck.id == payload.user_deck_id, UserDeck.user_id == current_user.id)
        .first()
    )
    if not deck:
        raise HTTPException(status_code=404, detail="Không tìm thấy deck để share")

    post = FeedPost(
        author_id=current_user.id,
        user_deck_id=deck.id,
        caption=payload.caption.strip(),
        visibility=payload.visibility,
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    author_reviewed, author_total, author_percent = _get_progress(db, current_user.id, deck.id)

    return FeedPostOut(
        id=post.id,
        author_id=current_user.id,
        author_username=current_user.username,
        author_full_name=current_user.full_name,
        author_avatar_url=current_user.avatar_url,
        author_avatar_seed=current_user.avatar_seed or current_user.username,
        user_deck_id=deck.id,
        deck_title=deck.title,
        caption=post.caption,
        visibility=post.visibility,
        created_at=post.created_at,
        author_progress_reviewed=author_reviewed,
        author_progress_total_cards=author_total,
        author_progress_percent=author_percent,
        viewer_has_started=False,
        viewer_reviewed=0,
        viewer_total_cards=0,
        reaction_count=0,
        comment_count=0,
        viewer_liked=False,
    )


@router.get("/feed", response_model=list[FeedPostOut])
def get_feed(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    accepted_rows = (
        db.query(Friendship)
        .filter(
            Friendship.status == "accepted",
            or_(Friendship.requester_id == current_user.id, Friendship.addressee_id == current_user.id),
        )
        .all()
    )

    friend_ids = {
        row.addressee_id if row.requester_id == current_user.id else row.requester_id
        for row in accepted_rows
    }

    visible_author_ids = set(friend_ids)
    visible_author_ids.add(current_user.id)

    author_alias = aliased(User)

    rows = (
        db.query(FeedPost, author_alias, UserDeck)
        .join(author_alias, author_alias.id == FeedPost.author_id)
        .join(UserDeck, UserDeck.id == FeedPost.user_deck_id)
        .filter(
            or_(
                FeedPost.visibility == "public",
                FeedPost.author_id.in_(visible_author_ids),
            )
        )
        .order_by(desc(FeedPost.created_at))
        .limit(limit)
        .all()
    )

    result: list[FeedPostOut] = []
    for post, author, deck in rows:
        author_reviewed, author_total, author_percent = _get_progress(db, author.id, deck.id)

        viewer_deck = (
            db.query(UserDeck)
            .filter(
                UserDeck.user_id == current_user.id,
                UserDeck.source_library_deck_id == deck.source_library_deck_id,
            )
            .first()
        )

        viewer_reviewed = 0
        viewer_total = 0
        viewer_has_started = False
        if viewer_deck:
            viewer_reviewed, viewer_total, _ = _get_progress(db, current_user.id, viewer_deck.id)
            viewer_has_started = viewer_reviewed > 0

        reaction_count = db.query(func.count(FeedReaction.id)).filter(FeedReaction.post_id == post.id).scalar() or 0
        comment_count = db.query(func.count(FeedComment.id)).filter(FeedComment.post_id == post.id).scalar() or 0
        viewer_liked = (
            db.query(FeedReaction.id)
            .filter(FeedReaction.post_id == post.id, FeedReaction.user_id == current_user.id)
            .first()
            is not None
        )

        result.append(
            FeedPostOut(
                id=post.id,
                author_id=author.id,
                author_username=author.username,
                author_full_name=author.full_name,
                author_avatar_url=author.avatar_url,
                author_avatar_seed=author.avatar_seed or author.username,
                user_deck_id=deck.id,
                deck_title=deck.title,
                caption=post.caption,
                visibility=post.visibility,
                created_at=post.created_at,
                author_progress_reviewed=author_reviewed,
                author_progress_total_cards=author_total,
                author_progress_percent=author_percent,
                viewer_has_started=viewer_has_started,
                viewer_reviewed=viewer_reviewed,
                viewer_total_cards=viewer_total,
                reaction_count=int(reaction_count),
                comment_count=int(comment_count),
                viewer_liked=viewer_liked,
            )
        )

    return result


@router.post("/feed/posts/{post_id}/react")
def toggle_post_reaction(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = (
        db.query(FeedReaction)
        .filter(FeedReaction.post_id == post_id, FeedReaction.user_id == current_user.id)
        .first()
    )

    if existing:
        db.delete(existing)
        db.commit()
        return {"ok": True, "liked": False}

    reaction = FeedReaction(post_id=post_id, user_id=current_user.id)
    db.add(reaction)
    db.commit()
    return {"ok": True, "liked": True}


@router.get("/feed/posts/{post_id}/comments", response_model=list[FeedCommentOut])
def get_post_comments(
    post_id: int,
    db: Session = Depends(get_db),
):
    rows = (
        db.query(FeedComment, User)
        .join(User, User.id == FeedComment.user_id)
        .filter(FeedComment.post_id == post_id)
        .order_by(FeedComment.created_at.asc())
        .all()
    )

    return [
        FeedCommentOut(
            id=c.id,
            user_id=u.id,
            username=u.username,
            full_name=u.full_name,
            avatar_url=u.avatar_url,
            avatar_seed=u.avatar_seed or u.username,
            content=c.content,
            created_at=c.created_at,
        )
        for c, u in rows
    ]


@router.post("/feed/posts/{post_id}/comments", response_model=FeedCommentOut)
def create_post_comment(
    post_id: int,
    payload: FeedCommentCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = FeedComment(
        post_id=post_id,
        user_id=current_user.id,
        content=payload.content.strip(),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    return FeedCommentOut(
        id=comment.id,
        user_id=current_user.id,
        username=current_user.username,
        full_name=current_user.full_name,
        avatar_url=current_user.avatar_url,
        avatar_seed=current_user.avatar_seed or current_user.username,
        content=comment.content,
        created_at=comment.created_at,
    )
