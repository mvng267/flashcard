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
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    user_decks: Mapped[list["UserDeck"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    review_logs: Mapped[list["ReviewLog"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    exercise_attempts: Mapped[list["ExerciseAttempt"]] = relationship(back_populates="user", cascade="all, delete-orphan")


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
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped[User] = relationship(back_populates="user_decks")
    cards: Mapped[list["UserCard"]] = relationship(back_populates="deck", cascade="all, delete-orphan")
    exercise_attempts: Mapped[list["ExerciseAttempt"]] = relationship(back_populates="deck", cascade="all, delete-orphan")


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
    review_logs: Mapped[list["ReviewLog"]] = relationship(back_populates="card", cascade="all, delete-orphan")


class ReviewLog(Base):
    __tablename__ = "review_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    user_card_id: Mapped[int] = mapped_column(ForeignKey("user_cards.id", ondelete="CASCADE"), index=True)
    rating: Mapped[str] = mapped_column(String(16), nullable=False)
    was_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    reviewed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    next_due_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    user: Mapped[User] = relationship(back_populates="review_logs")
    card: Mapped[UserCard] = relationship(back_populates="review_logs")


class ExerciseAttempt(Base):
    __tablename__ = "exercise_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    user_deck_id: Mapped[int] = mapped_column(ForeignKey("user_decks.id", ondelete="CASCADE"), index=True)
    total_questions: Mapped[int] = mapped_column(Integer, default=0)
    correct_answers: Mapped[int] = mapped_column(Integer, default=0)
    score_percent: Mapped[float] = mapped_column(Float, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped[User] = relationship(back_populates="exercise_attempts")
    deck: Mapped[UserDeck] = relationship(back_populates="exercise_attempts")
    answers: Mapped[list["ExerciseAnswer"]] = relationship(back_populates="attempt", cascade="all, delete-orphan")


class ExerciseAnswer(Base):
    __tablename__ = "exercise_answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    attempt_id: Mapped[int] = mapped_column(ForeignKey("exercise_attempts.id", ondelete="CASCADE"), index=True)
    user_card_id: Mapped[int] = mapped_column(ForeignKey("user_cards.id", ondelete="CASCADE"), index=True)
    question_type: Mapped[str] = mapped_column(String(24), default="multiple_choice", nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    prompt_text: Mapped[str] = mapped_column(Text, default="", nullable=False)
    correct_answer: Mapped[str] = mapped_column(Text, nullable=False)
    user_answer: Mapped[str] = mapped_column(Text, default="")
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)

    attempt: Mapped[ExerciseAttempt] = relationship(back_populates="answers")


Index("ix_user_decks_user_source", UserDeck.user_id, UserDeck.source_library_deck_id)
Index("ix_review_logs_user_date", ReviewLog.user_id, ReviewLog.reviewed_at)
Index("ix_exercise_attempts_user_date", ExerciseAttempt.user_id, ExerciseAttempt.created_at)
