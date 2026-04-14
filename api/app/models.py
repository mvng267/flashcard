from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    bio: Mapped[str | None] = mapped_column(String(300), nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    auth_provider: Mapped[str] = mapped_column(String(32), default="local", nullable=False, server_default="local")
    google_sub: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    avatar_seed: Mapped[str] = mapped_column(String(120), default="", nullable=False, server_default="")
    daily_goal_reviews: Mapped[int] = mapped_column(Integer, default=20, nullable=False, server_default="20")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    user_decks: Mapped[list["UserDeck"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    review_logs: Mapped[list["ReviewLog"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    exercise_attempts: Mapped[list["ExerciseAttempt"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    study_sessions: Mapped[list["StudySessionLog"]] = relationship(back_populates="user", cascade="all, delete-orphan")

    posts: Mapped[list["FeedPost"]] = relationship(back_populates="author", cascade="all, delete-orphan")
    sent_messages: Mapped[list["DirectMessage"]] = relationship(
        back_populates="sender",
        cascade="all, delete-orphan",
        foreign_keys="DirectMessage.sender_id",
    )
    received_messages: Mapped[list["DirectMessage"]] = relationship(
        back_populates="receiver",
        cascade="all, delete-orphan",
        foreign_keys="DirectMessage.receiver_id",
    )


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped[User] = relationship(back_populates="refresh_tokens")


class LibraryDeck(Base):
    __tablename__ = "library_decks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    level: Mapped[str] = mapped_column(String(20), default="A1")
    topic: Mapped[str] = mapped_column(String(80), default="General")
    tags: Mapped[str] = mapped_column(String(255), default="")
    estimated_minutes: Mapped[int] = mapped_column(Integer, default=10)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    cards: Mapped[list["LibraryCard"]] = relationship(back_populates="deck", cascade="all, delete-orphan")


class LibraryCard(Base):
    __tablename__ = "library_cards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    deck_id: Mapped[int] = mapped_column(ForeignKey("library_decks.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    front_text: Mapped[str] = mapped_column(Text, nullable=False)
    back_text: Mapped[str] = mapped_column(Text, nullable=False)
    example_sentence: Mapped[str] = mapped_column(Text, default="")
    phonetic: Mapped[str] = mapped_column(String(120), default="")
    level: Mapped[str] = mapped_column(String(20), default="A1")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    deck: Mapped[LibraryDeck] = relationship(back_populates="cards")


class UserDeck(Base):
    __tablename__ = "user_decks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    source_library_deck_id: Mapped[int | None] = mapped_column(ForeignKey("library_decks.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    level: Mapped[str] = mapped_column(String(20), default="A1")
    topic: Mapped[str] = mapped_column(String(80), default="General")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped[User] = relationship(back_populates="user_decks")
    cards: Mapped[list["UserCard"]] = relationship(back_populates="deck", cascade="all, delete-orphan")
    exercise_attempts: Mapped[list["ExerciseAttempt"]] = relationship(back_populates="deck")
    study_sessions: Mapped[list["StudySessionLog"]] = relationship(back_populates="deck")


class UserCard(Base):
    __tablename__ = "user_cards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_deck_id: Mapped[int] = mapped_column(ForeignKey("user_decks.id", ondelete="CASCADE"), index=True)
    source_library_card_id: Mapped[int | None] = mapped_column(ForeignKey("library_cards.id", ondelete="SET NULL"), nullable=True)
    front_text: Mapped[str] = mapped_column(Text, nullable=False)
    back_text: Mapped[str] = mapped_column(Text, nullable=False)
    example_sentence: Mapped[str] = mapped_column(Text, default="")
    phonetic: Mapped[str] = mapped_column(String(120), default="")

    due_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True, nullable=False)
    interval_days: Mapped[int] = mapped_column(Integer, default=0)
    ease_factor: Mapped[float] = mapped_column(Float, default=2.5)
    repetitions: Mapped[int] = mapped_column(Integer, default=0)
    lapses: Mapped[int] = mapped_column(Integer, default=0)
    last_reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    deck: Mapped[UserDeck] = relationship(back_populates="cards")
    review_logs: Mapped[list["ReviewLog"]] = relationship(back_populates="card")


class StudySessionLog(Base):
    __tablename__ = "study_session_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    user_deck_id: Mapped[int | None] = mapped_column(ForeignKey("user_decks.id", ondelete="SET NULL"), index=True, nullable=True)
    mode: Mapped[str] = mapped_column(String(16), default="due", nullable=False)
    cards_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    deck_title_snapshot: Mapped[str] = mapped_column(String(255), default="", nullable=False, server_default="")
    deck_level_snapshot: Mapped[str | None] = mapped_column(String(20), nullable=True)
    deck_topic_snapshot: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped[User] = relationship(back_populates="study_sessions")
    deck: Mapped[UserDeck | None] = relationship(back_populates="study_sessions")


class ReviewLog(Base):
    __tablename__ = "review_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    user_card_id: Mapped[int | None] = mapped_column(ForeignKey("user_cards.id", ondelete="SET NULL"), index=True, nullable=True)
    rating: Mapped[str] = mapped_column(String(16), nullable=False)
    was_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    front_text_snapshot: Mapped[str] = mapped_column(Text, default="", nullable=False, server_default="")
    back_text_snapshot: Mapped[str] = mapped_column(Text, default="", nullable=False, server_default="")
    reviewed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    next_due_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    user: Mapped[User] = relationship(back_populates="review_logs")
    card: Mapped[UserCard | None] = relationship(back_populates="review_logs")


class ExerciseAttempt(Base):
    __tablename__ = "exercise_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    user_deck_id: Mapped[int | None] = mapped_column(ForeignKey("user_decks.id", ondelete="SET NULL"), index=True, nullable=True)
    total_questions: Mapped[int] = mapped_column(Integer, default=0)
    correct_answers: Mapped[int] = mapped_column(Integer, default=0)
    score_percent: Mapped[float] = mapped_column(Float, default=0)
    deck_title_snapshot: Mapped[str] = mapped_column(String(255), default="", nullable=False, server_default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped[User] = relationship(back_populates="exercise_attempts")
    deck: Mapped[UserDeck | None] = relationship(back_populates="exercise_attempts")
    answers: Mapped[list["ExerciseAnswer"]] = relationship(back_populates="attempt", cascade="all, delete-orphan")


class ExerciseAnswer(Base):
    __tablename__ = "exercise_answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    attempt_id: Mapped[int] = mapped_column(ForeignKey("exercise_attempts.id", ondelete="CASCADE"), index=True)
    user_card_id: Mapped[int | None] = mapped_column(ForeignKey("user_cards.id", ondelete="SET NULL"), index=True, nullable=True)
    question_type: Mapped[str] = mapped_column(String(24), default="multiple_choice", nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    prompt_text: Mapped[str] = mapped_column(Text, default="", nullable=False)
    correct_answer: Mapped[str] = mapped_column(Text, nullable=False)
    user_answer: Mapped[str] = mapped_column(Text, default="")
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)

    attempt: Mapped[ExerciseAttempt] = relationship(back_populates="answers")


class Friendship(Base):
    __tablename__ = "friendships"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    requester_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    addressee_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="pending", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    responded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class FeedPost(Base):
    __tablename__ = "feed_posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    user_deck_id: Mapped[int] = mapped_column(ForeignKey("user_decks.id", ondelete="CASCADE"), index=True, nullable=False)
    caption: Mapped[str] = mapped_column(Text, default="")
    visibility: Mapped[str] = mapped_column(String(16), default="friends", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    author: Mapped[User] = relationship(back_populates="posts")
    reactions: Mapped[list["FeedReaction"]] = relationship(cascade="all, delete-orphan")
    comments: Mapped[list["FeedComment"]] = relationship(cascade="all, delete-orphan")


class DirectMessage(Base):
    __tablename__ = "direct_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    receiver_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    sender: Mapped[User] = relationship(back_populates="sent_messages", foreign_keys=[sender_id])
    receiver: Mapped[User] = relationship(back_populates="received_messages", foreign_keys=[receiver_id])


class FeedReaction(Base):
    __tablename__ = "feed_reactions"
    __table_args__ = (
        UniqueConstraint("post_id", "user_id", name="uq_feed_reaction_post_user"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("feed_posts.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class FeedComment(Base):
    __tablename__ = "feed_comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("feed_posts.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    content: Mapped[str] = mapped_column(String(500), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


Index("ix_user_decks_user_source", UserDeck.user_id, UserDeck.source_library_deck_id)
Index("ix_study_sessions_user_date", StudySessionLog.user_id, StudySessionLog.created_at)
Index("ix_review_logs_user_date", ReviewLog.user_id, ReviewLog.reviewed_at)
Index("ix_exercise_attempts_user_date", ExerciseAttempt.user_id, ExerciseAttempt.created_at)
Index("ix_friendships_pair", Friendship.requester_id, Friendship.addressee_id, unique=True)
Index("ix_feed_posts_author_date", FeedPost.author_id, FeedPost.created_at)
Index("ix_direct_messages_pair_date", DirectMessage.sender_id, DirectMessage.receiver_id, DirectMessage.created_at)
Index("ix_feed_reactions_post", FeedReaction.post_id)
Index("ix_feed_comments_post", FeedComment.post_id, FeedComment.created_at)
