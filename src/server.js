import { createServer, } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { URL, fileURLToPath } from "node:url";
import dotenv from "dotenv";
// Load environment variables from .env file
dotenv.config();
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListResourceTemplatesRequestSchema, ListResourcesRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Resolve project root: prefer ASSETS_ROOT only if it actually has an assets/ directory
import { SUBSCRIPTION_PATTERNS } from "./subscription_data.js";
const DEFAULT_PORT = 3333;
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
        }
        catch {
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
function logAnalytics(event, data = {}) {
    const entry = {
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
function getRecentLogs(days = 7) {
    const logs = [];
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
                }
                catch (e) { }
            });
        }
    }
    return logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
function parseTextForSubscriptions(text) {
    const lines = text.split(/\r?\n/);
    const foundSubscriptions = {};
    lines.forEach((line) => {
        if (line.length < 5)
            return;
        const lowerLine = line.toLowerCase();
        Object.values(SUBSCRIPTION_PATTERNS).forEach(pattern => {
            if (pattern.regex.test(lowerLine)) {
                const priceMatch = line.match(/(\d+\.\d{2})/);
                let cost = 0;
                if (priceMatch) {
                    cost = parseFloat(priceMatch[0]);
                }
                else {
                    if (pattern.name === "Netflix")
                        cost = 15.49;
                    if (pattern.name === "Spotify")
                        cost = 11.99;
                    if (pattern.name === "ChatGPT")
                        cost = 20.00;
                }
                const existing = foundSubscriptions[pattern.name];
                if (existing) {
                    existing.count = (existing.count || 1) + 1;
                    if (existing.monthlyCost === 0 && cost > 0)
                        existing.monthlyCost = cost;
                }
                else {
                    foundSubscriptions[pattern.name] = {
                        id: `sub-${Math.random().toString(36).substr(2, 9)}`,
                        service: pattern.name,
                        monthlyCost: cost > 0 ? cost : 0,
                        status: "confirmed_subscription",
                        category: pattern.category,
                        logo: pattern.logo,
                        count: 1
                    };
                }
            }
        });
    });
    return Object.values(foundSubscriptions);
}
function classifyDevice(userAgent) {
    if (!userAgent)
        return "Unknown";
    const ua = userAgent.toLowerCase();
    if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod"))
        return "iOS";
    if (ua.includes("android"))
        return "Android";
    if (ua.includes("mac os") || ua.includes("macintosh"))
        return "macOS";
    if (ua.includes("windows"))
        return "Windows";
    if (ua.includes("linux"))
        return "Linux";
    if (ua.includes("cros"))
        return "ChromeOS";
    return "Other";
}
function computeSummary(args) {
    // Compute subscription analysis summary
    const subscriptionCount = Number(args.subscription_count) || 5;
    const monthlySpend = Number(args.monthly_spend) || 50;
    const usageLevel = args.usage_level || "medium";
    // Estimate potential savings
    let estimatedSavings = 0;
    if (usageLevel === "low")
        estimatedSavings = monthlySpend * 0.5;
    else if (usageLevel === "medium")
        estimatedSavings = monthlySpend * 0.3;
    else
        estimatedSavings = monthlySpend * 0.1;
    return {
        subscription_count: subscriptionCount,
        monthly_spend: monthlySpend,
        usage_level: usageLevel,
        estimated_savings: Math.round(estimatedSavings),
        analysis_type: "Subscription Analysis"
    };
}
function readWidgetHtml(componentName) {
    if (!fs.existsSync(ASSETS_DIR)) {
        throw new Error(`Widget assets not found. Expected directory ${ASSETS_DIR}. Run "pnpm run build" before starting the server.`);
    }
    const directPath = path.join(ASSETS_DIR, `${componentName}.html`);
    let htmlContents = null;
    let loadedFrom = "";
    if (fs.existsSync(directPath)) {
        htmlContents = fs.readFileSync(directPath, "utf8");
        loadedFrom = directPath;
    }
    else {
        const candidates = fs
            .readdirSync(ASSETS_DIR)
            .filter((file) => file.startsWith(`${componentName}-`) && file.endsWith(".html"))
            .sort();
        const fallback = candidates[candidates.length - 1];
        if (fallback) {
            const fallbackPath = path.join(ASSETS_DIR, fallback);
            htmlContents = fs.readFileSync(fallbackPath, "utf8");
            loadedFrom = fallbackPath;
        }
    }
    if (!htmlContents) {
        throw new Error(`Widget HTML for "${componentName}" not found in ${ASSETS_DIR}. Run "pnpm run build" to generate the assets.`);
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
function widgetMeta(widget, bustCache = false) {
    const templateUri = bustCache
        ? `ui://widget/just-cancel.html?v=${VERSION}`
        : widget.templateUri;
    return {
        "openai/outputTemplate": templateUri,
        "openai/widgetDescription": "A subscription management tool that helps you analyze your subscriptions and discover which ones to cancel to save money. Call this tool immediately with NO arguments to let the user enter their subscription details manually. Only provide arguments if the user has explicitly stated them.",
        "openai/componentDescriptions": {
            "subscription-form": "Input form for subscription details including monthly spend and usage patterns.",
            "analysis-display": "Display showing subscription analysis and cancellation recommendations.",
            "savings-tracker": "Progress tracker showing potential monthly savings.",
        },
        "openai/widgetKeywords": [
            "subscriptions",
            "cancel",
            "money saving",
            "budget",
            "streaming",
            "software",
            "cost reduction",
            "subscription management",
            "monthly expenses",
            "financial planning",
            "saving money"
        ],
        "openai/sampleConversations": [
            { "user": "Which subscriptions should I cancel?", "assistant": "Here is Just Cancel. Enter your subscription details to analyze which ones you should cancel to save money." },
            { "user": "I want to reduce my monthly subscription costs", "assistant": "I'll analyze your subscriptions and show you which ones to cancel for maximum savings." },
            { "user": "Help me save money on streaming services", "assistant": "I've loaded Just Cancel to help you identify streaming subscriptions you can cancel." },
        ],
        "openai/starterPrompts": [
            "Which subscriptions should I cancel?",
            "Help me save money on subscriptions",
            "Analyze my monthly subscription costs",
            "What subscriptions am I wasting money on?",
            "Reduce my streaming service costs",
            "Show me subscriptions I rarely use",
            "Help me cut my monthly expenses",
        ],
        "openai/widgetAccessible": true,
        "openai/resultCanProduceWidget": true,
        "openai/widgetCSP": {
            connect_domains: [
                "https://just-cancel-it.onrender.com",
                "https://cdnjs.cloudflare.com",
                "https://nominatim.openstreetmap.org",
                "https://api.open-meteo.com",
                "https://geocoding-api.open-meteo.com"
            ],
            resource_domains: [
                "https://just-cancel-it.onrender.com",
                "https://cdnjs.cloudflare.com"
            ],
        },
    };
}
const widgets = [
    {
        id: "just-cancel",
        title: "Just Cancel — Discover which subscriptions you should cancel to save money",
        templateUri: `ui://widget/just-cancel.html?v=${VERSION}`,
        invoking: "Opening Just Cancel...",
        invoked: "Here is Just Cancel. Analyze your subscriptions to discover which ones you should cancel to save money.",
        html: readWidgetHtml("just-cancel"),
    },
];
const widgetsById = new Map();
const widgetsByUri = new Map();
widgets.forEach((widget) => {
    widgetsById.set(widget.id, widget);
    widgetsByUri.set(widget.templateUri, widget);
});
const toolInputSchema = {
    type: "object",
    properties: {
        // Manual subscription entry
        subscriptions: { type: "array", items: { type: "object", properties: { service: { type: "string" }, monthly_cost: { type: "number" }, category: { type: "string" } } }, description: "Manually entered subscriptions if known." },
        total_monthly_spend: { type: "number", description: "Total monthly subscription spending if known." },
        view_filter: { type: "string", enum: ["all", "cancelling", "keeping", "investigating"], description: "Which subscriptions to show." },
        statement_text: { type: "string", description: "The raw text of a bank statement or list of transactions to analyze for subscriptions." },
        // File parameter for ChatGPT Apps SDK file uploads
        bank_statement: {
            type: "object",
            properties: {
                download_url: { type: "string", description: "URL to download the file from ChatGPT" },
                file_id: { type: "string", description: "ChatGPT file ID" },
            },
            required: ["download_url", "file_id"],
            additionalProperties: false,
            description: "Bank statement file (PDF or CSV) uploaded by the user in ChatGPT."
        },
    },
    required: [],
    additionalProperties: false,
    $schema: "http://json-schema.org/draft-07/schema#",
};
const toolInputParser = z.object({
    subscriptions: z.array(z.object({
        service: z.string(),
        monthly_cost: z.number(),
        category: z.string().optional(),
    })).optional(),
    total_monthly_spend: z.number().optional(),
    view_filter: z.enum(["all", "cancelling", "keeping", "investigating"]).optional(),
    statement_text: z.string().optional(),
    bank_statement: z.object({
        download_url: z.string(),
        file_id: z.string(),
    }).optional(),
});
const tools = widgets.map((widget) => ({
    name: widget.id,
    description: "Use this tool to analyze subscriptions and discover which ones to cancel to save money. Helps users identify underutilized or wasteful subscriptions. If the user uploads a bank statement PDF or CSV, use the bank_statement parameter. Call this tool immediately with NO arguments to let the user enter their subscription details manually. Only provide arguments if the user has explicitly stated them.",
    inputSchema: toolInputSchema,
    outputSchema: {
        type: "object",
        properties: {
            ready: { type: "boolean" },
            timestamp: { type: "string" },
            subscriptions: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        service: { type: "string" },
                        monthly_cost: { type: "number" },
                        status: { type: "string", enum: ["cancelling", "keeping", "investigating"] },
                        notes: { type: "string" },
                        cancel_link: { type: "string" },
                        category: { type: "string" },
                    },
                },
            },
            summary: {
                type: "object",
                properties: {
                    monthly_savings: { type: ["number", "null"] },
                    yearly_savings: { type: ["number", "null"] },
                    total_yearly_spending: { type: ["number", "null"] },
                    cancelling_count: { type: ["number", "null"] },
                    investigating_count: { type: ["number", "null"] },
                    keeping_count: { type: ["number", "null"] },
                    total_count: { type: ["number", "null"] },
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
        "openai/fileParams": ["bank_statement"],
        securitySchemes: [{ type: "noauth" }],
    },
    annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
    },
}));
const resources = widgets.map((widget) => ({
    uri: widget.templateUri,
    name: widget.title,
    description: "HTML template for the Just Cancel widget that helps analyze subscriptions and identify which ones to cancel for savings.",
    mimeType: "text/html+skybridge",
    _meta: widgetMeta(widget),
}));
const resourceTemplates = widgets.map((widget) => ({
    uriTemplate: widget.templateUri,
    name: widget.title,
    description: "Template descriptor for the Just Cancel widget.",
    mimeType: "text/html+skybridge",
    _meta: widgetMeta(widget),
}));
function createJustCancelServer() {
    const server = new Server({
        name: "just-cancel",
        version: "0.1.0",
        description: "Just Cancel helps users analyze their subscriptions and discover which ones to cancel to save money on monthly expenses.",
    }, {
        capabilities: {
            resources: {},
            tools: {},
        },
    });
    server.setRequestHandler(ListResourcesRequestSchema, async (_request) => {
        console.log(`[MCP] resources/list called, returning ${resources.length} resources`);
        resources.forEach((r) => {
            console.log(`  - ${r.uri} (${r.name})`);
        });
        return { resources };
    });
    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
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
    });
    server.setRequestHandler(ListResourceTemplatesRequestSchema, async (_request) => ({ resourceTemplates }));
    server.setRequestHandler(ListToolsRequestSchema, async (_request) => ({ tools }));
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const startTime = Date.now();
        let userAgentString = null;
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
            let args = {};
            try {
                args = toolInputParser.parse(request.params.arguments ?? {});
            }
            catch (parseError) {
                logAnalytics("parameter_parse_error", {
                    toolName: request.params.name,
                    params: request.params.arguments,
                    error: parseError.message,
                });
                throw parseError;
            }
            // Capture user context from _meta - try multiple locations
            const meta = request._meta || request.params?._meta || {};
            const userLocation = meta["openai/userLocation"];
            const userLocale = meta["openai/locale"];
            const userAgent = meta["openai/userAgent"];
            userAgentString = typeof userAgent === "string" ? userAgent : null;
            deviceCategory = classifyDevice(userAgentString);
            // Debug log
            console.log("Captured meta:", { userLocation, userLocale, userAgent });
            // If ChatGPT didn't pass structured arguments, try to infer details from freeform text in meta
            try {
                const candidates = [
                    meta["openai/subject"],
                    meta["openai/userPrompt"],
                    meta["openai/userText"],
                    meta["openai/lastUserMessage"],
                    meta["openai/inputText"],
                    meta["openai/requestText"],
                ];
                const userText = candidates.find((t) => typeof t === "string" && t.trim().length > 0) || "";
                // Simple inference for subscriptions if not provided (placeholder for more advanced AI logic)
                if (!args.total_monthly_spend) {
                    const spendMatch = userText.match(/\$(\d+)/);
                    if (spendMatch) {
                        args.total_monthly_spend = parseInt(spendMatch[1]);
                    }
                }
            }
            catch (e) {
                console.warn("Parameter inference from meta failed", e);
            }
            // Handle file uploads from ChatGPT Apps SDK
            let parsedSubscriptions = [];
            let fileParsingError = null;
            if (args.bank_statement?.download_url) {
                console.log("[MCP] Processing bank_statement file from ChatGPT:", args.bank_statement);
                try {
                    // Fetch the file from ChatGPT's download_url
                    const fileResponse = await fetch(args.bank_statement.download_url);
                    if (!fileResponse.ok) {
                        throw new Error(`Failed to fetch file: ${fileResponse.status} ${fileResponse.statusText}`);
                    }
                    const contentType = fileResponse.headers.get("content-type") || "";
                    const fileBuffer = await fileResponse.arrayBuffer();
                    let extractedText = "";
                    if (contentType.includes("pdf") || args.bank_statement.download_url.toLowerCase().includes(".pdf")) {
                        // Parse PDF using pdfjs-dist
                        console.log("[MCP] Parsing PDF file...");
                        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(fileBuffer) });
                        const pdf = await loadingTask.promise;
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const textContent = await page.getTextContent();
                            const pageText = textContent.items.map((item) => item.str).join(" ");
                            extractedText += pageText + "\n";
                        }
                        console.log(`[MCP] Extracted ${extractedText.length} characters from ${pdf.numPages} PDF pages`);
                    }
                    else {
                        // Assume CSV or text file
                        console.log("[MCP] Parsing CSV/text file...");
                        extractedText = new TextDecoder().decode(fileBuffer);
                    }
                    // Parse the extracted text for subscriptions
                    parsedSubscriptions = parseTextForSubscriptions(extractedText);
                    console.log(`[MCP] Found ${parsedSubscriptions.length} subscriptions from file`);
                    logAnalytics("file_parse_success", {
                        file_id: args.bank_statement.file_id,
                        content_type: contentType,
                        text_length: extractedText.length,
                        subscriptions_found: parsedSubscriptions.length,
                    });
                }
                catch (fileError) {
                    console.error("[MCP] File parsing failed:", fileError);
                    fileParsingError = fileError.message;
                    logAnalytics("file_parse_error", {
                        file_id: args.bank_statement?.file_id,
                        error: fileError.message,
                    });
                }
            }
            // Also parse statement_text if provided (for backwards compatibility)
            if (args.statement_text) {
                const textSubscriptions = parseTextForSubscriptions(args.statement_text);
                // Merge with file-parsed subscriptions, avoiding duplicates
                textSubscriptions.forEach(sub => {
                    if (!parsedSubscriptions.find(p => p.service.toLowerCase() === sub.service.toLowerCase())) {
                        parsedSubscriptions.push(sub);
                    }
                });
            }
            const responseTime = Date.now() - startTime;
            // Check if we are using defaults (i.e. no arguments provided)
            const usedDefaults = Object.keys(args).length === 0;
            // Infer likely user query from parameters
            const inferredQuery = [];
            if (args.subscriptions && args.subscriptions.length > 0) {
                inferredQuery.push(`${args.subscriptions.length} subscriptions`);
            }
            if (args.total_monthly_spend) {
                inferredQuery.push(`Spend: $${args.total_monthly_spend}`);
            }
            logAnalytics("tool_call_success", {
                toolName: request.params.name,
                params: args,
                inferredQuery: inferredQuery.length > 0 ? inferredQuery.join(", ") : "Just Cancel",
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
            console.log(`[MCP] Tool called: ${request.params.name}, returning templateUri: ${widgetMetadata["openai/outputTemplate"]}`);
            // Merge parsed subscriptions with any manually provided ones
            const allSubscriptions = [
                ...parsedSubscriptions,
                ...(args.subscriptions || []).map(s => ({
                    id: `sub-${Math.random().toString(36).substr(2, 9)}`,
                    service: s.service,
                    monthlyCost: s.monthly_cost,
                    category: s.category || "Other",
                    status: "confirmed_subscription",
                    count: 1,
                })),
            ];
            // Calculate total monthly spend from all subscriptions
            const calculatedMonthlySpend = allSubscriptions.reduce((sum, s) => sum + (s.monthlyCost || 0), 0);
            const totalMonthlySpend = args.total_monthly_spend || calculatedMonthlySpend;
            // Build structured content once so we can log it and return it.
            // For just-cancel, expose fields relevant to subscription details
            const structured = {
                ready: true,
                timestamp: new Date().toISOString(),
                subscriptions: allSubscriptions,
                total_monthly_spend: totalMonthlySpend,
                view_filter: args.view_filter,
                input_source: usedDefaults ? "default" : (args.bank_statement ? "file_upload" : "user"),
                file_parsing_error: fileParsingError,
                // Summary + follow-ups for natural language UX
                summary: {
                    subscription_count: allSubscriptions.length,
                    monthly_spend: totalMonthlySpend,
                    yearly_spend: totalMonthlySpend * 12,
                    analysis_type: args.bank_statement ? "File Analysis" : "Subscription Analysis",
                },
                suggested_followups: [
                    "Which subscriptions should I cancel?",
                    "How much can I save monthly?",
                    "Show me my most expensive subscriptions",
                    "Help me lower my monthly bills"
                ],
            };
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
            };
            console.log("[MCP] Returning outputTemplate:", metaForReturn["openai/outputTemplate"]);
            console.log("[MCP] Returning structuredContent:", structured);
            // Log success analytics
            try {
                // Check for "empty" result - when no subscription info provided
                const hasMainInputs = (args.subscriptions && args.subscriptions.length > 0) || args.total_monthly_spend || args.bank_statement || allSubscriptions.length > 0;
                if (!hasMainInputs) {
                    logAnalytics("tool_call_empty", {
                        toolName: request.params.name,
                        params: request.params.arguments || {},
                        reason: "No subscription details provided"
                    });
                }
                else {
                    logAnalytics("tool_call_success", {
                        responseTime,
                        params: request.params.arguments || {},
                        inferredQuery: inferredQuery.join(", "),
                        userLocation,
                        userLocale,
                        device: deviceCategory,
                    });
                }
            }
            catch { }
            // TEXT SUPPRESSION: Return empty content array to prevent ChatGPT from adding
            // any text after the widget. The widget provides all necessary UI.
            // See: content: [] means no text content, only the widget is shown.
            return {
                content: [], // Empty array = no text after widget
                structuredContent: structured,
                _meta: metaForReturn, // Contains openai/resultCanProduceWidget: true
            };
        }
        catch (error) {
            logAnalytics("tool_call_error", {
                error: error.message,
                stack: error.stack,
                responseTime: Date.now() - startTime,
                device: deviceCategory,
                userAgent: userAgentString,
            });
            throw error;
        }
    });
    return server;
}
const sessions = new Map();
const ssePath = "/mcp";
const postPath = "/mcp/messages";
const subscribePath = "/api/subscribe";
const analyticsPath = "/analytics";
const trackEventPath = "/api/track";
const healthPath = "/health";
const domainVerificationPath = "/.well-known/openai-apps-challenge";
const domainVerificationToken = process.env.OPENAI_DOMAIN_VERIFICATION_TOKEN ??
    "X1C2u_pL7rpRTEqXIorF7SPz-yc1ucHWvuIoUEEYwQE";
const ANALYTICS_PASSWORD = process.env.ANALYTICS_PASSWORD || "changeme123";
function checkAnalyticsAuth(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Basic ")) {
        return false;
    }
    const base64Credentials = authHeader.split(" ")[1];
    const credentials = Buffer.from(base64Credentials, "base64").toString("utf8");
    const [username, password] = credentials.split(":");
    return username === "admin" && password === ANALYTICS_PASSWORD;
}
function humanizeEventName(event) {
    const eventMap = {
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
function formatEventDetails(log) {
    const excludeKeys = ["timestamp", "event"];
    const details = {};
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
function evaluateAlerts(logs) {
    const alerts = [];
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    // 1. Tool Call Failures
    const toolErrors24h = logs.filter((l) => l.event === "tool_call_error" &&
        new Date(l.timestamp).getTime() >= dayAgo).length;
    if (toolErrors24h > 5) {
        alerts.push({
            id: "tool-errors",
            level: "critical",
            message: `Tool failures in last 24h: ${toolErrors24h} (>5 threshold)`,
        });
    }
    // 2. Parameter Parsing Errors
    const parseErrorsWeek = logs.filter((l) => l.event === "parameter_parse_error" &&
        new Date(l.timestamp).getTime() >= weekAgo).length;
    if (parseErrorsWeek > 3) {
        alerts.push({
            id: "parse-errors",
            level: "warning",
            message: `Parameter parse errors in last 7d: ${parseErrorsWeek} (>3 threshold)`,
        });
    }
    // 3. Empty Result Sets (or equivalent for calculator - e.g. missing inputs)
    const successCalls = logs.filter((l) => l.event === "tool_call_success" && new Date(l.timestamp).getTime() >= weekAgo);
    const emptyResults = logs.filter((l) => l.event === "tool_call_empty" && new Date(l.timestamp).getTime() >= weekAgo).length;
    const totalCalls = successCalls.length + emptyResults;
    if (totalCalls > 0 && (emptyResults / totalCalls) > 0.2) {
        alerts.push({
            id: "empty-results",
            level: "warning",
            message: `Empty result rate ${((emptyResults / totalCalls) * 100).toFixed(1)}% (>20% threshold)`,
        });
    }
    // 4. Widget Load Failures (Crashes)
    const widgetCrashes = logs.filter((l) => l.event === "widget_crash" && new Date(l.timestamp).getTime() >= dayAgo).length;
    if (widgetCrashes > 0) {
        alerts.push({
            id: "widget-crash",
            level: "critical",
            message: `Widget crashes in last 24h: ${widgetCrashes} (Fix immediately)`,
        });
    }
    // 5. Buttondown Subscription Failures
    const recentSubs = logs.filter((l) => (l.event === "widget_notify_me_subscribe" ||
        l.event === "widget_notify_me_subscribe_error") &&
        new Date(l.timestamp).getTime() >= weekAgo);
    const subFailures = recentSubs.filter((l) => l.event === "widget_notify_me_subscribe_error").length;
    const failureRate = recentSubs.length > 0 ? subFailures / recentSubs.length : 0;
    if (recentSubs.length >= 5 && failureRate > 0.1) {
        alerts.push({
            id: "buttondown-failures",
            level: "warning",
            message: `Buttondown failure rate ${(failureRate * 100).toFixed(1)}% over last 7d (${subFailures}/${recentSubs.length})`,
        });
    }
    return alerts;
}
function generateAnalyticsDashboard(logs, alerts) {
    const errorLogs = logs.filter((l) => l.event.includes("error"));
    const successLogs = logs.filter((l) => l.event === "tool_call_success");
    const parseLogs = logs.filter((l) => l.event === "parameter_parse_error");
    const widgetEvents = logs.filter((l) => l.event.startsWith("widget_"));
    const avgResponseTime = successLogs.length > 0
        ? (successLogs.reduce((sum, l) => sum + (l.responseTime || 0), 0) /
            successLogs.length).toFixed(0)
        : "N/A";
    const paramUsage = {};
    const tripPurposeDist = {};
    const climateDist = {};
    successLogs.forEach((log) => {
        if (log.params) {
            Object.keys(log.params).forEach((key) => {
                if (log.params[key] !== undefined) {
                    paramUsage[key] = (paramUsage[key] || 0) + 1;
                }
            });
            // Track trip purpose distribution
            if (log.params.purpose) {
                const purpose = log.params.purpose;
                tripPurposeDist[purpose] = (tripPurposeDist[purpose] || 0) + 1;
            }
            // Track climate distribution
            if (log.params.climate) {
                const climate = log.params.climate;
                climateDist[climate] = (climateDist[climate] || 0) + 1;
            }
        }
    });
    const widgetInteractions = {};
    widgetEvents.forEach((log) => {
        const humanName = humanizeEventName(log.event);
        widgetInteractions[humanName] = (widgetInteractions[humanName] || 0) + 1;
    });
    // Trip duration distribution
    const tripDurationDist = {};
    successLogs.forEach((log) => {
        if (log.params?.trip_duration) {
            const days = log.params.trip_duration;
            let bucket = "Unknown";
            if (days <= 3)
                bucket = "1-3 days";
            else if (days <= 7)
                bucket = "4-7 days";
            else if (days <= 14)
                bucket = "8-14 days";
            else
                bucket = "15+ days";
            tripDurationDist[bucket] = (tripDurationDist[bucket] || 0) + 1;
        }
    });
    // International vs Domestic distribution
    const tripTypeDist = {};
    successLogs.forEach((log) => {
        if (log.params?.is_international !== undefined) {
            const tripType = log.params.is_international ? "International" : "Domestic";
            tripTypeDist[tripType] = (tripTypeDist[tripType] || 0) + 1;
        }
    });
    // Destinations (top 10)
    const destinationDist = {};
    successLogs.forEach((log) => {
        if (log.params?.destination) {
            const dest = log.params.destination;
            destinationDist[dest] = (destinationDist[dest] || 0) + 1;
        }
    });
    // Checklist Actions
    const actionCounts = {
        "Generate Checklist": 0,
        "Subscribe": 0,
        "Check Item": 0,
        "Add Custom Item": 0,
        "Save Checklist": 0,
        "Print/Share": 0
    };
    widgetEvents.forEach(log => {
        if (log.event === "widget_generate_checklist")
            actionCounts["Generate Checklist"]++;
        if (log.event === "widget_notify_me_subscribe")
            actionCounts["Subscribe"]++;
        if (log.event === "widget_check_item")
            actionCounts["Check Item"]++;
        if (log.event === "widget_add_custom_item")
            actionCounts["Add Custom Item"]++;
        if (log.event === "widget_save_checklist")
            actionCounts["Save Checklist"]++;
        if (log.event === "widget_print_share")
            actionCounts["Print/Share"]++;
    });
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Just Cancel Analytics</title>
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
    <h1>📊 Just Cancel Analytics</h1>
    <p class="subtitle">Last 7 days • Auto-refresh every 60s</p>
    
    <div class="grid">
      <div class="card ${alerts.length ? "warning" : ""}">
        <h2>Alerts</h2>
        ${alerts.length
        ? `<ul style="padding-left:16px;margin:0;">${alerts
            .map((a) => `<li><strong>${a.level.toUpperCase()}</strong> — ${a.message}</li>`)
            .join("")}</ul>`
        : '<p style="color:#16a34a;">No active alerts</p>'}
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
        .map(([param, count]) => `
            <tr>
              <td><code>${param}</code></td>
              <td>${count}</td>
              <td>${((count / successLogs.length) * 100).toFixed(1)}%</td>
            </tr>
          `)
        .join("")}
        </tbody>
      </table>
    </div>

    <div class="grid" style="margin-bottom: 20px;">
      <div class="card">
        <h2>Trip Purpose</h2>
        <table>
          <thead><tr><th>Purpose</th><th>Count</th></tr></thead>
          <tbody>
            ${Object.entries(tripPurposeDist).length > 0 ? Object.entries(tripPurposeDist)
        .sort((a, b) => b[1] - a[1])
        .map(([purpose, count]) => `
              <tr>
                <td>${purpose}</td>
                <td>${count}</td>
              </tr>
            `)
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
        .map(([action, count]) => `
              <tr>
                <td>${action}</td>
                <td>${count}</td>
              </tr>
            `)
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
        .map(([action, count]) => `
            <tr>
              <td>${action}</td>
              <td>${count}</td>
            </tr>
          `)
        .join("") : '<tr><td colspan="2" style="text-align: center; color: #9ca3af;">No data yet</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="grid" style="margin-bottom: 20px;">
      <div class="card">
        <h2>Trip Duration</h2>
        <table>
          <thead><tr><th>Duration</th><th>Users</th></tr></thead>
          <tbody>
            ${Object.entries(tripDurationDist).length > 0 ? Object.entries(tripDurationDist)
        .sort((a, b) => b[1] - a[1])
        .map(([duration, count]) => `
              <tr>
                <td>${duration}</td>
                <td>${count}</td>
              </tr>
            `)
        .join("") : '<tr><td colspan="2" style="text-align: center; color: #9ca3af;">No data yet</td></tr>'}
          </tbody>
        </table>
      </div>
      
      <div class="card">
        <h2>Trip Type</h2>
        <table>
          <thead><tr><th>Type</th><th>Users</th></tr></thead>
          <tbody>
            ${Object.entries(tripTypeDist).length > 0 ? Object.entries(tripTypeDist)
        .sort((a, b) => b[1] - a[1])
        .map(([tripType, count]) => `
              <tr>
                <td>${tripType}</td>
                <td>${count}</td>
              </tr>
            `)
        .join("") : '<tr><td colspan="2" style="text-align: center; color: #9ca3af;">No data yet</td></tr>'}
          </tbody>
        </table>
      </div>
      
      <div class="card">
        <h2>Top Destinations</h2>
        <table>
          <thead><tr><th>Destination</th><th>Users</th></tr></thead>
          <tbody>
            ${Object.entries(destinationDist).length > 0 ? Object.entries(destinationDist)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([dest, count]) => `
              <tr>
                <td>${dest}</td>
                <td>${count}</td>
              </tr>
            `)
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
        .map((log) => `
            <tr>
              <td class="timestamp" style="white-space: nowrap;">${new Date(log.timestamp).toLocaleString()}</td>
              <td style="max-width: 400px;">${log.inferredQuery || "general search"}</td>
              <td style="font-size: 12px; color: #6b7280;">${log.userLocation ? `${log.userLocation.city || ''}, ${log.userLocation.region || ''}, ${log.userLocation.country || ''}`.replace(/^, |, $/g, '') : '—'}</td>
              <td style="font-size: 12px; color: #6b7280;">${log.userLocale || '—'}</td>
            </tr>
          `)
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
        .map((log) => `
            <tr>
              <td class="timestamp" style="white-space: nowrap;">${new Date(log.timestamp).toLocaleString()}</td>
              <td style="max-width: 600px;">${log.feedback || "—"}</td>
            </tr>
          `)
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
        .map((log) => `
            <tr class="${log.event.includes("error") ? "error-row" : ""}">
              <td class="timestamp">${new Date(log.timestamp).toLocaleString()}</td>
              <td><strong>${humanizeEventName(log.event)}</strong></td>
              <td style="font-size: 12px; max-width: 600px; overflow: hidden; text-overflow: ellipsis;">${formatEventDetails(log)}</td>
            </tr>
          `)
        .join("")}
        </tbody>
      </table>
    </div>
  </div>
  <script>setTimeout(() => location.reload(), 60000);</script>
</body>
</html>`;
}
async function handleAnalytics(req, res) {
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
        alerts.forEach((alert) => console.warn("[ALERT]", alert.id, alert.message));
        const html = generateAnalyticsDashboard(logs, alerts);
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(html);
    }
    catch (error) {
        console.error("Analytics error:", error);
        res.writeHead(500).end("Failed to generate analytics");
    }
}
async function handleTrackEvent(req, res) {
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
    }
    catch (error) {
        console.error("Track event error:", error);
        res.writeHead(500).end(JSON.stringify({ error: "Failed to track event" }));
    }
}
// Buttondown API integration
async function subscribeToButtondown(email, topicId, topicName) {
    const BUTTONDOWN_API_KEY = process.env.BUTTONDOWN_API_KEY;
    console.log("[Buttondown] subscribeToButtondown called", { email, topicId, topicName });
    console.log("[Buttondown] API key present:", !!BUTTONDOWN_API_KEY, "length:", BUTTONDOWN_API_KEY?.length ?? 0);
    if (!BUTTONDOWN_API_KEY) {
        throw new Error("BUTTONDOWN_API_KEY not set in environment variables");
    }
    const metadata = {
        topicName,
        source: "just-cancel",
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
            }
            else if (errorData.code) {
                errorMessage = `Error: ${errorData.code}`;
            }
        }
        catch {
            errorMessage = errorText;
        }
        throw new Error(errorMessage);
    }
    return await response.json();
}
// Update existing subscriber with new topic
async function updateButtondownSubscriber(email, topicId, topicName) {
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
        source: "just-cancel",
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
async function handleSubscribe(req, res) {
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
        const topicId = parsed.topicId || parsed.settlementId || "just-cancel";
        const topicName = parsed.topicName || parsed.settlementName || "Just Cancel Updates";
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
                message: "Successfully subscribed! You'll receive travel tips and packing list updates."
            }));
        }
        catch (subscribeError) {
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
                }
                catch (updateError) {
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
    }
    catch (error) {
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
async function handleHeartbeat(res) {
    res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    res.end(JSON.stringify({ status: "alive", timestamp: new Date().toISOString() }));
}
async function handleExtractPdf(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Content-Type", "application/json");
    console.log("[Extract PDF] Incoming request", {
        method: req.method,
        origin: req.headers.origin,
        userAgent: req.headers["user-agent"],
        contentType: req.headers["content-type"],
        contentLength: req.headers["content-length"],
    });
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
        console.log("[Extract PDF] Body received", { length: body.length });
        const parsedBody = JSON.parse(body);
        const base64 = parsedBody?.base64;
        if (!base64 || typeof base64 !== "string") {
            throw new Error("Missing base64 data");
        }
        const buffer = Buffer.from(base64, "base64");
        console.log("[Extract PDF] Decoded buffer", { bytes: buffer.length });
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
        const pdf = await loadingTask.promise;
        console.log("[Extract PDF] PDF loaded", { pages: pdf.numPages });
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item) => item.str).join(" ");
            console.log("[Extract PDF] Page extracted", { page: i, chars: pageText.length });
            fullText += pageText + "\n";
        }
        console.log("[Extract PDF] Extraction complete", { totalChars: fullText.length });
        res.writeHead(200).end(JSON.stringify({ text: fullText }));
    }
    catch (error) {
        console.error("[Extract PDF] Server-side PDF extraction failed", {
            message: error?.message,
            stack: error?.stack,
        });
        res.writeHead(500).end(JSON.stringify({
            error: error?.message || "Extraction failed",
        }));
    }
}
async function handleSseRequest(res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    const server = createJustCancelServer();
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
    }
    catch (error) {
        sessions.delete(sessionId);
        console.error("Failed to start SSE session", error);
        if (!res.headersSent) {
            res.writeHead(500).end("Failed to establish SSE connection");
        }
    }
}
async function handlePostMessage(req, res, url) {
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
    }
    catch (error) {
        console.error("Failed to process message", error);
        if (!res.headersSent) {
            res.writeHead(500).end("Failed to process message");
        }
    }
}
const portEnv = Number(process.env.PORT ?? 8000);
const port = Number.isFinite(portEnv) ? portEnv : 8000;
const httpServer = createServer(async (req, res) => {
    if (!req.url) {
        res.writeHead(400).end("Missing URL");
        return;
    }
    const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
    if (req.method === "OPTIONS" &&
        (url.pathname === ssePath || url.pathname === postPath)) {
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
    if (req.method === "GET" && url.pathname === domainVerificationPath) {
        res.writeHead(200, { "Content-Type": "text/plain" }).end(domainVerificationToken);
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
    if (url.pathname === "/api/heartbeat") {
        await handleHeartbeat(res);
        return;
    }
    if (url.pathname === "/api/extract-pdf" && (req.method === "POST" || req.method === "OPTIONS")) {
        await handleExtractPdf(req, res);
        return;
    }
    if (url.pathname === "/api/track" && req.method === "POST") {
        await handleTrackEvent(req, res);
        return;
    }
    // Serve alias for legacy loader path -> our main widget HTML
    if (req.method === "GET" && url.pathname === "/assets/just-cancel.html") {
        const mainAssetPath = path.join(ASSETS_DIR, "just-cancel.html");
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
            const contentTypeMap = {
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
});
httpServer.on("clientError", (err, socket) => {
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
        }
        catch (e) {
            console.error("Monitoring check failed:", e);
        }
    }, 60 * 60 * 1000); // 1 hour
}
httpServer.listen(port, () => {
    startMonitoring();
    console.log(`Just Cancel MCP server listening on http://localhost:${port}`);
    console.log(`  SSE stream: GET http://localhost:${port}${ssePath}`);
    console.log(`  Message post endpoint: POST http://localhost:${port}${postPath}?sessionId=...`);
});
