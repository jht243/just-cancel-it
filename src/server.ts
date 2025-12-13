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

type CryptoPortfolioOptimizerWidget = {
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
        } catch (e) {}
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

function computeSummary(args: any) {
  // Calculate total portfolio value from crypto holdings
  const cryptoHoldings = ['btc', 'eth', 'sol', 'ada', 'link', 'avax', 'dot', 'xrp', 'bnb', 'doge', 'matic', 'atom', 'uni', 'other'];
  const totalPortfolio = cryptoHoldings.reduce((sum, coin) => {
    return sum + (Number(args[coin]) || 0);
  }, 0);
  
  const currentYieldPercent = Number(args.current_yield_percent) || 0;
  const riskPreference = args.risk_preference || "medium";
  
  // Calculate potential yield based on risk preference
  const optimizedApyByRisk: Record<string, number> = {
    low: 4,      // Conservative staking strategies
    medium: 6,   // Balanced DeFi strategies
    high: 10     // Aggressive yield farming
  };
  const optimizedApy = optimizedApyByRisk[riskPreference] || 6;
  
  // Calculate earnings
  const currentAnnualYield = totalPortfolio * (currentYieldPercent / 100);
  const potentialAnnualYield = totalPortfolio * (optimizedApy / 100);
  const additionalYield = potentialAnnualYield - currentAnnualYield;
  
  // Determine optimization status
  let yieldStatus = "Not Optimized";
  if (currentYieldPercent >= optimizedApy) yieldStatus = "Well Optimized";
  else if (currentYieldPercent >= optimizedApy * 0.7) yieldStatus = "Partially Optimized";
  else if (currentYieldPercent > 0) yieldStatus = "Under-Optimized";

  return {
    total_portfolio: Math.round(totalPortfolio),
    current_yield_percent: currentYieldPercent,
    optimized_apy: optimizedApy,
    current_annual_yield: Math.round(currentAnnualYield),
    potential_annual_yield: Math.round(potentialAnnualYield),
    additional_yield: Math.round(additionalYield),
    yield_status: yieldStatus
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

  // Log what was loaded and check for "5%" in the badge
  const has5Percent = htmlContents.includes('<span class="rate-num">5%</span>');
  const isBlank = htmlContents.includes('<span class="rate-num"></span>');
  console.log(`[Widget Load] File: ${loadedFrom}`);
  console.log(`[Widget Load] Has "5%": ${has5Percent}, Is Blank: ${isBlank}`);
  console.log(`[Widget Load] HTML length: ${htmlContents.length} bytes`);

  return htmlContents;
}

// Use git commit hash for deterministic cache-busting across deploys
// Added timestamp suffix to force cache invalidation for width fix
const VERSION = (process.env.RENDER_GIT_COMMIT?.slice(0, 7) || Date.now().toString()) + '-' + Date.now();

function widgetMeta(widget: CryptoPortfolioOptimizerWidget, bustCache: boolean = false) {
  const templateUri = bustCache
    ? `ui://widget/crypto-portfolio-optimizer.html?v=${VERSION}`
    : widget.templateUri;

  return {
    "openai/outputTemplate": templateUri,
    "openai/widgetDescription":
      "A crypto yield optimizer educational tool that helps users simulate the best DeFi strategies to earn passive income on crypto portfolios (Bitcoin, Ethereum, Solana, etc.). Shows yield strategies like staking, lending, and liquidity provision with APY estimates. Call this tool immediately with NO arguments to let the user enter their data manually. Only provide arguments if the user has explicitly stated them.",
    "openai/componentDescriptions": {
      "holdings-form": "Input form for crypto holdings (BTC, ETH, SOL, etc.) with dollar values or coin amounts.",
      "yield-display": "Display showing potential annual yield earnings based on optimized strategies.",
      "strategy-cards": "Cards showing recommended yield strategies with APY ranges, risk levels, and referral links.",
    },
    "openai/widgetKeywords": [
      "crypto",
      "yield",
      "DeFi",
      "staking",
      "lending",
      "bitcoin",
      "ethereum",
      "solana",
      "APY",
      "passive income",
      "liquidity",
      "earn",
      "interest"
    ],
    "openai/sampleConversations": [
      { "user": "How can I earn yield on my crypto?", "assistant": "Here is the Crypto Yield Optimizer. Enter your crypto holdings to see how much passive income you could be earning with DeFi strategies." },
      { "user": "I have 2 BTC and 10 ETH, what yield can I get?", "assistant": "I'll calculate the potential yield on your Bitcoin and Ethereum holdings using the best available DeFi strategies." },
      { "user": "What's the best way to earn interest on Solana?", "assistant": "I've loaded the yield optimizer with Solana strategies. You can see staking, lending, and other options with their APY ranges." },
    ],
    "openai/starterPrompts": [
      "How can I earn yield on my crypto?",
      "Optimize my crypto for passive income",
      "What APY can I get on Bitcoin?",
      "Best DeFi strategies for Ethereum",
      "How much could I earn staking?",
      "Find yield opportunities for my portfolio",
      "Analyze my crypto portfolio",
    ],
    "openai/widgetPrefersBorder": true,
    "openai/widgetCSP": {
      connect_domains: [
        "https://api.stlouisfed.org",
        "https://crypto-portfolio-optimizer-jn05.onrender.com",
        "http://localhost:8010"
      ],
      script_src_domains: [
        "https://crypto-portfolio-optimizer-jn05.onrender.com"
      ],
      resource_domains: [],
    },
    "openai/widgetDomain": "https://web-sandbox.oaiusercontent.com",
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
    "openai/widgetAccessible": true,
    "openai/resultCanProduceWidget": true,
  } as const;
}

const widgets: CryptoPortfolioOptimizerWidget[] = [
  {
    id: "crypto-portfolio-optimizer",
    title: "Crypto Yield Optimizer — Simulate the best DeFi strategies to optimize passive income on a crypto portfolio",
    templateUri: `ui://widget/crypto-portfolio-optimizer.html?v=${VERSION}`,
    invoking:
      "Opening the Crypto Yield Optimizer...",
    invoked:
      "Here is the Crypto Yield Optimizer. Enter portfolio holdings to see how much passive income the portfolio could be earning with staking, lending, and other DeFi strategies.",
    html: readWidgetHtml("crypto-portfolio-optimizer"),
  },
];

const widgetsById = new Map<string, CryptoPortfolioOptimizerWidget>();
const widgetsByUri = new Map<string, CryptoPortfolioOptimizerWidget>();

widgets.forEach((widget) => {
  widgetsById.set(widget.id, widget);
  widgetsByUri.set(widget.templateUri, widget);
});

const toolInputSchema = {
  type: "object",
  properties: {
    // Crypto holdings (USD values)
    btc: { type: "number", description: "Dollar value of Bitcoin holdings." },
    eth: { type: "number", description: "Dollar value of Ethereum holdings." },
    sol: { type: "number", description: "Dollar value of Solana holdings." },
    ada: { type: "number", description: "Dollar value of Cardano holdings." },
    link: { type: "number", description: "Dollar value of Chainlink holdings." },
    avax: { type: "number", description: "Dollar value of Avalanche holdings." },
    dot: { type: "number", description: "Dollar value of Polkadot holdings." },
    xrp: { type: "number", description: "Dollar value of XRP holdings." },
    bnb: { type: "number", description: "Dollar value of BNB holdings." },
    doge: { type: "number", description: "Dollar value of Dogecoin holdings." },
    matic: { type: "number", description: "Dollar value of Polygon (MATIC) holdings." },
    atom: { type: "number", description: "Dollar value of Cosmos (ATOM) holdings." },
    uni: { type: "number", description: "Dollar value of Uniswap holdings." },
    other: { type: "number", description: "Dollar value of other crypto holdings." },
    // Crypto holdings (coin amounts)
    btc_amount: { type: "number", description: "Number of Bitcoin coins owned." },
    eth_amount: { type: "number", description: "Number of Ethereum coins owned." },
    sol_amount: { type: "number", description: "Number of Solana coins owned." },
    // Yield settings
    current_yield_percent: { type: "number", description: "Current APY the user is earning on their crypto (0-100)." },
    risk_preference: { type: "string", enum: ["low", "medium", "high"], description: "Preferred risk level for yield strategies." },
  },
  required: [],
  additionalProperties: false,
  $schema: "http://json-schema.org/draft-07/schema#",
} as const;

const toolInputParser = z.object({
  // Crypto holdings (USD values)
  btc: z.number().optional(),
  eth: z.number().optional(),
  sol: z.number().optional(),
  ada: z.number().optional(),
  link: z.number().optional(),
  avax: z.number().optional(),
  dot: z.number().optional(),
  xrp: z.number().optional(),
  bnb: z.number().optional(),
  doge: z.number().optional(),
  matic: z.number().optional(),
  atom: z.number().optional(),
  uni: z.number().optional(),
  other: z.number().optional(),
  // Crypto holdings (coin amounts)
  btc_amount: z.number().optional(),
  eth_amount: z.number().optional(),
  sol_amount: z.number().optional(),
  // Yield settings
  current_yield_percent: z.number().optional(),
  risk_preference: z.enum(["low", "medium", "high"]).optional(),
});

const tools: Tool[] = widgets.map((widget) => ({
  name: widget.id,
  description:
    "Use this to simulate crypto yield optimization. Helps users simulate the best DeFi strategies to earn passive income on crypto portfolios. Call this tool immediately with NO arguments to let the user enter their data manually. Only provide arguments if the user has explicitly stated them.",
  inputSchema: toolInputSchema,
  outputSchema: {
    type: "object",
    properties: {
      ready: { type: "boolean" },
      timestamp: { type: "string" },
      btc: { type: "number" },
      eth: { type: "number" },
      sol: { type: "number" },
      current_yield_percent: { type: "number" },
      risk_preference: { type: "string", enum: ["low", "medium", "high"] },
      input_source: { type: "string", enum: ["user", "default"] },
      summary: {
        type: "object",
        properties: {
          total_portfolio: { type: ["number", "null"] },
          current_yield_percent: { type: ["number", "null"] },
          optimized_apy: { type: ["number", "null"] },
          current_annual_yield: { type: ["number", "null"] },
          potential_annual_yield: { type: ["number", "null"] },
          additional_yield: { type: ["number", "null"] },
          yield_status: { type: ["string", "null"] },
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
    destructiveHint: false,
    openWorldHint: false,
    readOnlyHint: true,
  },
}));

const resources: Resource[] = widgets.map((widget) => ({
  uri: widget.templateUri,
  name: widget.title,
  description:
    "HTML template for the Crypto Yield Optimizer widget that helps find simulate Decentralized Finance (DeFi) strategies and optimize yield on crypto portfolios.",
  mimeType: "text/html+skybridge",
  _meta: widgetMeta(widget),
}));

const resourceTemplates: ResourceTemplate[] = widgets.map((widget) => ({
  uriTemplate: widget.templateUri,
  name: widget.title,
  description:
    "Template descriptor for the Crypto Yield Optimizer widget.",
  mimeType: "text/html+skybridge",
  _meta: widgetMeta(widget),
}));

function createCryptoYieldOptimizerServer(): Server {
  const server = new Server(
    {
      name: "crypto-yield-optimizer",
      version: "0.1.0",
      description:
        "Crypto Yield Optimizer helps users simulate the best DeFi strategies to discover passive income on a crypto (Bitcoin, Ethereum, Solana, etc.) portfolio.",
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

      // Inject current FRED rate into HTML before sending to ChatGPT
      // (Logic removed for yield optimizer)
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
        let args: z.infer<typeof toolInputParser> = {};
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

        // If ChatGPT didn't pass structured arguments, try to infer key numbers from freeform text in meta
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

          const parseAmountToNumber = (s: string): number | null => {
            const lower = s.toLowerCase().replace(/[,$\s]/g, "").trim();
            const k = lower.match(/(\d+(?:\.\d+)?)(k)$/);
            if (k) return Math.round(parseFloat(k[1]) * 1_000);
            const n = Number(lower.replace(/[^0-9.]/g, ""));
            return Number.isFinite(n) ? Math.round(n) : null;
          };

          // Infer crypto holdings from user text
          
          // Crypto holdings patterns (e.g., "$10k in bitcoin", "2 BTC", "$50,000 worth of ETH")
          const cryptoPatterns: Array<{ key: keyof typeof args; regex: RegExp }> = [
            { key: "btc", regex: /\$\s*(\d+(?:,\d{3})*(?:\.\d+)?)(k|m)?\s*(?:in\s+|worth\s+of\s+|of\s+)?(?:bitcoin|btc)/i },
            { key: "eth", regex: /\$\s*(\d+(?:,\d{3})*(?:\.\d+)?)(k|m)?\s*(?:in\s+|worth\s+of\s+|of\s+)?(?:ethereum|eth|ether)/i },
            { key: "sol", regex: /\$\s*(\d+(?:,\d{3})*(?:\.\d+)?)(k|m)?\s*(?:in\s+|worth\s+of\s+|of\s+)?(?:solana|sol)/i },
            { key: "ada", regex: /\$\s*(\d+(?:,\d{3})*(?:\.\d+)?)(k|m)?\s*(?:in\s+|worth\s+of\s+|of\s+)?(?:cardano|ada)/i },
            { key: "link", regex: /\$\s*(\d+(?:,\d{3})*(?:\.\d+)?)(k|m)?\s*(?:in\s+|worth\s+of\s+|of\s+)?(?:chainlink|link)/i },
            { key: "avax", regex: /\$\s*(\d+(?:,\d{3})*(?:\.\d+)?)(k|m)?\s*(?:in\s+|worth\s+of\s+|of\s+)?(?:avalanche|avax)/i },
            { key: "dot", regex: /\$\s*(\d+(?:,\d{3})*(?:\.\d+)?)(k|m)?\s*(?:in\s+|worth\s+of\s+|of\s+)?(?:polkadot|dot)/i },
            { key: "matic", regex: /\$\s*(\d+(?:,\d{3})*(?:\.\d+)?)(k|m)?\s*(?:in\s+|worth\s+of\s+|of\s+)?(?:polygon|matic)/i },
            { key: "atom", regex: /\$\s*(\d+(?:,\d{3})*(?:\.\d+)?)(k|m)?\s*(?:in\s+|worth\s+of\s+|of\s+)?(?:cosmos|atom)/i },
          ];
          
          for (const { key, regex } of cryptoPatterns) {
            if ((args as any)[key] === undefined) {
              const match = userText.match(regex);
              if (match) {
                let amount = parseFloat(match[1].replace(/,/g, ''));
                if (match[2]?.toLowerCase() === 'k') amount *= 1000;
                if (match[2]?.toLowerCase() === 'm') amount *= 1000000;
                if (amount > 0) (args as any)[key] = amount;
              }
            }
          }
          
          // Coin amount patterns (e.g., "2 BTC", "10 ETH", "100 SOL")
          const coinAmountPatterns: Array<{ key: keyof typeof args; regex: RegExp }> = [
            { key: "btc_amount", regex: /(\d+(?:\.\d+)?)\s*(?:bitcoin|btc)\b/i },
            { key: "eth_amount", regex: /(\d+(?:\.\d+)?)\s*(?:ethereum|eth|ether)\b/i },
            { key: "sol_amount", regex: /(\d+(?:\.\d+)?)\s*(?:solana|sol)\b/i },
          ];
          
          for (const { key, regex } of coinAmountPatterns) {
            if ((args as any)[key] === undefined) {
              const match = userText.match(regex);
              if (match) {
                const amount = parseFloat(match[1]);
                if (amount > 0) (args as any)[key] = amount;
              }
            }
          }
          
          // Current yield percent (e.g., "earning 3%", "getting 5% APY")
          if (args.current_yield_percent === undefined) {
             const yieldMatch = userText.match(/(?:earning|getting|making|receiving)\s*(\d+(?:\.\d+)?)\s*%/i);
             if (yieldMatch) {
               const percent = parseFloat(yieldMatch[1]);
               if (percent >= 0 && percent <= 100) args.current_yield_percent = percent;
             }
          }
          
          // Risk preference from keywords
          if (args.risk_preference === undefined) {
             if (/low risk|safe|cautious|conservative|staking only/i.test(userText)) args.risk_preference = "low";
             else if (/high risk|aggressive|yield farming|maximum yield/i.test(userText)) args.risk_preference = "high";
             else if (/medium|moderate|balanced/i.test(userText)) args.risk_preference = "medium";
          }

        } catch (e) {
          console.warn("Parameter inference from meta failed", e);
        }


        const responseTime = Date.now() - startTime;

        // Check if we are using defaults (i.e. no arguments provided)
        const usedDefaults = Object.keys(args).length === 0;

        // Infer likely user query from parameters
        const inferredQuery = [] as string[];
        if (args.btc) inferredQuery.push(`BTC: $${args.btc.toLocaleString()}`);
        if (args.eth) inferredQuery.push(`ETH: $${args.eth.toLocaleString()}`);
        if (args.sol) inferredQuery.push(`SOL: $${args.sol.toLocaleString()}`);
        if (args.current_yield_percent) inferredQuery.push(`current APY: ${args.current_yield_percent}%`);
        if (args.risk_preference) inferredQuery.push(`risk: ${args.risk_preference}`);

        logAnalytics("tool_call_success", {
          toolName: request.params.name,
          params: args,
          inferredQuery: inferredQuery.length > 0 ? inferredQuery.join(", ") : "Crypto Yield Optimizer",
          responseTime,

          device: deviceCategory,
          userLocation: userLocation
            ? {
                city: userLocation.city,
                region: userLocation.region,
                country: userLocation.country,
                timezone: userLocation.timezone,
              }
            : null,
          userLocale,
          userAgent,
        });

        // Use a stable template URI so toolOutput reliably hydrates the component
        const widgetMetadata = widgetMeta(widget, false);
        console.log(`[MCP] Tool called: ${request.params.name}, returning templateUri: ${(widgetMetadata as any)["openai/outputTemplate"]}`);

        // Build structured content once so we can log it and return it.
        // For the yield optimizer, expose fields relevant to crypto holdings and yield
        const structured = {
          ready: true,
          timestamp: new Date().toISOString(),
          ...args,
          input_source: usedDefaults ? "default" : "user",
          // Summary + follow-ups for natural language UX
          summary: computeSummary(args),
          suggested_followups: [
            "What's the safest way to earn yield?",
            "How can I maximize my APY?",
            "What strategies work for Bitcoin?",
            "Is staking or lending better for ETH?"
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
          // Check for "empty" result - when no main crypto inputs are provided
          const hasMainInputs = args.btc || args.eth || args.sol || args.btc_amount || args.eth_amount;
          
          if (!hasMainInputs) {
             logAnalytics("tool_call_empty", {
               toolName: request.params.name,
               params: request.params.arguments || {},
               reason: "No crypto holdings provided"
             });
          } else {
          logAnalytics("tool_call_success", {
            responseTime,
            params: request.params.arguments || {},
            inferredQuery: inferredQuery.join(", "),
            userLocation,
            userLocale,
            device: deviceCategory,
          });
          }
        } catch {}

        // Build content narration for the model
        const summary = computeSummary(args);
        const contentText = args.btc || args.eth || args.sol
          ? `Crypto Yield Optimizer ready. Portfolio value: $${summary.total_portfolio.toLocaleString()}. ${
              summary.potential_annual_yield > 0 ? `Potential yield: $${summary.potential_annual_yield.toLocaleString()}/year at ~${summary.optimized_apy}% APY.` : ''
            } Use the widget to explore yield strategies.`
          : "Crypto Yield Optimizer is ready. Enter portfolio composition to see how much passive income could be earned with DeFi strategies.";

        return {
          content: [{ type: "text", text: contentText }],
          structuredContent: structured,
          _meta: metaForReturn,
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
    tool_call_success: "Tool Call Success",
    tool_call_error: "Tool Call Error",
    parameter_parse_error: "Parameter Parse Error",
    widget_carousel_prev: "Carousel Previous",
    widget_carousel_next: "Carousel Next",
    widget_filter_age_change: "Filter: Age Change",
    widget_filter_state_change: "Filter: State Change",
    widget_filter_sort_change: "Filter: Sort Change",
    widget_filter_category_change: "Filter: Category Change",
    widget_user_feedback: "User Feedback",
    widget_test_event: "Test Event",
    widget_followup_click: "Follow-up Click",
    widget_crash: "Widget Crash",
  };
  return eventMap[event] || event;
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

  // 3. Empty Result Sets (or equivalent for calculator - e.g. missing inputs)
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

  const paramUsage: Record<string, number> = {};
  const yieldStatusDist: Record<string, number> = {};
  const riskPreferenceDist: Record<string, number> = {};
  
  successLogs.forEach((log) => {
    if (log.params) {
      Object.keys(log.params).forEach((key) => {
        if (log.params[key] !== undefined) {
          paramUsage[key] = (paramUsage[key] || 0) + 1;
        }
      });
      // Track risk preference distribution
      if (log.params.risk_preference) {
        const risk = log.params.risk_preference;
        riskPreferenceDist[risk] = (riskPreferenceDist[risk] || 0) + 1;
      }
    }
    if (log.structuredContent?.summary?.yield_status) {
       const cat = log.structuredContent.summary.yield_status;
       yieldStatusDist[cat] = (yieldStatusDist[cat] || 0) + 1;
    }
  });
  
  const widgetInteractions: Record<string, number> = {};
  widgetEvents.forEach((log) => {
    const humanName = humanizeEventName(log.event);
    widgetInteractions[humanName] = (widgetInteractions[humanName] || 0) + 1;
  });
  
  // Crypto holdings distribution (BTC)
  const btcHoldingsDist: Record<string, number> = {};
  successLogs.forEach((log) => {
    if (log.params?.btc) {
      const amount = log.params.btc;
      let bucket = "Unknown";
      if (amount < 1000) bucket = "Under $1k";
      else if (amount < 10000) bucket = "$1k-$10k";
      else if (amount < 50000) bucket = "$10k-$50k";
      else if (amount < 100000) bucket = "$50k-$100k";
      else bucket = "$100k+";
      btcHoldingsDist[bucket] = (btcHoldingsDist[bucket] || 0) + 1;
    }
  });

  // ETH holdings distribution
  const ethHoldingsDist: Record<string, number> = {};
  successLogs.forEach((log) => {
    if (log.params?.eth) {
      const amount = log.params.eth;
      let bucket = "Unknown";
      if (amount < 1000) bucket = "Under $1k";
      else if (amount < 10000) bucket = "$1k-$10k";
      else if (amount < 50000) bucket = "$10k-$50k";
      else if (amount < 100000) bucket = "$50k-$100k";
      else bucket = "$100k+";
      ethHoldingsDist[bucket] = (ethHoldingsDist[bucket] || 0) + 1;
    }
  });

  // Current yield distribution
  const currentYieldDist: Record<string, number> = {};
  successLogs.forEach((log) => {
    if (log.params?.current_yield_percent !== undefined) {
      const yieldPct = log.params.current_yield_percent;
      let bucket = "Unknown";
      if (yieldPct === 0) bucket = "0% (None)";
      else if (yieldPct < 3) bucket = "0-3%";
      else if (yieldPct < 6) bucket = "3-6%";
      else if (yieldPct < 10) bucket = "6-10%";
      else bucket = "10%+";
      currentYieldDist[bucket] = (currentYieldDist[bucket] || 0) + 1;
    }
  });

  // Calculator Actions
  const actionCounts: Record<string, number> = {
    "Calculate": 0,
    "Subscribe": 0,
    "View Graph": 0, 
    "View Summary": 0,
    "View Tips": 0,
    "Advanced Toggle": 0
  };

  widgetEvents.forEach(log => {
      if (log.event === "widget_calculate_click") actionCounts["Calculate"]++;
      if (log.event === "widget_notify_me_subscribe") actionCounts["Subscribe"]++;
      if (log.event === "widget_view_graph") actionCounts["View Graph"]++;
      if (log.event === "widget_view_summary") actionCounts["View Summary"]++;
      if (log.event === "widget_view_tips") actionCounts["View Tips"]++;
      if (log.event === "widget_advanced_toggle") actionCounts["Advanced Toggle"]++;
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Crypto Yield Optimizer Analytics</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #1a1a1a; margin-bottom: 10px; }
    .subtitle { color: #666; margin-bottom: 30px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .card h2 { font-size: 14px; color: #666; text-transform: uppercase; margin-bottom: 10px; }
    .card .value { font-size: 32px; font-weight: bold; color: #1a1a1a; }
    .card.error .value { color: #dc2626; }
    .card.success .value { color: #16a34a; }
    .card.warning .value { color: #ea580c; }
    table { width: 100%; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e5e5; }
    th { background: #f9fafb; font-weight: 600; color: #374151; font-size: 12px; text-transform: uppercase; }
    td { color: #1f2937; font-size: 14px; }
    tr:last-child td { border-bottom: none; }
    .error-row { background: #fef2f2; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
    .timestamp { color: #9ca3af; font-size: 12px; }
    td strong { color: #1f2937; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Crypto Yield Optimizer Analytics</h1>
    <p class="subtitle">Last 7 days • Auto-refresh every 60s</p>
    
    <div class="grid">
      <div class="card ${alerts.length ? "warning" : ""}">
        <h2>Alerts</h2>
        ${
          alerts.length
            ? `<ul style="padding-left:16px;margin:0;">${alerts
                .map(
                  (a) =>
                    `<li><strong>${a.level.toUpperCase()}</strong> — ${a.message}</li>`
                )
                .join("")}</ul>`
            : '<p style="color:#16a34a;">No active alerts</p>'
        }
      </div>
      <div class="card success">
        <h2>Total Calls</h2>
        <div class="value">${successLogs.length}</div>
      </div>
      <div class="card error">
        <h2>Errors</h2>
        <div class="value">${errorLogs.length}</div>
      </div>
      <div class="card warning">
        <h2>Parse Errors</h2>
        <div class="value">${parseLogs.length}</div>
      </div>
      <div class="card">
        <h2>Avg Response Time</h2>
        <div class="value">${avgResponseTime}<span style="font-size: 16px; color: #666;">ms</span></div>
      </div>
    </div>

    <div class="card" style="margin-bottom: 20px;">
      <h2>Parameter Usage</h2>
      <table>
        <thead><tr><th>Parameter</th><th>Times Used</th><th>Usage %</th></tr></thead>
        <tbody>
          ${Object.entries(paramUsage)
            .sort((a, b) => b[1] - a[1])
            .map(
              ([param, count]) => `
            <tr>
              <td><code>${param}</code></td>
              <td>${count}</td>
              <td>${((count / successLogs.length) * 100).toFixed(1)}%</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>

    <div class="grid" style="margin-bottom: 20px;">
      <div class="card">
        <h2>Yield Status</h2>
        <table>
          <thead><tr><th>Status</th><th>Count</th></tr></thead>
          <tbody>
            ${Object.entries(yieldStatusDist).length > 0 ? Object.entries(yieldStatusDist)
              .sort((a, b) => (b[1] as number) - (a[1] as number))
              .map(
                ([cat, count]) => `
              <tr>
                <td>${cat}</td>
                <td>${count}</td>
              </tr>
            `
              )
              .join("") : '<tr><td colspan="2" style="text-align: center; color: #9ca3af;">No data yet</td></tr>'}
          </tbody>
        </table>
      </div>
      
       <div class="card">
        <h2>User Actions</h2>
        <table>
          <thead><tr><th>Action</th><th>Count</th></tr></thead>
          <tbody>
            ${Object.entries(actionCounts)
              .sort((a, b) => b[1] - a[1])
              .map(
                ([action, count]) => `
              <tr>
                <td>${action}</td>
                <td>${count}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>


    <div class="card" style="margin-bottom: 20px;">
      <h2>Widget Interactions</h2>
      <table>
        <thead><tr><th>Action</th><th>Count</th></tr></thead>
        <tbody>
          ${Object.entries(widgetInteractions).length > 0 ? Object.entries(widgetInteractions)
            .sort((a, b) => b[1] - a[1])
            .map(
              ([action, count]) => `
            <tr>
              <td>${action}</td>
              <td>${count}</td>
            </tr>
          `
            )
            .join("") : '<tr><td colspan="2" style="text-align: center; color: #9ca3af;">No data yet</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="grid" style="margin-bottom: 20px;">
      <div class="card">
        <h2>BTC Holdings</h2>
        <table>
          <thead><tr><th>Amount</th><th>Users</th></tr></thead>
          <tbody>
            ${Object.entries(btcHoldingsDist).length > 0 ? Object.entries(btcHoldingsDist)
              .sort((a, b) => (b[1] as number) - (a[1] as number))
              .map(
                ([amount, count]) => `
              <tr>
                <td>${amount}</td>
                <td>${count}</td>
              </tr>
            `
              )
              .join("") : '<tr><td colspan="2" style="text-align: center; color: #9ca3af;">No data yet</td></tr>'}
          </tbody>
        </table>
      </div>
      
      <div class="card">
        <h2>ETH Holdings</h2>
        <table>
          <thead><tr><th>Amount</th><th>Users</th></tr></thead>
          <tbody>
            ${Object.entries(ethHoldingsDist).length > 0 ? Object.entries(ethHoldingsDist)
              .sort((a, b) => (b[1] as number) - (a[1] as number))
              .map(
                ([amount, count]) => `
              <tr>
                <td>${amount}</td>
                <td>${count}</td>
              </tr>
            `
              )
              .join("") : '<tr><td colspan="2" style="text-align: center; color: #9ca3af;">No data yet</td></tr>'}
          </tbody>
        </table>
      </div>
      
      <div class="card">
        <h2>Current Yield %</h2>
        <table>
          <thead><tr><th>APY Range</th><th>Users</th></tr></thead>
          <tbody>
            ${Object.entries(currentYieldDist).length > 0 ? Object.entries(currentYieldDist)
              .sort((a, b) => (b[1] as number) - (a[1] as number))
              .map(
                ([yieldRange, count]) => `
              <tr>
                <td>${yieldRange}</td>
                <td>${count}</td>
              </tr>
            `
              )
              .join("") : '<tr><td colspan="2" style="text-align: center; color: #9ca3af;">No data yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card" style="margin-bottom: 20px;">
      <h2>User Queries (Inferred from Tool Calls)</h2>
      <table>
        <thead><tr><th>Date</th><th>Query</th><th>Location</th><th>Locale</th></tr></thead>
        <tbody>
          ${successLogs.length > 0 ? successLogs
            .slice(0, 20)
            .map(
              (log) => `
            <tr>
              <td class="timestamp" style="white-space: nowrap;">${new Date(log.timestamp).toLocaleString()}</td>
              <td style="max-width: 400px;">${log.inferredQuery || "general search"}</td>
              <td style="font-size: 12px; color: #6b7280;">${log.userLocation ? `${log.userLocation.city || ''}, ${log.userLocation.region || ''}, ${log.userLocation.country || ''}`.replace(/^, |, $/g, '') : '—'}</td>
              <td style="font-size: 12px; color: #6b7280;">${log.userLocale || '—'}</td>
            </tr>
          `
            )
            .join("") : '<tr><td colspan="4" style="text-align: center; color: #9ca3af;">No queries yet</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="card" style="margin-bottom: 20px;">
      <h2>User Feedback</h2>
      <table>
        <thead><tr><th>Date</th><th>Feedback</th></tr></thead>
        <tbody>
          ${logs.filter(l => l.event === "widget_user_feedback").length > 0 ? logs
            .filter(l => l.event === "widget_user_feedback")
            .slice(0, 20)
            .map(
              (log) => `
            <tr>
              <td class="timestamp" style="white-space: nowrap;">${new Date(log.timestamp).toLocaleString()}</td>
              <td style="max-width: 600px;">${log.feedback || "—"}</td>
            </tr>
          `
            )
            .join("") : '<tr><td colspan="2" style="text-align: center; color: #9ca3af;">No feedback yet</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="card">
      <h2>Recent Events (Last 50)</h2>
      <table>
        <thead><tr><th>Time</th><th>Event</th><th>Details</th></tr></thead>
        <tbody>
          ${logs
            .slice(0, 50)
            .map(
              (log) => `
            <tr class="${log.event.includes("error") ? "error-row" : ""}">
              <td class="timestamp">${new Date(log.timestamp).toLocaleString()}</td>
              <td><strong>${humanizeEventName(log.event)}</strong></td>
              <td style="font-size: 12px; max-width: 600px; overflow: hidden; text-overflow: ellipsis;">${formatEventDetails(log)}</td>
            </tr>
          `
            )
            .join("")}
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
    source: "crypto-portfolio-optimizer",
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
    source: "crypto-portfolio-optimizer",
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

    // Support both old (settlementId/settlementName) and new (topicId/topicName) field names
    const parsed = JSON.parse(body);
    const email = parsed.email;
    const topicId = parsed.topicId || parsed.settlementId || "crypto-portfolio-optimizer";
    const topicName = parsed.topicName || parsed.settlementName || "Crypto Yield Optimizer Updates";
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
        message: "Successfully subscribed! You'll receive portfolio optimization tips and updates." 
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

async function handleSseRequest(res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const server = createCryptoYieldOptimizerServer();
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

const portEnv = Number(process.env.PORT ?? 8000);
const port = Number.isFinite(portEnv) ? portEnv : 8000;

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

    // Serve alias for legacy loader path -> our main widget HTML
    if (req.method === "GET" && (url.pathname === "/assets/portfolio-optimizer.html" || url.pathname === "/assets/crypto-portfolio-optimizer.html")) {
      const mainAssetPath = path.join(ASSETS_DIR, "crypto-portfolio-optimizer.html");
      console.log(`[Debug Legacy] Request: ${url.pathname}, Main Path: ${mainAssetPath}, Exists: ${fs.existsSync(mainAssetPath)}`);
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
      const assetPath = path.join(ASSETS_DIR, url.pathname.slice(8));
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
  console.log(`Crypto Yield Optimizer MCP server listening on http://localhost:${port}`);
  console.log(`  SSE stream: GET http://localhost:${port}${ssePath}`);
  console.log(
    `  Message post endpoint: POST http://localhost:${port}${postPath}?sessionId=...`
  );
});
