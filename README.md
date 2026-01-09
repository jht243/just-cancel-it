# Just Cancel - ChatGPT MCP Connector

A Model Context Protocol (MCP) server that helps you discover which subscriptions you should cancel to save money.

**[Privacy Policy](PRIVACY.md)** | **[OpenAI Apps SDK](https://developers.openai.com/apps-sdk)**

## Features

- 💰 Discover subscriptions you should cancel to save money
- 📊 Analyze subscription usage and value
- 🎯 Get personalized recommendations
- 📅 Track subscription renewal dates
- ✅ Interactive cancellation checklist
- 🖨️ Print-friendly reports

## Analysis Categories

1. **Streaming Services** - Video, music, and podcast subscriptions
2. **Software & Apps** - SaaS tools, productivity apps, and utilities
3. **News & Media** - Digital newspapers, magazines, and newsletters
4. **Fitness & Wellness** - Gym memberships, fitness apps, and wellness services
5. **Food & Delivery** - Meal kits, restaurant subscriptions, and delivery services
6. **Gaming & Entertainment** - Gaming platforms and entertainment memberships
7. **Shopping & Retail** - Membership clubs and subscription boxes
8. **Financial Services** - Premium banking, investing, and financial tools

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

Server runs on `http://localhost:8000`. **Note:** HTTP endpoints are for local development only.

### Deploy to Render.com

1. Push this repo to GitHub
2. Connect to Render.com
3. Create new Web Service from this repo
4. Render will auto-detect `render.yaml` and deploy

## How to Use in ChatGPT

1. Open ChatGPT in **Developer Mode**
2. Add MCP Connector with your deployed URL
3. Say: **"Which subscriptions should I cancel?"** or **"Help me save money on subscriptions"**
4. The interactive widget appears!

### Example Prompts

- "Which subscriptions am I wasting money on?"
- "Help me analyze my streaming subscriptions"
- "What subscriptions should I cancel to save money?"
- "I want to reduce my monthly subscription costs"
- "Show me which subscriptions I rarely use"

## Tech Stack

- **MCP SDK** - Model Context Protocol for ChatGPT integration
- **Node.js + TypeScript** - Server runtime
- **Server-Sent Events (SSE)** - Real-time communication
- **React** - Widget UI components
- **Lucide Icons** - Beautiful icons

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
BUTTONDOWN_API_KEY=your_api_key
ANALYTICS_PASSWORD=your_password
```

## Privacy & Data Use

- **What we collect:** When the widget runs inside ChatGPT we receive the location (city/region/country), locale, device/browser fingerprint, and subscription query details via `_meta`.
- **How we use it:** These fields feed the `/analytics` dashboard only; we do not sell or share this data.
- **Retention:** Logs are stored for **30 days** in the `/logs` folder and then automatically rotated.
- **User input storage:** The widget caches your subscription data in `localStorage`; entries expire after **30 days**. Clear anytime with the "Reset" button.

## Monitoring & Alerts

- Visit `/analytics` (Basic Auth protected) to review the live dashboard.
- Automated alerts trigger for:
  - **Tool failures**: >5 per day (critical)
  - **Parameter parse errors**: >3 per week (warning)
  - **Empty results**: >20% of calls (warning)
  - **Widget crashes**: Any occurrence (critical)
  - **Buttondown failures**: >10% failure rate (warning)

## Security

- **Production**: All traffic uses HTTPS via Render.com
- **Local development**: HTTP (`localhost:8000`) is for development only
- Widget runs in a sandboxed iframe with strict CSP

## Support

For questions, bug reports, or support:
- **Email**: support@layer3labs.io

**Note:** GitHub issues are not monitored for support requests. Please use email for all inquiries.

## License

MIT
