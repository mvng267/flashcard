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
    username: str | None = Field(default=None, min_length=3, max_length=40)
    password: str = Field(min_length=6, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    username: str
    full_name: str
    bio: str | None = None
    auth_provider: str
    avatar_url: str | None = None
    avatar_seed: str
    daily_goal_reviews: int
    created_at: datetime


class UserProfileUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    email: EmailStr | None = None
    username: str | None = Field(default=None, min_length=3, max_length=40)
    bio: str | None = Field(default=None, max_length=300)
    avatar_seed: str | None = Field(default=None, min_length=1, max_length=120)
    daily_goal_reviews: int | None = Field(default=None, ge=1, le=500)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=6, max_length=128)
    new_password: str = Field(min_length=6, max_length=128)


class GoogleLoginRequest(BaseModel):
    id_token: str = Field(min_length=10)


class GoogleAuthorizeRequest(BaseModel):
    redirect_uri: str
    code_challenge: str = Field(min_length=30)
    state: str = Field(min_length=6, max_length=256)


class GoogleAuthorizeResponse(BaseModel):
    authorization_url: str


class GoogleCallbackRequest(BaseModel):
    code: str
    code_verifier: str = Field(min_length=30)
    state: str = Field(min_length=6, max_length=256)
    redirect_uri: str


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


class DeckResetProgressRequest(BaseModel):
    confirm_text: str


class DeckResetProgressResponse(BaseModel):
    deck_id: int
    reset_cards: int
    deleted_reviews: int
    deleted_sessions: int
    deleted_exercise_attempts: int


class DeckDeleteResponse(BaseModel):
    deck_id: int
    deleted_cards: int
    deleted_reviews: int
    deleted_sessions: int
    deleted_exercise_attempts: int


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
    study_sessions: int
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


class ExerciseCheckRequest(BaseModel):
    deck_id: int
    answer: ExerciseAnswerIn


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


class ExerciseCheckResponse(BaseModel):
    deck_id: int
    total_questions: int = 1
    correct_answers: int
    score_percent: float
    answer: ExerciseAnswerResult


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
    study_sessions: int
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


class ExerciseAttemptReportItem(BaseModel):
    attempt_id: int
    deck_id: int
    deck_title: str
    score_percent: float
    correct_answers: int
    total_questions: int
    created_at: datetime


class ExerciseAttemptAnswerReportItem(BaseModel):
    user_card_id: int
    question_type: ExerciseQuestionType
    question_text: str
    prompt_text: str
    correct_answer: str
    user_answer: str
    is_correct: bool


class ExerciseAttemptDetailReportResponse(BaseModel):
    attempt_id: int
    deck_id: int
    deck_title: str
    score_percent: float
    correct_answers: int
    total_questions: int
    created_at: datetime
    answers: list[ExerciseAttemptAnswerReportItem]


class RetentionWeekItem(BaseModel):
    week_start: str
    reviewed_cards: int
    retained_cards: int
    retention_percent: float


class RetentionReportResponse(BaseModel):
    range_weeks: int
    overall_retention_percent: float
    weekly: list[RetentionWeekItem]


class StreakDailyItem(BaseModel):
    date: str
    study_sessions: int
    review_count: int
    exercise_attempts: int
    total_lessons: int
    goal_reached: bool


class StreakReportResponse(BaseModel):
    range_days: int
    current_streak_days: int
    today_study_sessions: int
    today_review_count: int
    today_exercise_attempts: int
    today_total_lessons: int
    daily_goal_reviews: int
    daily_goal_progress_percent: float
    daily_goal_reached: bool
    weekly_total_lessons: int
    daily_activity: list[StreakDailyItem]


class UserPublicProfile(BaseModel):
    id: int
    username: str
    full_name: str
    bio: str | None = None
    avatar_url: str | None = None
    avatar_seed: str
    is_friend: bool = False
    requested_by_me: bool = False
    requested_me: bool = False


class PublicStreakActivityItem(BaseModel):
    date: str
    study_sessions: int
    review_count: int
    exercise_attempts: int
    total_lessons: int


class UserStudyOverview(BaseModel):
    total_decks: int
    total_cards: int
    reviewed_cards: int
    due_cards: int
    total_reviews_30d: int
    accuracy_percent_30d: float
    study_sessions_30d: int
    exercise_attempts_30d: int
    current_streak_days: int


class UserPublicProfileDetailResponse(BaseModel):
    user: UserPublicProfile
    overview: UserStudyOverview
    streak_range_days: int
    streak_activity: list[PublicStreakActivityItem]


class FriendshipActionRequest(BaseModel):
    user_id: int


class FriendshipActionResponse(BaseModel):
    ok: bool
    status: str


class FeedPostCreateRequest(BaseModel):
    user_deck_id: int
    caption: str = Field(default="", max_length=500)
    visibility: Literal["friends", "public"] = "friends"


class FeedCommentOut(BaseModel):
    id: int
    user_id: int
    username: str
    full_name: str
    avatar_url: str | None = None
    avatar_seed: str
    content: str
    created_at: datetime


class FeedPostOut(BaseModel):
    id: int
    author_id: int
    author_username: str
    author_full_name: str
    author_avatar_url: str | None = None
    author_avatar_seed: str
    user_deck_id: int
    deck_title: str
    caption: str
    visibility: str
    created_at: datetime
    author_progress_reviewed: int
    author_progress_total_cards: int
    author_progress_percent: float
    viewer_has_started: bool
    viewer_reviewed: int
    viewer_total_cards: int
    reaction_count: int
    comment_count: int
    viewer_liked: bool


class FeedCommentCreateRequest(BaseModel):
    post_id: int
    content: str = Field(min_length=1, max_length=500)


class FeedReactionToggleRequest(BaseModel):
    post_id: int


class MessageSendRequest(BaseModel):
    to_user_id: int
    content: str = Field(min_length=1, max_length=5000)


class MessageOut(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    content: str
    is_read: bool
    created_at: datetime


class ConversationPreview(BaseModel):
    user_id: int
    username: str
    full_name: str
    avatar_url: str | None = None
    avatar_seed: str
    last_message: str
    last_message_at: datetime
