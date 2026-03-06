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
};

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export type MeResponse = {
  id: number;
  email: string;
  full_name: string;
  created_at: string;
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

export type ExerciseSubmitResponse = {
  attempt_id: number;
  deck_id: number;
  total_questions: number;
  correct_answers: number;
  score_percent: number;
  answers: {
    user_card_id: number;
    question_type: ExerciseQuestionType;
    question_text: string;
    prompt_text: string;
    correct_answer: string;
    user_answer: string;
    is_correct: boolean;
  }[];
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

export type ReportDetailed = {
  range_days: number;
  deck_breakdown: {
    deck_id: number;
    deck_title: string;
    total_cards: number;
    due_cards: number;
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

export const authStorage = {
  getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
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

  async getLibraryDecks(params?: { q?: string; level?: string; topic?: string }) {
    const { data } = await http.get<LibraryDeck[]>("/library/decks", { params });
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

  async startExercise(deckId: number, questionCount = 6) {
    const { data } = await http.post<ExerciseStartResponse>("/study/exercise/start", {
      deck_id: deckId,
      question_count: questionCount,
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
