import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  Flame,
  Footprints,
  Heart,
  Loader2,
  Mail,
  MessageSquare,
  RotateCcw,
  Sparkles,
  Target,
  Timer,
  Trophy,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";

type ProfileType =
  | "structured_achiever"
  | "busy_minimalist"
  | "craving_crusher"
  | "weekend_warrior"
  | "momentum_builder";

type QuizAnswerMap = Record<string, string>;

interface QuizChoice {
  id: string;
  title: string;
  detail: string;
  scores: Partial<Record<ProfileType, number>>;
}

interface QuizQuestion {
  id: string;
  prompt: string;
  hint: string;
  icon: React.ReactNode;
  choices: QuizChoice[];
}

interface QuizProfile {
  label: string;
  tag: string;
  description: string;
  firstFocus: string;
  steps: string[];
  avoid: string;
  timeline: string;
  accent: string;
  bg: string;
}

interface WeightLossQuizProps {
  initialData?: any;
}

const injectedStyles = `
@keyframes floatIn {
  from { transform: translateY(10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.hide-scrollbar::-webkit-scrollbar { display: none; }
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.btn-press { transition: transform 0.1s ease, opacity 0.2s ease; }
.btn-press:active { transform: scale(0.97); }
.btn-press:hover { opacity: 0.85; }
`;

if (typeof document !== "undefined" && !document.getElementById("weight-loss-quiz-styles")) {
  const styleEl = document.createElement("style");
  styleEl.id = "weight-loss-quiz-styles";
  styleEl.textContent = injectedStyles;
  document.head.appendChild(styleEl);
}

const COLORS = {
  primary: "#2D6A4F",
  primaryDark: "#1B4332",
  bg: "#F5F0E8",
  card: "#FFFFFF",
  textMain: "#1A1A1A",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  border: "#DDD8D0",
  borderLight: "#EBE6DE",
  inputBg: "#F5F0E8",
  accentLight: "#E2EDE6",
  warning: "#C4953A",
  warningBg: "#F5EDD8",
  danger: "#C0392B",
  dangerBg: "#F5DEDA",
};

const QUIZ_STATE_KEY = "WEIGHT_LOSS_QUIZ_STATE";
const ENJOY_VOTE_KEY = "WEIGHT_LOSS_QUIZ_ENJOY_VOTE";

const PROFILE_ORDER: ProfileType[] = [
  "structured_achiever",
  "busy_minimalist",
  "craving_crusher",
  "weekend_warrior",
  "momentum_builder",
];

const PROFILES: Record<ProfileType, QuizProfile> = {
  structured_achiever: {
    label: "Structured Achiever",
    tag: "Data-friendly and routine-driven",
    description: "You do best with clarity, measurable targets, and a weekly checkpoint rhythm.",
    firstFocus: "Build a weekly scorecard and keep your plan visible.",
    steps: [
      "Set a daily protein minimum and calorie range.",
      "Log meals for 7 days and review patterns nightly.",
      "Do 3 strength sessions and track body weight trend.",
    ],
    avoid: "Avoid perfection mode where one off-plan meal turns into an off-plan week.",
    timeline: "Expect visible momentum in 2-3 weeks with consistent tracking.",
    accent: COLORS.primary,
    bg: COLORS.accentLight,
  },
  busy_minimalist: {
    label: "Busy Minimalist",
    tag: "Low-friction habits win",
    description: "You need fast defaults that survive packed days and decision fatigue.",
    firstFocus: "Reduce choices by creating repeatable meals and movement defaults.",
    steps: [
      "Choose 3 go-to meals you can repeat all week.",
      "Hit a non-negotiable step floor each day.",
      "Use a simple evening cutoff for extra snacking.",
    ],
    avoid: "Avoid overcomplicated plans with too many rules.",
    timeline: "Expect consistency gains in the first week and fat-loss trend in 3-4 weeks.",
    accent: "#6B705C",
    bg: "#ECEAE2",
  },
  craving_crusher: {
    label: "Craving Crusher",
    tag: "Appetite and triggers are the lever",
    description: "Your biggest progress unlock is hunger control and better trigger response.",
    firstFocus: "Make every meal more filling and remove high-risk trigger setups.",
    steps: [
      "Anchor each meal with protein + fiber first.",
      "Pre-plan a high-volume evening snack option.",
      "Swap high-trigger foods at home for portion-safe versions.",
    ],
    avoid: "Avoid long under-eating stretches that rebound into night overeating.",
    timeline: "Expect fewer cravings in 7-10 days and steadier fat loss by week 3.",
    accent: COLORS.warning,
    bg: COLORS.warningBg,
  },
  weekend_warrior: {
    label: "Weekend Warrior",
    tag: "Strong weekdays, loose weekends",
    description: "You are close. Your key move is protecting progress in social situations.",
    firstFocus: "Create a weekend strategy before social plans begin.",
    steps: [
      "Set a weekend alcohol and dessert ceiling in advance.",
      "Front-load protein earlier on social days.",
      "Use one reset routine Sunday evening: groceries, walk, meal prep.",
    ],
    avoid: "Avoid the all-or-nothing reset mentality every Monday.",
    timeline: "Expect faster visible changes once weekends are controlled (2-4 weeks).",
    accent: "#A68A64",
    bg: "#F0E8D8",
  },
  momentum_builder: {
    label: "Momentum Builder",
    tag: "Confidence and consistency first",
    description: "Your best path is stacking small wins before intensity.",
    firstFocus: "Build a streak you can protect, even on low-energy days.",
    steps: [
      "Pick one nutrition habit and one movement habit for 7 days.",
      "Track only completion streaks, not perfection.",
      "Celebrate non-scale wins: energy, sleep, confidence, fit of clothes.",
    ],
    avoid: "Avoid jumping into aggressive plans that are hard to sustain.",
    timeline: "Expect habit confidence in 1-2 weeks and physical changes over 4+ weeks.",
    accent: "#4C7D5A",
    bg: "#E7F1EB",
  },
};

const QUESTIONS: QuizQuestion[] = [
  {
    id: "derailer",
    prompt: "What derails your progress most often?",
    hint: "Choose the one that happens most consistently.",
    icon: <Flame size={20} />,
    choices: [
      {
        id: "night_cravings",
        title: "Night cravings",
        detail: "Evenings are where calories spike.",
        scores: { craving_crusher: 3, momentum_builder: 1 },
      },
      {
        id: "stress_eating",
        title: "Stress eating",
        detail: "Food becomes the quick decompression tool.",
        scores: { craving_crusher: 2, momentum_builder: 2 },
      },
      {
        id: "no_time",
        title: "No time to prep",
        detail: "Busy schedule knocks out good choices.",
        scores: { busy_minimalist: 3, weekend_warrior: 1 },
      },
      {
        id: "social_weekends",
        title: "Social weekends",
        detail: "Weekends undo weekday momentum.",
        scores: { weekend_warrior: 3, structured_achiever: 1 },
      },
    ],
  },
  {
    id: "routine",
    prompt: "Your current activity baseline is closest to:",
    hint: "This helps calibrate your first movement target.",
    icon: <Activity size={20} />,
    choices: [
      {
        id: "mostly_sitting",
        title: "Mostly sitting",
        detail: "Desk-heavy days and low movement.",
        scores: { momentum_builder: 2, busy_minimalist: 2 },
      },
      {
        id: "some_walking",
        title: "Some walking",
        detail: "A little activity, but inconsistent.",
        scores: { busy_minimalist: 2, momentum_builder: 2 },
      },
      {
        id: "regular_workouts",
        title: "2-3 workouts/week",
        detail: "You already have some structure.",
        scores: { structured_achiever: 2, weekend_warrior: 2 },
      },
      {
        id: "very_active",
        title: "Very active",
        detail: "Training is not the issue.",
        scores: { structured_achiever: 3, craving_crusher: 1 },
      },
    ],
  },
  {
    id: "overeating_time",
    prompt: "When do you overeat the most?",
    hint: "Pinpointing timing improves strategy quality.",
    icon: <Timer size={20} />,
    choices: [
      {
        id: "evening",
        title: "Evening",
        detail: "Late-day hunger and habit eating.",
        scores: { craving_crusher: 3, momentum_builder: 1 },
      },
      {
        id: "meals",
        title: "At main meals",
        detail: "Portions creep bigger than planned.",
        scores: { structured_achiever: 2, busy_minimalist: 2 },
      },
      {
        id: "social_events",
        title: "Social events",
        detail: "Restaurants and gatherings are hardest.",
        scores: { weekend_warrior: 3, craving_crusher: 1 },
      },
      {
        id: "random_snacking",
        title: "Random snacking",
        detail: "Unplanned bites all day.",
        scores: { busy_minimalist: 2, craving_crusher: 2 },
      },
    ],
  },
  {
    id: "tracking",
    prompt: "How do you feel about tracking food data?",
    hint: "No right answer. We tailor the plan to your preference.",
    icon: <BarChart3 size={20} />,
    choices: [
      {
        id: "love_data",
        title: "I like data",
        detail: "Numbers help me stay accountable.",
        scores: { structured_achiever: 3 },
      },
      {
        id: "short_term",
        title: "Okay short-term",
        detail: "Helpful for a while, then annoying.",
        scores: { structured_achiever: 1, busy_minimalist: 2, weekend_warrior: 1 },
      },
      {
        id: "simple_rules",
        title: "Prefer simple rules",
        detail: "I want guardrails, not spreadsheets.",
        scores: { busy_minimalist: 3, momentum_builder: 1 },
      },
      {
        id: "no_tracking",
        title: "I do not want tracking",
        detail: "I want behavior-first tools only.",
        scores: { momentum_builder: 3, craving_crusher: 1 },
      },
    ],
  },
  {
    id: "mornings",
    prompt: "Your mornings usually look like:",
    hint: "Morning rhythm predicts daily consistency.",
    icon: <Sparkles size={20} />,
    choices: [
      {
        id: "chaotic",
        title: "Chaotic",
        detail: "I am rushing from the start.",
        scores: { busy_minimalist: 3, momentum_builder: 1 },
      },
      {
        id: "quick_simple",
        title: "Quick and simple",
        detail: "I can do one easy routine.",
        scores: { busy_minimalist: 2, momentum_builder: 2 },
      },
      {
        id: "structured",
        title: "Structured",
        detail: "I can execute a set plan.",
        scores: { structured_achiever: 3 },
      },
      {
        id: "plenty_time",
        title: "Plenty of time",
        detail: "Time is available, consistency varies.",
        scores: { structured_achiever: 2, craving_crusher: 1, weekend_warrior: 1 },
      },
    ],
  },
  {
    id: "movement_style",
    prompt: "Best movement style for you right now:",
    hint: "Pick what you would actually do this week.",
    icon: <Footprints size={20} />,
    choices: [
      {
        id: "walking",
        title: "Walking and steps",
        detail: "Simple, repeatable, low barrier.",
        scores: { busy_minimalist: 2, momentum_builder: 2 },
      },
      {
        id: "home_workouts",
        title: "Home workouts",
        detail: "Efficient and schedule-friendly.",
        scores: { busy_minimalist: 2, structured_achiever: 1, momentum_builder: 1 },
      },
      {
        id: "gym_strength",
        title: "Gym strength",
        detail: "I like progressive training.",
        scores: { structured_achiever: 3 },
      },
      {
        id: "classes_sports",
        title: "Classes or sports",
        detail: "Fun keeps me consistent.",
        scores: { weekend_warrior: 2, momentum_builder: 2 },
      },
    ],
  },
  {
    id: "consistency_barrier",
    prompt: "Biggest consistency challenge:",
    hint: "Be honest. This drives your main action plan.",
    icon: <Target size={20} />,
    choices: [
      {
        id: "motivation_dips",
        title: "Motivation dips",
        detail: "Good start, then fade.",
        scores: { momentum_builder: 3 },
      },
      {
        id: "busy_schedule",
        title: "Busy schedule",
        detail: "Too much context switching.",
        scores: { busy_minimalist: 3 },
      },
      {
        id: "hunger_cravings",
        title: "Hunger and cravings",
        detail: "Appetite keeps pulling me off-plan.",
        scores: { craving_crusher: 3 },
      },
      {
        id: "social_events",
        title: "Social events",
        detail: "Dinners and weekends are hard.",
        scores: { weekend_warrior: 3 },
      },
    ],
  },
  {
    id: "goal_priority",
    prompt: "What outcome matters most right now?",
    hint: "This sets the tone of your plan.",
    icon: <Trophy size={20} />,
    choices: [
      {
        id: "scale_down",
        title: "Scale trend down",
        detail: "I want measurable weight loss.",
        scores: { structured_achiever: 2, craving_crusher: 1, busy_minimalist: 1 },
      },
      {
        id: "more_energy",
        title: "More energy",
        detail: "I want to feel better daily.",
        scores: { momentum_builder: 2, busy_minimalist: 1, craving_crusher: 1 },
      },
      {
        id: "confidence",
        title: "Confidence and appearance",
        detail: "I want visible body changes.",
        scores: { weekend_warrior: 2, structured_achiever: 1, momentum_builder: 1 },
      },
      {
        id: "overall_health",
        title: "Health markers",
        detail: "I care about long-term metabolic health.",
        scores: { structured_achiever: 2, momentum_builder: 2 },
      },
    ],
  },
  {
    id: "pace",
    prompt: "Preferred pace:",
    hint: "Sustainable plans are the fastest in the long run.",
    icon: <ArrowRight size={20} />,
    choices: [
      {
        id: "slow_easy",
        title: "Slow and easy",
        detail: "Small wins I can keep.",
        scores: { momentum_builder: 3, busy_minimalist: 1 },
      },
      {
        id: "moderate",
        title: "Moderate and balanced",
        detail: "Steady progress, low burnout risk.",
        scores: { busy_minimalist: 2, structured_achiever: 1, weekend_warrior: 1 },
      },
      {
        id: "aggressive",
        title: "Aggressive but safe",
        detail: "I can handle tighter structure.",
        scores: { structured_achiever: 3, craving_crusher: 1 },
      },
      {
        id: "need_guidance",
        title: "Not sure, guide me",
        detail: "I need a realistic starting point.",
        scores: { momentum_builder: 2, busy_minimalist: 2 },
      },
    ],
  },
];

const trackEvent = (event: string, data?: Record<string, any>) => {
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, data: data || {} }),
  }).catch(() => {
    // no-op
  });
};

const normalizeApiBaseUrl = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, "");
};

const resolveApiBaseUrl = (initialData?: any): string => {
  const fromHydration = normalizeApiBaseUrl(initialData?.api_base_url || initialData?.apiBaseUrl);
  if (fromHydration) return fromHydration;

  if (typeof window !== "undefined") {
    const fromGlobal = normalizeApiBaseUrl((window as any).__TRIP_PLANNER_API_BASE_URL__);
    if (fromGlobal) return fromGlobal;

    const origin = window.location.origin;
    if (origin && origin !== "null" && !origin.includes("web-sandbox.oaiusercontent.com")) {
      return origin;
    }
  }

  return "http://localhost:8001";
};

const buildApiUrl = (apiBaseUrl: string, path: string): string => {
  if (/^https?:\/\//i.test(path)) return path;
  return `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
};

const getSavedAnswers = (): QuizAnswerMap => {
  try {
    const raw = localStorage.getItem(QUIZ_STATE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.answers && typeof parsed.answers === "object") {
      return parsed.answers;
    }
  } catch {
    // no-op
  }
  return {};
};

const scoreQuiz = (answers: QuizAnswerMap): Record<ProfileType, number> => {
  const totals: Record<ProfileType, number> = {
    structured_achiever: 0,
    busy_minimalist: 0,
    craving_crusher: 0,
    weekend_warrior: 0,
    momentum_builder: 0,
  };

  QUESTIONS.forEach((question) => {
    const selected = question.choices.find((choice) => choice.id === answers[question.id]);
    if (!selected) return;
    PROFILE_ORDER.forEach((profile) => {
      totals[profile] += selected.scores[profile] || 0;
    });
  });

  return totals;
};

const pickTopProfile = (scores: Record<ProfileType, number>): ProfileType => {
  return PROFILE_ORDER.slice().sort((a, b) => {
    const scoreDiff = scores[b] - scores[a];
    if (scoreDiff !== 0) return scoreDiff;
    return PROFILE_ORDER.indexOf(a) - PROFILE_ORDER.indexOf(b);
  })[0];
};

export default function WeightLossQuiz({ initialData }: WeightLossQuizProps) {
  const apiBaseUrl = useMemo(() => resolveApiBaseUrl(initialData), [initialData]);
  const [answers, setAnswers] = useState<QuizAnswerMap>(() => getSavedAnswers());
  const [currentIndex, setCurrentIndex] = useState(() => {
    const saved = getSavedAnswers();
    const nextOpen = QUESTIONS.findIndex((q) => !saved[q.id]);
    return nextOpen === -1 ? QUESTIONS.length - 1 : nextOpen;
  });
  const [showResults, setShowResults] = useState(() => {
    const saved = getSavedAnswers();
    return QUESTIONS.every((q) => Boolean(saved[q.id]));
  });

  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [subscribeMessage, setSubscribeMessage] = useState("");

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const [enjoyVote, setEnjoyVote] = useState<"up" | "down" | null>(() => {
    try {
      const saved = localStorage.getItem(ENJOY_VOTE_KEY);
      return saved === "up" || saved === "down" ? saved : null;
    } catch {
      return null;
    }
  });

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(QUIZ_STATE_KEY, JSON.stringify({ answers, updatedAt: Date.now() }));
    } catch {
      // no-op
    }
  }, [answers]);

  useEffect(() => {
    trackEvent("quiz_view", { fromHydration: Boolean(initialData && Object.keys(initialData).length > 0) });
  }, [initialData]);

  const answeredCount = Object.keys(answers).length;
  const progress = Math.round((answeredCount / QUESTIONS.length) * 100);
  const activeQuestion = QUESTIONS[Math.min(currentIndex, QUESTIONS.length - 1)];

  const scores = useMemo(() => scoreQuiz(answers), [answers]);
  const topProfile = useMemo(() => pickTopProfile(scores), [scores]);
  const profile = PROFILES[topProfile];
  const maxScore = Math.max(...Object.values(scores), 1);

  const handleAnswer = (questionId: string, choiceId: string) => {
    const nextAnswers = { ...answers, [questionId]: choiceId };
    setAnswers(nextAnswers);
    trackEvent("quiz_answered", { questionId, choiceId, answeredCount: Object.keys(nextAnswers).length });

    const isLastQuestion = currentIndex >= QUESTIONS.length - 1;
    if (isLastQuestion) {
      setShowResults(true);
      trackEvent("quiz_completed", { profile: pickTopProfile(scoreQuiz(nextAnswers)) });
      return;
    }

    window.setTimeout(() => {
      setCurrentIndex((prev) => Math.min(prev + 1, QUESTIONS.length - 1));
    }, 120);
  };

  const handleRestart = () => {
    setAnswers({});
    setCurrentIndex(0);
    setShowResults(false);
    setCopied(false);
    try {
      localStorage.removeItem(QUIZ_STATE_KEY);
    } catch {
      // no-op
    }
    trackEvent("quiz_reset");
  };

  const handleCopyPlan = async () => {
    const text = [
      `Weight-Loss Quiz Result: ${profile.label}`,
      profile.description,
      `First focus: ${profile.firstFocus}`,
      "7-day starter plan:",
      ...profile.steps.map((step, idx) => `${idx + 1}. ${step}`),
      `Avoid: ${profile.avoid}`,
      `Timeline: ${profile.timeline}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      trackEvent("quiz_copy_plan", { profile: profile.label });
    } catch {
      setCopied(false);
    }
  };

  const handleEnjoyVote = (vote: "up" | "down") => {
    setEnjoyVote(vote);
    try {
      localStorage.setItem(ENJOY_VOTE_KEY, vote);
    } catch {
      // no-op
    }
    trackEvent("enjoy_vote", { vote, tool: "weight-loss-quiz" });
    setShowFeedbackModal(true);
  };

  const handleSubscribe = async () => {
    if (!subscribeEmail || !subscribeEmail.includes("@")) {
      setSubscribeStatus("error");
      setSubscribeMessage("Please enter a valid email.");
      return;
    }

    setSubscribeStatus("loading");
    try {
      const response = await fetch(buildApiUrl(apiBaseUrl, "/api/subscribe"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: subscribeEmail,
          topicId: "weight-loss-quiz-news",
          topicName: "Weight-Loss Quiz Updates",
        }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setSubscribeStatus("success");
        setSubscribeMessage(data.message || "Subscribed.");
        trackEvent("notify_me_subscribe", { topic: "weight-loss-quiz-news" });
      } else {
        setSubscribeStatus("error");
        setSubscribeMessage(data.error || "Unable to subscribe right now.");
      }
    } catch {
      setSubscribeStatus("error");
      setSubscribeMessage("Network error. Please try again.");
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) return;
    setFeedbackStatus("submitting");

    try {
      const response = await fetch(buildApiUrl(apiBaseUrl, "/api/track"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "user_feedback",
          data: {
            tool: "weight-loss-quiz",
            enjoymentVote: enjoyVote,
            profile: profile.label,
            feedback: feedbackText,
          },
        }),
      });

      if (!response.ok) {
        setFeedbackStatus("error");
        return;
      }

      setFeedbackStatus("success");
      trackEvent("user_feedback", { profile: profile.label, enjoymentVote: enjoyVote || null });
      window.setTimeout(() => {
        setShowFeedbackModal(false);
        setFeedbackText("");
        setFeedbackStatus("idle");
      }, 900);
    } catch {
      setFeedbackStatus("error");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(160deg, ${COLORS.bg} 0%, #EFE8DD 45%, #E5EFE8 100%)`,
        padding: "20px 12px 32px",
        color: COLORS.textMain,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 600,
          margin: "0 auto",
          animation: "floatIn 220ms ease",
        }}
      >
        <div
          style={{
            backgroundColor: COLORS.card,
            border: `1px solid ${COLORS.borderLight}`,
            borderRadius: 22,
            padding: 20,
            boxShadow: "0 12px 30px rgba(26,26,26,0.07)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, letterSpacing: 0.3, textTransform: "uppercase" }}>
                Weight-Loss Blueprint Quiz
              </div>
              <h1 style={{ margin: "6px 0 0", fontSize: 24, lineHeight: 1.15 }}>Find your easiest fat-loss strategy</h1>
            </div>
            <div
              style={{
                minWidth: 72,
                padding: "8px 10px",
                borderRadius: 999,
                backgroundColor: COLORS.inputBg,
                border: `1px solid ${COLORS.border}`,
                textAlign: "center",
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              {showResults ? "Done" : `${answeredCount}/${QUESTIONS.length}`}
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ height: 8, borderRadius: 999, backgroundColor: COLORS.inputBg, border: `1px solid ${COLORS.borderLight}` }}>
              <div
                style={{
                  width: `${showResults ? 100 : progress}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: `linear-gradient(90deg, ${COLORS.primaryDark}, ${COLORS.primary})`,
                  transition: "width 220ms ease",
                }}
              />
            </div>
          </div>

          {!showResults && activeQuestion && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 10,
                  color: COLORS.primaryDark,
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    backgroundColor: COLORS.accentLight,
                  }}
                >
                  {activeQuestion.icon}
                </span>
                Question {currentIndex + 1}
              </div>

              <h2 style={{ margin: "0 0 8px", fontSize: 21, lineHeight: 1.25 }}>{activeQuestion.prompt}</h2>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: COLORS.textSecondary }}>{activeQuestion.hint}</p>

              <div style={{ display: "grid", gap: 10 }}>
                {activeQuestion.choices.map((choice) => {
                  const isSelected = answers[activeQuestion.id] === choice.id;
                  return (
                    <button
                      key={choice.id}
                      className="btn-press"
                      onClick={() => handleAnswer(activeQuestion.id, choice.id)}
                      style={{
                        textAlign: "left",
                        padding: "14px 14px",
                        borderRadius: 14,
                        border: isSelected ? `2px solid ${COLORS.primary}` : `1px solid ${COLORS.border}`,
                        backgroundColor: isSelected ? COLORS.accentLight : COLORS.card,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                        <div>
                          <div style={{ fontWeight: 700, color: COLORS.textMain, fontSize: 14 }}>{choice.title}</div>
                          <div style={{ marginTop: 2, fontSize: 12, color: COLORS.textSecondary }}>{choice.detail}</div>
                        </div>
                        {isSelected && <CheckCircle2 size={18} color={COLORS.primaryDark} />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
                <button
                  className="btn-press"
                  onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))}
                  disabled={currentIndex === 0}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    borderRadius: 10,
                    border: `1px solid ${COLORS.border}`,
                    backgroundColor: "white",
                    color: currentIndex === 0 ? COLORS.textMuted : COLORS.textMain,
                    fontSize: 13,
                    padding: "9px 12px",
                    cursor: currentIndex === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  <ChevronLeft size={15} /> Back
                </button>

                <button
                  className="btn-press"
                  onClick={() => {
                    if (currentIndex >= QUESTIONS.length - 1) {
                      setShowResults(true);
                      trackEvent("quiz_completed", { profile: topProfile });
                    } else {
                      setCurrentIndex((p) => Math.min(QUESTIONS.length - 1, p + 1));
                    }
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    borderRadius: 10,
                    border: "none",
                    backgroundColor: COLORS.primary,
                    color: "white",
                    fontSize: 13,
                    fontWeight: 700,
                    padding: "9px 12px",
                    cursor: "pointer",
                  }}
                >
                  {currentIndex >= QUESTIONS.length - 1 ? "Show result" : "Next"}
                  <ArrowRight size={15} />
                </button>
              </div>
            </>
          )}

          {showResults && (
            <div style={{ animation: "floatIn 220ms ease" }}>
              <div
                style={{
                  background: `linear-gradient(145deg, ${profile.bg} 0%, #FFFFFF 100%)`,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 14,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: profile.accent, textTransform: "uppercase", letterSpacing: 0.4 }}>
                  Your profile
                </div>
                <h2 style={{ margin: "6px 0 4px", fontSize: 24 }}>{profile.label}</h2>
                <p style={{ margin: 0, fontSize: 13, color: COLORS.textSecondary }}>{profile.tag}</p>
                <p style={{ margin: "10px 0 0", fontSize: 14 }}>{profile.description}</p>
              </div>

              <div
                style={{
                  border: `1px solid ${COLORS.borderLight}`,
                  borderRadius: 14,
                  padding: 14,
                  backgroundColor: "#fff",
                  marginBottom: 12,
                }}
              >
                <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>Your first focus</h3>
                <p style={{ margin: "0 0 12px", fontSize: 13, color: COLORS.textSecondary }}>{profile.firstFocus}</p>

                <h4 style={{ margin: "0 0 8px", fontSize: 14 }}>7-day starter plan</h4>
                <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6, fontSize: 13, color: COLORS.textMain }}>
                  {profile.steps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>

                <div
                  style={{
                    marginTop: 12,
                    padding: 10,
                    borderRadius: 10,
                    backgroundColor: COLORS.warningBg,
                    border: `1px solid #EBD9BA`,
                    fontSize: 12,
                    color: "#6F4D1A",
                  }}
                >
                  <strong>Avoid this:</strong> {profile.avoid}
                </div>

                <div style={{ marginTop: 10, fontSize: 12, color: COLORS.textSecondary }}>{profile.timeline}</div>
              </div>

              <div
                style={{
                  border: `1px solid ${COLORS.borderLight}`,
                  borderRadius: 14,
                  padding: 14,
                  backgroundColor: "#fff",
                  marginBottom: 14,
                }}
              >
                <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>Profile score breakdown</h3>
                <div style={{ display: "grid", gap: 8 }}>
                  {PROFILE_ORDER.map((profileKey) => (
                    <div key={profileKey}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                        <span>{PROFILES[profileKey].label}</span>
                        <span style={{ color: COLORS.textSecondary }}>{scores[profileKey]}</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 999, backgroundColor: COLORS.inputBg }}>
                        <div
                          style={{
                            width: `${Math.max(8, Math.round((scores[profileKey] / maxScore) * 100))}%`,
                            height: "100%",
                            borderRadius: 999,
                            backgroundColor: PROFILES[profileKey].accent,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="btn-press"
                  onClick={handleCopyPlan}
                  style={{
                    flex: 1,
                    minWidth: 160,
                    borderRadius: 11,
                    border: "none",
                    backgroundColor: COLORS.primary,
                    color: "white",
                    fontWeight: 700,
                    fontSize: 13,
                    padding: "11px 14px",
                    cursor: "pointer",
                  }}
                >
                  {copied ? "Copied" : "Copy my 7-day plan"}
                </button>

                <button
                  className="btn-press"
                  onClick={handleRestart}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    borderRadius: 11,
                    border: `1px solid ${COLORS.border}`,
                    backgroundColor: "white",
                    color: COLORS.textMain,
                    fontWeight: 600,
                    fontSize: 13,
                    padding: "11px 14px",
                    cursor: "pointer",
                  }}
                >
                  <RotateCcw size={14} /> Retake quiz
                </button>
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: 18,
              paddingTop: 14,
              borderTop: `1px solid ${COLORS.borderLight}`,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <button
              className="btn-press"
              onClick={() => setShowSubscribeModal(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                borderRadius: 10,
                border: `1px solid ${COLORS.border}`,
                backgroundColor: "white",
                padding: "8px 10px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              <Mail size={14} /> Weekly tips
            </button>

            <button
              className="btn-press"
              onClick={() => setShowFeedbackModal(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                borderRadius: 10,
                border: `1px solid ${COLORS.border}`,
                backgroundColor: "white",
                padding: "8px 10px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              <MessageSquare size={14} /> Feedback
            </button>

            {!enjoyVote && (
              <div
                style={{
                  marginLeft: "auto",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: COLORS.inputBg,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 10,
                  padding: "6px 8px",
                  fontSize: 12,
                }}
              >
                <span style={{ color: COLORS.textSecondary }}>Enjoying this quiz?</span>
                <button
                  onClick={() => handleEnjoyVote("up")}
                  className="btn-press"
                  style={{ border: "none", background: "transparent", cursor: "pointer", display: "flex", color: COLORS.primaryDark }}
                >
                  <ThumbsUp size={14} />
                </button>
                <button
                  onClick={() => handleEnjoyVote("down")}
                  className="btn-press"
                  style={{ border: "none", background: "transparent", cursor: "pointer", display: "flex", color: COLORS.danger }}
                >
                  <ThumbsDown size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showSubscribeModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 12,
            zIndex: 20,
          }}
          onClick={() => setShowSubscribeModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 420,
              backgroundColor: "white",
              borderRadius: 16,
              padding: 18,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>Get weekly fat-loss tips</h3>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: COLORS.textSecondary }}>
              We send practical, no-noise ideas you can apply in real life.
            </p>
            <input
              value={subscribeEmail}
              onChange={(e) => setSubscribeEmail(e.target.value)}
              placeholder="you@example.com"
              style={{
                width: "100%",
                borderRadius: 10,
                border: `1px solid ${COLORS.border}`,
                padding: "10px 12px",
                fontSize: 14,
              }}
            />
            {subscribeMessage && (
              <div style={{ marginTop: 10, fontSize: 12, color: subscribeStatus === "success" ? COLORS.primaryDark : COLORS.danger }}>
                {subscribeMessage}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button
                className="btn-press"
                onClick={handleSubscribe}
                disabled={subscribeStatus === "loading"}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  border: "none",
                  backgroundColor: COLORS.primary,
                  color: "white",
                  padding: "10px 12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                {subscribeStatus === "loading" ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
                Subscribe
              </button>
              <button
                className="btn-press"
                onClick={() => setShowSubscribeModal(false)}
                style={{
                  borderRadius: 10,
                  border: `1px solid ${COLORS.border}`,
                  backgroundColor: "white",
                  padding: "10px 12px",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showFeedbackModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 12,
            zIndex: 20,
          }}
          onClick={() => setShowFeedbackModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 420,
              backgroundColor: "white",
              borderRadius: 16,
              padding: 18,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Heart size={16} color={COLORS.primaryDark} />
              <h3 style={{ margin: 0, fontSize: 18 }}>Share quick feedback</h3>
            </div>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="What felt useful, confusing, or missing?"
              style={{
                width: "100%",
                minHeight: 110,
                borderRadius: 10,
                border: `1px solid ${COLORS.border}`,
                padding: 10,
                fontSize: 13,
                resize: "vertical",
              }}
            />
            {feedbackStatus === "error" && <div style={{ marginTop: 8, color: COLORS.danger, fontSize: 12 }}>Could not submit feedback.</div>}
            {feedbackStatus === "success" && <div style={{ marginTop: 8, color: COLORS.primaryDark, fontSize: 12 }}>Feedback sent. Thank you.</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                className="btn-press"
                onClick={handleFeedbackSubmit}
                disabled={feedbackStatus === "submitting"}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  border: "none",
                  backgroundColor: COLORS.primary,
                  color: "white",
                  padding: "10px 12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                {feedbackStatus === "submitting" ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
                Send
              </button>
              <button
                className="btn-press"
                onClick={() => setShowFeedbackModal(false)}
                style={{
                  borderRadius: 10,
                  border: `1px solid ${COLORS.border}`,
                  backgroundColor: "white",
                  padding: "10px 12px",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
