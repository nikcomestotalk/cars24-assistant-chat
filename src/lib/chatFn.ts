import { createServerFn } from "@tanstack/react-start";
import { processWorkflowMessage } from "./workflow/ConversationController";

const SYSTEM_PROMPT = `You are an AI assistant for Cars24, India's largest used car marketplace.
Help users buy used cars, sell their car, calculate EMI, find insurance, and book service.

You know the Indian car market well — Maruti Swift, WagonR, Baleno, Brezza, Dzire, Alto;
Hyundai i20, Creta, Venue, Verna; Honda City, Amaze; Tata Nexon, Punch, Altroz;
Mahindra XUV700, Scorpio; Toyota Innova, Fortuner; and typical prices, fuel types, mileage.

IMPORTANT CONTEXT RULES:
- Always remember what was discussed earlier in the conversation
- If the user provides additional details (year, KM, city) after you asked for them, use those details immediately
- Never ask for information the user already provided
- If a tool was already shown, reference it naturally ("as you saw in the estimate above...")

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
    const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
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
        return {
          text: workflowOutput.text,
          tool: null,
          widget: workflowOutput.widget,
          followUps: workflowOutput.followUps ?? [],
          isWorkflow: true,
        };
      }
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
User is actively in this workflow.

COLLECTED DATA:
${collectedEntries.length > 0 ? collectedEntries.join("\n") : "NONE — Session just started or was reset"}

CURRENT STEP: "${currentStep?.prompt || 'unknown'}"
Pending fields: ${pendingFields.length > 0 ? pendingFields.join(", ") : "none"}

INTERACTION RULES:
- Respond naturally and conversationally, as a human assistant would
- ALWAYS start by understanding the user's request, then respond appropriately
- If user asks to see/review/check what they've provided: Show collected data in conversational format, explain what's still needed
- If user requests reset/restart/start over/begin again/from scratch/clear:
  * Acknowledge warmly and confirm you're clearing data: "Of course! Let's start fresh."
  * Clear all collected data and reset to beginning
  * Ask the first workflow question naturally (as if starting a new conversation)
- If NO DATA COLLECTED (fresh start or just reset): When appropriate, ask the first workflow question naturally
  * Ask like you would in natural conversation, not as a prompt
- If user asks off-topic questions: Answer helpfully and conversationally, then gently guide back to the workflow
- If user provides info related to any workflow field (even if not current step): Acknowledge specifically and note it
- Never be robotic, stiff, or system-like — sound like a real human: warm, understanding, helpful
- Balance being helpful with keeping user focused on completing the workflow
- Use conversational transitions, not mechanical ones

EXAMPLES OF GOOD RESPONSES:
✓ "Got it, let's start fresh. Which car would you like to sell?"
✓ "Of course! Let's begin from the top. What car are you interested in selling?"
✓ "Here's what you've mentioned so far: your 2021 WagonR, it's petrol... We still need to know the city and mileage."
✓ "Sure, I can help with that! But first, let me get your car details so we can find you the best price."

EXAMPLES OF BAD RESPONSES:
✗ "Restarting workflow. First step: collect car model."
✗ "I'm your Cars24 assistant..."
✗ "COLLECTED DATA: car_model: wagonr, year: 2021"`;
      }
    }

    // ── Free-form LLM path (requires API key) ─────────────────────────────
    if (!hasApiKey) {
      return { text: "", tool: null, followUps: [], error: "no_api_key" };
    }

    const systemPrompt = SYSTEM_PROMPT + workflowContext;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
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

    if (!res.ok) {
      const err = await res.text();
      console.error("Anthropic API error", res.status, err);
      return { text: "", tool: null, followUps: [], error: `upstream_${res.status}` };
    }

    const body = (await res.json()) as {
      content: Array<{ type: string; text?: string; name?: string; input?: Record<string, unknown> }>;
    };

    const textBlock = body.content.find((c) => c.type === "text");
    const toolBlock = body.content.find((c) => c.type === "tool_use");

    const rawText = textBlock?.text ?? "";
    const { clean: text, followUps } = parseFollowUps(rawText);

    return {
      text,
      tool: toolBlock
        ? { name: toolBlock.name!, data: executeTool(toolBlock.name!, toolBlock.input ?? {}) }
        : null,
      followUps,
    };
  });
