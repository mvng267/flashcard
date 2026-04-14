import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { 
  ArrowLeft, 
  RotateCcw, 
  Volume2, 
  Settings2, 
  X, 
  Play, 
  ChevronRight, 
  CheckCircle2,
  Zap,
  VolumeX
} from "lucide-react";

import {
  api,
  getApiError,
  type ExerciseAnswerResult,
  type ExerciseQuestion,
  type ExerciseQuestionType,
  type ReviewRating,
  type StudyCard,
  type StudyMode,
} from "../lib/api";

type VoiceMode = "us" | "uk";
type SpeedMode = "slow" | "normal" | "fast";
type StudyStep = "study" | "exercise" | "exercise-result";

type ExerciseSingleResult = {
  answer: ExerciseAnswerResult;
  checked: boolean;
};

type ExerciseAnswerState = {
  user_card_id: number;
  question_type: ExerciseQuestionType;
  answer: string;
};

const buttonMap: Record<
  ReviewRating,
  { label: string; hint: string; sub: string; className: string; icon: React.ReactNode }
> = {
  again: {
    label: "Làm lại",
    hint: "Quên hoặc sai hoàn toàn",
    sub: "Ôn lại ngay (<10 phút)",
    className: "border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/15",
    icon: <RotateCcw size={18} />,
  },
  hard: {
    label: "Khó",
    hint: "Nhớ mơ hồ, cần củng cố",
    sub: "Ôn lại sau ~2 ngày",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/15",
    icon: <Zap size={18} />,
  },
  good: {
    label: "Được",
    hint: "Nhớ ổn, vẫn cần nhắc",
    sub: "Ôn lại sau ~4 ngày",
    className: "border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/15",
    icon: <CheckCircle2 size={18} />,
  },
  easy: {
    label: "Dễ",
    hint: "Nhớ chắc, trả lời nhanh",
    sub: "Ôn lại sau ~7 ngày",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15",
    icon: <Zap size={18} />,
  },
};

const speedRateMap: Record<SpeedMode, number> = {
  slow: 0.78,
  normal: 0.95,
  fast: 1.12,
};

// ... (keep pickEnglishVoice, vietnameseDiacriticsRegex, inferCardSides as is)

const pickEnglishVoice = (voices: SpeechSynthesisVoice[], voiceMode: VoiceMode): SpeechSynthesisVoice | null => {
  if (!voices.length) return null;

  const preferredByMode: Record<VoiceMode, string[]> = {
    us: ["Samantha", "Alex", "Fred", "Google US English"],
    uk: ["Daniel", "Serena", "Google UK English Female", "Google UK English Male"],
  };

  for (const name of preferredByMode[voiceMode]) {
    const found = voices.find((v) => v.name.toLowerCase().includes(name.toLowerCase()));
    if (found) return found;
  }

  const langPrefix = voiceMode === "uk" ? "en-gb" : "en-us";
  const byLang = voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
  if (byLang) return byLang;

  return voices.find((v) => v.lang.toLowerCase().startsWith("en")) ?? null;
};

const vietnameseDiacriticsRegex = /[ăâđêôơưáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i;

const inferCardSides = (card?: StudyCard | null) => {
  if (!card) {
    return {
      englishText: "",
      vietnameseText: "",
      swapped: false,
    };
  }

  const front = card.front_text?.trim() || "";
  const back = card.back_text?.trim() || "";

  const frontLooksVi = vietnameseDiacriticsRegex.test(front);
  const backLooksVi = vietnameseDiacriticsRegex.test(back);

  if (frontLooksVi && !backLooksVi) {
    return {
      englishText: back,
      vietnameseText: front,
      swapped: true,
    };
  }

  return {
    englishText: front,
    vietnameseText: back,
    swapped: false,
  };
};

const Study: React.FC = () => {
  const navigate = useNavigate();
  const { deckId } = useParams();
  const [searchParams] = useSearchParams();

  const parsedDeckId = Number(deckId);

  const [step, setStep] = useState<StudyStep>("study");
  const [studyMode, setStudyMode] = useState<StudyMode>("mixed");
  const [sessionModeLabel, setSessionModeLabel] = useState<string>("mixed");

  const [cards, setCards] = useState<StudyCard[]>([]);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const [voiceMode, setVoiceMode] = useState<VoiceMode>("us");
  const [speedMode, setSpeedMode] = useState<SpeedMode>("normal");
  const [autoPlay, setAutoPlay] = useState(true);
  const [showVoiceSheet, setShowVoiceSheet] = useState(false);

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [activeVoiceLabel, setActiveVoiceLabel] = useState("system default");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const [exerciseLoading, setExerciseLoading] = useState(false);
  const [exerciseError, setExerciseError] = useState<string | null>(null);
  const [exerciseQuestions, setExerciseQuestions] = useState<ExerciseQuestion[]>([]);
  const [exerciseAnswers, setExerciseAnswers] = useState<ExerciseAnswerState[]>([]);
  const [exerciseHints, setExerciseHints] = useState<Record<number, { text: string; source: "ai" | "fallback" }>>({});
  const [hintLoading, setHintLoading] = useState<Record<number, boolean>>({});
  const [exerciseResult, setExerciseResult] = useState<{
    score_percent: number;
    correct_answers: number;
    total_questions: number;
  } | null>(null);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [exerciseChecked, setExerciseChecked] = useState<Record<number, ExerciseSingleResult>>({});
  const [exerciseHistorySummary, setExerciseHistorySummary] = useState<{
    total_attempts: number;
    average_score_percent: number;
    best_score_percent: number;
    latest_score_percent?: number | null;
  } | null>(null);

  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const studyCardRef = useRef<HTMLDivElement | null>(null);

  const currentCard = cards[index];
  const currentExerciseQuestion = exerciseQuestions[exerciseIndex];
  const cardSides = useMemo(() => inferCardSides(currentCard), [currentCard]);
  const progress = useMemo(() => (cards.length ? ((index + 1) / cards.length) * 100 : 0), [index, cards.length]);
  const exerciseProgress = useMemo(
    () => (exerciseQuestions.length ? ((exerciseIndex + 1) / exerciseQuestions.length) * 100 : 0),
    [exerciseIndex, exerciseQuestions.length],
  );
  const checkedCount = useMemo(
    () => Object.values(exerciseChecked).filter((item) => item.checked).length,
    [exerciseChecked],
  );
  const correctCheckedCount = useMemo(
    () => Object.values(exerciseChecked).filter((item) => item.checked && item.answer.is_correct).length,
    [exerciseChecked],
  );
  const allExerciseChecked = useMemo(
    () => exerciseQuestions.length > 0 && checkedCount === exerciseQuestions.length,
    [checkedCount, exerciseQuestions.length],
  );
  const currentExerciseResult = currentExerciseQuestion
    ? exerciseChecked[currentExerciseQuestion.user_card_id]
    : undefined;

  const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  const loadStudySession = useCallback(
    async (mode: StudyMode = "mixed") => {
      if (!parsedDeckId || Number.isNaN(parsedDeckId)) {
        setSessionError("Deck không hợp lệ");
        setSessionLoading(false);
        return;
      }

      try {
        setSessionLoading(true);
        setSessionError(null);
        setStep("study");

        const result = await api.startStudySession(parsedDeckId, 20, mode);
        setCards(result.cards);
        setIndex(0);
        setRevealed(false);
        setSessionModeLabel(result.session_mode === "due" ? "due" : "practice");
      } catch (error) {
        setSessionError(getApiError(error, "Không tải được phiên học"));
      } finally {
        setSessionLoading(false);
      }
    },
    [parsedDeckId],
  );

  const startExercise = useCallback(async () => {
    if (!parsedDeckId || Number.isNaN(parsedDeckId)) return;

    try {
      setSessionLoading(false);
      setExerciseLoading(true);
      setExerciseError(null);
      setStep("exercise");

      const result = await api.startExercise(parsedDeckId, 6);
      setExerciseQuestions(result.questions);
      setExerciseAnswers(
        result.questions.map((q) => ({
          user_card_id: q.user_card_id,
          question_type: q.question_type,
          answer: "",
        })),
      );
      setExerciseHints({});
      setHintLoading({});
      setExerciseResult(null);
      setExerciseIndex(0);
      setExerciseChecked({});

      try {
        const history = await api.exerciseHistory(parsedDeckId, 20);
        setExerciseHistorySummary(history.summary);
      } catch {
        setExerciseHistorySummary(null);
      }
    } catch (error) {
      const errMsg = getApiError(error, "Không tạo được bài tập");
      setExerciseError(errMsg);

      const lowerMsg = errMsg.toLowerCase();
      if (lowerMsg.includes("học flashcard trước") || lowerMsg.includes("chưa học")) {
        setStep("study");
        const nextMode: StudyMode = "due";
        setStudyMode(nextMode);
        void loadStudySession(nextMode);
      }
    } finally {
      setExerciseLoading(false);
    }
  }, [parsedDeckId, loadStudySession]);

  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (initialLoadDone.current) return;

    const modeParam = searchParams.get("mode");
    if (modeParam === "exercise") {
      void startExercise();
      initialLoadDone.current = true;
      return;
    }

    const normalizedMode: StudyMode = modeParam === "due" || modeParam === "practice" ? modeParam : "mixed";
    setStudyMode(normalizedMode);
    void loadStudySession(normalizedMode);
    initialLoadDone.current = true;
  }, [searchParams, loadStudySession, startExercise]);

  const stopSpeaking = useCallback(() => {
    if (!speechSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [speechSupported]);

  const speakWord = useCallback((textOverride?: string) => {
    if (!speechSupported) {
      setSpeechError("Thiết bị không hỗ trợ phát âm (TTS).");
      return;
    }

    if (!currentCard && !textOverride) return;

    setSpeechError(null);
    window.speechSynthesis.cancel();

    const textToSpeak = textOverride || cardSides.englishText || currentCard.front_text;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = voiceMode === "uk" ? "en-GB" : "en-US";
    
    // Auto-switch to VI if text looks Vietnamese and we're not explicitly speaking English
    if (vietnameseDiacriticsRegex.test(textToSpeak)) {
        utterance.lang = "vi-VN";
    }

    utterance.rate = speedRateMap[speedMode];
    utterance.pitch = 1;

    const availableVoices = window.speechSynthesis.getVoices();
    const selectedVoice = pickEnglishVoice(availableVoices.length ? availableVoices : voices, voiceMode);

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      setActiveVoiceLabel(`${selectedVoice.name} · ${selectedVoice.lang}`);
    } else {
      setActiveVoiceLabel("system default");
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeechError("Không phát âm được, thử lại giúp tao.");
    };

    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [cardSides.englishText, currentCard, speechSupported, speedMode, voiceMode, voices]);

  const rateCard = async (rating: ReviewRating) => {
    if (!currentCard) return;

    stopSpeaking();

    try {
      await api.reviewCard(currentCard.user_card_id, rating);
    } catch {
      // vẫn cho user học tiếp
    }

    if (index < cards.length - 1) {
      setIndex((prev) => prev + 1);
      setRevealed(false);
    } else {
      await startExercise();
    }
  };

  const submitExercise = async () => {
    if (!parsedDeckId || Number.isNaN(parsedDeckId)) return;

    try {
      setExerciseLoading(true);
      setExerciseError(null);

      const result = await api.submitExercise(parsedDeckId, exerciseAnswers);

      setExerciseResult({
        score_percent: result.score_percent,
        correct_answers: result.correct_answers,
        total_questions: result.total_questions,
      });
      setStep("exercise-result");

      try {
        const history = await api.exerciseHistory(parsedDeckId, 20);
        setExerciseHistorySummary(history.summary);
      } catch {
        setExerciseHistorySummary(null);
      }
    } catch (error) {
      setExerciseError(getApiError(error, "Nộp bài thất bại"));
    } finally {
      setExerciseLoading(false);
    }
  };

  const checkCurrentExercise = async () => {
    if (!parsedDeckId || Number.isNaN(parsedDeckId)) return;
    const question = exerciseQuestions[exerciseIndex];
    if (!question) return;

    const answer = exerciseAnswers.find((a) => a.user_card_id === question.user_card_id)?.answer || "";
    if (!answer.trim()) {
      setExerciseError("Bạn chưa nhập/chọn đáp án");
      return;
    }

    try {
      setExerciseLoading(true);
      setExerciseError(null);

      const result = await api.checkExerciseAnswer(parsedDeckId, {
        user_card_id: question.user_card_id,
        question_type: question.question_type,
        answer,
      });

      setExerciseChecked((prev) => ({
        ...prev,
        [question.user_card_id]: {
          checked: true,
          answer: result.answer,
        },
      }));
    } catch (error) {
      setExerciseError(getApiError(error, "Chấm câu thất bại"));
    } finally {
      setExerciseLoading(false);
    }
  };

  const requestHint = async (question: ExerciseQuestion) => {
    if (!parsedDeckId || Number.isNaN(parsedDeckId)) return;

    try {
      setHintLoading((prev) => ({ ...prev, [question.user_card_id]: true }));

      const answer = exerciseAnswers.find((a) => a.user_card_id === question.user_card_id)?.answer || "";
      const hint = await api.exerciseHint({
        deck_id: parsedDeckId,
        user_card_id: question.user_card_id,
        question_type: question.question_type,
        question_text: question.question_text,
        prompt_text: question.prompt_text,
        options: question.options,
        answer_mask: question.answer_mask,
        user_answer: answer,
      });

      setExerciseHints((prev) => ({
        ...prev,
        [question.user_card_id]: { text: hint.hint, source: hint.source },
      }));
    } catch (error) {
      setExerciseHints((prev) => ({
        ...prev,
        [question.user_card_id]: { text: getApiError(error, "Không lấy được gợi ý"), source: "fallback" },
      }));
    } finally {
      setHintLoading((prev) => ({ ...prev, [question.user_card_id]: false }));
    }
  };

  useEffect(() => {
    if (!speechSupported) return;

    const synth = window.speechSynthesis;
    const loadVoices = () => setVoices(synth.getVoices());

    loadVoices();
    synth.onvoiceschanged = loadVoices;

    return () => {
      synth.onvoiceschanged = null;
    };
  }, [speechSupported]);

  useEffect(() => {
    stopSpeaking();
    setSpeechError(null);

    if (!autoPlay || step !== "study") return;

    const timer = window.setTimeout(() => {
      speakWord();
    }, 120);

    return () => window.clearTimeout(timer);
  }, [index, autoPlay, speakWord, stopSpeaking, step]);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [stopSpeaking]);

  useEffect(() => {
    if (step !== "study") return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      const key = event.key.toLowerCase();

      if (event.code === "Space" || key === "f") {
        event.preventDefault();
        setRevealed((prev) => !prev);
        return;
      }

      if (!revealed && event.code === "Enter") {
        event.preventDefault();
        setRevealed(true);
        return;
      }

      if (!revealed) return;

      const map: Record<string, ReviewRating> = {
        "1": "again",
        "2": "hard",
        "3": "good",
        "4": "easy",
        a: "again",
        h: "hard",
        g: "good",
        e: "easy",
      };

      if (map[key] && currentCard) {
        event.preventDefault();
        void rateCard(map[key]);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [step, revealed, currentCard, rateCard]);

  useEffect(() => {
    if (step !== "exercise") return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTyping = tag === "input" || tag === "textarea";
      const key = event.key.toLowerCase();

      if (!currentExerciseQuestion) return;

      if (!isTyping && event.code === "ArrowLeft") {
        event.preventDefault();
        if (exerciseIndex > 0) setExerciseIndex((prev) => prev - 1);
        return;
      }

      if (!isTyping && event.code === "ArrowRight") {
        event.preventDefault();
        if (exerciseIndex < exerciseQuestions.length - 1) setExerciseIndex((prev) => prev + 1);
        return;
      }

      if (!isTyping && currentExerciseQuestion.question_type === "multiple_choice") {
        const idxMap: Record<string, number> = { "1": 0, "2": 1, "3": 2, "4": 3 };
        if (key in idxMap) {
          const option = currentExerciseQuestion.options[idxMap[key]];
          if (option) {
            event.preventDefault();
            setExerciseAnswers((prev) =>
              prev.map((item) =>
                item.user_card_id === currentExerciseQuestion.user_card_id ? { ...item, answer: option } : item,
              ),
            );
          }
          return;
        }
      }

      if (!isTyping && event.code === "Enter") {
        event.preventDefault();
        if (!currentExerciseResult?.checked) {
          void checkCurrentExercise();
        } else if (exerciseIndex < exerciseQuestions.length - 1) {
          setExerciseIndex((prev) => prev + 1);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    step,
    exerciseIndex,
    exerciseQuestions,
    currentExerciseQuestion,
    currentExerciseResult,
    checkCurrentExercise,
  ]);

  if (sessionLoading) {
    return <div className="app-card-soft p-6 text-sm text-slate-400">Đang tải phiên học...</div>;
  }

  if (sessionError) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300">{sessionError}</div>
        <button
          onClick={() => void loadStudySession(studyMode)}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (!cards.length && step === "study") {
    return (
      <div className="space-y-3">
        <div className="app-card-soft p-5 text-sm text-slate-400">
          Không có thẻ tới hạn. Bấm "Luyện tự do" để học lại toàn bộ deck.
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void loadStudySession("practice")}
            className="app-btn bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Luyện tự do
          </button>
          <button
            onClick={() => navigate("/")}
            className="app-btn-secondary rounded-lg px-3 py-2 text-sm"
          >
            Quay về Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (step === "exercise" || step === "exercise-result") {
    const q = currentExerciseQuestion;
    const answer = exerciseAnswers.find((a) => a.user_card_id === q?.user_card_id)?.answer || "";
    const hint = q ? exerciseHints[q.user_card_id] : null;
    const loadingHint = q ? Boolean(hintLoading[q.user_card_id]) : false;
    const isChecked = currentExerciseResult?.checked;

    return (
      <div className="mx-auto max-w-none px-2 md:px-3 h-full flex flex-col gap-3 overflow-hidden">
        <header className="flex items-center justify-between gap-4">
          <button
            onClick={() => navigate("/")}
            className="app-btn-secondary px-3 py-2 text-sm text-slate-300 hover:border-slate-500"
          >
            <ArrowLeft size={16} />
            Thoát
          </button>

          <div className="flex-1 flex items-center gap-4">
            <div className="flex-1 relative h-3 overflow-hidden rounded-full bg-slate-800 ring-1 ring-slate-700/50">
              <div
                className="absolute h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-sky-400 transition-all duration-500"
                style={{ width: `${exerciseProgress}%` }}
              />
            </div>
            <div className="text-[10px] font-bold text-slate-500 whitespace-nowrap tabular-nums">
              {exerciseIndex + 1} / {exerciseQuestions.length}
            </div>
          </div>
        </header>

        {exerciseError && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{exerciseError}</div>}

        {exerciseLoading && !isChecked && <div className="app-card-soft p-4 text-sm text-slate-400">Đang xử lý...</div>}

        {step === "exercise" && q && (
          <div className="flex-1 min-h-0 space-y-3 overflow-hidden">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 md:p-8 min-h-0 flex-1 flex flex-col justify-between overflow-hidden">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-2">{q.prompt_text}</p>
                    <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">{q.question_text}</h2>
                  </div>

                  {!isChecked && (
                    <button
                      type="button"
                      onClick={() => void requestHint(q)}
                      disabled={loadingHint}
                      className="shrink-0 rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-200 hover:bg-violet-500/20 disabled:opacity-60"
                    >
                      {loadingHint ? "AI..." : "✨ Gợi ý"}
                    </button>
                  )}
                </div>

                <div className="mt-8">
                  {q.question_type === "multiple_choice" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {q.options.map((option, idx) => {
                        const isSelected = answer === option;
                        let btnClass = "border-slate-700 bg-slate-950 text-slate-200 hover:border-slate-500";
                        
                        if (isChecked) {
                          const isCorrect = option === currentExerciseResult.answer.correct_answer;
                          const isWrongSelection = isSelected && !currentExerciseResult.answer.is_correct;
                          if (isCorrect) btnClass = "border-emerald-500 bg-emerald-500/20 text-emerald-200";
                          else if (isWrongSelection) btnClass = "border-red-500 bg-red-500/20 text-red-200";
                          else if (isSelected) btnClass = "border-slate-500 bg-slate-800 text-slate-400";
                        } else if (isSelected) {
                          btnClass = "border-sky-400 bg-sky-500/10 text-sky-200";
                        }

                        return (
                          <button
                            key={option}
                            type="button"
                            disabled={isChecked}
                            onClick={() =>
                              setExerciseAnswers((prev) =>
                                prev.map((item) =>
                                  item.user_card_id === q.user_card_id ? { ...item, answer: option } : item,
                                ),
                              )
                            }
                            className={`rounded-xl border px-4 py-3 text-left text-sm transition flex items-center justify-between ${btnClass}`}
                          >
                            <span>{option}</span>
                            {!isChecked && <span className="text-[10px] text-slate-500 font-mono">{idx + 1}</span>}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {q.answer_mask && !isChecked && (
                        <p className="text-xs text-slate-500">Mẫu: {q.answer_mask}</p>
                      )}
                      <input
                        value={answer}
                        disabled={isChecked}
                        autoFocus
                        onChange={(e) =>
                          setExerciseAnswers((prev) =>
                            prev.map((item) =>
                              item.user_card_id === q.user_card_id ? { ...item, answer: e.target.value } : item,
                            ),
                          )
                        }
                        placeholder="Nhập từ tiếng Anh..."
                        className={`app-input px-4 py-3 text-lg transition ${
                          isChecked
                            ? currentExerciseResult.answer.is_correct
                              ? "border-emerald-500 bg-emerald-500/10 text-emerald-200"
                              : "border-red-500 bg-red-500/10 text-red-200"
                            : "border-slate-700 bg-slate-950 text-slate-100 focus:border-sky-400"
                        }`}
                      />
                      
                      {isChecked && !currentExerciseResult.answer.is_correct && (
                        <div className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-200 border border-emerald-500/20">
                          Đáp án đúng: <b>{currentExerciseResult.answer.correct_answer}</b>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {hint && (
                  <div className="mt-6 rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
                    <span className="font-semibold">{hint.source === "ai" ? "AI" : "Gợi ý"}:</span> {hint.text}
                  </div>
                )}
              </div>

              <div className="mt-10 flex gap-3">
                {!isChecked ? (
                  <button
                    onClick={() => void checkCurrentExercise()}
                    disabled={exerciseLoading || !answer.trim()}
                    className="flex-1 rounded-xl bg-violet-500 px-4 py-3 font-semibold text-slate-950 hover:bg-violet-400 disabled:opacity-50"
                  >
                    Kiểm tra (Enter)
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (exerciseIndex < exerciseQuestions.length - 1) {
                        setExerciseIndex((prev) => prev + 1);
                      } else {
                        void submitExercise();
                      }
                    }}
                    className="flex-1 rounded-xl bg-sky-500 px-4 py-3 font-semibold text-slate-900 hover:bg-sky-400"
                  >
                    {exerciseIndex < exerciseQuestions.length - 1 ? "Câu tiếp theo (Enter)" : "Xem kết quả cuối (Enter)"}
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-center gap-2">
              {exerciseQuestions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setExerciseIndex(i)}
                  className={`h-2 w-8 rounded-full transition ${
                    i === exerciseIndex
                      ? "bg-violet-500"
                      : exerciseChecked[exerciseQuestions[i].user_card_id]?.checked
                      ? exerciseChecked[exerciseQuestions[i].user_card_id].answer.is_correct
                        ? "bg-emerald-500/50"
                        : "bg-red-500/50"
                      : "bg-slate-800"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {step === "exercise-result" && exerciseResult && (
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <RotateCcw size={40} />
            </div>
            <h3 className="text-3xl font-bold text-emerald-200">Hoàn thành bài tập!</h3>
            <p className="mt-4 text-lg text-emerald-100">
              Bạn đạt <b>{exerciseResult.score_percent}%</b>
            </p>
            <p className="text-sm text-emerald-100/70">
              ({exerciseResult.correct_answers}/{exerciseResult.total_questions} câu trả lời đúng)
            </p>

            {exerciseHistorySummary && (
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
                  <p className="text-xs text-slate-400 uppercase mb-1">Tổng lượt làm</p>
                  <p className="text-xl font-bold">{exerciseHistorySummary.total_attempts}</p>
                </div>
                <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
                  <p className="text-xs text-slate-400 uppercase mb-1">Điểm trung bình</p>
                  <p className="text-xl font-bold">{exerciseHistorySummary.average_score_percent}%</p>
                </div>
                <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
                  <p className="text-xs text-slate-400 uppercase mb-1">Kỷ lục</p>
                  <p className="text-xl font-bold text-sky-400">{exerciseHistorySummary.best_score_percent}%</p>
                </div>
              </div>
            )}

            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <button
                onClick={() => navigate("/")}
                className="rounded-xl border border-slate-700 px-6 py-3 font-semibold text-slate-100 hover:bg-slate-800"
              >
                Về Dashboard
              </button>
              <button
                onClick={() => void startExercise()}
                className="rounded-xl bg-violet-500 px-6 py-3 font-semibold text-slate-950 hover:bg-violet-400"
              >
                Làm bài khác
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-none px-2 md:px-3 h-full flex flex-col gap-3 overflow-hidden">
      <header className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate("/")}
          className="app-btn-secondary px-3 py-2 text-sm text-slate-300 hover:border-slate-500"
        >
          <ArrowLeft size={16} />
          Thoát
        </button>

        <div className="flex-1 flex items-center gap-4">
          <div className="flex-1 relative h-3 overflow-hidden rounded-full bg-slate-800 ring-1 ring-slate-700/50">
            <div
              className="absolute h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-indigo-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <button
            onClick={() => setShowVoiceSheet(true)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-sky-400 transition shadow-sm"
          >
            <Settings2 size={18} />
          </button>
        </div>
      </header>

      <div className="flashcard-stage relative mx-auto w-full max-w-[1280px] flex-1 min-h-0">
        <div
          ref={studyCardRef}
          className={`flashcard-surface ${revealed ? "flipped" : ""} relative h-full min-h-[420px] w-full cursor-pointer rounded-[2rem]`}
          onClick={() => setRevealed((prev) => !prev)}
        >
          <div className="flashcard-face front absolute inset-0 rounded-[2rem] border border-slate-800/80 bg-gradient-to-b from-slate-900 to-slate-950 p-8 md:p-14 shadow-xl">
            <div className="flex h-full w-full flex-col items-center justify-center text-center">
              <div className="px-4 py-1.5 rounded-full border border-slate-800 bg-slate-900/50 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
                Mặt Trước (EN)
              </div>

              <h1 className="mt-8 text-5xl md:text-7xl font-bold tracking-tight text-white drop-shadow-sm select-none">
                {cardSides.englishText}
              </h1>

              {currentCard.phonetic && (
                <p className="mt-5 text-2xl md:text-3xl text-sky-400/90 font-mono tracking-wide">{currentCard.phonetic}</p>
              )}

              <p className="mt-8 max-w-3xl text-xl md:text-2xl italic text-slate-500 leading-relaxed font-serif">
                "{currentCard.example_sentence || "Click to flip card"}"
              </p>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  isSpeaking ? stopSpeaking() : speakWord(cardSides.englishText);
                }}
                className={`mt-8 inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition ${
                  isSpeaking
                    ? "border-red-500/50 bg-red-500/10 text-red-300"
                    : "border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20"
                }`}
              >
                {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
                {isSpeaking ? "Đang phát..." : "Nghe tiếng Anh"}
              </button>

              <div className="mt-7 flex items-center gap-2 text-slate-600 text-[11px] font-medium uppercase tracking-widest animate-pulse">
                <Play size={12} fill="currentColor" /> Bấm phím cách hoặc click để xem
              </div>
            </div>
          </div>

          <div className="flashcard-face back absolute inset-0 rounded-[2rem] border border-slate-800/80 bg-gradient-to-b from-slate-900 to-slate-950 p-8 md:p-14 shadow-xl">
            <div className="flex h-full w-full flex-col items-center justify-center text-center">
              <div className="px-4 py-1.5 rounded-full border border-sky-900/50 bg-sky-500/10 text-[10px] font-bold uppercase tracking-[0.3em] text-sky-400">
                Mặt Sau (VN)
              </div>

              <h1 className="mt-8 text-5xl md:text-7xl font-bold tracking-tight text-sky-100 select-none">
                {cardSides.vietnameseText}
              </h1>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  isSpeaking ? stopSpeaking() : speakWord(cardSides.englishText);
                }}
                className={`mt-10 inline-flex items-center gap-3 rounded-2xl border px-6 py-3.5 text-sm font-bold transition-all shadow-lg active:scale-95 ${
                  isSpeaking
                    ? "border-red-500/50 bg-red-500/10 text-red-400"
                    : "border-sky-500/50 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20"
                }`}
              >
                {isSpeaking ? <VolumeX size={20} /> : <Volume2 size={20} />}
                {isSpeaking ? "Đang phát..." : "Nghe tiếng Anh"}
              </button>

              <div className="mt-6 text-[10px] font-medium text-slate-500 uppercase tracking-widest">
                Đánh giá mức độ ghi nhớ ở dưới
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control / Rating Section */}
      <div className="max-w-[1280px] mx-auto w-full pt-2 shrink-0">
        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="group w-full relative overflow-hidden rounded-[1.5rem] bg-white px-8 py-4 text-lg md:text-xl font-black text-slate-950 transition-all hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] active:scale-[0.98]"
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
              HIỆN ĐÁP ÁN <ChevronRight size={24} strokeWidth={3} />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-sky-400 to-indigo-400 translate-y-full transition-transform duration-300 group-hover:translate-y-0" />
          </button>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 md:gap-3">
            {(["again", "hard", "good", "easy"] as ReviewRating[]).map((key, idx) => (
              <button
                key={key}
                onClick={() => void rateCard(key)}
                className={`group flex flex-col items-start justify-center rounded-2xl border-2 px-4 py-3 md:px-4 md:py-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-95 ${buttonMap[key].className}`}
              >
                <div className="mb-1.5 flex w-full items-center justify-between">
                  <div className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-tight">
                    {buttonMap[key].icon}
                    <span>{buttonMap[key].label}</span>
                  </div>
                  <div className="rounded-md bg-black/20 px-1.5 py-0.5 text-[9px] font-mono text-slate-500">
                    {idx + 1}
                  </div>
                </div>

                <p className="text-[11px] leading-snug text-slate-200/90">{buttonMap[key].hint}</p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide opacity-75">{buttonMap[key].sub}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Voice Config Sheet / Modal */}
      {showVoiceSheet && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div 
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl p-6 space-y-6 animate-in slide-in-from-bottom-10 duration-500"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                  <Volume2 size={20} />
                </div>
                <h3 className="text-lg font-bold">Cấu hình giọng nói</h3>
              </div>
              <button 
                onClick={() => setShowVoiceSheet(false)}
                className="p-2 hover:bg-slate-800 rounded-full transition text-slate-500 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 pt-2">
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Phát âm theo vùng</p>
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl">
                    {(["us", "uk"] as const).map((v) => (
                    <button
                        key={v}
                        onClick={() => setVoiceMode(v)}
                        className={`py-3 text-sm font-bold rounded-xl transition-all ${voiceMode === v ? "bg-slate-800 text-sky-400 shadow-lg ring-1 ring-slate-700" : "text-slate-500 hover:text-slate-400"}`}
                    >
                        Tiếng Anh ({v.toUpperCase()})
                    </button>
                    ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tốc độ đọc</p>
                <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-2xl">
                    {(["slow", "normal", "fast"] as const).map((v) => (
                    <button
                        key={v}
                        onClick={() => setSpeedMode(v)}
                        className={`py-2.5 text-xs font-bold rounded-xl transition-all ${speedMode === v ? "bg-slate-800 text-sky-400 shadow-lg ring-1 ring-slate-700" : "text-slate-500 hover:text-slate-400"}`}
                    >
                        {v === "normal" ? "Vừa" : v === "slow" ? "Chậm" : "Nhanh"}
                    </button>
                    ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between cursor-pointer group" onClick={() => setAutoPlay(!autoPlay)}>
                <div>
                    <p className="text-sm font-bold text-slate-200">Tự động phát âm</p>
                    <p className="text-xs text-slate-500">Đọc ngay khi vừa lật thẻ</p>
                </div>
                <div className={`w-12 h-6 rounded-full transition-colors relative ${autoPlay ? 'bg-sky-500' : 'bg-slate-700'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoPlay ? 'left-7' : 'left-1'}`} />
                </div>
              </div>

              <button
                onClick={() => setShowVoiceSheet(false)}
                className="w-full py-4 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black rounded-2xl transition shadow-lg shadow-sky-500/10 active:scale-95"
              >
                XÁC NHẬN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Study;
