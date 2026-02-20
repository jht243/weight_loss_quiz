# Weight-Loss Blueprint Quiz - ChatGPT MCP Connector

A Model Context Protocol (MCP) server that provides an interactive weight-loss quiz widget for ChatGPT. Users answer a visual, vision-first flow and receive a personalized archetype with an actionable first-week plan.

**[Privacy Policy](PRIVACY.md)** | **[OpenAI Apps SDK](https://developers.openai.com/apps-sdk)**

## Features

- 🎯 Vision-first onboarding questions to build motivation
- 🧠 Archetype-based results (e.g. Busy Minimalist, Craving Crusher)
- 📅 Personalized 7 Day Plan, Supplements, Guidance And Mentorship
- 🍽️ Personalized Recepies section based on archetype
- 📊 Analytics dashboard for tool and widget events
- 📧 Buttondown email subscription endpoint

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
pnpm install
```

### Build the Widget

```bash
pnpm run build
```

### Run Locally

```bash
pnpm start
```

Server runs on `http://localhost:8000`. HTTP is for local development only.

## How to Use in ChatGPT

1. Open ChatGPT in **Developer Mode**
2. Add MCP Connector with your deployed HTTPS URL (e.g. `https://weight-loss-quiz.onrender.com`)
3. Ask for help with weight loss strategy
4. The interactive quiz widget appears

### Example Prompts

- "Help me find the best weight-loss strategy for me"
- "I keep falling off on weekends and need a plan"
- "Give me a simple fat-loss system I can stick to"

## Tech Stack

- **MCP SDK** - Model Context Protocol integration
- **Node.js + TypeScript** - Server runtime
- **React** - Widget UI
- **Lucide Icons** - UI iconography

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
OPENAI_API_KEY=your_openai_key    # Optional AI parsing endpoint
BUTTONDOWN_API_KEY=your_api_key   # Email subscriptions
ANALYTICS_PASSWORD=your_password  # /analytics dashboard
```

## License

MIT
