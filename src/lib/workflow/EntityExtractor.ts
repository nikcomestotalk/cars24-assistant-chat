import type { EntitySchema, CollectedData, ExtractedEntities } from "./types";

// ── Rule-based fallback (no API key needed) ───────────────────────────────────

function ruleBasedExtract(message: string, schema: EntitySchema): CollectedData {
  const lower = message.toLowerCase().trim();
  const entities: CollectedData = {};

  for (const [key, field] of Object.entries(schema)) {
    if (field.type === "boolean") {
      // For booleans, require a more explicit affirmation to avoid false positives
      // from negations in other contexts (e.g., "not CNG" shouldn't set wants_inspection)
      const yes = /\b(yes|ok|sure|yep|yeah|book|proceed|confirm|go ahead|absolutely)\b/i.test(lower);
      const no  = /^(no|nope|skip|later|not now|cancel|decline|maybe later)\b/i.test(lower) ||
                  /\b(no|nope|skip|later|not now|cancel|decline|maybe later)\s*\.?\s*$/i.test(lower);
      if (yes) entities[key] = true;
      else if (no) entities[key] = false;

    } else if (field.type === "enum" && field.options) {
      const matched = field.options.find((opt) =>
        lower.includes(opt.toLowerCase())
      );
      if (matched) entities[key] = matched;

    } else if (field.type === "number") {
      if (key === "year") {
        const m = lower.match(/\b(20\d{2})\b/);
        if (m) entities[key] = parseInt(m[1], 10);
      } else if (key === "km_driven") {
        // "45k", "45,000", "45000"
        const m = lower.match(/(\d[\d,]*)[\s]*k(?:m|ilo)?/i) ||
                  lower.match(/\b(\d{4,6})\b/);
        if (m) {
          const raw = m[1].replace(/,/g, "");
          const val = raw.endsWith("k") ? parseInt(raw) * 1000 : parseInt(raw, 10);
          entities[key] = lower.includes("k") && !lower.match(/\d{4,}/) ? val * 1000 : parseInt(raw, 10);
        }
        // Handle "45k" shorthand directly
        const kMatch = lower.match(/\b(\d+)\s*k\b/i);
        if (kMatch && !entities[key]) entities[key] = parseInt(kMatch[1], 10) * 1000;
      }

    } else if (field.type === "string") {
      if (key === "phone_number") {
        const m = lower.match(/\b([6-9]\d{9})\b/);
        if (m) entities[key] = m[1];
      } else if (key === "otp_code") {
        const m = lower.match(/\b(\d{6})\b/);
        if (m) entities[key] = m[1];
      } else if (key === "city") {
        const cities = ["delhi", "mumbai", "bangalore", "bengaluru", "hyderabad",
                        "chennai", "pune", "ahmedabad", "kolkata", "jaipur",
                        "lucknow", "surat", "kochi", "noida", "gurgaon"];
        const found = cities.find((c) => lower.includes(c));
        if (found) entities[key] = found.charAt(0).toUpperCase() + found.slice(1);
      } else if (key === "rc_number") {
        // Indian RC format: 2 letters + 1-2 digits + 1-3 letters + 4 digits (e.g. MH02AB1234)
        const m = lower.match(/\b([a-z]{2}\s*\d{1,2}\s*[a-z]{1,3}\s*\d{4})\b/i);
        if (m) entities[key] = m[1].replace(/\s/g, "").toUpperCase();
      } else if (key === "car_model") {
        // Don't interpret an RC number as a car model
        const isRc = /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}$/i.test(message.trim().replace(/\s/g, ""));
        // Strip common filler phrases to isolate the car name
        let clean = message.trim()
          .replace(/\b(i (want to |am |'m )?(sell|selling)|want to sell|sell|my car is|it'?s? a?|i have a?|have a?)\b/gi, " ")
          .replace(/\b(my|a |the |car|vehicle|auto)\b/gi, " ")
          .replace(/\s{2,}/g, " ")
          .trim();
        // Only store if cleaned text contains a recognisable car brand or model name
        const CAR_KEYWORDS = /\b(maruti|suzuki|hyundai|honda|tata|mahindra|kia|toyota|ford|renault|nissan|volkswagen|skoda|mg|jeep|swift|wagonr|wagon r|alto|baleno|brezza|dzire|ertiga|ignis|celerio|city|amaze|jazz|i10|i20|creta|venue|verna|santro|nexon|punch|altroz|tiago|tigor|harrier|safari|xuv|bolero|scorpio|thar|compass|seltos|sonet|carens|innova|fortuner|etios|corolla|duster|kwid|polo|vento|octavia|hector|astor|ecosport|figo|aspire|eon|santafe|tucson|elantra)\b/i;
        if (!isRc && clean.length > 0 && clean.length < 60 && CAR_KEYWORDS.test(clean)) entities[key] = clean;
      } else if (key === "selected_slot") {
        // Only extract if the message looks like an actual time slot
        if (/\b(am|pm|morning|afternoon|evening|tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\s*(am|pm|:))/i.test(lower)) {
          entities[key] = message.trim();
        }
      }
    }
  }

  return entities;
}

// ── LLM-based extractor (when API key is available) ───────────────────────────

async function llmExtract(
  userMessage: string,
  schema: EntitySchema,
  apiKey: string,
): Promise<CollectedData> {
  const fieldLines = Object.entries(schema).map(([key, field]) => {
    let line = `- ${key} (${field.type}${field.required ? ", required" : ""}): ${field.description}`;
    if (key === "rc_number") line += ". Indian vehicle registration number format: 2 letters + 2 digits + letters + 4 digits, e.g. MH02AB1234. Normalize: remove spaces, uppercase";
    if (field.options) line += `. Must be one of: ${field.options.join(", ")}`;
    if (field.example) line += `. Example value: ${field.example}`;
    return line;
  });

  const userPrompt = `Extract these fields from the user message. Return ONLY a JSON object — no explanation, no code block.

Fields:
${fieldLines.join("\n")}

User message: "${userMessage}"

Rules:
- Omit fields the user didn't mention (don't include them in JSON)
- For boolean fields: true if user says yes/ok/sure/yep, false if no/skip/later/not now
- For enum fields: normalize to exact option spelling (e.g. "petrol" → "Petrol")
- For number fields: extract only the numeric value`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: "You are a precise JSON entity extractor. Return only valid JSON with no surrounding text or markdown.",
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) return ruleBasedExtract(userMessage, schema);

  const body = await res.json() as { content: Array<{ type: string; text?: string }> };
  const raw = body.content.find((c) => c.type === "text")?.text?.trim() ?? "{}";

  try {
    const parsed = JSON.parse(raw);
    const entities: CollectedData = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value !== null && value !== undefined) {
        entities[key] = value as string | number | boolean;
      }
    }
    return entities;
  } catch {
    return ruleBasedExtract(userMessage, schema);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function extractEntities(
  userMessage: string,
  schema: EntitySchema,
  apiKey: string,
): Promise<ExtractedEntities> {
  if (Object.keys(schema).length === 0) {
    return { entities: {}, confidence: 1, isOffTopic: false };
  }

  let entities: CollectedData;
  if (apiKey) {
    entities = await llmExtract(userMessage, schema, apiKey);
  } else {
    entities = ruleBasedExtract(userMessage, schema);
  }

  return { entities, confidence: apiKey ? 0.9 : 0.7, isOffTopic: false };
}
