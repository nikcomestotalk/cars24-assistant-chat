import type { EntitySchema, CollectedData, ExtractedEntities } from "./types";

export async function extractEntities(
  userMessage: string,
  schema: EntitySchema,
  apiKey: string,
): Promise<ExtractedEntities> {
  if (Object.keys(schema).length === 0) {
    return { entities: {}, confidence: 1, isOffTopic: false };
  }

  const fieldLines = Object.entries(schema).map(([key, field]) => {
    let line = `- ${key} (${field.type}${field.required ? ", required" : ""}): ${field.description}`;
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

  if (!res.ok) {
    return { entities: {}, confidence: 0, isOffTopic: false };
  }

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
    return { entities, confidence: 0.9, isOffTopic: false };
  } catch {
    return { entities: {}, confidence: 0, isOffTopic: false };
  }
}
