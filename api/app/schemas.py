from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=6, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    created_at: datetime


class RefreshRequest(BaseModel):
    refresh_token: str


class LibraryDeckCardPreview(BaseModel):
    id: int
    front_text: str
    back_text: str


class LibraryDeckOut(BaseModel):
    id: int
    title: str
    description: str
    level: str
    topic: str
    tags: str
    estimated_minutes: int
    card_count: int


class LibraryDeckDetail(LibraryDeckOut):
    cards_preview: list[LibraryDeckCardPreview]


class InstallDeckResponse(BaseModel):
    user_deck_id: int
    installed_cards: int
    already_installed: bool = False


class UserDeckOut(BaseModel):
    id: int
    source_library_deck_id: int | None = None
    title: str
    description: str
    level: str
    topic: str
    total_cards: int
    due_cards: int


StudySessionMode = Literal["due", "practice"]
StudySessionStartMode = Literal["mixed", "due", "practice"]


class StudySessionStartRequest(BaseModel):
    deck_id: int
    limit: int = Field(default=20, ge=1, le=100)
    mode: StudySessionStartMode = "mixed"


class StudyCardOut(BaseModel):
    user_card_id: int
    front_text: str
    back_text: str
    example_sentence: str
    phonetic: str


class StudySessionStartResponse(BaseModel):
    deck_id: int
    total_due: int
    session_mode: StudySessionMode
    cards: list[StudyCardOut]


RatingLiteral = Literal["again", "hard", "good", "easy"]


class ReviewRequest(BaseModel):
    user_card_id: int
    rating: RatingLiteral


class ReviewResponse(BaseModel):
    user_card_id: int
    rating: RatingLiteral
    next_due_at: datetime
    interval_days: int
    repetitions: int
    ease_factor: float


class DailyActivityItem(BaseModel):
    date: str
    reviews: int
    accuracy: float


class ExerciseSummary(BaseModel):
    total_attempts: int
    average_score_percent: float
    best_score_percent: float
    latest_score_percent: float | None = None


class ReportOverview(BaseModel):
    range_days: int
    total_reviews: int
    correct_reviews: int
    accuracy_percent: float
    streak_days: int
    due_cards: int
    total_cards: int
    exercise_attempts: int
    exercise_average_score: float
    daily_activity: list[DailyActivityItem]


ExerciseQuestionType = Literal["multiple_choice", "hard_fill"]


class ExerciseQuestion(BaseModel):
    user_card_id: int
    question_type: ExerciseQuestionType
    question_text: str
    prompt_text: str
    options: list[str] = []
    answer_mask: str | None = None


class ExerciseStartRequest(BaseModel):
    deck_id: int
    question_count: int = Field(default=6, ge=4, le=20)


class ExerciseStartResponse(BaseModel):
    deck_id: int
    deck_title: str
    questions: list[ExerciseQuestion]


class ExerciseAnswerIn(BaseModel):
    user_card_id: int
    question_type: ExerciseQuestionType
    answer: str


class ExerciseSubmitRequest(BaseModel):
    deck_id: int
    answers: list[ExerciseAnswerIn]


class ExerciseHintRequest(BaseModel):
    deck_id: int
    user_card_id: int
    question_type: ExerciseQuestionType
    question_text: str
    prompt_text: str
    options: list[str] = []
    answer_mask: str | None = None
    user_answer: str | None = None


class ExerciseHintResponse(BaseModel):
    hint: str
    source: Literal["ai", "fallback"] = "fallback"


class ExerciseAnswerResult(BaseModel):
    user_card_id: int
    question_type: ExerciseQuestionType
    question_text: str
    prompt_text: str
    correct_answer: str
    user_answer: str
    is_correct: bool


class ExerciseSubmitResponse(BaseModel):
    attempt_id: int
    deck_id: int
    total_questions: int
    correct_answers: int
    score_percent: float
    answers: list[ExerciseAnswerResult]


class ExerciseAttemptOut(BaseModel):
    id: int
    user_deck_id: int
    total_questions: int
    correct_answers: int
    score_percent: float
    created_at: datetime


class ExerciseHistoryResponse(BaseModel):
    attempts: list[ExerciseAttemptOut]
    summary: ExerciseSummary


class DeckDetailReportItem(BaseModel):
    deck_id: int
    deck_title: str
    total_cards: int
    due_cards: int
    review_count: int
    correct_count: int
    accuracy_percent: float
    exercise_attempts: int
    exercise_average_score: float


class RatingBreakdownItem(BaseModel):
    rating: RatingLiteral
    count: int


class ExerciseTypeBreakdownItem(BaseModel):
    question_type: ExerciseQuestionType
    attempts: int
    correct: int
    accuracy_percent: float


class RecentExerciseReportItem(BaseModel):
    attempt_id: int
    deck_id: int
    deck_title: str
    score_percent: float
    correct_answers: int
    total_questions: int
    created_at: datetime


class WeakCardReportItem(BaseModel):
    question_text: str
    correct_answer: str
    wrong_count: int


class ReportDetailedResponse(BaseModel):
    range_days: int
    deck_breakdown: list[DeckDetailReportItem]
    rating_breakdown: list[RatingBreakdownItem]
    exercise_type_breakdown: list[ExerciseTypeBreakdownItem]
    recent_exercises: list[RecentExerciseReportItem]
    weak_cards: list[WeakCardReportItem]
