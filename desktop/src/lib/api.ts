import axios, { AxiosError } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const ACCESS_TOKEN_KEY = "flashcard.accessToken";
const REFRESH_TOKEN_KEY = "flashcard.refreshToken";

export type AuthPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = AuthPayload & {
  full_name: string;
  username?: string;
};

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export type MeResponse = {
  id: number;
  email: string;
  username: string;
  full_name: string;
  bio?: string | null;
  auth_provider: string;
  avatar_url?: string | null;
  avatar_seed: string;
  daily_goal_reviews: number;
  created_at: string;
};

export type UpdateProfilePayload = {
  full_name?: string;
  email?: string;
  username?: string;
  bio?: string;
  avatar_seed?: string;
  daily_goal_reviews?: number;
};

export type ChangePasswordPayload = {
  current_password: string;
  new_password: string;
};

export type GoogleLoginPayload = {
  id_token: string;
};

export type LibraryDeck = {
  id: number;
  title: string;
  description: string;
  level: string;
  topic: string;
  tags: string;
  estimated_minutes: number;
  card_count: number;
};

export type InstallDeckResponse = {
  user_deck_id: number;
  installed_cards: number;
  already_installed: boolean;
};

export type UserDeck = {
  id: number;
  source_library_deck_id?: number | null;
  title: string;
  description: string;
  level: string;
  topic: string;
  total_cards: number;
  due_cards: number;
};

export type StudyMode = "mixed" | "due" | "practice";

export type StudyCard = {
  user_card_id: number;
  front_text: string;
  back_text: string;
  example_sentence: string;
  phonetic: string;
};

export type StudySessionResponse = {
  deck_id: number;
  total_due: number;
  session_mode: "due" | "practice";
  cards: StudyCard[];
};

export type ReviewRating = "again" | "hard" | "good" | "easy";

export type DailyActivity = {
  date: string;
  reviews: number;
  accuracy: number;
};

export type ReportOverview = {
  range_days: number;
  total_reviews: number;
  correct_reviews: number;
  accuracy_percent: number;
  streak_days: number;
  due_cards: number;
  total_cards: number;
  study_sessions: number;
  exercise_attempts: number;
  exercise_average_score: number;
  daily_activity: DailyActivity[];
};

export type ExerciseQuestionType = "multiple_choice" | "hard_fill";

export type ExerciseQuestion = {
  user_card_id: number;
  question_type: ExerciseQuestionType;
  question_text: string;
  prompt_text: string;
  options: string[];
  answer_mask?: string | null;
};

export type ExerciseStartResponse = {
  deck_id: number;
  deck_title: string;
  questions: ExerciseQuestion[];
};

export type ExerciseAnswerIn = {
  user_card_id: number;
  question_type: ExerciseQuestionType;
  answer: string;
};

export type ExerciseAnswerResult = {
  user_card_id: number;
  question_type: ExerciseQuestionType;
  question_text: string;
  prompt_text: string;
  correct_answer: string;
  user_answer: string;
  is_correct: boolean;
};

export type ExerciseSubmitResponse = {
  attempt_id: number;
  deck_id: number;
  total_questions: number;
  correct_answers: number;
  score_percent: number;
  answers: ExerciseAnswerResult[];
};

export type ExerciseCheckResponse = {
  deck_id: number;
  total_questions: number;
  correct_answers: number;
  score_percent: number;
  answer: ExerciseAnswerResult;
};

export type ExerciseHintResponse = {
  hint: string;
  source: "ai" | "fallback";
};

export type ExerciseHistory = {
  attempts: {
    id: number;
    user_deck_id: number;
    total_questions: number;
    correct_answers: number;
    score_percent: number;
    created_at: string;
  }[];
  summary: {
    total_attempts: number;
    average_score_percent: number;
    best_score_percent: number;
    latest_score_percent?: number | null;
  };
};

export type StreakDailyItem = {
  date: string;
  study_sessions: number;
  review_count: number;
  exercise_attempts: number;
  total_lessons: number;
  goal_reached: boolean;
};

export type StreakReportResponse = {
  range_days: number;
  current_streak_days: number;
  today_study_sessions: number;
  today_review_count: number;
  today_exercise_attempts: number;
  today_total_lessons: number;
  daily_goal_reviews: number;
  daily_goal_progress_percent: number;
  daily_goal_reached: boolean;
  weekly_total_lessons: number;
  daily_activity: StreakDailyItem[];
};

export type RetentionWeekItem = {
  week_start: string;
  reviewed_cards: number;
  retained_cards: number;
  retention_percent: number;
};

export type RetentionReportResponse = {
  range_weeks: number;
  overall_retention_percent: number;
  weekly: RetentionWeekItem[];
};

export type UserPublicProfile = {
  id: number;
  username: string;
  full_name: string;
  bio?: string | null;
  avatar_url?: string | null;
  avatar_seed: string;
  is_friend: boolean;
  requested_by_me: boolean;
  requested_me: boolean;
};

export type PublicStreakActivityItem = {
  date: string;
  study_sessions: number;
  review_count: number;
  exercise_attempts: number;
  total_lessons: number;
};

export type UserStudyOverview = {
  total_decks: number;
  total_cards: number;
  reviewed_cards: number;
  due_cards: number;
  total_reviews_30d: number;
  accuracy_percent_30d: number;
  study_sessions_30d: number;
  exercise_attempts_30d: number;
  current_streak_days: number;
};

export type UserPublicProfileDetailResponse = {
  user: UserPublicProfile;
  overview: UserStudyOverview;
  streak_range_days: number;
  streak_activity: PublicStreakActivityItem[];
};

export type FriendshipActionResponse = {
  ok: boolean;
  status: string;
};

export type FeedPostOut = {
  id: number;
  author_id: number;
  author_username: string;
  author_full_name: string;
  author_avatar_url?: string | null;
  author_avatar_seed: string;
  user_deck_id: number;
  deck_title: string;
  caption: string;
  visibility: string;
  created_at: string;
  author_progress_reviewed: number;
  author_progress_total_cards: number;
  author_progress_percent: number;
  viewer_has_started: boolean;
  viewer_reviewed: number;
  viewer_total_cards: number;
  reaction_count: number;
  comment_count: number;
  viewer_liked: boolean;
};

export type FeedCommentOut = {
  id: number;
  user_id: number;
  username: string;
  full_name: string;
  avatar_url?: string | null;
  avatar_seed: string;
  content: string;
  created_at: string;
};

export type MessageOut = {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  is_read: boolean;
  created_at: string;
};

export type ConversationPreview = {
  user_id: number;
  username: string;
  full_name: string;
  avatar_url?: string | null;
  avatar_seed: string;
  last_message: string;
  last_message_at: string;
};

export type ExerciseAttemptReportItem = {
  attempt_id: number;
  deck_id: number;
  deck_title: string;
  score_percent: number;
  correct_answers: number;
  total_questions: number;
  created_at: string;
};

export type ExerciseAttemptAnswerReportItem = {
  user_card_id: number;
  question_type: ExerciseQuestionType;
  question_text: string;
  prompt_text: string;
  correct_answer: string;
  user_answer: string;
  is_correct: boolean;
};

export type ExerciseAttemptDetail = {
  attempt_id: number;
  deck_id: number;
  deck_title: string;
  score_percent: number;
  correct_answers: number;
  total_questions: number;
  created_at: string;
  answers: ExerciseAttemptAnswerReportItem[];
};

export type ReportDetailed = {
  range_days: number;
  deck_breakdown: {
    deck_id: number;
    deck_title: string;
    total_cards: number;
    due_cards: number;
    study_sessions: number;
    review_count: number;
    correct_count: number;
    accuracy_percent: number;
    exercise_attempts: number;
    exercise_average_score: number;
  }[];
  rating_breakdown: {
    rating: ReviewRating;
    count: number;
  }[];
  exercise_type_breakdown: {
    question_type: ExerciseQuestionType;
    attempts: number;
    correct: number;
    accuracy_percent: number;
  }[];
  recent_exercises: {
    attempt_id: number;
    deck_id: number;
    deck_title: string;
    score_percent: number;
    correct_answers: number;
    total_questions: number;
    created_at: string;
  }[];
  weak_cards: {
    question_text: string;
    correct_answer: string;
    wrong_count: number;
  }[];
};

const normalizeStoredToken = (value: string | null): string | null => {
  if (!value) return null;
  const token = value.trim();
  if (!token || token === "undefined" || token === "null") return null;
  return token;
};

export const authStorage = {
  getAccessToken() {
    const token = normalizeStoredToken(localStorage.getItem(ACCESS_TOKEN_KEY));
    if (!token) {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
    return token;
  },
  getRefreshToken() {
    const token = normalizeStoredToken(localStorage.getItem(REFRESH_TOKEN_KEY));
    if (!token) {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
    return token;
  },
  setTokens(tokens: TokenResponse) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  },
  clear() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

http.interceptors.request.use((config) => {
  const token = authStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  async register(payload: RegisterPayload): Promise<TokenResponse> {
    const { data } = await http.post<TokenResponse>("/auth/register", payload);
    return data;
  },

  async login(payload: AuthPayload): Promise<TokenResponse> {
    const { data } = await http.post<TokenResponse>("/auth/login", payload);
    return data;
  },

  async me(): Promise<MeResponse> {
    const { data } = await http.get<MeResponse>("/auth/me");
    return data;
  },

  async refresh(refreshToken: string): Promise<TokenResponse> {
    const { data } = await http.post<TokenResponse>("/auth/refresh", {
      refresh_token: refreshToken,
    });
    return data;
  },

  async updateMe(payload: UpdateProfilePayload): Promise<MeResponse> {
    const { data } = await http.patch<MeResponse>("/auth/me", payload);
    return data;
  },

  async changePassword(payload: ChangePasswordPayload): Promise<{ ok: boolean }> {
    const { data } = await http.post<{ ok: boolean }>("/auth/change-password", payload);
    return data;
  },

  async loginWithGoogle(payload: GoogleLoginPayload): Promise<TokenResponse> {
    const { data } = await http.post<TokenResponse>("/auth/google", payload);
    return data;
  },

  async googleAuthorize(redirectUri: string, state: string, codeChallenge: string) {
    const { data } = await http.post<{ authorization_url: string }>("/auth/google/authorize", {
      redirect_uri: redirectUri,
      state,
      code_challenge: codeChallenge,
    });
    return data;
  },

  async googleCallback(code: string, state: string, codeVerifier: string, redirectUri: string) {
    const { data } = await http.post<TokenResponse>("/auth/google/callback", {
      code,
      state,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
    });
    return data;
  },

  async getLibraryDecks(params?: { q?: string; level?: string; topic?: string; card_levels?: string }) {
    const { data } = await http.get<LibraryDeck[]>("/library/decks", { params });
    return data;
  },

  async getLibraryCardLevels() {
    const { data } = await http.get<string[]>("/library/card-levels");
    return data;
  },

  async installLibraryDeck(deckId: number) {
    const { data } = await http.post<InstallDeckResponse>(`/library/decks/${deckId}/install`);
    return data;
  },

  async getMyDecks() {
    const { data } = await http.get<UserDeck[]>("/me/decks");
    return data;
  },

  async startStudySession(deckId: number, limit = 20, mode: StudyMode = "mixed") {
    const { data } = await http.post<StudySessionResponse>("/study/session/start", {
      deck_id: deckId,
      limit,
      mode,
    });
    return data;
  },

  async reviewCard(userCardId: number, rating: ReviewRating) {
    const { data } = await http.post("/study/review", {
      user_card_id: userCardId,
      rating,
    });
    return data;
  },

  async reportsOverview(days = 30) {
    const { data } = await http.get<ReportOverview>("/reports/overview", {
      params: { days },
    });
    return data;
  },

  async reportsDetailed(days = 30) {
    const { data } = await http.get<ReportDetailed>("/reports/detailed", {
      params: { days },
    });
    return data;
  },

  async reportsStreak(days = 30) {
    const { data } = await http.get<StreakReportResponse>("/reports/streak", {
      params: { days },
    });
    return data;
  },

  async reportsRetention(weeks = 8) {
    const { data } = await http.get<RetentionReportResponse>("/reports/retention", {
      params: { weeks },
    });
    return data;
  },

  async searchUsers(q: string) {
    const { data } = await http.get<UserPublicProfile[]>("/social/users/search", { params: { q } });
    return data;
  },

  async getFriends() {
    const { data } = await http.get<UserPublicProfile[]>("/social/friends");
    return data;
  },

  async getUserPublicProfile(userId: number, days = 30) {
    const { data } = await http.get<UserPublicProfileDetailResponse>(`/social/users/${userId}/profile`, {
      params: { days },
    });
    return data;
  },

  async sendFriendRequest(userId: number) {
    const { data } = await http.post<FriendshipActionResponse>("/social/friends/request", {
      user_id: userId,
    });
    return data;
  },

  async acceptFriendRequest(userId: number) {
    const { data } = await http.post<FriendshipActionResponse>("/social/friends/accept", {
      user_id: userId,
    });
    return data;
  },

  async removeFriend(userId: number) {
    const { data } = await http.post<FriendshipActionResponse>("/social/friends/remove", {
      user_id: userId,
    });
    return data;
  },

  async getFeed() {
    const { data } = await http.get<FeedPostOut[]>("/social/feed");
    return data;
  },

  async createFeedPost(payload: { user_deck_id: number; caption?: string; visibility?: string }) {
    const { data } = await http.post<FeedPostOut>("/social/feed/posts", payload);
    return data;
  },

  async togglePostReaction(postId: number) {
    const { data } = await http.post<{ ok: boolean; liked: boolean }>(`/social/feed/posts/${postId}/react`);
    return data;
  },

  async getPostComments(postId: number) {
    const { data } = await http.get<FeedCommentOut[]>(`/social/feed/posts/${postId}/comments`);
    return data;
  },

  async createPostComment(postId: number, content: string) {
    const { data } = await http.post<FeedCommentOut>(`/social/feed/posts/${postId}/comments`, {
      post_id: postId,
      content,
    });
    return data;
  },

  async getConversations() {
    const { data } = await http.get<ConversationPreview[]>("/messages/conversations");
    return data;
  },

  async getChatHistory(userId: number) {
    const { data } = await http.get<MessageOut[]>(`/messages/${userId}`);
    return data;
  },

  async sendMessage(toUserId: number, content: string) {
    const { data } = await http.post<MessageOut>("/messages/send", {
      to_user_id: toUserId,
      content,
    });
    return data;
  },

  async reportExerciseAttempts(limit = 50, deckId?: number) {
    const { data } = await http.get<ExerciseAttemptReportItem[]>("/reports/exercise-attempts", {
      params: { limit, deck_id: deckId },
    });
    return data;
  },

  async reportExerciseAttemptDetail(attemptId: number) {
    const { data } = await http.get<ExerciseAttemptDetail>(`/reports/exercise-attempts/${attemptId}`);
    return data;
  },

  async resetDeckProgress(deckId: number) {
    const { data } = await http.post<{
      deck_id: number;
      reset_cards: number;
    }>(`/me/decks/${deckId}/reset`, { confirm_text: "RESET" });
    return data;
  },

  async deleteDeck(deckId: number) {
    const { data } = await http.delete<{
      deck_id: number;
      deleted_cards: number;
    }>(`/me/decks/${deckId}`);
    return data;
  },

  async startExercise(deckId: number, questionCount = 6) {
    const { data } = await http.post<ExerciseStartResponse>("/study/exercise/start", {
      deck_id: deckId,
      question_count: questionCount,
    });
    return data;
  },

  async checkExerciseAnswer(deckId: number, answer: ExerciseAnswerIn) {
    const { data } = await http.post<ExerciseCheckResponse>("/study/exercise/check", {
      deck_id: deckId,
      answer,
    });
    return data;
  },

  async submitExercise(deckId: number, answers: ExerciseAnswerIn[]) {
    const { data } = await http.post<ExerciseSubmitResponse>("/study/exercise/submit", {
      deck_id: deckId,
      answers,
    });
    return data;
  },

  async exerciseHint(payload: {
    deck_id: number;
    user_card_id: number;
    question_type: ExerciseQuestionType;
    question_text: string;
    prompt_text: string;
    options?: string[];
    answer_mask?: string | null;
    user_answer?: string;
  }) {
    const { data } = await http.post<ExerciseHintResponse>("/study/exercise/hint", payload);
    return data;
  },

  async exerciseHistory(deckId: number, limit = 20) {
    const { data } = await http.get<ExerciseHistory>(`/study/exercise/history/${deckId}`, {
      params: { limit },
    });
    return data;
  },
};

export const getApiError = (error: unknown, fallback = "Có lỗi xảy ra") => {
  if (axios.isAxiosError(error)) {
    const axErr = error as AxiosError<{ detail?: string }>;
    if (typeof axErr.response?.data?.detail === "string") {
      return axErr.response.data.detail;
    }
    if (axErr.message) return axErr.message;
  }

  if (error instanceof Error) return error.message;
  return fallback;
};
