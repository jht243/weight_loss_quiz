import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import fs from "node:fs";
import path from "node:path";
import { URL, fileURLToPath } from "node:url";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  type CallToolRequest,
  type ListResourceTemplatesRequest,
  type ListResourcesRequest,
  type ListToolsRequest,
  type ReadResourceRequest,
  type Resource,
  type ResourceTemplate,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

type WeightLossQuizWidget = {
  id: string;
  title: string;
  templateUri: string;
  invoking: string;
  invoked: string;
  html: string;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve project root: prefer ASSETS_ROOT only if it actually has an assets/ directory
const DEFAULT_ROOT_DIR = path.resolve(__dirname, "..");
const ROOT_DIR = (() => {
  const envRoot = process.env.ASSETS_ROOT;
  if (envRoot) {
    const candidate = path.resolve(envRoot);
    try {
      const candidateAssets = path.join(candidate, "assets");
      if (fs.existsSync(candidateAssets)) {
        return candidate;
      }
    } catch {
      // fall through to default
    }
  }
  return DEFAULT_ROOT_DIR;
})();

const ASSETS_DIR = path.resolve(ROOT_DIR, "assets");
const LOGS_DIR = path.resolve(__dirname, "..", "logs");
const portEnv = Number(process.env.PORT ?? 8000);
const port = Number.isFinite(portEnv) ? portEnv : 8000;

const normalizeOrigin = (value?: string): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, "");
};

const WIDGET_API_BASE_URL = normalizeOrigin(
  process.env.WIDGET_API_BASE_URL ||
  process.env.PUBLIC_API_BASE_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  `http://localhost:${port}`
) || `http://localhost:${port}`;

const LOCALHOST_API_ORIGIN = `http://localhost:${port}`;
const LOCALHOST_LOOPBACK_API_ORIGIN = `http://127.0.0.1:${port}`;

const WIDGET_CONNECT_DOMAINS = Array.from(
  new Set([
    WIDGET_API_BASE_URL,
    LOCALHOST_API_ORIGIN,
    LOCALHOST_LOOPBACK_API_ORIGIN,
    "https://weight-loss-quiz.onrender.com",
    "https://weight-loss-quiz-da2g.onrender.com",
  ])
);

const WIDGET_RESOURCE_DOMAINS = Array.from(
  new Set([
    "https://weight-loss-quiz.onrender.com",
    "https://weight-loss-quiz-da2g.onrender.com",
    ...(WIDGET_API_BASE_URL.startsWith("https://") ? [WIDGET_API_BASE_URL] : []),
  ])
);

if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

type AnalyticsEvent = {
  timestamp: string;
  event: string;
  [key: string]: any;
};

function logAnalytics(event: string, data: Record<string, any> = {}) {
  const entry: AnalyticsEvent = {
    timestamp: new Date().toISOString(),
    event,
    ...data,
  };

  const logLine = JSON.stringify(entry);
  console.log(logLine);

  const today = new Date().toISOString().split("T")[0];
  const logFile = path.join(LOGS_DIR, `${today}.log`);
  fs.appendFileSync(logFile, logLine + "\n");
}

function getRecentLogs(days: number = 7): AnalyticsEvent[] {
  const logs: AnalyticsEvent[] = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const logFile = path.join(LOGS_DIR, `${dateStr}.log`);

    if (fs.existsSync(logFile)) {
      const content = fs.readFileSync(logFile, "utf8");
      const lines = content.trim().split("\n");
      lines.forEach((line) => {
        try {
          logs.push(JSON.parse(line));
        } catch (e) { }
      });
    }
  }

  return logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

function classifyDevice(userAgent?: string | null): string {
  if (!userAgent) return "Unknown";
  const ua = userAgent.toLowerCase();
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) return "iOS";
  if (ua.includes("android")) return "Android";
  if (ua.includes("mac os") || ua.includes("macintosh")) return "macOS";
  if (ua.includes("windows")) return "Windows";
  if (ua.includes("linux")) return "Linux";
  if (ua.includes("cros")) return "ChromeOS";
  return "Other";
}

const GOAL_OPTIONS = ["lose_weight", "more_energy", "build_consistency", "improve_fitness"] as const;
const CHALLENGE_OPTIONS = ["cravings", "hunger", "social_events", "weekends", "schedule", "motivation"] as const;
const ACTIVITY_OPTIONS = ["mostly_sitting", "some_walking", "regular_workouts", "very_active"] as const;
const TRACKING_OPTIONS = ["data_friendly", "short_term_tracking", "simple_rules", "no_tracking"] as const;
const TIMELINE_OPTIONS = ["slow_easy", "moderate", "aggressive", "need_guidance"] as const;

function computeSummary(args: any) {
  const goal = typeof args.goal === "string" ? args.goal : null;
  const biggestChallenge = typeof args.biggest_challenge === "string" ? args.biggest_challenge : null;
  const activityLevel = typeof args.activity_level === "string" ? args.activity_level : null;
  const trackingPreference = typeof args.tracking_preference === "string" ? args.tracking_preference : null;
  const timeline = typeof args.timeline === "string" ? args.timeline : null;

  let suggestedProfile = "momentum_builder";
  if (trackingPreference === "data_friendly" || trackingPreference === "short_term_tracking") suggestedProfile = "structured_achiever";
  if (trackingPreference === "simple_rules" || trackingPreference === "no_tracking") suggestedProfile = "busy_minimalist";
  if (biggestChallenge === "cravings" || biggestChallenge === "hunger") suggestedProfile = "craving_crusher";
  if (biggestChallenge === "social_events" || biggestChallenge === "weekends") suggestedProfile = "weekend_warrior";
  if ((biggestChallenge === "schedule" || biggestChallenge === "motivation") && activityLevel === "mostly_sitting") {
    suggestedProfile = "momentum_builder";
  }

  const starterFocusMap: Record<string, string> = {
    structured_achiever: "Set measurable daily nutrition targets and weekly check-ins.",
    busy_minimalist: "Use repeatable meals and a simple step goal.",
    craving_crusher: "Prioritize protein + fiber and reduce high-trigger moments.",
    weekend_warrior: "Create a social-event strategy before weekends start.",
    momentum_builder: "Stack one nutrition habit and one movement habit this week.",
  };

  return {
    goal,
    biggest_challenge: biggestChallenge,
    activity_level: activityLevel,
    tracking_preference: trackingPreference,
    timeline,
    suggested_profile: suggestedProfile,
    starter_focus: starterFocusMap[suggestedProfile],
  };
}

function readWidgetHtml(componentName: string): string {
  if (!fs.existsSync(ASSETS_DIR)) {
    throw new Error(
      `Widget assets not found. Expected directory ${ASSETS_DIR}. Run "pnpm run build" before starting the server.`
    );
  }

  const directPath = path.join(ASSETS_DIR, `${componentName}.html`);
  let htmlContents: string | null = null;
  let loadedFrom = "";

  if (fs.existsSync(directPath)) {
    htmlContents = fs.readFileSync(directPath, "utf8");
    loadedFrom = directPath;
  } else {
    const candidates = fs
      .readdirSync(ASSETS_DIR)
      .filter(
        (file) => file.startsWith(`${componentName}-`) && file.endsWith(".html")
      )
      .sort();
    const fallback = candidates[candidates.length - 1];
    if (fallback) {
      const fallbackPath = path.join(ASSETS_DIR, fallback);
      htmlContents = fs.readFileSync(fallbackPath, "utf8");
      loadedFrom = fallbackPath;
    }
  }

  if (!htmlContents) {
    throw new Error(
      `Widget HTML for "${componentName}" not found in ${ASSETS_DIR}. Run "pnpm run build" to generate the assets.`
    );
  }

  console.log(`[Widget Load] File: ${loadedFrom}`);
  console.log(`[Widget Load] HTML length: ${htmlContents.length} bytes`);

  return htmlContents;
}

// Use git commit hash for deterministic cache-busting across deploys
const VERSION = process.env.RENDER_GIT_COMMIT?.slice(0, 7) || Date.now().toString();

function widgetMeta(widget: WeightLossQuizWidget, bustCache: boolean = false) {
  const templateUri = bustCache
    ? `ui://widget/weight-loss-quiz.html?v=${VERSION}`
    : widget.templateUri;

  return {
    "openai/outputTemplate": templateUri,
    "openai/widgetDescription":
      "Weight-Loss Blueprint Quiz — a guided quiz that identifies the user's behavior archetype and returns a practical 7-day fat-loss plan, tailored recipes, and supplement suggestions.",
    "openai/componentDescriptions": {
      "home-screen": "Clear quiz value proposition with an explicit call to action to begin the quiz.",
      "quiz-flow": "Interactive question-by-question flow with visual answer cards and progress tracking.",
      "result-profile": "Personalized archetype result with first-focus guidance and behavior explanation.",
      "week-plan": "Actionable 7-day starter plan with avoid guidance and timeline expectations.",
      "nutrition-support": "Custom recipes and featured supplement cards with external buy links.",
    },
    "openai/widgetKeywords": [
      "weight loss quiz",
      "fat loss",
      "weight loss archetype",
      "7 day fat loss plan",
      "habit-first weight loss",
      "healthy habits",
      "nutrition",
      "fitness",
      "habit plan",
      "wellness",
      "goal setting",
      "behavior change"
    ],
    "openai/sampleConversations": [
      { "user": "I need a realistic way to lose weight without all-or-nothing dieting", "assistant": "Let's run the Weight-Loss Blueprint Quiz so you get an archetype and a practical 7-day plan." },
      { "user": "I do fine during the week but lose control on weekends", "assistant": "Open the quiz and we'll map your biggest challenge to a plan you can actually follow." },
      { "user": "Give me a simple fat-loss plan with meals and supplement options", "assistant": "Start the quiz and you'll get a tailored profile, recipes, and supplement suggestions." },
    ],
    "openai/starterPrompts": [
      "Take me through the weight-loss quiz",
      "I want a personalized 7-day fat-loss plan",
      "Help me identify my weight-loss archetype",
      "I struggle with cravings late at night",
      "I need a plan that works with a busy schedule",
      "I keep slipping on weekends and social events",
      "Give me a simple sustainable fat-loss strategy",
    ],
    "openai/widgetPrefersBorder": true,
    "openai/widgetCSP": {
      connect_domains: WIDGET_CONNECT_DOMAINS,
      resource_domains: WIDGET_RESOURCE_DOMAINS,
    },
    "openai/widgetDomain": "https://web-sandbox.oaiusercontent.com",
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
    "openai/widgetAccessible": true,
    "openai/resultCanProduceWidget": true,
  } as const;
}

const widgets: WeightLossQuizWidget[] = [
  {
    id: "weight-loss-quiz",
    title: "Weight-Loss Blueprint Quiz — Discover your best-fit strategy in minutes",
    templateUri: `ui://widget/weight-loss-quiz.html?v=${VERSION}`,
    invoking:
      "Opening Weight-Loss Blueprint Quiz...",
    invoked:
      "Here is your Weight-Loss Blueprint Quiz. Answer the visual prompts to get a personalized, realistic plan.",
    html: readWidgetHtml("weight-loss-quiz"),
  },
];

const widgetsById = new Map<string, WeightLossQuizWidget>();
const widgetsByUri = new Map<string, WeightLossQuizWidget>();

widgets.forEach((widget) => {
  widgetsById.set(widget.id, widget);
  widgetsByUri.set(widget.templateUri, widget);
});

const toolInputSchema = {
  type: "object",
  properties: {
    goal: {
      type: "string",
      enum: [...GOAL_OPTIONS],
      description: "Primary outcome the user wants from the weight-loss quiz.",
    },
    biggest_challenge: {
      type: "string",
      enum: [...CHALLENGE_OPTIONS],
      description: "Main behavior obstacle that prevents consistency.",
    },
    activity_level: {
      type: "string",
      enum: [...ACTIVITY_OPTIONS],
      description: "Current movement baseline.",
    },
    tracking_preference: {
      type: "string",
      enum: [...TRACKING_OPTIONS],
      description: "User preference for structure and tracking.",
    },
    timeline: {
      type: "string",
      enum: [...TIMELINE_OPTIONS],
      description: "Preferred pace for progress.",
    },
  },
  required: [],
  additionalProperties: true,
  $schema: "http://json-schema.org/draft-07/schema#",
} as const;

const toolInputParser = z.object({
  goal: z.enum(GOAL_OPTIONS).optional(),
  biggest_challenge: z.enum(CHALLENGE_OPTIONS).optional(),
  activity_level: z.enum(ACTIVITY_OPTIONS).optional(),
  tracking_preference: z.enum(TRACKING_OPTIONS).optional(),
  timeline: z.enum(TIMELINE_OPTIONS).optional(),
}).passthrough();

const tools: Tool[] = widgets.map((widget) => ({
  name: widget.id,
  description:
    "Use this tool to launch a modern visual weight-loss quiz. The quiz identifies the user's weight-loss profile and generates a personalized 7-day action plan. Call this tool immediately with NO arguments so the user can complete the interactive flow.",
  inputSchema: toolInputSchema,
  outputSchema: {
    type: "object",
    properties: {
      ready: { type: "boolean" },
      timestamp: { type: "string" },
      goal: { type: ["string", "null"] },
      biggest_challenge: { type: ["string", "null"] },
      activity_level: { type: ["string", "null"] },
      tracking_preference: { type: ["string", "null"] },
      timeline: { type: ["string", "null"] },
      input_source: { type: "string", enum: ["user", "default"] },
      summary: {
        type: "object",
        properties: {
          goal: { type: ["string", "null"] },
          biggest_challenge: { type: ["string", "null"] },
          activity_level: { type: ["string", "null"] },
          tracking_preference: { type: ["string", "null"] },
          timeline: { type: ["string", "null"] },
          suggested_profile: { type: ["string", "null"] },
          starter_focus: { type: ["string", "null"] },
        },
      },
      suggested_followups: {
        type: "array",
        items: { type: "string" },
      },
    },
  },
  title: widget.title,
  securitySchemes: [{ type: "noauth" }],
  _meta: {
    ...widgetMeta(widget),
    "openai/visibility": "public",
    securitySchemes: [{ type: "noauth" }],
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
}));

const resources: Resource[] = widgets.map((widget) => ({
  uri: widget.templateUri,
  name: widget.title,
  description:
    "HTML template for the Weight-Loss Blueprint Quiz widget.",
  mimeType: "text/html+skybridge",
  _meta: widgetMeta(widget),
}));

const resourceTemplates: ResourceTemplate[] = widgets.map((widget) => ({
  uriTemplate: widget.templateUri,
  name: widget.title,
  description:
    "Template descriptor for the Weight-Loss Blueprint Quiz widget.",
  mimeType: "text/html+skybridge",
  _meta: widgetMeta(widget),
}));

function createWeightLossQuizServer(): Server {
  const server = new Server(
    {
      name: "weight-loss-quiz",
      version: "0.1.0",
      description:
        "Weight-Loss Blueprint Quiz — helps users discover a personalized and sustainable strategy through a modern interactive quiz.",
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  server.setRequestHandler(
    ListResourcesRequestSchema,
    async (_request: ListResourcesRequest) => {
      console.log(`[MCP] resources/list called, returning ${resources.length} resources`);
      resources.forEach((r: any) => {
        console.log(`  - ${r.uri} (${r.name})`);
      });
      return { resources };
    }
  );

  server.setRequestHandler(
    ReadResourceRequestSchema,
    async (request: ReadResourceRequest) => {
      const widget = widgetsByUri.get(request.params.uri);

      if (!widget) {
        throw new Error(`Unknown resource: ${request.params.uri}`);
      }

      const htmlToSend = widget.html;

      return {
        contents: [
          {
            uri: widget.templateUri,
            mimeType: "text/html+skybridge",
            text: htmlToSend,
            _meta: widgetMeta(widget),
          },
        ],
      };
    }
  );

  server.setRequestHandler(
    ListResourceTemplatesRequestSchema,
    async (_request: ListResourceTemplatesRequest) => ({ resourceTemplates })
  );

  server.setRequestHandler(
    ListToolsRequestSchema,
    async (_request: ListToolsRequest) => ({ tools })
  );

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
      const startTime = Date.now();
      let userAgentString: string | null = null;
      let deviceCategory = "Unknown";

      // Log the full request to debug _meta location
      console.log("Full request object:", JSON.stringify(request, null, 2));

      try {
        const widget = widgetsById.get(request.params.name);

        if (!widget) {
          logAnalytics("tool_call_error", {
            error: "Unknown tool",
            toolName: request.params.name,
          });
          throw new Error(`Unknown tool: ${request.params.name}`);
        }

        // Parse and validate input parameters
        let args: Record<string, any> = {};
        try {
          args = toolInputParser.parse(request.params.arguments ?? {});
        } catch (parseError: any) {
          logAnalytics("parameter_parse_error", {
            toolName: request.params.name,
            params: request.params.arguments,
            error: parseError.message,
          });
          throw parseError;
        }

        // Capture user context from _meta - try multiple locations
        const meta = (request as any)._meta || request.params?._meta || {};
        const userLocation = meta["openai/userLocation"];
        const userLocale = meta["openai/locale"];
        const userAgent = meta["openai/userAgent"];
        userAgentString = typeof userAgent === "string" ? userAgent : null;
        deviceCategory = classifyDevice(userAgentString);

        // Debug log
        console.log("Captured meta:", { userLocation, userLocale, userAgent });

        // If ChatGPT didn't pass structured arguments, infer lightweight quiz context from freeform text
        try {
          const candidates: any[] = [
            meta["openai/subject"],
            meta["openai/userPrompt"],
            meta["openai/userText"],
            meta["openai/lastUserMessage"],
            meta["openai/inputText"],
            meta["openai/requestText"],
          ];
          const userText = candidates.find((t) => typeof t === "string" && t.trim().length > 0) || "";

          if (!args.goal) {
            if (/weight|fat\s*loss|lose\s*weight|lean/i.test(userText)) {
              args.goal = "lose_weight";
            } else if (/energy|feel\s*better|less\s*tired/i.test(userText)) {
              args.goal = "more_energy";
            } else if (/consisten|routine|habit|stick\s*to/i.test(userText)) {
              args.goal = "build_consistency";
            } else if (/fitness|performance|workout/i.test(userText)) {
              args.goal = "improve_fitness";
            }
          }

          if (!args.biggest_challenge) {
            if (/hunger|always\s*hungry/i.test(userText)) args.biggest_challenge = "hunger";
            else if (/craving|snack|sweet|sugar/i.test(userText)) args.biggest_challenge = "cravings";
            else if (/weekend|social|restaurant|party|vacation/i.test(userText)) args.biggest_challenge = "social_events";
            else if (/weekends?/i.test(userText)) args.biggest_challenge = "weekends";
            else if (/busy|schedule|time/i.test(userText)) args.biggest_challenge = "schedule";
            else if (/motivation|consisten/i.test(userText)) args.biggest_challenge = "motivation";
          }

          if (!args.activity_level) {
            if (/sit|desk|inactive/i.test(userText)) args.activity_level = "mostly_sitting";
            else if (/walk|steps/i.test(userText)) args.activity_level = "some_walking";
            else if (/gym|workout|train/i.test(userText)) args.activity_level = "regular_workouts";
            else if (/athlete|very active|daily training/i.test(userText)) args.activity_level = "very_active";
          }

          if (!args.tracking_preference) {
            if (/track|macro|calorie|data/i.test(userText)) args.tracking_preference = "data_friendly";
            else if (/short\s*term|temporary|few\s*weeks/i.test(userText)) args.tracking_preference = "short_term_tracking";
            else if (/simple|easy|rules/i.test(userText)) args.tracking_preference = "simple_rules";
            else if (/no\s*tracking|hate\s*tracking/i.test(userText)) args.tracking_preference = "no_tracking";
          }

          if (!args.timeline) {
            if (/slow|sustainable|easy/i.test(userText)) args.timeline = "slow_easy";
            else if (/aggressive|fast|quick/i.test(userText)) args.timeline = "aggressive";
            else if (/moderate|balanced/i.test(userText)) args.timeline = "moderate";
            else if (/guide|not sure|unsure/i.test(userText)) args.timeline = "need_guidance";
          }

        } catch (e) {
          console.warn("Parameter inference from meta failed", e);
        }


        const responseTime = Date.now() - startTime;
        const summary = computeSummary(args);

        // Check if we are using defaults (i.e. no arguments provided)
        const usedDefaults = Object.keys(args).length === 0;

        // Infer likely user query from parameters
        const inferredQuery = [] as string[];
        if (args.goal) inferredQuery.push(`goal=${args.goal}`);
        if (args.biggest_challenge) inferredQuery.push(`challenge=${args.biggest_challenge}`);
        if (args.activity_level) inferredQuery.push(`activity=${args.activity_level}`);
        if (args.tracking_preference) inferredQuery.push(`tracking=${args.tracking_preference}`);
        if (args.timeline) inferredQuery.push(`timeline=${args.timeline}`);

        // Use a stable template URI so toolOutput reliably hydrates the component
        const widgetMetadata = widgetMeta(widget, false);
        console.log(`[MCP] Tool called: ${request.params.name}, returning templateUri: ${(widgetMetadata as any)["openai/outputTemplate"]}`);

        // Build structured content once so we can log it and return it.
        const structured = {
          ready: true,
          timestamp: new Date().toISOString(),
          ...args,
          input_source: usedDefaults ? "default" : "user",
          // Summary + follow-ups for natural language UX
          summary,
          suggested_followups: [
            "Show me a high-protein meal framework",
            "Give me a simple weekly movement plan",
            "How do I handle cravings at night?",
            "Help me stay on track during weekends"
          ],
        } as const;

        // Embed the widget resource in _meta to mirror official examples and improve hydration reliability
        const metaForReturn = {
          ...widgetMetadata,
          "openai.com/widget": {
            type: "resource",
            resource: {
              uri: widget.templateUri,
              mimeType: "text/html+skybridge",
              text: widget.html,
              title: widget.title,
            },
          },
        } as const;

        console.log("[MCP] Returning outputTemplate:", (metaForReturn as any)["openai/outputTemplate"]);
        console.log("[MCP] Returning structuredContent:", structured);

        // Log success analytics
        try {
          // Check for "empty" result - when no meaningful quiz context is provided
          const hasMainInputs = args.goal || args.biggest_challenge || args.activity_level || args.tracking_preference || args.timeline;

          if (!hasMainInputs) {
            logAnalytics("tool_call_empty", {
              toolName: request.params.name,
              params: args,
              reason: "No quiz context provided"
            });
          } else {
            logAnalytics("tool_call_success", {
              toolName: request.params.name,
              responseTime,
              params: args,
              summary,
              inferredQuery: inferredQuery.length > 0 ? inferredQuery.join(", ") : "weight-loss-quiz",
              userLocation,
              userLocale,
              device: deviceCategory,
              userAgent,
            });
          }
        } catch { }

        // TEXT SUPPRESSION: Return empty content array to prevent ChatGPT from adding
        // any text after the widget. The widget provides all necessary UI.
        // See: content: [] means no text content, only the widget is shown.
        return {
          content: [],  // Empty array = no text after widget
          structuredContent: structured,
          _meta: metaForReturn,  // Contains openai/resultCanProduceWidget: true
        };
      } catch (error: any) {
        logAnalytics("tool_call_error", {
          error: error.message,
          stack: error.stack,
          responseTime: Date.now() - startTime,
          device: deviceCategory,
          userAgent: userAgentString,
        });
        throw error;
      }
    }
  );

  return server;
}

type SessionRecord = {
  server: Server;
  transport: SSEServerTransport;
};

const sessions = new Map<string, SessionRecord>();

const ssePath = "/mcp";
const postPath = "/mcp/messages";
const subscribePath = "/api/subscribe";
const analyticsPath = "/analytics";
const trackEventPath = "/api/track";
const healthPath = "/health";


const ANALYTICS_PASSWORD = process.env.ANALYTICS_PASSWORD || "changeme123";

function checkAnalyticsAuth(req: IncomingMessage): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return false;
  }

  const base64Credentials = authHeader.split(" ")[1];
  const credentials = Buffer.from(base64Credentials, "base64").toString("utf8");
  const [username, password] = credentials.split(":");

  return username === "admin" && password === ANALYTICS_PASSWORD;
}

function humanizeEventName(event: string): string {
  const eventMap: Record<string, string> = {
    // Server-side
    tool_call_success: "Tool Call (Success)",
    tool_call_error: "Tool Call (Error)",
    tool_call_empty: "Tool Call (Empty)",
    parameter_parse_error: "Parameter Parse Error",
    // In-app quiz actions
    widget_quiz_view: "Quiz Viewed",
    widget_quiz_started: "Quiz Started",
    widget_quiz_answered: "Question Answered",
    widget_quiz_completed: "Quiz Completed",
    widget_quiz_reset: "Quiz Reset",
    widget_quiz_copy_plan: "Plan Copied",
    // Feedback & rating
    widget_enjoy_vote: "Enjoy Vote",
    widget_user_feedback: "Feedback (Submitted)",
    // Subscriptions
    widget_notify_me_subscribe: "Email Subscribe",
    widget_notify_me_subscribe_error: "Email Subscribe (Error)",
    // Errors
    widget_crash: "Widget Crash",
  };
  return eventMap[event] || event.replace(/^widget_/, "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function formatEventDetails(log: AnalyticsEvent): string {
  const excludeKeys = ["timestamp", "event"];
  const details: Record<string, any> = {};

  Object.keys(log).forEach((key) => {
    if (!excludeKeys.includes(key)) {
      details[key] = log[key];
    }
  });

  if (Object.keys(details).length === 0) {
    return "—";
  }

  return JSON.stringify(details, null, 0);
}

type AlertEntry = {
  id: string;
  level: "warning" | "critical";
  message: string;
};

function evaluateAlerts(logs: AnalyticsEvent[]): AlertEntry[] {
  const alerts: AlertEntry[] = [];
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  // 1. Tool Call Failures
  const toolErrors24h = logs.filter(
    (l) =>
      l.event === "tool_call_error" &&
      new Date(l.timestamp).getTime() >= dayAgo
  ).length;

  if (toolErrors24h > 5) {
    alerts.push({
      id: "tool-errors",
      level: "critical",
      message: `Tool failures in last 24h: ${toolErrors24h} (>5 threshold)`,
    });
  }

  // 2. Parameter Parsing Errors
  const parseErrorsWeek = logs.filter(
    (l) =>
      l.event === "parameter_parse_error" &&
      new Date(l.timestamp).getTime() >= weekAgo
  ).length;

  if (parseErrorsWeek > 3) {
    alerts.push({
      id: "parse-errors",
      level: "warning",
      message: `Parameter parse errors in last 7d: ${parseErrorsWeek} (>3 threshold)`,
    });
  }

  // 3. Empty result sets (missing quiz context)
  const successCalls = logs.filter(
    (l) => l.event === "tool_call_success" && new Date(l.timestamp).getTime() >= weekAgo
  );
  const emptyResults = logs.filter(
    (l) => l.event === "tool_call_empty" && new Date(l.timestamp).getTime() >= weekAgo
  ).length;

  const totalCalls = successCalls.length + emptyResults;
  if (totalCalls > 0 && (emptyResults / totalCalls) > 0.2) {
    alerts.push({
      id: "empty-results",
      level: "warning",
      message: `Empty result rate ${((emptyResults / totalCalls) * 100).toFixed(1)}% (>20% threshold)`,
    });
  }

  // 4. Widget Load Failures (Crashes)
  const widgetCrashes = logs.filter(
    (l) => l.event === "widget_crash" && new Date(l.timestamp).getTime() >= dayAgo
  ).length;

  if (widgetCrashes > 0) {
    alerts.push({
      id: "widget-crash",
      level: "critical",
      message: `Widget crashes in last 24h: ${widgetCrashes} (Fix immediately)`,
    });
  }

  // 5. Buttondown Subscription Failures
  const recentSubs = logs.filter(
    (l) =>
      (l.event === "widget_notify_me_subscribe" ||
        l.event === "widget_notify_me_subscribe_error") &&
      new Date(l.timestamp).getTime() >= weekAgo
  );

  const subFailures = recentSubs.filter(
    (l) => l.event === "widget_notify_me_subscribe_error"
  ).length;

  const failureRate =
    recentSubs.length > 0 ? subFailures / recentSubs.length : 0;

  if (recentSubs.length >= 5 && failureRate > 0.1) {
    alerts.push({
      id: "buttondown-failures",
      level: "warning",
      message: `Buttondown failure rate ${(failureRate * 100).toFixed(
        1
      )}% over last 7d (${subFailures}/${recentSubs.length})`,
    });
  }

  return alerts;
}

function generateAnalyticsDashboard(logs: AnalyticsEvent[], alerts: AlertEntry[]): string {
  const errorLogs = logs.filter((l) => l.event.includes("error"));
  const successLogs = logs.filter((l) => l.event === "tool_call_success");
  const parseLogs = logs.filter((l) => l.event === "parameter_parse_error");
  const widgetEvents = logs.filter((l) => l.event.startsWith("widget_"));

  const avgResponseTime =
    successLogs.length > 0
      ? (successLogs.reduce((sum, l) => sum + (l.responseTime || 0), 0) /
        successLogs.length).toFixed(0)
      : "N/A";

  // --- Prompt-level analytics (from tool calls) ---
  const paramUsage: Record<string, number> = {};
  const suggestedProfileDist: Record<string, number> = {};
  const activityLevelDist: Record<string, number> = {};

  successLogs.forEach((log) => {
    if (log.params) {
      Object.keys(log.params).forEach((key) => {
        if (log.params[key] !== undefined) {
          paramUsage[key] = (paramUsage[key] || 0) + 1;
        }
      });
      const suggestedProfile = log.summary?.suggested_profile || computeSummary(log.params || {}).suggested_profile;
      if (suggestedProfile) {
        suggestedProfileDist[suggestedProfile] = (suggestedProfileDist[suggestedProfile] || 0) + 1;
      }
      const activityLevel = log.params.activity_level;
      if (activityLevel) {
        activityLevelDist[activityLevel] = (activityLevelDist[activityLevel] || 0) + 1;
      }
    }
  });

  // Goals (top 10)
  const goalDist: Record<string, number> = {};
  successLogs.forEach((log) => {
    const goal = log.params?.goal;
    if (goal) {
      goalDist[goal] = (goalDist[goal] || 0) + 1;
    }
  });

  // Biggest challenges (top 10)
  const challengeDist: Record<string, number> = {};
  successLogs.forEach((log) => {
    const challenge = log.params?.biggest_challenge;
    if (challenge) {
      challengeDist[challenge] = (challengeDist[challenge] || 0) + 1;
    }
  });

  // --- In-app analytics (from widget events) ---
  // Quiz management actions
  const quizActions: Record<string, number> = {};
  const quizActionEvents = ["widget_quiz_view", "widget_quiz_started", "widget_quiz_answered", "widget_quiz_completed", "widget_quiz_reset", "widget_quiz_copy_plan"];
  quizActionEvents.forEach(e => { quizActions[humanizeEventName(e)] = 0; });

  // Engagement actions
  const engagementActions: Record<string, number> = {};
  const engagementEvents = ["widget_enjoy_vote", "widget_user_feedback", "widget_notify_me_subscribe", "widget_notify_me_subscribe_error"];
  engagementEvents.forEach(e => { engagementActions[humanizeEventName(e)] = 0; });

  // Completion funnel
  const completionStages: Record<string, number> = {
    "Quiz Viewed": 0,
    "Quiz Started": 0,
    "Quiz Completed": 0,
    "Plan Copied": 0,
  };

  // Enjoy votes
  let enjoyUp = 0;
  let enjoyDown = 0;

  // Feedback with votes
  const feedbackLogs: AnalyticsEvent[] = [];

  // All widget interactions (catch-all)
  const allWidgetCounts: Record<string, number> = {};

  widgetEvents.forEach((log) => {
    const humanName = humanizeEventName(log.event);
    allWidgetCounts[humanName] = (allWidgetCounts[humanName] || 0) + 1;

    // Quiz management
    if (quizActionEvents.includes(log.event)) {
      quizActions[humanName] = (quizActions[humanName] || 0) + 1;
    }
    // Engagement
    if (engagementEvents.includes(log.event)) {
      engagementActions[humanName] = (engagementActions[humanName] || 0) + 1;
    }
    // Funnel stages
    if (log.event === "widget_quiz_view") {
      completionStages["Quiz Viewed"]++;
    }
    if (log.event === "widget_quiz_started") {
      completionStages["Quiz Started"]++;
    }
    if (log.event === "widget_quiz_completed") {
      completionStages["Quiz Completed"]++;
    }
    if (log.event === "widget_quiz_copy_plan") {
      completionStages["Plan Copied"]++;
    }
    // Enjoy votes
    if (log.event === "widget_enjoy_vote") {
      if (log.vote === "up") enjoyUp++;
      else if (log.vote === "down") enjoyDown++;
    }
    // Feedback
    if (log.event === "widget_user_feedback") {
      feedbackLogs.push(log);
    }
  });

  const totalEnjoyVotes = enjoyUp + enjoyDown;
  const enjoyPct = totalEnjoyVotes > 0 ? ((enjoyUp / totalEnjoyVotes) * 100).toFixed(0) : "—";

  // Daily call volume (last 7 days)
  const dailyCounts: Record<string, { toolCalls: number; widgetEvents: number; errors: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    dailyCounts[key] = { toolCalls: 0, widgetEvents: 0, errors: 0 };
  }
  logs.forEach(l => {
    const day = l.timestamp?.split("T")[0];
    if (dailyCounts[day]) {
      if (l.event === "tool_call_success") dailyCounts[day].toolCalls++;
      if (l.event.startsWith("widget_")) dailyCounts[day].widgetEvents++;
      if (l.event.includes("error")) dailyCounts[day].errors++;
    }
  });

  // Helper to render a simple table
  const renderTable = (headers: string[], rows: string[][], emptyMsg: string) => {
    if (rows.length === 0) return `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody><tr><td colspan="${headers.length}" style="text-align:center;color:#9ca3af;">${emptyMsg}</td></tr></tbody></table>`;
    return `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  };

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Weight-Loss Quiz Analytics</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; padding: 20px; color: #1f2937; }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { color: #1a1a1a; margin-bottom: 6px; font-size: 28px; }
    .subtitle { color: #666; margin-bottom: 24px; font-size: 14px; }
    .section-title { font-size: 18px; font-weight: 700; color: #1a1a1a; margin: 28px 0 14px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 20px; }
    .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; margin-bottom: 20px; }
    .grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 20px; }
    .card { background: white; border-radius: 10px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); border: 1px solid #e5e7eb; }
    .card h2 { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    .card .value { font-size: 36px; font-weight: 800; color: #1a1a1a; line-height: 1.1; }
    .card .value .unit { font-size: 14px; font-weight: 500; color: #9ca3af; }
    .card.error .value { color: #dc2626; }
    .card.success .value { color: #16a34a; }
    .card.warning .value { color: #ea580c; }
    .card.info .value { color: #2563eb; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
    th { font-weight: 600; color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; background: #f9fafb; }
    td { color: #374151; }
    tr:last-child td { border-bottom: none; }
    .error-row { background: #fef2f2; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 12px; color: #374151; }
    .timestamp { color: #9ca3af; font-size: 12px; white-space: nowrap; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
    .badge-green { background: #dcfce7; color: #16a34a; }
    .badge-red { background: #fef2f2; color: #dc2626; }
    .badge-blue { background: #dbeafe; color: #2563eb; }
    .badge-orange { background: #fff7ed; color: #ea580c; }
    .bar { height: 8px; border-radius: 4px; background: #e5e7eb; overflow: hidden; margin-top: 4px; }
    .bar-fill { height: 100%; border-radius: 4px; }
    .pct { font-size: 11px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Weight-Loss Quiz Analytics</h1>
    <p class="subtitle">Last 7 days · ${logs.length} total events · Auto-refresh 60s</p>

    <!-- ========== ALERTS ========== -->
    ${alerts.length > 0 ? `
    <div class="card" style="margin-bottom:20px; border-left: 4px solid ${alerts.some(a => a.level === "critical") ? "#dc2626" : "#ea580c"};">
      <h2>⚠️ Active Alerts</h2>
      <ul style="padding-left:16px;margin:4px 0 0;">
        ${alerts.map(a => `<li style="margin-bottom:4px;"><span class="badge ${a.level === "critical" ? "badge-red" : "badge-orange"}">${a.level.toUpperCase()}</span> ${a.message}</li>`).join("")}
      </ul>
    </div>` : ""}

    <!-- ========== OVERVIEW CARDS ========== -->
    <div class="section-title">📈 Overview</div>
    <div class="grid">
      <div class="card success">
        <h2>Tool Calls (Prompt)</h2>
        <div class="value">${successLogs.length}</div>
      </div>
      <div class="card info">
        <h2>Widget Events (In-App)</h2>
        <div class="value">${widgetEvents.length}</div>
      </div>
      <div class="card error">
        <h2>Errors</h2>
        <div class="value">${errorLogs.length}</div>
      </div>
      <div class="card">
        <h2>Avg Response</h2>
        <div class="value">${avgResponseTime}<span class="unit">ms</span></div>
      </div>
      <div class="card ${totalEnjoyVotes > 0 ? (parseInt(enjoyPct) >= 70 ? "success" : parseInt(enjoyPct) >= 40 ? "warning" : "error") : ""}">
        <h2>Satisfaction</h2>
        <div class="value">${enjoyPct}${totalEnjoyVotes > 0 ? '<span class="unit">%</span>' : ""}</div>
        <div class="pct">${enjoyUp} 👍 / ${enjoyDown} 👎 (${totalEnjoyVotes} votes)</div>
      </div>
    </div>

    <!-- ========== DAILY VOLUME ========== -->
    <div class="card" style="margin-bottom:20px;">
      <h2>📅 Daily Volume (7 Days)</h2>
      ${renderTable(
    ["Date", "Tool Calls", "Widget Events", "Errors"],
    Object.entries(dailyCounts).map(([day, c]) => [
      `<span class="timestamp">${day}</span>`,
      String(c.toolCalls),
      String(c.widgetEvents),
      c.errors > 0 ? `<span style="color:#dc2626;font-weight:600;">${c.errors}</span>` : "0"
    ]),
    "No data"
  )}
    </div>

    <!-- ========== PROMPT ANALYTICS ========== -->
    <div class="section-title">🔍 Prompt Analytics (What's Being Called)</div>
    <div class="grid-3">
      <div class="card">
        <h2>Suggested Profile Distribution</h2>
        ${renderTable(
    ["Profile", "Count", "%"],
    Object.entries(suggestedProfileDist).sort((a, b) => b[1] - a[1]).map(([profile, count]) => {
      const pct = successLogs.length > 0 ? ((count / successLogs.length) * 100).toFixed(0) : "0";
      const label = profile;
      return [label, String(count), `${pct}%`];
    }),
    "No data yet"
  )}
      </div>
      <div class="card">
        <h2>Activity Level</h2>
        ${renderTable(
    ["Level", "Count"],
    Object.entries(activityLevelDist).sort((a, b) => b[1] - a[1]).map(([level, count]) => {
      return [level, String(count)];
    }),
    "No data yet"
  )}
      </div>
      <div class="card">
        <h2>Parameter Usage</h2>
        ${renderTable(
    ["Parameter", "Used", "%"],
    Object.entries(paramUsage).sort((a, b) => b[1] - a[1]).map(([p, c]) => [
      `<code>${p}</code>`,
      String(c),
      successLogs.length > 0 ? `${((c / successLogs.length) * 100).toFixed(0)}%` : "0%"
    ]),
    "No data yet"
  )}
      </div>
    </div>

    <div class="grid-3">
      <div class="card">
        <h2>� Top Goals</h2>
        ${renderTable(
    ["Goal", "Count"],
    Object.entries(goalDist).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([d, c]) => [d, String(c)]),
    "No data yet"
  )}
      </div>
      <div class="card">
        <h2>⚠️ Top Challenges</h2>
        ${renderTable(
    ["Challenge", "Count"],
    Object.entries(challengeDist).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([d, c]) => [d, String(c)]),
    "No data yet"
  )}
      </div>
      <div class="card">
        <h2>🧩 Goal × Challenge Combinations</h2>
        ${(() => {
      const combinations: Record<string, number> = {};
      successLogs.forEach(l => {
        const goal = l.params?.goal;
        const challenge = l.params?.biggest_challenge;
        if (goal && challenge) {
          const combo = goal + " × " + challenge;
          combinations[combo] = (combinations[combo] || 0) + 1;
        }
      });
      return renderTable(
        ["Combination", "Count"],
        Object.entries(combinations).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([r, c]) => [r, String(c)]),
        "No data yet"
      );
    })()}
      </div>
    </div>

    <!-- ========== IN-APP ANALYTICS ========== -->
    <div class="section-title">🖱️ In-App Actions (After Tool Call)</div>
    <div class="grid-3">
      <div class="card">
        <h2>Quiz Journey Actions</h2>
        ${renderTable(
      ["Action", "Count"],
      Object.entries(quizActions).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]).map(([a, c]) => [a, String(c)]),
      "No in-app actions yet"
    )}
      </div>
      <div class="card">
        <h2>Engagement Actions</h2>
        ${renderTable(
      ["Action", "Count"],
      Object.entries(engagementActions).sort((a, b) => b[1] - a[1]).map(([b, c]) => [b, String(c)]),
      "No clicks yet"
    )}
      </div>
      <div class="card">
        <h2>Completion Funnel</h2>
        ${renderTable(
      ["Stage", "Count"],
      Object.entries(completionStages).map(([a, c]) => [a, String(c)]),
      "No funnel data yet"
    )}
      </div>
    </div>

    <div class="grid-2" style="margin-bottom:20px;">
      <div class="card">
        <h2>Funnel Conversion Snapshot</h2>
        ${renderTable(
      ["Metric", "Value"],
      [
        ["Start rate from views", completionStages["Quiz Viewed"] > 0 ? `${((completionStages["Quiz Started"] / completionStages["Quiz Viewed"]) * 100).toFixed(0)}%` : "—"],
        ["Completion rate from starts", completionStages["Quiz Started"] > 0 ? `${((completionStages["Quiz Completed"] / completionStages["Quiz Started"]) * 100).toFixed(0)}%` : "—"],
        ["Copy-plan rate from completions", completionStages["Quiz Completed"] > 0 ? `${((completionStages["Plan Copied"] / completionStages["Quiz Completed"]) * 100).toFixed(0)}%` : "—"],
      ],
      "No data yet"
    )}
      </div>
      <div class="card">
        <h2>Most Frequent Widget Events</h2>
        ${renderTable(
      ["Event", "Count"],
      Object.entries(allWidgetCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([t, c]) => [t, String(c)]),
      "No widget events yet"
    )}
      </div>
    </div>

    <!-- ========== USER EXPERIENCE ========== -->
    <div class="section-title">❤️ User Experience & Feedback</div>
    <div class="grid-2" style="margin-bottom:20px;">
      <div class="card">
        <h2>Enjoy Vote Breakdown</h2>
        <div style="display:flex;gap:20px;align-items:center;margin-bottom:12px;">
          <div style="text-align:center;">
            <div style="font-size:32px;font-weight:800;color:#16a34a;">${enjoyUp}</div>
            <div style="font-size:12px;color:#6b7280;">👍 Thumbs Up</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:32px;font-weight:800;color:#dc2626;">${enjoyDown}</div>
            <div style="font-size:12px;color:#6b7280;">👎 Thumbs Down</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:32px;font-weight:800;color:#2563eb;">${totalEnjoyVotes}</div>
            <div style="font-size:12px;color:#6b7280;">Total Votes</div>
          </div>
        </div>
        ${totalEnjoyVotes > 0 ? `
        <div class="bar" style="height:12px;">
          <div class="bar-fill" style="width:${enjoyPct}%;background:linear-gradient(90deg,#16a34a,#22c55e);"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:4px;">
          <span class="pct">👍 ${enjoyPct}%</span>
          <span class="pct">👎 ${100 - parseInt(enjoyPct)}%</span>
        </div>` : '<p style="color:#9ca3af;font-size:13px;margin-top:8px;">No votes yet</p>'}
      </div>
      <div class="card">
        <h2>Feedback Submissions</h2>
        ${feedbackLogs.length > 0 ? renderTable(
      ["Date", "Vote", "Feedback", "Profile"],
      feedbackLogs.slice(0, 15).map(l => [
        `<span class="timestamp">${new Date(l.timestamp).toLocaleString()}</span>`,
        l.enjoymentVote === "up" ? '<span class="badge badge-green">👍</span>' : l.enjoymentVote === "down" ? '<span class="badge badge-red">👎</span>' : "—",
        `<div style="max-width:300px;overflow:hidden;text-overflow:ellipsis;">${l.feedback || "—"}</div>`,
        l.profile || "—"
      ]),
      "No feedback yet"
    ) : '<p style="color:#9ca3af;font-size:13px;">No feedback submitted yet</p>'}
      </div>
    </div>

    <!-- ========== QUERIES LOG ========== -->
    <div class="section-title">📋 Recent Queries</div>
    <div class="card" style="margin-bottom:20px;">
      ${renderTable(
      ["Date", "Query", "Profile", "Goal → Challenge", "Location", "Locale"],
      successLogs.slice(0, 25).map(l => [
        `<span class="timestamp">${new Date(l.timestamp).toLocaleString()}</span>`,
        `<div style="max-width:250px;overflow:hidden;text-overflow:ellipsis;">${l.inferredQuery || "—"}</div>`,
        (l.summary?.suggested_profile || computeSummary(l.params || {}).suggested_profile)
          ? `<span class="badge badge-blue">${l.summary?.suggested_profile || computeSummary(l.params || {}).suggested_profile}</span>`
          : "—",
        l.params?.goal && l.params?.biggest_challenge
          ? `${l.params?.goal} → ${l.params?.biggest_challenge}`
          : (l.params?.goal || "—"),
        l.userLocation ? `${l.userLocation.city || ""}${l.userLocation.region ? ", " + l.userLocation.region : ""}${l.userLocation.country ? ", " + l.userLocation.country : ""}`.replace(/^, /, "") : "—",
        l.userLocale || "—"
      ]),
      "No queries yet"
    )}
    </div>

    <!-- ========== ALL WIDGET EVENTS ========== -->
    <div class="section-title">📊 All Widget Interactions (Aggregated)</div>
    <div class="card" style="margin-bottom:20px;">
      ${renderTable(
      ["Event", "Count"],
      Object.entries(allWidgetCounts).sort((a, b) => b[1] - a[1]).map(([a, c]) => [a, String(c)]),
      "No widget events yet"
    )}
    </div>

    <!-- ========== RAW EVENT LOG ========== -->
    <div class="section-title">🔎 Recent Events (Last 50)</div>
    <div class="card" style="margin-bottom:20px;">
      <table>
        <thead><tr><th>Time</th><th>Event</th><th>Details</th></tr></thead>
        <tbody>
          ${logs.slice(0, 50).map(log => `
            <tr class="${log.event.includes("error") ? "error-row" : ""}">
              <td class="timestamp">${new Date(log.timestamp).toLocaleString()}</td>
              <td><strong>${humanizeEventName(log.event)}</strong></td>
              <td style="font-size:12px;max-width:500px;overflow:hidden;text-overflow:ellipsis;">${formatEventDetails(log)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  </div>
  <script>setTimeout(() => location.reload(), 60000);</script>
</body>
</html>`;
}

async function handleAnalytics(req: IncomingMessage, res: ServerResponse) {
  if (!checkAnalyticsAuth(req)) {
    res.writeHead(401, {
      "WWW-Authenticate": 'Basic realm="Analytics Dashboard"',
      "Content-Type": "text/plain",
    });
    res.end("Authentication required");
    return;
  }

  try {
    const logs = getRecentLogs(7);
    const alerts = evaluateAlerts(logs);
    alerts.forEach((alert) =>
      console.warn("[ALERT]", alert.id, alert.message)
    );
    const html = generateAnalyticsDashboard(logs, alerts);
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
  } catch (error) {
    console.error("Analytics error:", error);
    res.writeHead(500).end("Failed to generate analytics");
  }
}

async function handleTrackEvent(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    res.writeHead(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405).end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  try {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
    }

    const { event, data } = JSON.parse(body);

    if (!event) {
      res.writeHead(400).end(JSON.stringify({ error: "Missing event name" }));
      return;
    }

    logAnalytics(`widget_${event}`, data || {});

    res.writeHead(200).end(JSON.stringify({ success: true }));
  } catch (error) {
    console.error("Track event error:", error);
    res.writeHead(500).end(JSON.stringify({ error: "Failed to track event" }));
  }
}

// Buttondown API integration
async function subscribeToButtondown(email: string, topicId: string, topicName: string) {
  const BUTTONDOWN_API_KEY = process.env.BUTTONDOWN_API_KEY;

  console.log("[Buttondown] subscribeToButtondown called", { email, topicId, topicName });
  console.log("[Buttondown] API key present:", !!BUTTONDOWN_API_KEY, "length:", BUTTONDOWN_API_KEY?.length ?? 0);

  if (!BUTTONDOWN_API_KEY) {
    throw new Error("BUTTONDOWN_API_KEY not set in environment variables");
  }

  const metadata: Record<string, any> = {
    topicName,
    source: "weight-loss-quiz",
    subscribedAt: new Date().toISOString(),
  };

  const requestBody = {
    email_address: email,
    tags: [topicId],
    metadata,
  };

  console.log("[Buttondown] Sending request body:", JSON.stringify(requestBody));

  const response = await fetch("https://api.buttondown.email/v1/subscribers", {
    method: "POST",
    headers: {
      "Authorization": `Token ${BUTTONDOWN_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  console.log("[Buttondown] Response status:", response.status, response.statusText);

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = "Failed to subscribe";

    try {
      const errorData = JSON.parse(errorText);
      if (errorData.detail) {
        errorMessage = errorData.detail;
      } else if (errorData.code) {
        errorMessage = `Error: ${errorData.code}`;
      }
    } catch {
      errorMessage = errorText;
    }

    throw new Error(errorMessage);
  }

  return await response.json();
}

// Update existing subscriber with new topic
async function updateButtondownSubscriber(email: string, topicId: string, topicName: string) {
  const BUTTONDOWN_API_KEY = process.env.BUTTONDOWN_API_KEY;

  if (!BUTTONDOWN_API_KEY) {
    throw new Error("BUTTONDOWN_API_KEY not set in environment variables");
  }

  // First, get the subscriber ID
  const searchResponse = await fetch(`https://api.buttondown.email/v1/subscribers?email=${encodeURIComponent(email)}`, {
    method: "GET",
    headers: {
      "Authorization": `Token ${BUTTONDOWN_API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!searchResponse.ok) {
    throw new Error("Failed to find subscriber");
  }

  const subscribers = await searchResponse.json();
  if (!subscribers.results || subscribers.results.length === 0) {
    throw new Error("Subscriber not found");
  }

  const subscriber = subscribers.results[0];
  const subscriberId = subscriber.id;

  // Update the subscriber with new tag and metadata
  const existingTags = subscriber.tags || [];
  const existingMetadata = subscriber.metadata || {};

  // Add new topic to tags if not already there
  const updatedTags = existingTags.includes(topicId) ? existingTags : [...existingTags, topicId];

  // Add new topic to metadata (Buttondown requires string values)
  const topicKey = `topic_${topicId}`;
  const topicData = JSON.stringify({
    name: topicName,
    subscribedAt: new Date().toISOString(),
  });

  const updatedMetadata = {
    ...existingMetadata,
    [topicKey]: topicData,
    source: "weight-loss-quiz",
  };

  const updateRequestBody = {
    tags: updatedTags,
    metadata: updatedMetadata,
  };

  console.log("[Buttondown] updateButtondownSubscriber called", { email, topicId, topicName, subscriberId });
  console.log("[Buttondown] Sending update request body:", JSON.stringify(updateRequestBody));

  const updateResponse = await fetch(`https://api.buttondown.email/v1/subscribers/${subscriberId}`, {
    method: "PATCH",
    headers: {
      "Authorization": `Token ${BUTTONDOWN_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updateRequestBody),
  });

  console.log("[Buttondown] Update response status:", updateResponse.status, updateResponse.statusText);

  if (!updateResponse.ok) {
    const errorText = await updateResponse.text();
    throw new Error(`Failed to update subscriber: ${errorText}`);
  }

  return await updateResponse.json();
}

async function handleSubscribe(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    res.writeHead(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405).end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  try {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
    }

    const parsed = JSON.parse(body);
    const email = parsed.email;
    const topicId = parsed.topicId || "weight-loss-quiz";
    const topicName = parsed.topicName || "Weight-Loss Quiz Updates";
    if (!email || !email.includes("@")) {
      res.writeHead(400).end(JSON.stringify({ error: "Invalid email address" }));
      return;
    }

    const BUTTONDOWN_API_KEY_PRESENT = !!process.env.BUTTONDOWN_API_KEY;
    if (!BUTTONDOWN_API_KEY_PRESENT) {
      res.writeHead(500).end(JSON.stringify({ error: "Server misconfigured: BUTTONDOWN_API_KEY missing" }));
      return;
    }

    try {
      await subscribeToButtondown(email, topicId, topicName);
      res.writeHead(200).end(JSON.stringify({
        success: true,
        message: "Successfully subscribed! You'll receive weight-loss quiz tips and updates."
      }));
    } catch (subscribeError: any) {
      const rawMessage = String(subscribeError?.message ?? "").trim();
      const msg = rawMessage.toLowerCase();
      const already = msg.includes('already subscribed') || msg.includes('already exists') || msg.includes('already on your list') || msg.includes('subscriber already exists') || msg.includes('already');

      if (already) {
        console.log("Subscriber already on list, attempting update", { email, topicId, message: rawMessage });
        try {
          await updateButtondownSubscriber(email, topicId, topicName);
          res.writeHead(200).end(JSON.stringify({
            success: true,
            message: "You're now subscribed to this topic!"
          }));
        } catch (updateError: any) {
          console.warn("Update subscriber failed, returning graceful success", {
            email,
            topicId,
            error: updateError?.message,
          });
          logAnalytics("widget_notify_me_subscribe_error", {
            stage: "update",
            email,
            error: updateError?.message,
          });
          res.writeHead(200).end(JSON.stringify({
            success: true,
            message: "You're already subscribed! We'll keep you posted.",
          }));
        }
        return;
      }

      logAnalytics("widget_notify_me_subscribe_error", {
        stage: "subscribe",
        email,
        error: rawMessage || "unknown_error",
      });
      throw subscribeError;
    }
  } catch (error: any) {
    console.error("Subscribe error:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    logAnalytics("widget_notify_me_subscribe_error", {
      stage: "handler",
      email: undefined,
      error: error.message || "unknown_error",
    });
    res.writeHead(500).end(JSON.stringify({
      error: error.message || "Failed to subscribe. Please try again."
    }));
  }
}

// AI-powered quiz context parsing using OpenAI
async function handleParseQuizAI(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Private-Network", "true");

  if (req.method !== "POST") {
    res.writeHead(405).end("Method not allowed");
    return;
  }

  try {
    const body = await new Promise<string>((resolve, reject) => {
      let data = "";
      req.on("data", chunk => data += chunk);
      req.on("end", () => resolve(data));
      req.on("error", reject);
    });

    const { text } = JSON.parse(body);

    if (!text || typeof text !== "string") {
      res.writeHead(400).end(JSON.stringify({ error: "Missing 'text' field" }));
      return;
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      // Fallback to basic parsing if no API key
      console.log("[Parse Quiz] No OPENAI_API_KEY, using fallback parsing");
      const fields = fallbackParseQuizText(text);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ fields, source: "fallback" }));
      return;
    }

    const systemPrompt = `You extract weight-loss quiz context from natural language.

Return a JSON object with this shape:
{
  "goal": "lose_weight" | "more_energy" | "build_consistency" | "improve_fitness" | null,
  "biggest_challenge": "cravings" | "hunger" | "social_events" | "weekends" | "schedule" | "motivation" | null,
  "activity_level": "mostly_sitting" | "some_walking" | "regular_workouts" | "very_active" | null,
  "tracking_preference": "data_friendly" | "short_term_tracking" | "simple_rules" | "no_tracking" | null,
  "timeline": "slow_easy" | "moderate" | "aggressive" | "need_guidance" | null
}

Use null for unknown fields. Return only valid JSON.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Parse Quiz] OpenAI API error:", response.status, errorText);
      // Fallback on API error
      const fields = fallbackParseQuizText(text);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ fields, source: "fallback" }));
      return;
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content || "[]";

    // Parse the JSON response
    let fields;
    try {
      // Handle potential markdown code blocks
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      fields = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("[Parse Quiz] Failed to parse AI response:", content);
      fields = fallbackParseQuizText(text);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ fields, source: "fallback" }));
      return;
    }

    console.log("[Parse Quiz] AI parsed fields");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ fields, source: "ai" }));

  } catch (error: any) {
    console.error("[Parse Quiz] Error:", error);
    res.writeHead(500).end(JSON.stringify({ error: error.message || "Failed to parse quiz context" }));
  }
}

// Fallback parsing when OpenAI is not available
function fallbackParseQuizText(text: string): Record<string, string | null> {
  const lower = text.toLowerCase();

  const goal = /lose\s*weight|fat\s*loss|lean|drop\s*weight/.test(lower)
    ? "lose_weight"
    : /energy|feel\s*better/.test(lower)
      ? "more_energy"
      : null;

  const biggestChallenge = /craving|hunger|snack/.test(lower)
    ? "cravings"
    : /weekend|social|restaurant|party/.test(lower)
      ? "social_events"
      : /busy|schedule|time/.test(lower)
        ? "schedule"
        : /motivation|consisten/.test(lower)
          ? "motivation"
          : null;

  const activityLevel = /sit|desk|inactive/.test(lower)
    ? "mostly_sitting"
    : /walk|steps/.test(lower)
      ? "some_walking"
      : /gym|workout|train/.test(lower)
        ? "regular_workouts"
        : /athlete|very active|daily training/.test(lower)
          ? "very_active"
          : null;

  const trackingPreference = /track|macro|calorie|data/.test(lower)
    ? "data_friendly"
    : /short\s*term|temporary|few\s*weeks/.test(lower)
      ? "short_term_tracking"
    : /simple|easy|rules/.test(lower)
      ? "simple_rules"
      : /no\s*tracking|hate\s*tracking/.test(lower)
        ? "no_tracking"
        : null;

  const timeline = /slow|sustainable|easy/.test(lower)
    ? "slow_easy"
    : /aggressive|fast|quick/.test(lower)
      ? "aggressive"
      : /moderate|balanced/.test(lower)
        ? "moderate"
        : /guide|not sure|unsure/.test(lower)
          ? "need_guidance"
          : null;

  return {
    goal,
    biggest_challenge: biggestChallenge,
    activity_level: activityLevel,
    tracking_preference: trackingPreference,
    timeline,
  };
}

async function handleSseRequest(res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const server = createWeightLossQuizServer();
  const transport = new SSEServerTransport(postPath, res);
  const sessionId = transport.sessionId;

  sessions.set(sessionId, { server, transport });

  transport.onclose = async () => {
    sessions.delete(sessionId);
    await server.close();
  };

  transport.onerror = (error) => {
    console.error("SSE transport error", error);
  };

  try {
    await server.connect(transport);
  } catch (error) {
    sessions.delete(sessionId);
    console.error("Failed to start SSE session", error);
    if (!res.headersSent) {
      res.writeHead(500).end("Failed to establish SSE connection");
    }
  }
}

async function handlePostMessage(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    res.writeHead(400).end("Missing sessionId query parameter");
    return;
  }

  const session = sessions.get(sessionId);

  if (!session) {
    res.writeHead(404).end("Unknown session");
    return;
  }

  try {
    await session.transport.handlePostMessage(req, res);
  } catch (error) {
    console.error("Failed to process message", error);
    if (!res.headersSent) {
      res.writeHead(500).end("Failed to process message");
    }
  }
}

const httpServer = createServer(
  async (req: IncomingMessage, res: ServerResponse) => {
    if (!req.url) {
      res.writeHead(400).end("Missing URL");
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

    if (
      req.method === "OPTIONS" &&
      (url.pathname === ssePath || url.pathname === postPath)
    ) {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type",
      });
      res.end();
      return;
    }

    if (req.method === "GET" && url.pathname === healthPath) {
      res.writeHead(200, { "Content-Type": "text/plain" }).end("OK");
      return;
    }

    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      const mainAssetPath = path.join(ASSETS_DIR, "weight-loss-quiz.html");
      if (fs.existsSync(mainAssetPath) && fs.statSync(mainAssetPath).isFile()) {
        res.writeHead(200, {
          "Content-Type": "text/html",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache",
        });
        fs.createReadStream(mainAssetPath).pipe(res);
        return;
      }
      res.writeHead(404).end("Not Found");
      return;
    }

    if (req.method === "GET" && url.pathname === ssePath) {
      await handleSseRequest(res);
      return;
    }

    if (req.method === "POST" && url.pathname === postPath) {
      await handlePostMessage(req, res, url);
      return;
    }

    if (url.pathname === subscribePath) {
      await handleSubscribe(req, res);
      return;
    }

    if (url.pathname === analyticsPath) {
      await handleAnalytics(req, res);
      return;
    }

    if (url.pathname === trackEventPath) {
      await handleTrackEvent(req, res);
      return;
    }

    // AI-powered quiz context parsing endpoint
    if (req.method === "POST" && url.pathname === "/api/parse-quiz") {
      await handleParseQuizAI(req, res);
      return;
    }

    if (req.method === "OPTIONS" && url.pathname === "/api/parse-quiz") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type",
        "Access-Control-Allow-Private-Network": "true",
      });
      res.end();
      return;
    }

    // Serve primary widget HTML
    if (req.method === "GET" && url.pathname === "/assets/weight-loss-quiz.html") {
      const mainAssetPath = path.join(ASSETS_DIR, "weight-loss-quiz.html");
      console.log(`[Debug Asset] Request: ${url.pathname}, Main Path: ${mainAssetPath}, Exists: ${fs.existsSync(mainAssetPath)}`);
      if (fs.existsSync(mainAssetPath) && fs.statSync(mainAssetPath).isFile()) {
        res.writeHead(200, {
          "Content-Type": "text/html",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache",
        });
        fs.createReadStream(mainAssetPath).pipe(res);
        return;
      }
    }

    // Serve static assets from /assets directory
    if (req.method === "GET" && url.pathname.startsWith("/assets/")) {
      const rawAssetPath = url.pathname.slice(8);
      let decodedAssetPath = rawAssetPath;
      try {
        decodedAssetPath = decodeURIComponent(rawAssetPath);
      } catch {
        decodedAssetPath = rawAssetPath;
      }
      const assetPath = path.join(ASSETS_DIR, decodedAssetPath);
      if (fs.existsSync(assetPath) && fs.statSync(assetPath).isFile()) {
        const ext = path.extname(assetPath).toLowerCase();
        const contentTypeMap: Record<string, string> = {
          ".js": "application/javascript",
          ".css": "text/css",
          ".html": "text/html",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".png": "image/png",
          ".gif": "image/gif",
          ".webp": "image/webp",
          ".svg": "image/svg+xml"
        };
        const contentType = contentTypeMap[ext] || "application/octet-stream";
        res.writeHead(200, {
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache"
        });

        fs.createReadStream(assetPath).pipe(res);
        return;
      }
    }

    res.writeHead(404).end("Not Found");
  }
);

httpServer.on("clientError", (err: Error, socket) => {
  console.error("HTTP client error", err);
  socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

function startMonitoring() {
  // Check alerts every hour
  setInterval(() => {
    try {
      const logs = getRecentLogs(7);
      const alerts = evaluateAlerts(logs);

      if (alerts.length > 0) {
        console.log("\n=== 🚨 ACTIVE ALERTS 🚨 ===");
        alerts.forEach(alert => {
          console.log(`[ALERT] [${alert.level.toUpperCase()}] ${alert.message}`);
        });
        console.log("===========================\n");
      }
    } catch (e) {
      console.error("Monitoring check failed:", e);
    }
  }, 60 * 60 * 1000); // 1 hour
}

httpServer.listen(port, () => {
  startMonitoring();
  console.log(`Weight-Loss Quiz MCP server listening on http://localhost:${port}`);
  console.log(`  SSE stream: GET http://localhost:${port}${ssePath}`);
  console.log(
    `  Message post endpoint: POST http://localhost:${port}${postPath}?sessionId=...`
  );
});
