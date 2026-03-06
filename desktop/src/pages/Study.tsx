import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, RotateCcw, Volume2 } from "lucide-react";

import {
  api,
  getApiError,
  type ExerciseQuestion,
  type ExerciseQuestionType,
  type ReviewRating,
  type StudyCard,
  type StudyMode,
} from "../lib/api";

type VoiceMode = "us" | "uk";
type SpeedMode = "slow" | "normal" | "fast";
type StudyStep = "study" | "exercise" | "exercise-result";

type ExerciseAnswerState = {
  user_card_id: number;
  question_type: ExerciseQuestionType;
  answer: string;
};

const buttonMap: Record<ReviewRating, { label: string; className: string }> = {
  again: { label: "Again", className: "bg-red-500/10 text-red-300 border-red-400/30" },
  hard: { label: "Hard", className: "bg-orange-500/10 text-orange-300 border-orange-400/30" },
  good: { label: "Good", className: "bg-sky-500/10 text-sky-300 border-sky-400/30" },
  easy: { label: "Easy", className: "bg-emerald-500/10 text-emerald-300 border-emerald-400/30" },
};

const speedRateMap: Record<SpeedMode, number> = {
  slow: 0.78,
  normal: 0.95,
  fast: 1.12,
};

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

  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const currentCard = cards[index];
  const progress = useMemo(() => (cards.length ? ((index + 1) / cards.length) * 100 : 0), [index, cards.length]);

  const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  const loadStudySession = useCallback(
    async (mode: StudyMode = studyMode) => {
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
    [parsedDeckId, studyMode],
  );

  const startExercise = useCallback(async () => {
    if (!parsedDeckId || Number.isNaN(parsedDeckId)) return;

    try {
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
    } catch (error) {
      setExerciseError(getApiError(error, "Không tạo được bài tập"));
    } finally {
      setExerciseLoading(false);
    }
  }, [parsedDeckId]);

  useEffect(() => {
    const mode = (searchParams.get("mode") as StudyMode | "exercise" | null) || "mixed";
    if (mode === "exercise") {
      void startExercise();
      return;
    }

    const normalizedMode: StudyMode = mode === "due" || mode === "practice" ? mode : "mixed";
    setStudyMode(normalizedMode);
    void loadStudySession(normalizedMode);
  }, [searchParams, loadStudySession, startExercise]);

  const stopSpeaking = useCallback(() => {
    if (!speechSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [speechSupported]);

  const speakWord = useCallback(() => {
    if (!speechSupported) {
      setSpeechError("Thiết bị không hỗ trợ phát âm (TTS).");
      return;
    }

    if (!currentCard) return;

    setSpeechError(null);
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(currentCard.front_text);
    utterance.lang = voiceMode === "uk" ? "en-GB" : "en-US";
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
  }, [currentCard, speechSupported, speedMode, voiceMode, voices]);

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
    } catch (error) {
      setExerciseError(getApiError(error, "Nộp bài thất bại"));
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

  if (sessionLoading) {
    return <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">Đang tải phiên học...</div>;
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
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-400">
          Không có thẻ tới hạn. Bấm "Luyện tự do" để học lại toàn bộ deck.
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void loadStudySession("practice")}
            className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Luyện tự do
          </button>
          <button
            onClick={() => navigate("/")}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200"
          >
            Quay về Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (step === "exercise" || step === "exercise-result") {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Bài tập sau phiên học</h2>
          <button
            onClick={() => navigate("/")}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200"
          >
            Về dashboard
          </button>
        </div>

        {exerciseError && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{exerciseError}</div>}

        {exerciseLoading && <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">Đang xử lý bài tập...</div>}

        {step === "exercise" && !exerciseLoading && (
          <div className="space-y-4">
            {exerciseQuestions.map((q, idx) => {
              const answer = exerciseAnswers.find((a) => a.user_card_id === q.user_card_id)?.answer || "";
              const hint = exerciseHints[q.user_card_id];
              const loadingHint = Boolean(hintLoading[q.user_card_id]);

              return (
                <div key={q.user_card_id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Câu {idx + 1}</p>
                      <p className="text-lg font-semibold">{q.question_text}</p>
                      <p className="text-xs text-slate-400 mt-1">{q.prompt_text}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void requestHint(q)}
                      disabled={loadingHint}
                      className="shrink-0 rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-200 hover:bg-violet-500/20 disabled:opacity-60"
                    >
                      {loadingHint ? "AI đang gợi ý..." : "✨ Gợi ý AI"}
                    </button>
                  </div>

                  {q.question_type === "multiple_choice" ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {q.options.map((option) => {
                        const selected = answer === option;
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() =>
                              setExerciseAnswers((prev) =>
                                prev.map((item) =>
                                  item.user_card_id === q.user_card_id ? { ...item, answer: option } : item,
                                ),
                              )
                            }
                            className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                              selected
                                ? "border-sky-400 bg-sky-500/10 text-sky-200"
                                : "border-slate-700 bg-slate-950 text-slate-200 hover:border-slate-500"
                            }`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-3">
                      {q.answer_mask && (
                        <p className="text-xs text-slate-500 mb-2">Gợi ý mẫu chữ: {q.answer_mask}</p>
                      )}
                      <input
                        value={answer}
                        onChange={(e) =>
                          setExerciseAnswers((prev) =>
                            prev.map((item) =>
                              item.user_card_id === q.user_card_id ? { ...item, answer: e.target.value } : item,
                            ),
                          )
                        }
                        placeholder="Nhập từ tiếng Anh"
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-400"
                      />
                    </div>
                  )}

                  {hint && (
                    <div className="mt-3 rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-sm text-violet-100">
                      <span className="font-semibold">{hint.source === "ai" ? "AI" : "Smart Hint"}:</span> {hint.text}
                    </div>
                  )}
                </div>
              );
            })}

            <button
              onClick={() => void submitExercise()}
              disabled={exerciseLoading}
              className="w-full rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-sky-400 disabled:opacity-60"
            >
              Nộp bài tập
            </button>
          </div>
        )}

        {step === "exercise-result" && exerciseResult && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6">
            <h3 className="text-xl font-semibold text-emerald-200">Kết quả bài tập</h3>
            <p className="mt-2 text-sm text-emerald-100">
              Điểm: <b>{exerciseResult.score_percent}%</b> ({exerciseResult.correct_answers}/{exerciseResult.total_questions} câu đúng)
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => navigate("/")}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-100 hover:border-slate-500"
              >
                Về dashboard
              </button>
              <button
                onClick={() => {
                  setStep("study");
                  void loadStudySession("due");
                }}
                className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-sky-400"
              >
                Học lại (due)
              </button>
              <button
                onClick={() => {
                  setStep("study");
                  void loadStudySession("practice");
                }}
                className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
              >
                Luyện tự do
              </button>
              <button
                onClick={() => void startExercise()}
                className="rounded-lg bg-violet-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-violet-400"
              >
                Làm bài nữa
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:border-slate-500"
        >
          <ArrowLeft size={16} />
          Thoát
        </button>

        <div className="flex-1 max-w-xl">
          <div className="mb-1 flex justify-between text-xs text-slate-400">
            <span>
              Deck #{deckId} · mode: <b>{sessionModeLabel}</b>
            </span>
            <span>
              {index + 1}/{cards.length}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 md:p-10 min-h-[340px] flex flex-col justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{revealed ? "Nghĩa" : "Từ tiếng Anh"}</p>
          <h1 className="mt-4 text-3xl md:text-5xl font-semibold tracking-tight">
            {revealed ? currentCard.back_text : currentCard.front_text}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={isSpeaking ? stopSpeaking : speakWord}
              className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-sky-400/60 hover:text-sky-200 transition"
            >
              <Volume2 size={14} />
              {isSpeaking ? "dừng phát âm" : "phát âm"}
            </button>

            <span className="text-xs text-slate-500">Voice: {activeVoiceLabel}</span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <p className="mb-2 text-xs text-slate-400">Giọng</p>
              <div className="flex gap-2">
                {([
                  { key: "us", label: "US" },
                  { key: "uk", label: "UK" },
                ] as const).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setVoiceMode(item.key)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition ${
                      voiceMode === item.key
                        ? "border-sky-400/70 bg-sky-500/15 text-sky-200"
                        : "border-slate-700 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <p className="mb-2 text-xs text-slate-400">Tốc độ</p>
              <div className="flex gap-2">
                {([
                  { key: "slow", label: "Chậm" },
                  { key: "normal", label: "Vừa" },
                  { key: "fast", label: "Nhanh" },
                ] as const).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSpeedMode(item.key)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition ${
                      speedMode === item.key
                        ? "border-sky-400/70 bg-sky-500/15 text-sky-200"
                        : "border-slate-700 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <p className="text-xs text-slate-400">Tự động phát âm</p>
                <p className="text-xs text-slate-500 mt-1">Khi chuyển sang thẻ mới</p>
              </div>
              <input
                type="checkbox"
                checked={autoPlay}
                onChange={(e) => setAutoPlay(e.target.checked)}
                className="h-4 w-4 accent-sky-500"
              />
            </label>
          </div>

          {speechError && <p className="mt-2 text-xs text-red-300">{speechError}</p>}

          <p className="mt-6 text-sm text-slate-400">Ví dụ: {currentCard.example_sentence || "(chưa có ví dụ)"}</p>
        </div>

        <div className="mt-8">
          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold hover:bg-slate-700"
            >
              <RotateCcw size={16} />
              Hiện đáp án
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {(["again", "hard", "good", "easy"] as ReviewRating[]).map((key) => (
                <button
                  key={key}
                  onClick={() => void rateCard(key)}
                  className={`rounded-xl border px-3 py-3 text-sm font-semibold transition hover:opacity-90 ${buttonMap[key].className}`}
                >
                  {buttonMap[key].label}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Study;
