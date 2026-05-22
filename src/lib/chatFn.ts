import { createServerFn } from "@tanstack/react-start";
import { processWorkflowMessage } from "./workflow/ConversationController";

/**
 * Plain vars/secrets from `wrangler` + `.dev.vars` are exposed as `env` bindings
 * (`import { env } from "cloudflare:workers"`). They are **not** copied onto
 * `process.env`, so Node-style reads miss them in workerd/dev.
 */
async function getAnthropicApiKey(): Promise<string> {
  try {
    const { env } = (await import(
      /* vite-ignore workers-only virtual module */
      "cloudflare:workers"
    )) as { env: { ANTHROPIC_API_KEY?: string } };
    const fromBindings = env.ANTHROPIC_API_KEY?.trim();
    if (fromBindings) return fromBindings;
  } catch {
    /* not executing in Workers (e.g. tests) */
  }
  


  return typeof process !== "undefined" ? (process.env.ANTHROPIC_API_KEY?.trim() ?? "") : "";
}

const SYSTEM_PROMPT = `You are an AI assistant for Cars24, India's largest used car marketplace.
Help users buy used cars, sell their car, calculate EMI, find insurance, and book service.

You know the Indian car market well — Maruti Swift, WagonR, Baleno, Brezza, Dzire, Alto;
Hyundai i20, Creta, Venue, Verna; Honda City, Amaze; Tata Nexon, Punch, Altroz;
Mahindra XUV700, Scorpio; Toyota Innova, Fortuner; and typical prices, fuel types, mileage.

🔴 CRITICAL: If ACTIVE WORKFLOW CONTEXT section is present below, you MUST:
- Follow the CRITICAL CONSTRAINTS strictly
- Never deviate from workflow context rules
- Always acknowledge the user's specific question/request
- Never give generic greetings when in a workflow
- Reference collected data when responding

IMPORTANT CONTEXT RULES:
- Always remember what was discussed earlier in the conversation
- If the user provides additional details (year, KM, city) after you asked for them, use those details immediately
- Never ask for information the user already provided
- If a tool was already shown, reference it naturally ("as you saw in the estimate above...")
- CRITICAL: Read the user's exact question - don't respond with generic help text

WHEN TO USE TOOLS:
- search_cars: user wants to browse or find cars to buy
- calc_emi: user asks about EMI, loan, or financing
- price_estimate: user wants to know what their car is worth or wants to sell

RESPONSE FORMAT:
1. Answer concisely (1–3 sentences max)
2. Call a tool if needed (search_cars / calc_emi / price_estimate)
3. End EVERY response with follow-up suggestions in this exact format (no exceptions):
<followups>["Short question 1?", "Short question 2?", "Short question 3?"]</followups>

Follow-up rules:
- Always 3 suggestions, max 6 words each
- Make them specific to the current conversation context
- Suggest the NEXT natural step for the user (not things they just asked)
- Examples for sell flow: ["What documents do I need?", "How to get a better price?", "Book free inspection"]
- Examples for buy flow: ["Compare these cars", "Calculate EMI for Swift", "Show diesel options"]
- Examples for general: ["Buy a used car", "Sell my car", "Calculate loan EMI"]`;

const TOOLS = [
  {
    name: "search_cars",
    description: "Show used car listings matching the user's requirements",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Brief description of what they want" },
      },
    },
  },
  {
    name: "calc_emi",
    description: "Show an interactive EMI calculator for a specific car",
    input_schema: {
      type: "object" as const,
      properties: {
        car_name: { type: "string", description: "Full car name" },
        price: { type: "number", description: "Car price in INR" },
      },
      required: ["car_name", "price"],
    },
  },
  {
    name: "price_estimate",
    description: "Show a sell price estimate for the user's car",
    input_schema: {
      type: "object" as const,
      properties: {
        car_name: { type: "string", description: "Car model name" },
        year: { type: "number", description: "Year of manufacture" },
        km: { type: "number", description: "Kilometres driven" },
        city: { type: "string", description: "City where the car is registered" },
        fuel: { type: "string", description: "Fuel type: Petrol / Diesel / CNG / Electric" },
      },
      required: ["car_name"],
    },
  },
];

const MOCK_CARS = [
  { id: 1, name: "Maruti Swift VXI",    year: 2021, km: 32000, fuel: "Petrol", price: 595000,  image: null },
  { id: 2, name: "Honda City ZX",       year: 2020, km: 45000, fuel: "Petrol", price: 895000,  image: null },
  { id: 3, name: "Hyundai i20 Asta",    year: 2022, km: 18000, fuel: "Petrol", price: 785000,  image: null },
  { id: 4, name: "Maruti Baleno Alpha", year: 2021, km: 28000, fuel: "Petrol", price: 665000,  image: null },
  { id: 5, name: "Tata Nexon XZ+",      year: 2022, km: 21000, fuel: "Petrol", price: 910000,  image: null },
];

const SELL_PROFILES = [
  { pattern: /wagon\s*r/i, name: "Maruti WagonR VXI",    min: 310000, max: 490000, est: 405000 },
  { pattern: /alto/i,      name: "Maruti Alto K10",       min: 200000, max: 340000, est: 275000 },
  { pattern: /dzire/i,     name: "Maruti Dzire ZXI",      min: 410000, max: 610000, est: 510000 },
  { pattern: /swift/i,     name: "Maruti Swift VXi",      min: 380000, max: 560000, est: 475000 },
  { pattern: /baleno/i,    name: "Maruti Baleno Alpha",   min: 490000, max: 710000, est: 610000 },
  { pattern: /ertiga/i,    name: "Maruti Ertiga ZXI",     min: 580000, max: 840000, est: 710000 },
  { pattern: /brezza/i,    name: "Maruti Brezza ZXI",     min: 670000, max: 980000, est: 840000 },
  { pattern: /i20/i,       name: "Hyundai i20 Asta",      min: 520000, max: 770000, est: 650000 },
  { pattern: /creta/i,     name: "Hyundai Creta SX",      min: 780000, max: 1150000, est: 960000 },
  { pattern: /venue/i,     name: "Hyundai Venue SX",      min: 640000, max: 920000, est: 780000 },
  { pattern: /verna/i,     name: "Hyundai Verna SX",      min: 560000, max: 830000, est: 700000 },
  { pattern: /city/i,      name: "Honda City ZX",         min: 620000, max: 900000, est: 760000 },
  { pattern: /amaze/i,     name: "Honda Amaze VX",        min: 460000, max: 660000, est: 560000 },
  { pattern: /nexon/i,     name: "Tata Nexon XZ+",        min: 710000, max: 1060000, est: 880000 },
  { pattern: /punch/i,     name: "Tata Punch Creative",   min: 560000, max: 810000, est: 690000 },
  { pattern: /altroz/i,    name: "Tata Altroz XZ",        min: 490000, max: 730000, est: 620000 },
  { pattern: /innova/i,    name: "Toyota Innova Crysta",  min: 1100000, max: 1700000, est: 1380000 },
  { pattern: /fortuner/i,  name: "Toyota Fortuner",       min: 2200000, max: 3100000, est: 2650000 },
  { pattern: /scorpio/i,   name: "Mahindra Scorpio",      min: 690000, max: 1050000, est: 860000 },
  { pattern: /xuv\s*700/i, name: "Mahindra XUV700 AX7",  min: 1500000, max: 2100000, est: 1780000 },
];

function buildPriceEstimate(input: {
  car_name: string; year?: number; km?: number; city?: string; fuel?: string;
}) {
  const p = SELL_PROFILES.find((s) => s.pattern.test(input.car_name)) ?? {
    name: input.car_name, min: 380000, max: 620000, est: 500000,
  };
  const year = input.year ?? 2021;
  const km = input.km ?? 42000;
  const age = new Date().getFullYear() - year;
  return {
    carName: p.name, year, km,
    fuel: input.fuel ?? "Petrol",
    city: input.city ?? "Delhi",
    priceMin: p.min, priceMax: p.max, priceEstimate: p.est,
    hasDefaults: !input.year || !input.km,
    factors: [
      { label: "Single owner", impact: "positive" },
      { label: km > 60000 ? "High mileage" : "Low mileage", impact: km > 60000 ? "negative" : "positive" },
      { label: input.fuel ?? "Petrol", impact: "neutral" },
      { label: age > 4 ? "Older model year" : "Recent model", impact: age > 4 ? "negative" : "positive" },
      { label: "Original paint", impact: "positive" },
      { label: "Insurance active", impact: "neutral" },
    ],
  };
}

function executeTool(name: string, input: Record<string, unknown>) {
  if (name === "search_cars")    return MOCK_CARS;
  if (name === "calc_emi")       return { carName: input.car_name, price: input.price };
  if (name === "price_estimate") return buildPriceEstimate(input as Parameters<typeof buildPriceEstimate>[0]);
  return null;
}

function parseFollowUps(text: string): { clean: string; followUps: string[] } {
  const match = text.match(/<followups>([\s\S]*?)<\/followups>/);
  if (!match) return { clean: text.trim(), followUps: [] };
  try {
    const followUps = JSON.parse(match[1].trim()) as string[];
    const clean = text.replace(/<followups>[\s\S]*?<\/followups>/, "").trim();
    return { clean, followUps: Array.isArray(followUps) ? followUps.slice(0, 4) : [] };
  } catch {
    return { clean: text.replace(/<followups>[\s\S]*?<\/followups>/, "").trim(), followUps: [] };
  }
}

export type ChatRequest = {
  messages: Array<{ role: string; content: string }>;
  sessionId?: string;
  /** Latest user message text (used for workflow engine) */
  latestMessage?: string;
};

export type ChatResponse = {
  text: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tool: { name: string; data: any } | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  widget?: { type: string; data: any };
  followUps: string[];
  isWorkflow?: boolean;
  error?: string;
};

export const chatServerFn = createServerFn({ method: "POST" })
  .inputValidator((data: ChatRequest) => data)
  .handler(async ({ data }): Promise<ChatResponse> => {
    const apiKey = await getAnthropicApiKey();
    console.log("🔑 [API KEY] API Key:", apiKey);
    const hasApiKey = !!apiKey && apiKey !== "sk-ant-...";

    // ── Workflow engine path (works with or without API key) ───────────────
    let workflowContext = "";
    if (data.sessionId && data.latestMessage) {
      const workflowOutput = await processWorkflowMessage(
        data.sessionId,
        data.latestMessage,
        apiKey, // empty string → rule-based extractor fallback
      );
      if (workflowOutput) {
        console.log("⚙️  [WORKFLOW] Handled by workflow engine (no LLM call):", workflowOutput.text?.substring(0, 100));
        return {
          text: workflowOutput.text,
          tool: null,
          widget: workflowOutput.widget,
          followUps: workflowOutput.followUps ?? [],
          isWorkflow: true,
        };
      }
      console.log("↩️  [WORKFLOW] Returned null — falling through to LLM");
      // Workflow returned null (off-topic). Build rich context about the active workflow
      // so the LLM can make intelligent, contextual decisions with natural, human responses
      const { SessionStore } = await import("./workflow/SessionStore");
      const { getFlow } = await import("./workflow/WorkflowEngine");
      const session = SessionStore.get(data.sessionId);
      if (session.workflowId) {
        const flow = getFlow(session.workflowId);
        const collectedEntries = Object.entries(session.collectedData)
          .filter(([k, v]: [string, unknown]) => v !== undefined && v !== null && v !== "")
          .map(([k, v]: [string, unknown]) => `${k}: ${v}`);
        const currentStep = session.currentStepId ? flow?.steps[session.currentStepId] : undefined;
        const pendingFields = currentStep?.requiredEntities
          .filter((k: string) => !session.collectedData[k])
          .map((k: string) => k.replace(/_/g, " ")) || [];

        workflowContext = `\n\nACTIVE WORKFLOW CONTEXT:
Workflow: "${flow?.name}" (${session.workflowId})
User is actively in this workflow with collected data.

COLLECTED DATA:
${collectedEntries.length > 0 ? collectedEntries.join("\n") : "NONE — Session just started or was reset"}

CURRENT STEP: "${currentStep?.prompt || 'unknown'}"
Pending fields: ${pendingFields.length > 0 ? pendingFields.join(", ") : "none"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 CRITICAL CONSTRAINTS (These are mandatory - follow every time):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 🚫 NEVER EVER give generic greetings when in an active workflow
   - DO NOT respond with: "I'm your Cars24 assistant..."
   - DO NOT respond with: "I can help you buy a car, get a price..."
   - DO NOT respond with generic help text about what you can do
   - ALWAYS acknowledge the user's SPECIFIC question first

2. ✅ ALWAYS acknowledge what the user specifically asked
   - Read their exact question/statement
   - Start your response referencing what they asked
   - Example: User says "show me options selected" → Start with "Here's what you've provided so far:"

3. 🎯 ALWAYS respond contextually based on COLLECTED DATA
   - If collected data exists, reference it
   - Show the user what's already been captured
   - Remind them what's still needed
   - Never pretend they haven't told you anything

4. 🔄 ALWAYS stay in the workflow context
   - Guide responses back to workflow completion
   - Don't switch to generic help mode
   - Keep focus on the current step or pending information

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INTERACTION RULES:
- Respond naturally and conversationally, as a human assistant would
- ALWAYS start by understanding the user's request, then respond appropriately
- If user asks to see/review/check what they've provided:
  * Show collected data: "So far you've told me: [list items]"
  * Explain what's still needed: "We still need to know: [list items]"
  * Ask next question naturally
- If user requests reset/restart/start over/begin again/from scratch/clear:
  * Acknowledge warmly: "Of course! Let's start fresh."
  * Confirm you're clearing data
  * Ask the first workflow question naturally
- If NO DATA COLLECTED (fresh start or just reset): Ask the first workflow question naturally
  * Ask conversationally, not like a robot reading a prompt
- If user asks off-topic questions:
  * Answer their question helpfully (acknowledge it matters)
  * Then gently guide back: "But first, let me get your car details..."
- If user provides info related to ANY workflow field:
  * Acknowledge it specifically: "Got it, so it's a diesel"
  * Note it in context
  * Move forward naturally
- NEVER be robotic, stiff, or system-like
- Sound like a real human: warm, understanding, helpful
- Use conversational transitions ("Got it", "Makes sense", "I see")

EXAMPLES OF PERFECT RESPONSES:
✓ User: "can you show me what options I selected?"
  → "Here's what you've told me so far: your 2021 WagonR, petrol fuel... We still need the mileage and city. How many km has it driven?"

✓ User: "reset"
  → "Of course! Let's start fresh. What car are you interested in selling?"

✓ User: "Actually it's diesel not petrol"
  → "Got it, noted! So it's a diesel WagonR. Now, how many kilometers has it driven?"

✓ User: "What cars are available to buy?"
  → "Sure, I can show you available cars! But first, let me get your selling details so we can find you the best options. What car are you selling?"

EXAMPLES OF RESPONSES TO AVOID:
✗ "I'm your Cars24 assistant — I can help you buy a car, sell a car, calculate EMI..."
✗ "Restarting workflow. First step: collect car model."
✗ "COLLECTED DATA: car_model: wagonr, year: 2021"
✗ "How can I assist you today?"
✗ Any generic greeting when user is in active workflow`;
      }
    }

    // ── Free-form LLM path (requires API key) ─────────────────────────────
    console.log("\n══════════════════════════════════════════");
    console.log("🤖 [LLM PATH]");
    console.log("  hasApiKey  :", hasApiKey);
    console.log("  sessionId  :", data.sessionId);
    console.log("  userMessage:", data.latestMessage);
    console.log("  workflowCtx:", workflowContext ? "YES (workflow active)" : "NO (free-form)");
    console.log("  msgCount   :", data.messages?.length ?? 0, "messages in history");
    console.log("══════════════════════════════════════════\n");

    if (!hasApiKey) {
      console.warn("⚠️  [LLM] No API key — returning error");
      return { text: "", tool: null, followUps: [], error: "no_api_key" };
    }

    const systemPrompt = SYSTEM_PROMPT + workflowContext;

    // Retry up to 3 times for transient errors (529 overloaded, 503, 502)
    const RETRYABLE = new Set([529, 503, 502]);
    let res!: Response;
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`📤 [LLM] Calling Anthropic API... (attempt ${attempt}/3)`);
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          system: systemPrompt,
          messages: data.messages,
          tools: TOOLS,
        }),
      });

      console.log(`📥 [LLM] Response status: ${res.status}`, res.ok ? "✅ OK" : "❌ ERROR");

      if (res.ok || !RETRYABLE.has(res.status)) break;

      const waitMs = attempt * 1500; // 1.5s, 3s
      console.warn(`⏳ [LLM] ${res.status} Overloaded — retrying in ${waitMs}ms...`);
      await new Promise(r => setTimeout(r, waitMs));
    }

    if (!res.ok) {
      const err = await res.text();
      console.error("❌ [LLM] Anthropic API error", res.status, err);
      return { text: "", tool: null, followUps: [], error: `upstream_${res.status}` };
    }

    const body = (await res.json()) as {
      content: Array<{ type: string; text?: string; name?: string; input?: Record<string, unknown> }>;
    };

    const textBlock = body.content.find((c) => c.type === "text");
    const toolBlock = body.content.find((c) => c.type === "tool_use");

    const rawText = textBlock?.text ?? "";
    console.log("💬 [LLM] Raw response (first 200 chars):", rawText.substring(0, 200));
    const { clean: text, followUps } = parseFollowUps(rawText);

    return {
      text,
      tool: toolBlock
        ? { name: toolBlock.name!, data: executeTool(toolBlock.name!, toolBlock.input ?? {}) }
        : null,
      followUps,
    };
  });
