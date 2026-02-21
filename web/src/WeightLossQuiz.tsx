import React, { useEffect, useMemo, useRef, useState } from "react";
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
  description: string[];
  firstFocus: string;
  weekPlan: { day: string; focus: string; details: string }[];
  supplements: { name: string; how: string; why: string; note: string }[];
  mentoring: { label: string; url: string; note: string }[];
  recipes: { name: string; why: string; build: string }[];
  avoid: string;
  timeline: string;
  accent: string;
  bg: string;
}

interface ArchetypeVisual {
  code: string;
  headline: string;
  pillars: { letter: string; title: string; detail: string; color: string }[];
}

interface RecipeDetail {
  prepTime: string;
  cookTime: string;
  servings: string;
  ingredients: string[];
  steps: string[];
}

interface SupplementVisual {
  image: string;
  amazonUrl: string;
}

type SupplementKey = "protein" | "creatine" | "fiber" | "magnesium" | "electrolyte" | "omega3";

interface FeaturedSupplement {
  name: string;
  cardTitle: string;
  amazonUrl: string;
  photoLabels: string[];
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

const FONTS = {
  display: '"Avenir Next", "Futura", "Trebuchet MS", sans-serif',
  body: '"Avenir Next", "Segoe UI", sans-serif',
};

const makeSupplementImage = (title: string, subtitle: string, topColor: string, bottomColor: string): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${topColor}" />
      <stop offset="100%" stop-color="${bottomColor}" />
    </linearGradient>
  </defs>
  <rect width="720" height="480" fill="url(#bg)" rx="24" />
  <rect x="250" y="70" width="220" height="330" rx="38" fill="white" opacity="0.96" />
  <rect x="295" y="34" width="130" height="52" rx="14" fill="#1B4332" />
  <rect x="275" y="168" width="170" height="120" rx="18" fill="${topColor}" opacity="0.88" />
  <text x="360" y="220" text-anchor="middle" font-size="34" font-family="Arial, sans-serif" font-weight="700" fill="#1B4332">${title}</text>
  <text x="360" y="254" text-anchor="middle" font-size="20" font-family="Arial, sans-serif" fill="#1B4332">${subtitle}</text>
  <text x="360" y="444" text-anchor="middle" font-size="26" font-family="Arial, sans-serif" fill="#FFFFFF" opacity="0.95">Supplement Pick</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const SUPPLEMENT_VISUAL_LIBRARY: Record<SupplementKey, SupplementVisual> = {
  protein: {
    image: makeSupplementImage("Protein", "Whey / Plant", "#D7F0E3", "#84B59F"),
    amazonUrl: "https://www.amazon.com/s?k=protein+powder",
  },
  creatine: {
    image: makeSupplementImage("Creatine", "Monohydrate", "#DBEAFE", "#60A5FA"),
    amazonUrl: "https://www.amazon.com/s?k=creatine+monohydrate",
  },
  fiber: {
    image: makeSupplementImage("Fiber", "Psyllium", "#FEF3C7", "#F59E0B"),
    amazonUrl: "https://www.amazon.com/s?k=psyllium+husk+fiber",
  },
  magnesium: {
    image: makeSupplementImage("Magnesium", "Glycinate", "#EDE9FE", "#A78BFA"),
    amazonUrl: "https://www.amazon.com/s?k=magnesium+glycinate",
  },
  electrolyte: {
    image: makeSupplementImage("Electrolytes", "Sugar-Free", "#DCFCE7", "#34D399"),
    amazonUrl: "https://www.amazon.com/s?k=sugar+free+electrolyte+powder",
  },
  omega3: {
    image: makeSupplementImage("Omega-3", "EPA / DHA", "#FFE4E6", "#FB7185"),
    amazonUrl: "https://www.amazon.com/s?k=omega+3+fish+oil",
  },
};

const SUPPLEMENT_PHOTO_DIR = "/assets/supplement-photos";

const SUPPLEMENT_PHOTO_ALIASES: Record<SupplementKey, string[]> = {
  protein: ["protein", "protein-shake", "rtd-protein"],
  creatine: ["creatine", "creatine-monohydrate"],
  fiber: ["fiber", "fiber-blend", "psyllium-fiber"],
  magnesium: ["magnesium", "magnesium-glycinate"],
  electrolyte: ["electrolyte", "electrolytes", "electrolyte-mix"],
  omega3: ["omega-3", "omega3", "fish-oil"],
};

const FEATURED_SUPPLEMENTS: FeaturedSupplement[] = [
  {
    name: "GLP-1 Burner Unleashed",
    cardTitle: "GLP-1 Burner Unleashed",
    amazonUrl: "https://amzn.to/4aucMBu",
    photoLabels: ["glp1_burner"],
  },
  {
    name: "Stripfast5000 Weight Management Support + Relaxation Capsules",
    cardTitle: "Stripfast5000 Weight Management Support",
    amazonUrl: "https://amzn.to/4r6WPq1",
    photoLabels: ["stripfast_night_bullets"],
  },
  {
    name: "Metabolic Health - Gut Health Supplement to Aid Weight Management* - Formulated with Bergamot and Turmeric (Curcumin Phytosome)",
    cardTitle: "Metabolic Health - Gut Health Supplement",
    amazonUrl: "https://amzn.to/4aHnXFP",
    photoLabels: ["metabolic health thorne"],
  },
];

const getSupplementKey = (name: string): SupplementKey => {
  const lowerName = name.toLowerCase();

  if (lowerName.includes("creatine")) return "creatine";
  if (lowerName.includes("psyllium") || lowerName.includes("fiber")) return "fiber";
  if (lowerName.includes("magnesium")) return "magnesium";
  if (lowerName.includes("electrolyte")) return "electrolyte";
  if (lowerName.includes("omega")) return "omega3";
  return "protein";
};

const normalizeSupplementFileLabel = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\+/g, "plus")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const buildSupplementPhotoCandidates = (name: string, customLabels: string[] = []): string[] => {
  const key = getSupplementKey(name);
  const labels = Array.from(
    new Set([
      ...customLabels,
      ...customLabels.map((label) => normalizeSupplementFileLabel(label)),
      name,
      normalizeSupplementFileLabel(name),
      ...SUPPLEMENT_PHOTO_ALIASES[key],
    ])
  ).filter(Boolean);
  const extensions = ["webp", "png", "jpg", "jpeg"];

  return labels.flatMap((label) => extensions.map((ext) => `${SUPPLEMENT_PHOTO_DIR}/${encodeURIComponent(label)}.${ext}`));
};

const getSupplementVisual = (name: string): SupplementVisual => {
  return SUPPLEMENT_VISUAL_LIBRARY[getSupplementKey(name)];
};

const QUIZ_STATE_KEY = "WEIGHT_LOSS_QUIZ_STATE";
const ENJOY_VOTE_KEY = "enjoyVote";
const LEGACY_ENJOY_VOTE_KEY = "WEIGHT_LOSS_QUIZ_ENJOY_VOTE";

const PROFILE_ORDER: ProfileType[] = [
  "structured_achiever",
  "busy_minimalist",
  "craving_crusher",
  "weekend_warrior",
  "momentum_builder",
];

const ARCHETYPE_VISUALS: Record<ProfileType, ArchetypeVisual> = {
  structured_achiever: {
    code: "SA",
    headline: "Built for precision, structure, and visible progress.",
    pillars: [
      { letter: "S", title: "Systems", detail: "You thrive on clear rules, routines, and checklists.", color: "#2F80ED" },
      { letter: "A", title: "Adjustments", detail: "You improve quickly when reviewing data weekly.", color: "#27AE60" },
      { letter: "R", title: "Results", detail: "Seeing measurable wins keeps motivation high.", color: "#F2994A" },
    ],
  },
  busy_minimalist: {
    code: "BM",
    headline: "Simple defaults beat complicated plans every time.",
    pillars: [
      { letter: "B", title: "Baselines", detail: "You need non-negotiable minimums that fit busy days.", color: "#1F78B4" },
      { letter: "M", title: "Minimalism", detail: "Low-friction meals and routines reduce decision fatigue.", color: "#33A02C" },
      { letter: "F", title: "Flow", detail: "Momentum comes from repeatable systems, not willpower spikes.", color: "#FF7F00" },
    ],
  },
  craving_crusher: {
    code: "CC",
    headline: "Satiety and trigger control are your superpower.",
    pillars: [
      { letter: "C", title: "Control", detail: "You win when high-risk trigger moments are pre-planned.", color: "#E31A1C" },
      { letter: "S", title: "Satiety", detail: "Protein + fiber structure lowers urge-driven eating.", color: "#FB9A99" },
      { letter: "R", title: "Resilience", detail: "One better response beats all-or-nothing cycles.", color: "#6A3D9A" },
    ],
  },
  weekend_warrior: {
    code: "WW",
    headline: "Your weekdays are strong; weekends are the unlock.",
    pillars: [
      { letter: "W", title: "Weekday Base", detail: "You already have a solid baseline routine in place.", color: "#1D4E89" },
      { letter: "G", title: "Guardrails", detail: "Pre-committed social rules prevent weekend drift.", color: "#F59E0B" },
      { letter: "R", title: "Recovery", detail: "Fast resets keep one event from becoming a lost week.", color: "#10B981" },
    ],
  },
  momentum_builder: {
    code: "MB",
    headline: "Small wins compound into long-term transformation.",
    pillars: [
      { letter: "M", title: "Momentum", detail: "Short daily wins create a streak worth protecting.", color: "#0EA5E9" },
      { letter: "C", title: "Confidence", detail: "You progress when goals feel achievable and repeatable.", color: "#22C55E" },
      { letter: "P", title: "Progression", detail: "Add intensity only after consistency is stable.", color: "#8B5CF6" },
    ],
  },
};

const PROFILES: Record<ProfileType, QuizProfile> = {
  structured_achiever: {
    label: "Structured Achiever",
    tag: "Data-friendly and routine-driven",
    description: [
      "You perform best when your plan is measurable, visible, and easy to review each week.",
      "Instead of relying on motivation, your progress accelerates when you use clear targets for protein, calories, and workouts.",
      "Your edge is consistency through structure, not extreme dieting.",
    ],
    firstFocus: "Build one simple dashboard this week: protein target, calorie range, steps, and strength sessions.",
    weekPlan: [
      { day: "Day 1", focus: "Set your scoreboard", details: "Define your calorie range, protein minimum, hydration goal, and daily step floor in one note app." },
      { day: "Day 2", focus: "Lock your meal framework", details: "Pick breakfast, lunch, and dinner templates so your weekdays run on autopilot." },
      { day: "Day 3", focus: "Strength session 1", details: "Complete a full-body lift and log sets/reps. Aim for 45-60 minutes." },
      { day: "Day 4", focus: "Audit hunger triggers", details: "Review yesterday's food log and identify where cravings or low-protein meals appeared." },
      { day: "Day 5", focus: "Strength session 2", details: "Repeat full-body or upper/lower split and keep progressive overload simple." },
      { day: "Day 6", focus: "Weekend guardrails", details: "Pre-plan social meals and define an alcohol/dessert cap before the day starts." },
      { day: "Day 7", focus: "Weekly review", details: "Check adherence, scale trend, and energy. Adjust one variable only for next week." },
    ],
    supplements: [
      { name: "Protein powder (whey or plant)", how: "Use 1 serving (20-35g protein) to close protein gaps.", why: "Higher protein supports satiety and helps preserve muscle during fat loss.", note: "Choose products with third-party testing when possible." },
      { name: "Creatine monohydrate", how: "3-5g daily, any time of day.", why: "Supports strength performance and lean mass while dieting.", note: "Can cause slight water retention; this is expected." },
      { name: "Psyllium husk fiber", how: "5-10g daily with plenty of water.", why: "Improves fullness and can make appetite control easier.", note: "Start low and increase gradually to avoid GI discomfort." },
    ],
    mentoring: [
      { label: "Noom", url: "https://www.noom.com/", note: "Behavior coaching and habit accountability for daily execution." },
      { label: "Precision Nutrition Coaching", url: "https://www.precisionnutrition.com/coaching", note: "Structured coaching with clear nutrition milestones." },
      { label: "Find a Registered Dietitian", url: "https://www.eatright.org/find-a-nutrition-expert", note: "Great option for personalized nutrition and medical context." },
    ],
    recipes: [
      { name: "Macro Power Bowl", why: "High-protein and easy to track for consistency.", build: "Chicken breast, quinoa, roasted vegetables, olive oil, and lemon." },
      { name: "Greek Yogurt Protein Parfait", why: "Fast, measurable breakfast with high satiety.", build: "Greek yogurt, whey scoop, berries, chia seeds, and almonds." },
      { name: "Sheet-Pan Salmon Plate", why: "Structured dinner template with protein + fiber.", build: "Salmon fillet, broccoli, sweet potato, garlic, and olive oil." },
    ],
    avoid: "Avoid perfection mode where one off-plan meal turns into an off-plan week.",
    timeline: "Expect visible momentum in 2-3 weeks with consistent tracking.",
    accent: COLORS.primary,
    bg: COLORS.accentLight,
  },
  busy_minimalist: {
    label: "Busy Minimalist",
    tag: "Low-friction habits win",
    description: [
      "You are not lacking discipline; your schedule is simply overloaded and decision fatigue is high.",
      "The best strategy for you is removing complexity so healthy choices happen automatically even on chaotic days.",
      "When your system is simple, your consistency can outperform more aggressive plans.",
    ],
    firstFocus: "Build a low-friction routine with repeatable meals, predictable shopping, and one movement minimum.",
    weekPlan: [
      { day: "Day 1", focus: "Create your emergency menu", details: "Write 3 quick meals and 2 snacks you can execute in under 10 minutes." },
      { day: "Day 2", focus: "Batch-prep basics", details: "Cook protein, prep vegetables, and pre-portion grab-and-go snacks." },
      { day: "Day 3", focus: "Movement minimum", details: "Set a realistic step floor and stack one 15-minute walk after a meal." },
      { day: "Day 4", focus: "Calendar-proof your plan", details: "Identify your busiest 2 blocks and pre-assign meals for those windows." },
      { day: "Day 5", focus: "Tighten your environment", details: "Place high-protein options at eye level and hide trigger snacks." },
      { day: "Day 6", focus: "Social simplicity", details: "Use one ordering rule for restaurants: protein first, then fiber, then carbs." },
      { day: "Day 7", focus: "Reset + refill", details: "Repeat grocery list, prep in 45 minutes, and lock in next week's defaults." },
    ],
    supplements: [
      { name: "Protein shake or RTD protein", how: "Use 1 serving when meals are rushed.", why: "Helps prevent low-protein days that drive late cravings.", note: "Look for 20g+ protein with low added sugar." },
      { name: "Magnesium glycinate", how: "200-350mg in the evening.", why: "May support sleep quality and recovery during stressful weeks.", note: "Avoid if it conflicts with your clinician's advice." },
      { name: "Psyllium fiber or fiber blend", how: "5g once daily to start.", why: "Helps with fullness and consistency when meals are light on produce.", note: "Increase water intake when adding fiber." },
    ],
    mentoring: [
      { label: "Noom", url: "https://www.noom.com/", note: "Good for behavior prompts and habit reminders on busy schedules." },
      { label: "WW (WeightWatchers)", url: "https://www.weightwatchers.com/", note: "Simple structure with flexible food choices." },
      { label: "Find a Registered Dietitian", url: "https://www.eatright.org/find-a-nutrition-expert", note: "Useful if you need a plan tailored to your weekly workflow." },
    ],
    recipes: [
      { name: "10-Minute Rotisserie Wrap", why: "Minimal prep for packed weekdays.", build: "Rotisserie chicken, whole-wheat wrap, spinach, hummus, cucumber." },
      { name: "Microwave Egg & Oats Bowl", why: "One-bowl breakfast with protein and fiber.", build: "Egg whites, spinach, quick oats, salsa, and shredded cheese." },
      { name: "Freezer Stir-Fry Shortcut", why: "Reliable low-friction dinner default.", build: "Frozen veggie mix, pre-cooked protein, microwave rice, soy-ginger sauce." },
    ],
    avoid: "Avoid overcomplicated plans with too many rules.",
    timeline: "Expect consistency gains in the first week and fat-loss trend in 3-4 weeks.",
    accent: "#6B705C",
    bg: "#ECEAE2",
  },
  craving_crusher: {
    label: "Craving Crusher",
    tag: "Appetite and triggers are the lever",
    description: [
      "Your main challenge is not effort, it is appetite pressure and trigger exposure across the day.",
      "When meals are more filling and your environment is engineered for success, cravings lose their power.",
      "You will make the fastest progress by improving satiety before increasing restriction.",
    ],
    firstFocus: "Design hunger-proof meals and reduce the number of high-trigger moments in your home and routine.",
    weekPlan: [
      { day: "Day 1", focus: "Satiety baseline", details: "Set a protein target per meal and add one high-fiber food at each eating occasion." },
      { day: "Day 2", focus: "Craving map", details: "Identify your top 3 trigger times and write a replacement plan for each." },
      { day: "Day 3", focus: "Kitchen reset", details: "Remove or portion high-trigger foods; place supportive options in front." },
      { day: "Day 4", focus: "Evening strategy", details: "Pre-log dinner and a planned snack to avoid unplanned grazing." },
      { day: "Day 5", focus: "Volume day", details: "Build high-volume plates (lean protein, vegetables, fruit, broth-based additions)." },
      { day: "Day 6", focus: "Stress response", details: "Use a 10-minute pause routine (walk, hydration, breathing) before reactive eating." },
      { day: "Day 7", focus: "Refine and repeat", details: "Review which swaps reduced cravings most and repeat those next week." },
    ],
    supplements: [
      { name: "Protein powder", how: "1 serving when meals are protein-light.", why: "Helps improve fullness and reduce rebound hunger.", note: "Avoid replacing every meal; use as a support tool." },
      { name: "Psyllium husk fiber", how: "5-10g daily split into 1-2 servings.", why: "Can improve satiety and reduce urge-driven snacking.", note: "Take with adequate water and separate from medications if advised." },
      { name: "Magnesium glycinate", how: "200-350mg in evening.", why: "May support sleep and stress regulation, which can reduce cravings.", note: "Check suitability with your clinician." },
    ],
    mentoring: [
      { label: "Noom", url: "https://www.noom.com/", note: "Helpful for mindset and trigger-awareness coaching." },
      { label: "WW (WeightWatchers)", url: "https://www.weightwatchers.com/", note: "Structure with behavior support and community accountability." },
      { label: "Find a Registered Dietitian", url: "https://www.eatright.org/find-a-nutrition-expert", note: "Useful for appetite strategy and medical personalization." },
    ],
    recipes: [
      { name: "Giant Crunch Salad", why: "High volume + protein to curb appetite.", build: "Lettuce, chicken, chickpeas, cucumbers, tomatoes, light dressing." },
      { name: "Chocolate Protein Pudding", why: "Satisfies dessert cravings in a controlled way.", build: "Greek yogurt, cocoa powder, protein powder, berries." },
      { name: "Taco Cauliflower Skillet", why: "Craving-friendly comfort meal with fewer calories.", build: "Lean ground turkey, cauliflower rice, salsa, black beans, avocado." },
    ],
    avoid: "Avoid long under-eating stretches that rebound into night overeating.",
    timeline: "Expect fewer cravings in 7-10 days and steadier fat loss by week 3.",
    accent: COLORS.warning,
    bg: COLORS.warningBg,
  },
  weekend_warrior: {
    label: "Weekend Warrior",
    tag: "Strong weekdays, loose weekends",
    description: [
      "Your weekday structure is solid, which means your results are mostly decided by 48 weekend hours.",
      "You do not need a stricter diet; you need a better social strategy before events begin.",
      "Once weekends become controlled instead of chaotic, body composition changes quickly.",
    ],
    firstFocus: "Install weekend guardrails early: pre-commitments for alcohol, portions, and post-event resets.",
    weekPlan: [
      { day: "Day 1", focus: "Weekend rules", details: "Set specific limits for drinks, desserts, and late-night eating." },
      { day: "Day 2", focus: "Protein front-load", details: "Hit protein at breakfast/lunch so evening social meals are easier to control." },
      { day: "Day 3", focus: "Restaurant playbook", details: "Use one plate method: protein anchor, vegetables, then optional extras." },
      { day: "Day 4", focus: "Event buffer", details: "Take a pre-event walk and hydrate before social meals." },
      { day: "Day 5", focus: "Alcohol strategy", details: "Alternate drinks with water and set a hard stop before the event starts." },
      { day: "Day 6", focus: "Damage-control protocol", details: "If off-plan, return immediately at next meal instead of waiting for Monday." },
      { day: "Day 7", focus: "Sunday reset", details: "Plan groceries, prep protein, and schedule workouts before bed." },
    ],
    supplements: [
      { name: "Protein powder", how: "Use 1 serving before high-risk social windows.", why: "Reduces appetite and improves portion control later.", note: "Keep a ready-to-mix serving on hand." },
      { name: "Electrolyte mix (sugar-free)", how: "Use in water around social events or after intense activity.", why: "Supports hydration and can reduce overeating driven by dehydration/fatigue.", note: "Pick lower-sodium options if medically needed." },
      { name: "Omega-3 (EPA/DHA)", how: "Use daily with meals per label guidance.", why: "May support overall health and recovery while improving routine consistency.", note: "Discuss dosing if you use blood-thinning medications." },
    ],
    mentoring: [
      { label: "Noom", url: "https://www.noom.com/", note: "Great for mindset around social eating patterns." },
      { label: "WW (WeightWatchers)", url: "https://www.weightwatchers.com/", note: "Flexible social eating framework with accountability." },
      { label: "Find a Registered Dietitian", url: "https://www.eatright.org/find-a-nutrition-expert", note: "Helpful for event-specific planning and sustainable fat loss." },
    ],
    recipes: [
      { name: "Restaurant-Style Fajita Plate", why: "Social-feel meal with built-in portion control.", build: "Grilled steak/chicken, peppers, onions, salsa, lettuce, small tortillas." },
      { name: "High-Protein Brunch Omelet", why: "Pre-social protein helps reduce later overeating.", build: "Eggs + egg whites, turkey, spinach, mushrooms, fruit on side." },
      { name: "Sunday Reset Chili", why: "Meal-prep anchor for post-weekend reset.", build: "Lean beef/turkey, tomatoes, beans, onions, bell peppers." },
    ],
    avoid: "Avoid the all-or-nothing reset mentality every Monday.",
    timeline: "Expect faster visible changes once weekends are controlled (2-4 weeks).",
    accent: "#A68A64",
    bg: "#F0E8D8",
  },
  momentum_builder: {
    label: "Momentum Builder",
    tag: "Confidence and consistency first",
    description: [
      "You will progress fastest by building confidence with repeatable wins, not by chasing extreme plans.",
      "Your body and mindset respond best when goals are realistic enough to maintain through stress and low-energy days.",
      "Once your streak is stable, intensity can increase without burnout.",
    ],
    firstFocus: "Protect a daily streak with one food habit and one movement habit that are almost impossible to miss.",
    weekPlan: [
      { day: "Day 1", focus: "Choose your two non-negotiables", details: "Example: protein at breakfast + 20-minute walk daily." },
      { day: "Day 2", focus: "Lower friction", details: "Place shoes and meal items where you can see them to reduce decision load." },
      { day: "Day 3", focus: "Track streak only", details: "Mark completion daily. Do not track perfection or macro precision yet." },
      { day: "Day 4", focus: "Energy checkpoint", details: "Rate mood, sleep, and hunger to spot what is already improving." },
      { day: "Day 5", focus: "Add one upgrade", details: "Add a second walk or a brief strength session if momentum feels good." },
      { day: "Day 6", focus: "Plan for hard days", details: "Define your minimum version of each habit for low-motivation days." },
      { day: "Day 7", focus: "Weekly reflection", details: "Review streak consistency and choose one small progression for next week." },
    ],
    supplements: [
      { name: "Protein powder", how: "1 serving on days protein intake is low.", why: "Supports satiety and habit consistency without complex meal prep.", note: "Use as support, not a replacement for whole foods." },
      { name: "Creatine monohydrate", how: "3-5g daily.", why: "Supports strength and performance as activity increases.", note: "Safe for most people, but check with your clinician if needed." },
      { name: "Magnesium glycinate", how: "200-350mg at night.", why: "Can help sleep quality and recovery, which improves follow-through.", note: "Stop if GI side effects occur and ask your clinician." },
    ],
    mentoring: [
      { label: "Noom", url: "https://www.noom.com/", note: "Behavior-focused prompts help maintain momentum day to day." },
      { label: "WW (WeightWatchers)", url: "https://www.weightwatchers.com/", note: "Simple framework with community accountability." },
      { label: "Find a Registered Dietitian", url: "https://www.eatright.org/find-a-nutrition-expert", note: "Good next step when you are ready to personalize further." },
    ],
    recipes: [
      { name: "2-2-2 Smoothie", why: "Easy repeatable meal to maintain streaks.", build: "2 scoops protein, 2 cups spinach, 2 cups frozen berries + water." },
      { name: "Build-Your-Own Nourish Bowl", why: "Flexible and forgiving for consistency days.", build: "Protein base, grain, roasted vegetables, avocado, simple dressing." },
      { name: "One-Pan Chicken & Sweet Potato", why: "Simple prep that feels like a complete win.", build: "Chicken thighs, sweet potato cubes, broccoli, olive oil, seasoning." },
    ],
    avoid: "Avoid jumping into aggressive plans that are hard to sustain.",
    timeline: "Expect habit confidence in 1-2 weeks and physical changes over 4+ weeks.",
    accent: "#4C7D5A",
    bg: "#E7F1EB",
  },
};

const RECIPE_DETAILS: Record<string, RecipeDetail> = {
  "Macro Power Bowl": {
    prepTime: "12 min",
    cookTime: "18 min",
    servings: "2",
    ingredients: [
      "10 oz chicken breast, cubed",
      "1 cup cooked quinoa",
      "2 cups mixed vegetables",
      "1 tbsp olive oil",
      "Lemon juice, salt, pepper",
    ],
    steps: [
      "Season chicken with salt and pepper and sear in olive oil until cooked through.",
      "Roast or saute vegetables until tender-crisp.",
      "Build bowls with quinoa, chicken, and vegetables.",
      "Finish with lemon juice and a drizzle of olive oil.",
    ],
  },
  "Greek Yogurt Protein Parfait": {
    prepTime: "6 min",
    cookTime: "0 min",
    servings: "1",
    ingredients: [
      "1 cup plain Greek yogurt",
      "1 scoop vanilla protein powder",
      "1/2 cup berries",
      "1 tbsp chia seeds",
      "1 tbsp sliced almonds",
    ],
    steps: [
      "Whisk protein powder into Greek yogurt until smooth.",
      "Layer yogurt mix and berries in a bowl or jar.",
      "Top with chia and almonds.",
      "Chill for 5 minutes or eat immediately.",
    ],
  },
  "Sheet-Pan Salmon Plate": {
    prepTime: "10 min",
    cookTime: "20 min",
    servings: "2",
    ingredients: [
      "2 salmon fillets",
      "2 cups broccoli florets",
      "1 medium sweet potato, cubed",
      "1 tbsp olive oil",
      "Garlic powder, paprika, salt, pepper",
    ],
    steps: [
      "Heat oven to 425F and line a sheet pan.",
      "Toss broccoli and sweet potato with half the oil and seasoning.",
      "Roast vegetables for 10 minutes, then add salmon.",
      "Brush salmon with remaining oil and roast 10-12 more minutes.",
    ],
  },
  "10-Minute Rotisserie Wrap": {
    prepTime: "10 min",
    cookTime: "0 min",
    servings: "1",
    ingredients: [
      "1 whole-wheat wrap",
      "4 oz rotisserie chicken",
      "1 tbsp hummus",
      "1 cup spinach",
      "Cucumber slices",
    ],
    steps: [
      "Spread hummus across the wrap.",
      "Layer chicken, spinach, and cucumber.",
      "Roll tightly and slice in half.",
      "Serve with fruit or carrots for extra fiber.",
    ],
  },
  "Microwave Egg & Oats Bowl": {
    prepTime: "4 min",
    cookTime: "4 min",
    servings: "1",
    ingredients: [
      "1/2 cup quick oats",
      "3/4 cup water",
      "3/4 cup egg whites",
      "1 cup spinach",
      "Salsa and shredded cheese",
    ],
    steps: [
      "Microwave oats with water for 90 seconds.",
      "Stir in egg whites and spinach.",
      "Microwave in 30-second bursts until eggs set.",
      "Top with salsa and a small amount of cheese.",
    ],
  },
  "Freezer Stir-Fry Shortcut": {
    prepTime: "6 min",
    cookTime: "10 min",
    servings: "2",
    ingredients: [
      "3 cups frozen stir-fry vegetables",
      "8 oz pre-cooked chicken or tofu",
      "2 cups microwave rice",
      "2 tbsp soy-ginger sauce",
    ],
    steps: [
      "Saute frozen vegetables in a hot pan until softened.",
      "Add protein and cook until heated through.",
      "Microwave rice and fold into the pan.",
      "Finish with soy-ginger sauce and serve.",
    ],
  },
  "Giant Crunch Salad": {
    prepTime: "12 min",
    cookTime: "0 min",
    servings: "1",
    ingredients: [
      "2 cups chopped romaine",
      "4 oz cooked chicken",
      "1/3 cup chickpeas",
      "Cucumber and tomato",
      "2 tbsp light vinaigrette",
    ],
    steps: [
      "Add greens to a large bowl.",
      "Top with chicken, chickpeas, cucumber, and tomato.",
      "Toss with vinaigrette right before eating.",
      "Add extra veggies for more volume if needed.",
    ],
  },
  "Chocolate Protein Pudding": {
    prepTime: "5 min",
    cookTime: "0 min",
    servings: "1",
    ingredients: [
      "3/4 cup plain Greek yogurt",
      "1/2 scoop chocolate protein powder",
      "1 tsp cocoa powder",
      "1/3 cup berries",
    ],
    steps: [
      "Mix yogurt, protein powder, and cocoa until thick.",
      "Adjust thickness with a splash of milk if needed.",
      "Top with berries.",
      "Chill 10 minutes for a pudding texture.",
    ],
  },
  "Taco Cauliflower Skillet": {
    prepTime: "8 min",
    cookTime: "15 min",
    servings: "2",
    ingredients: [
      "10 oz lean ground turkey",
      "3 cups cauliflower rice",
      "1/2 cup black beans",
      "1/2 cup salsa",
      "Taco seasoning and avocado",
    ],
    steps: [
      "Brown turkey with taco seasoning in a skillet.",
      "Add cauliflower rice and cook 4-5 minutes.",
      "Stir in black beans and salsa until warm.",
      "Serve topped with avocado slices.",
    ],
  },
  "Restaurant-Style Fajita Plate": {
    prepTime: "10 min",
    cookTime: "14 min",
    servings: "2",
    ingredients: [
      "10 oz sliced chicken or steak",
      "2 bell peppers, sliced",
      "1 onion, sliced",
      "Salsa, lettuce, and small tortillas",
      "1 tbsp oil and fajita seasoning",
    ],
    steps: [
      "Season protein and sear in a hot skillet.",
      "Cook peppers and onions until softened.",
      "Serve protein and vegetables over lettuce.",
      "Add salsa and 1-2 small tortillas on the side.",
    ],
  },
  "High-Protein Brunch Omelet": {
    prepTime: "6 min",
    cookTime: "8 min",
    servings: "1",
    ingredients: [
      "2 whole eggs + 1/2 cup egg whites",
      "2 oz turkey or chicken sausage",
      "1 cup spinach",
      "Mushrooms",
      "Fruit on the side",
    ],
    steps: [
      "Saute mushrooms and spinach until tender.",
      "Add turkey and warm through.",
      "Pour in eggs and cook until set.",
      "Fold omelet and serve with fruit.",
    ],
  },
  "Sunday Reset Chili": {
    prepTime: "12 min",
    cookTime: "28 min",
    servings: "4",
    ingredients: [
      "1 lb lean beef or turkey",
      "1 can diced tomatoes",
      "1 can beans, drained",
      "1 onion and 1 bell pepper",
      "Chili powder, cumin, garlic",
    ],
    steps: [
      "Brown meat with onion and bell pepper.",
      "Add tomatoes, beans, and seasonings.",
      "Simmer for 20 minutes, stirring occasionally.",
      "Portion into meal-prep containers.",
    ],
  },
  "2-2-2 Smoothie": {
    prepTime: "4 min",
    cookTime: "0 min",
    servings: "1",
    ingredients: [
      "2 scoops protein powder",
      "2 cups spinach",
      "2 cups frozen berries",
      "Water and ice as needed",
    ],
    steps: [
      "Add water first, then protein, spinach, and berries.",
      "Blend until fully smooth.",
      "Add extra ice for thicker texture.",
      "Drink immediately or refrigerate up to 24 hours.",
    ],
  },
  "Build-Your-Own Nourish Bowl": {
    prepTime: "10 min",
    cookTime: "12 min",
    servings: "2",
    ingredients: [
      "8 oz cooked protein",
      "1 cup cooked grain",
      "2 cups roasted vegetables",
      "1/2 avocado",
      "Simple olive-oil vinaigrette",
    ],
    steps: [
      "Cook grain and roast vegetables.",
      "Warm or cook your protein source.",
      "Assemble bowls with grain, protein, and vegetables.",
      "Top with avocado and vinaigrette.",
    ],
  },
  "One-Pan Chicken & Sweet Potato": {
    prepTime: "10 min",
    cookTime: "30 min",
    servings: "3",
    ingredients: [
      "1 lb chicken thighs",
      "2 medium sweet potatoes, cubed",
      "2 cups broccoli florets",
      "1 tbsp olive oil",
      "Salt, pepper, garlic powder",
    ],
    steps: [
      "Heat oven to 425F and prep a sheet pan.",
      "Toss chicken, sweet potatoes, and broccoli with oil and seasoning.",
      "Spread evenly and roast 25-30 minutes.",
      "Flip midway through cooking for even browning.",
    ],
  },
};

const QUESTIONS: QuizQuestion[] = [
  {
    id: "vision_goal",
    prompt: "Let's start with your vision: what outcome matters most right now?",
    hint: "Pick the result that would make you feel the most proud.",
    icon: <Trophy size={20} />,
    choices: [
      {
        id: "vision_scale_down",
        title: "Drop body weight steadily",
        detail: "I want measurable fat-loss progress.",
        scores: { structured_achiever: 2, craving_crusher: 1, busy_minimalist: 1 },
      },
      {
        id: "vision_more_energy",
        title: "Feel more energized every day",
        detail: "I want energy and momentum back.",
        scores: { momentum_builder: 2, busy_minimalist: 1, craving_crusher: 1 },
      },
      {
        id: "vision_confidence",
        title: "Feel confident in my body",
        detail: "I want to feel proud in photos and clothes.",
        scores: { weekend_warrior: 2, structured_achiever: 1, momentum_builder: 1 },
      },
      {
        id: "vision_health",
        title: "Improve my long-term health",
        detail: "I want better markers and sustainable habits.",
        scores: { structured_achiever: 2, momentum_builder: 2 },
      },
    ],
  },
  {
    id: "vision_dream",
    prompt: "If this plan works, what would feel most exciting in 3 months?",
    hint: "This helps us design for motivation, not just discipline.",
    icon: <Sparkles size={20} />,
    choices: [
      {
        id: "dream_clothes",
        title: "Clothes fit and look better",
        detail: "I want to see visible changes in the mirror.",
        scores: { structured_achiever: 1, weekend_warrior: 2, craving_crusher: 1 },
      },
      {
        id: "dream_energy",
        title: "Wake up with energy and focus",
        detail: "I want to feel stronger and less sluggish.",
        scores: { momentum_builder: 2, busy_minimalist: 1, craving_crusher: 1 },
      },
      {
        id: "dream_consistency",
        title: "Finally stay consistent",
        detail: "I want to trust myself to follow through.",
        scores: { momentum_builder: 2, busy_minimalist: 2 },
      },
      {
        id: "dream_strength",
        title: "Look and perform like an athlete",
        detail: "I want to train hard and see body recomposition.",
        scores: { structured_achiever: 3, weekend_warrior: 1 },
      },
    ],
  },
  {
    id: "vision_change",
    prompt: "What do you most want to change first?",
    hint: "We'll prioritize your biggest leverage point.",
    icon: <Target size={20} />,
    choices: [
      {
        id: "change_eating_structure",
        title: "My eating structure",
        detail: "I need better daily meal rhythm.",
        scores: { structured_achiever: 2, busy_minimalist: 2 },
      },
      {
        id: "change_cravings",
        title: "Cravings and snacking",
        detail: "I need better appetite control.",
        scores: { craving_crusher: 3, momentum_builder: 1 },
      },
      {
        id: "change_consistency",
        title: "Consistency and follow-through",
        detail: "I need habits that stick on busy days.",
        scores: { momentum_builder: 3, busy_minimalist: 1 },
      },
      {
        id: "change_social_control",
        title: "Social and weekend control",
        detail: "I need a strategy for events and weekends.",
        scores: { weekend_warrior: 3, craving_crusher: 1 },
      },
    ],
  },
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

const QUESTION_CHOICE_LOOKUP = new Map(
  QUESTIONS.map((question) => [
    question.id,
    new Set(question.choices.map((choice) => choice.id)),
  ])
);

const trackEvent = (event: string, data?: Record<string, any>, apiBaseUrl?: string) => {
  const endpoint = buildApiUrl(apiBaseUrl || "", "/api/track");
  fetch(endpoint, {
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
    const fromGlobal = normalizeApiBaseUrl((window as any).__WEIGHT_LOSS_QUIZ_API_BASE_URL__);
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

function SupplementPhoto({
  name,
  fallbackImage,
  customLabels,
}: {
  name: string;
  fallbackImage: string;
  customLabels?: string[];
}) {
  const candidates = useMemo(() => buildSupplementPhotoCandidates(name, customLabels), [name, customLabels]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    setCandidateIndex(0);
    setUseFallback(false);
  }, [name, customLabels]);

  const handleImageError = () => {
    if (useFallback) return;
    if (candidateIndex < candidates.length - 1) {
      setCandidateIndex((prev) => prev + 1);
      return;
    }
    setUseFallback(true);
  };

  return (
    <img
      src={useFallback ? fallbackImage : candidates[candidateIndex]}
      alt={name}
      style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }}
      onError={handleImageError}
    />
  );
}

const sanitizeAnswers = (value: unknown): QuizAnswerMap => {
  if (!value || typeof value !== "object") return {};
  const input = value as Record<string, unknown>;
  const cleaned: QuizAnswerMap = {};

  QUESTIONS.forEach((question) => {
    const candidate = input[question.id];
    const validChoices = QUESTION_CHOICE_LOOKUP.get(question.id);
    if (typeof candidate === "string" && validChoices?.has(candidate)) {
      cleaned[question.id] = candidate;
    }
  });

  return cleaned;
};

const getSavedAnswers = (): QuizAnswerMap => {
  try {
    const raw = localStorage.getItem(QUIZ_STATE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.answers && typeof parsed.answers === "object") {
      return sanitizeAnswers(parsed.answers);
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
  const containerRef = useRef<HTMLDivElement | null>(null);
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
  const [showHomeScreen, setShowHomeScreen] = useState(() => {
    const saved = getSavedAnswers();
    return !QUESTIONS.every((q) => Boolean(saved[q.id]));
  });

  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [subscribeMessage, setSubscribeMessage] = useState("");

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [pillRight, setPillRight] = useState(16);

  const [enjoyVote, setEnjoyVote] = useState<"up" | "down" | null>(() => {
    try {
      const saved = localStorage.getItem(ENJOY_VOTE_KEY) || localStorage.getItem(LEGACY_ENJOY_VOTE_KEY);
      return saved === "up" || saved === "down" ? saved : null;
    } catch {
      return null;
    }
  });

  const [copied, setCopied] = useState(false);
  const [expandedRecipes, setExpandedRecipes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      localStorage.setItem(QUIZ_STATE_KEY, JSON.stringify({ answers, updatedAt: Date.now() }));
    } catch {
      // no-op
    }
  }, [answers]);

  useEffect(() => {
    track("quiz_view", { fromHydration: Boolean(initialData && Object.keys(initialData).length > 0) });
  }, [initialData]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updatePillPosition = () => {
      const container = containerRef.current;
      if (!container) {
        setPillRight(16);
        return;
      }
      const rect = container.getBoundingClientRect();
      const nextRight = Math.max(16, window.innerWidth - rect.right + 16);
      setPillRight((prev) => (Math.abs(prev - nextRight) < 1 ? prev : nextRight));
    };

    updatePillPosition();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      resizeObserver = new ResizeObserver(updatePillPosition);
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener("resize", updatePillPosition);
    window.addEventListener("scroll", updatePillPosition, true);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updatePillPosition);
      window.removeEventListener("scroll", updatePillPosition, true);
    };
  }, [showHomeScreen, showResults]);

  const answeredCount = Math.min(Object.keys(answers).length, QUESTIONS.length);
  const progress = Math.min(100, Math.round((answeredCount / QUESTIONS.length) * 100));
  const activeQuestion = QUESTIONS[Math.min(currentIndex, QUESTIONS.length - 1)];
  const isVisionStage = !showResults && currentIndex < 3;

  const scores = useMemo(() => scoreQuiz(answers), [answers]);
  const topProfile = useMemo(() => pickTopProfile(scores), [scores]);
  const profile = PROFILES[topProfile];
  const archetypeVisual = ARCHETYPE_VISUALS[topProfile];
  const maxScore = Math.max(...Object.values(scores), 1);
  const currentScreen = showHomeScreen ? "home" : showResults ? "results" : "quiz";
  const track = (event: string, data?: Record<string, any>) => {
    trackEvent(event, data, apiBaseUrl);
  };

  const handleAnswer = (questionId: string, choiceId: string) => {
    const nextAnswers = { ...answers, [questionId]: choiceId };
    setAnswers(nextAnswers);
    track("quiz_answered", { questionId, choiceId, answeredCount: Object.keys(nextAnswers).length });

    const isLastQuestion = currentIndex >= QUESTIONS.length - 1;
    if (isLastQuestion) {
      setShowResults(true);
      track("quiz_completed", { profile: pickTopProfile(scoreQuiz(nextAnswers)) });
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
    setShowHomeScreen(true);
    setExpandedRecipes({});
    setCopied(false);
    try {
      localStorage.removeItem(QUIZ_STATE_KEY);
    } catch {
      // no-op
    }
    track("quiz_reset");
  };

  const handleStartQuiz = () => {
    setShowHomeScreen(false);
    track("quiz_started", { resumed: answeredCount > 0 });
  };

  const handleOpenSubscribeModal = () => {
    setShowSubscribeModal(true);
    setSubscribeStatus("idle");
    setSubscribeMessage("");
    track("subscribe_click", { tool: "weight-loss-quiz", screen: currentScreen });
  };

  const handleOpenFeedbackModal = () => {
    setShowFeedbackModal(true);
    setFeedbackStatus("idle");
    track("feedback_click", { tool: "weight-loss-quiz", screen: currentScreen });
  };

  const handleFooterReset = () => {
    track("reset_click", { tool: "weight-loss-quiz", screen: currentScreen });
    handleRestart();
  };

  const handleDonateClick = () => {
    track("donate_click", { tool: "weight-loss-quiz", screen: currentScreen, status: "coming_soon" });
  };

  const handlePrint = () => {
    track("print_click", { tool: "weight-loss-quiz", screen: currentScreen });
    window.setTimeout(() => {
      window.print();
    }, 40);
  };

  const handleCopyPlan = async () => {
    const text = [
      `Weight-Loss Quiz Result: ${profile.label}`,
      `Archetype code: ${archetypeVisual.code}`,
      archetypeVisual.headline,
      ...archetypeVisual.pillars.map((pillar) => `${pillar.letter} - ${pillar.title}: ${pillar.detail}`),
      ...profile.description,
      `First focus: ${profile.firstFocus}`,
      "7 Day Plan:",
      ...profile.weekPlan.map((entry) => `${entry.day}: ${entry.focus} - ${entry.details}`),
      "Supplements:",
      ...FEATURED_SUPPLEMENTS.map((item) => `- ${item.name}: ${item.amazonUrl}`),
      "Guidance And Mentorship:",
      ...profile.mentoring.map((item) => `- ${item.label}: ${item.url} (${item.note})`),
      "Personalized Recipes:",
      ...profile.recipes.map((item) => `- ${item.name}: ${item.why} Build: ${item.build}`),
      `Avoid: ${profile.avoid}`,
      `Timeline: ${profile.timeline}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      track("quiz_copy_plan", { profile: profile.label });
    } catch {
      setCopied(false);
    }
  };

  const handleEnjoyVote = (vote: "up" | "down") => {
    setEnjoyVote(vote);
    try {
      localStorage.setItem(ENJOY_VOTE_KEY, vote);
      localStorage.setItem(LEGACY_ENJOY_VOTE_KEY, vote);
    } catch {
      // no-op
    }
    track("enjoy_vote", { vote, tool: "weight-loss-quiz" });
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
          sourceWidget: "weight-loss-quiz",
          sourceScreen: currentScreen,
        }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setSubscribeStatus("success");
        setSubscribeMessage(data.message || "Subscribed.");
        track("notify_me_subscribe", {
          topic: "weight-loss-quiz-news",
          sourceWidget: "weight-loss-quiz",
          sourceScreen: currentScreen,
        });
      } else {
        setSubscribeStatus("error");
        setSubscribeMessage(data.error || "Unable to subscribe right now.");
        track("notify_me_subscribe_error", {
          topic: "weight-loss-quiz-news",
          sourceWidget: "weight-loss-quiz",
          sourceScreen: currentScreen,
          reason: data.error || "unknown_error",
        });
      }
    } catch {
      setSubscribeStatus("error");
      setSubscribeMessage("Network error. Please try again.");
      track("notify_me_subscribe_error", {
        topic: "weight-loss-quiz-news",
        sourceWidget: "weight-loss-quiz",
        sourceScreen: currentScreen,
        reason: "network_error",
      });
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
      track("user_feedback", { profile: profile.label, enjoymentVote: enjoyVote || null });
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
        fontFamily: FONTS.body,
      }}
    >
      <div
        ref={containerRef}
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
          {!showResults && showHomeScreen && (
            <div style={{ animation: "floatIn 260ms ease" }}>
              <div
                style={{
                  borderRadius: 18,
                  padding: 18,
                  border: `1px solid ${COLORS.borderLight}`,
                  background: `radial-gradient(circle at top right, #E5EFE8 0%, #F7F3EC 42%, #FFFFFF 100%)`,
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    borderRadius: 999,
                    padding: "6px 10px",
                    border: `1px solid ${COLORS.border}`,
                    backgroundColor: "rgba(255,255,255,0.8)",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                    color: COLORS.primaryDark,
                  }}
                >
                  <Sparkles size={13} /> Weight-Loss Blueprint Quiz
                </div>

                <h1 style={{ margin: "12px 0 8px", fontSize: 30, lineHeight: 1.08, fontFamily: FONTS.display }}>
                  Take the 2-minute quiz to get your fat-loss blueprint.
                </h1>
                <p style={{ margin: "0 0 10px", color: COLORS.textSecondary, fontSize: 14, lineHeight: 1.5 }}>
                  Start the quiz now to identify your archetype and finish with a personalized 7-day plan, custom recipes,
                  and supplement suggestions matched to your habits.
                </p>

                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    borderRadius: 999,
                    border: `1px solid ${COLORS.border}`,
                    backgroundColor: "rgba(255,255,255,0.86)",
                    padding: "7px 11px",
                    marginBottom: 14,
                    fontSize: 12,
                    color: COLORS.primaryDark,
                    fontWeight: 700,
                  }}
                >
                  <ArrowRight size={13} /> Tap “Take the quiz now” to begin
                </div>

                <div style={{ display: "grid", gap: 9, marginBottom: 14 }}>
                  {[
                    {
                      icon: <Target size={15} color={COLORS.primaryDark} />,
                      title: "Know your archetype",
                      detail: "Learn the exact behavior pattern that is driving your fat-loss results.",
                    },
                    {
                      icon: <BarChart3 size={15} color={COLORS.primaryDark} />,
                      title: "Get a personalized 7-day plan",
                      detail: "Receive clear daily actions for your first week.",
                    },
                    {
                      icon: <Heart size={15} color={COLORS.primaryDark} />,
                      title: "Unlock custom recipes",
                      detail: "See practical recipe ideas built for your profile.",
                    },
                    {
                      icon: <Timer size={15} color={COLORS.primaryDark} />,
                      title: "Get supplement suggestions",
                      detail: "Review 3 tailored supplement picks with buy links.",
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      style={{
                        display: "flex",
                        gap: 9,
                        alignItems: "flex-start",
                        borderRadius: 11,
                        border: `1px solid ${COLORS.borderLight}`,
                        padding: "10px 11px",
                        backgroundColor: "rgba(255,255,255,0.82)",
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          flexShrink: 0,
                          borderRadius: 8,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: COLORS.accentLight,
                        }}
                      >
                        {item.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textMain }}>{item.title}</div>
                        <div style={{ fontSize: 12, color: COLORS.textSecondary, lineHeight: 1.4 }}>{item.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  className="btn-press"
                  onClick={handleStartQuiz}
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    border: "none",
                    background: `linear-gradient(90deg, ${COLORS.primaryDark}, ${COLORS.primary})`,
                    color: "white",
                    fontWeight: 800,
                    fontSize: 15,
                    padding: "12px 14px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  {answeredCount > 0 ? "Resume quiz" : "Take the quiz now"}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {!showResults && !showHomeScreen && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, letterSpacing: 0.3, textTransform: "uppercase" }}>
                    Weight-Loss Blueprint Quiz
                  </div>
                  <h1 style={{ margin: "6px 0 0", fontSize: 24, lineHeight: 1.15, fontFamily: FONTS.display }}>Find your easiest fat-loss strategy</h1>
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
                  {`${answeredCount}/${QUESTIONS.length}`}
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <div style={{ height: 8, borderRadius: 999, backgroundColor: COLORS.inputBg, border: `1px solid ${COLORS.borderLight}` }}>
                  <div
                    style={{
                      width: `${progress}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: `linear-gradient(90deg, ${COLORS.primaryDark}, ${COLORS.primary})`,
                      transition: "width 220ms ease",
                    }}
                  />
                </div>
              </div>
            </>
          )}

          {!showResults && !showHomeScreen && activeQuestion && (
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
                {isVisionStage ? `Vision step ${currentIndex + 1} of 3` : `Question ${currentIndex + 1}`}
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
                      track("quiz_completed", { profile: topProfile });
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
                  padding: 18,
                  marginBottom: 14,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: profile.accent, textTransform: "uppercase", letterSpacing: 0.4 }}>
                  Your archetype
                </div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8 }}>
                  <div
                    style={{
                      minWidth: 120,
                      flex: "0 0 120px",
                      borderRadius: 14,
                      background: `linear-gradient(160deg, ${profile.accent} 0%, ${COLORS.primaryDark} 100%)`,
                      color: "#fff",
                      padding: "10px 8px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      alignItems: "center",
                      boxShadow: "0 10px 22px rgba(0,0,0,0.16)",
                    }}
                  >
                    <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1, opacity: 0.9 }}>Type</div>
                    <div style={{ fontSize: 52, lineHeight: 1, fontWeight: 800, fontFamily: FONTS.display }}>{archetypeVisual.code}</div>
                    <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, opacity: 0.9 }}>Archetype</div>
                  </div>

                  <div style={{ flex: "1 1 280px" }}>
                    <h2 style={{ margin: "0 0 4px", fontSize: 40, lineHeight: 1.02, fontFamily: FONTS.display }}>{profile.label}</h2>
                    <p style={{ margin: 0, fontSize: 16, color: COLORS.textSecondary }}>{profile.tag}</p>
                    <p style={{ margin: "10px 0 0", fontSize: 15, lineHeight: 1.45, color: COLORS.textMain }}>{archetypeVisual.headline}</p>
                  </div>
                </div>

                <div style={{ marginTop: 12, display: "grid", gap: 7 }}>
                  {archetypeVisual.pillars.map((pillar, idx) => (
                    <div
                      key={pillar.title}
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: `1px solid ${COLORS.borderLight}`,
                        backgroundColor: "#FCFCFA",
                      }}
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 9,
                          backgroundColor: pillar.color,
                          color: "#fff",
                          fontSize: 20,
                          fontWeight: 800,
                          lineHeight: "34px",
                          textAlign: "center",
                          flexShrink: 0,
                          fontFamily: FONTS.display,
                        }}
                      >
                        {pillar.letter}
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, fontFamily: FONTS.display }}>{pillar.title}</div>
                        <div style={{ fontSize: 14, color: COLORS.textSecondary, lineHeight: 1.4 }}>{pillar.detail}</div>
                        {profile.description[idx] && (
                          <div style={{ marginTop: 6, fontSize: 14, color: COLORS.textMain, lineHeight: 1.45 }}>
                            {profile.description[idx]}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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
                <h3 style={{ margin: "0 0 8px", fontSize: 18, fontFamily: FONTS.display }}>Your first focus</h3>
                <p style={{ margin: "0 0 12px", fontSize: 15, color: COLORS.textSecondary, lineHeight: 1.5 }}>{profile.firstFocus}</p>

                <details
                  style={{
                    marginBottom: 10,
                    border: `1px solid ${COLORS.borderLight}`,
                    borderRadius: 10,
                    backgroundColor: COLORS.card,
                    padding: "8px 10px",
                  }}
                >
                  <summary style={{ cursor: "pointer", fontSize: 15, fontWeight: 700, color: COLORS.textMain, fontFamily: FONTS.display }}>
                    7 Day Plan
                  </summary>
                  <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                    {profile.weekPlan.map((entry) => (
                      <div
                        key={entry.day}
                        style={{
                          border: `1px solid ${COLORS.borderLight}`,
                          borderRadius: 10,
                          padding: 10,
                          backgroundColor: COLORS.card,
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.primaryDark }}>{entry.day}</div>
                        <div style={{ marginTop: 2, fontSize: 15, fontWeight: 700, fontFamily: FONTS.display }}>{entry.focus}</div>
                        <div style={{ marginTop: 3, fontSize: 14, color: COLORS.textSecondary, lineHeight: 1.45 }}>{entry.details}</div>
                      </div>
                    ))}

                    <div
                      style={{
                        marginTop: 2,
                        padding: 10,
                        borderRadius: 10,
                        backgroundColor: COLORS.warningBg,
                        border: `1px solid #EBD9BA`,
                        fontSize: 14,
                        lineHeight: 1.45,
                        color: "#6F4D1A",
                      }}
                    >
                      <strong>Avoid this:</strong> {profile.avoid}
                    </div>

                    <div style={{ marginTop: 2, fontSize: 14, lineHeight: 1.45, color: COLORS.textSecondary }}>{profile.timeline}</div>
                  </div>
                </details>

                <details
                  style={{
                    marginBottom: 2,
                    border: `1px solid ${COLORS.borderLight}`,
                    borderRadius: 10,
                    backgroundColor: COLORS.card,
                    padding: "8px 10px",
                    marginTop: 10,
                  }}
                >
                  <summary style={{ cursor: "pointer", fontSize: 15, fontWeight: 700, color: COLORS.textMain, fontFamily: FONTS.display }}>
                    Personalized Recipes
                  </summary>
                  <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                    {profile.recipes.map((item) => {
                      const details = RECIPE_DETAILS[item.name];
                      const isExpanded = Boolean(expandedRecipes[item.name]);

                      return (
                        <div
                          key={item.name}
                          style={{
                            padding: "10px 11px",
                            borderRadius: 9,
                            border: `1px solid ${COLORS.borderLight}`,
                            backgroundColor: "#FCFCFA",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                            <div>
                              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: FONTS.display }}>{item.name}</div>
                              <div style={{ fontSize: 14, lineHeight: 1.45, color: COLORS.textSecondary, marginTop: 2 }}>{item.why}</div>
                            </div>
                            <button
                              className="btn-press"
                              onClick={() => setExpandedRecipes((prev) => ({ ...prev, [item.name]: !isExpanded }))}
                              style={{
                                borderRadius: 8,
                                border: `1px solid ${COLORS.border}`,
                                backgroundColor: "white",
                                color: COLORS.primaryDark,
                                fontSize: 12,
                                fontWeight: 700,
                                padding: "6px 10px",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {isExpanded ? "Hide" : "Expand"}
                            </button>
                          </div>

                          <div style={{ fontSize: 14, lineHeight: 1.45, color: COLORS.textMain, marginTop: 5 }}>
                            <strong>Build:</strong> {item.build}
                          </div>

                          {isExpanded && details && (
                            <div style={{ marginTop: 8, borderTop: `1px solid ${COLORS.borderLight}`, paddingTop: 8 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.primaryDark }}>
                                {details.prepTime} prep · {details.cookTime} cook · Serves {details.servings}
                              </div>
                              <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: COLORS.textMain }}>Ingredients</div>
                              <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.45 }}>
                                {details.ingredients.map((ingredient) => (
                                  <li key={ingredient}>{ingredient}</li>
                                ))}
                              </ul>

                              <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: COLORS.textMain }}>Recipe</div>
                              <ol style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.45 }}>
                                {details.steps.map((step) => (
                                  <li key={step}>{step}</li>
                                ))}
                              </ol>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </details>

                <details
                  style={{
                    marginBottom: 10,
                    border: `1px solid ${COLORS.borderLight}`,
                    borderRadius: 10,
                    backgroundColor: COLORS.card,
                    padding: "8px 10px",
                  }}
                >
                  <summary style={{ cursor: "pointer", fontSize: 15, fontWeight: 700, color: COLORS.textMain, fontFamily: FONTS.display }}>
                    Supplements
                  </summary>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginTop: 10 }}>
                    {FEATURED_SUPPLEMENTS.map((item) => {
                      const visual = getSupplementVisual(item.name);
                      return (
                        <a
                          key={item.name}
                          href={item.amazonUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            textDecoration: "none",
                            borderRadius: 10,
                            border: `1px solid ${COLORS.borderLight}`,
                            backgroundColor: "#FFFFFF",
                            overflow: "hidden",
                            minHeight: 214,
                          }}
                        >
                          <SupplementPhoto name={item.name} fallbackImage={visual.image} customLabels={item.photoLabels} />
                          <div
                            style={{
                              padding: "11px 10px 9px",
                              display: "flex",
                              flexDirection: "column",
                              gap: 6,
                              flex: 1,
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: COLORS.textMain,
                                lineHeight: 1.35,
                                minHeight: 32,
                                maxHeight: 32,
                                width: "100%",
                                textAlign: "center",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                wordBreak: "break-word",
                              }}
                            >
                              {item.cardTitle}
                            </div>
                            <span
                              style={{
                                marginTop: 4,
                                alignSelf: "center",
                                fontSize: 11,
                                color: COLORS.primaryDark,
                                fontWeight: 500,
                                textTransform: "uppercase",
                                letterSpacing: 0.3,
                                borderRadius: 999,
                                border: `1px solid ${COLORS.border}`,
                                padding: "4px 8px",
                                backgroundColor: COLORS.inputBg,
                              }}
                            >
                              View details
                            </span>
                          </div>
                        </a>
                      );
                    })}
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      padding: 10,
                      borderRadius: 10,
                      backgroundColor: "#F8F7F3",
                      border: `1px solid ${COLORS.borderLight}`,
                      fontSize: 13,
                      lineHeight: 1.45,
                      color: COLORS.textSecondary,
                    }}
                  >
                    Supplements are optional and not medical advice. Check with your clinician, especially if you use prescription medications or have health conditions.
                  </div>
                </details>

                <details
                  style={{
                    marginBottom: 2,
                    border: `1px solid ${COLORS.borderLight}`,
                    borderRadius: 10,
                    backgroundColor: COLORS.card,
                    padding: "8px 10px",
                  }}
                >
                  <summary style={{ cursor: "pointer", fontSize: 15, fontWeight: 700, color: COLORS.textMain, fontFamily: FONTS.display }}>
                    Guidance And Mentorship
                  </summary>
                  <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                    {profile.mentoring.map((item) => (
                      <div key={item.label} style={{ fontSize: 14, lineHeight: 1.45 }}>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: COLORS.primaryDark, fontWeight: 700, textDecoration: "none", fontFamily: FONTS.display }}
                        >
                          {item.label}
                        </a>
                        <div style={{ color: COLORS.textSecondary }}>{item.note}</div>
                      </div>
                    ))}
                  </div>
                </details>
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

          {!showHomeScreen && (
            <>
              <div
                style={{
                  marginTop: 18,
                  paddingTop: 14,
                  borderTop: `1px solid ${COLORS.borderLight}`,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  justifyContent: "center",
                }}
              >
                <button
                  className="btn-press"
                  onClick={handleOpenSubscribeModal}
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
                  <Mail size={14} /> Subscribe
                </button>

                <button
                  className="btn-press"
                  onClick={handleFooterReset}
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
                  <RotateCcw size={14} /> Reset
                </button>

                <button
                  className="btn-press"
                  onClick={handleDonateClick}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    borderRadius: 10,
                    border: `1px solid ${COLORS.border}`,
                    backgroundColor: "white",
                    padding: "8px 10px",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Donate
                </button>

                <button
                  className="btn-press"
                  onClick={handleOpenFeedbackModal}
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

                <button
                  className="btn-press"
                  onClick={handlePrint}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    borderRadius: 10,
                    border: `1px solid ${COLORS.border}`,
                    backgroundColor: "white",
                    padding: "8px 10px",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Print
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {showResults && !showHomeScreen && !enjoyVote && (
        <div
          className="no-print"
          style={{
            position: "fixed",
            right: pillRight,
            bottom: 16,
            zIndex: 15,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              pointerEvents: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              borderRadius: 999,
              border: `1px solid ${COLORS.border}`,
              backgroundColor: "white",
              boxShadow: "0 8px 24px rgba(26,26,26,0.12)",
              padding: "8px 10px",
            }}
          >
            <span style={{ color: COLORS.textMain, fontWeight: 700, fontSize: 13 }}>Enjoying this app?</span>
            <button
              onClick={() => handleEnjoyVote("up")}
              className="btn-press"
              aria-label="Thumbs up"
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                border: `1px solid ${COLORS.border}`,
                backgroundColor: "#EFFAF4",
                color: COLORS.primary,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <ThumbsUp size={16} />
            </button>
            <button
              onClick={() => handleEnjoyVote("down")}
              className="btn-press"
              aria-label="Thumbs down"
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                border: `1px solid ${COLORS.border}`,
                backgroundColor: "#FFF1F0",
                color: COLORS.danger,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <ThumbsDown size={16} />
            </button>
          </div>
        </div>
      )}

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
            {enjoyVote && (
              <div
                style={{
                  marginBottom: 10,
                  borderRadius: 10,
                  border: `1px solid ${enjoyVote === "up" ? "#BCE3C7" : "#F1C2BD"}`,
                  backgroundColor: enjoyVote === "up" ? "#EFFAF4" : "#FFF1F0",
                  color: enjoyVote === "up" ? COLORS.primaryDark : COLORS.danger,
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "8px 10px",
                }}
              >
                {enjoyVote === "up"
                  ? "Thanks for the thumbs up. What did you enjoy most?"
                  : "Thanks for the honest feedback. What should we improve first?"}
              </div>
            )}
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder={
                enjoyVote === "up"
                  ? "What worked best for you? Any ideas to make it even better?"
                  : enjoyVote === "down"
                    ? "What felt confusing, broken, or missing?"
                    : "What felt useful, confusing, or missing?"
              }
              style={{
                display: "block",
                width: "100%",
                minHeight: 110,
                borderRadius: 10,
                border: `1px solid ${COLORS.border}`,
                padding: 10,
                fontSize: 13,
                resize: "vertical",
                boxSizing: "border-box",
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
