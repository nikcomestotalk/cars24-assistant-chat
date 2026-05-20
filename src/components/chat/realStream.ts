import { chatServerFn } from "../../routes/api/chat";
import type { StreamEvent } from "./mockStream";

type HistoryMessage = { role: "user" | "assistant"; content: string; type: string };

/**
 * Converts the internal message thread (which includes widget messages) into
 * the plain user/assistant array the Anthropic API expects.
 * Widget messages (car_cards, emi_widget, price_estimate) become a short
 * bracketed note so Claude retains the context of what was shown.
 */
function buildApiMessages(
  history: HistoryMessage[],
  currentMessage: string,
): Array<{ role: string; content: string }> {
  const result: Array<{ role: string; content: string }> = [];

  for (const m of history) {
    let content: string;
    if (m.type === "text") {
      if (!m.content) continue; // skip empty placeholder assistant messages
      content = m.content;
    } else {
      const label: Record<string, string> = {
        car_cards:      "[Showed car listing results]",
        emi_widget:     "[Showed EMI calculator]",
        price_estimate: "[Showed price estimate widget]",
      };
      content = label[m.type] ?? "[Showed widget]";
    }

    // Anthropic requires strictly alternating roles — merge consecutive same-role
    if (result.length > 0 && result[result.length - 1].role === m.role) {
      result[result.length - 1].content += "\n" + content;
    } else {
      result.push({ role: m.role, content });
    }
  }

  // Append the current message (always user)
  if (result.length > 0 && result[result.length - 1].role === "user") {
    result[result.length - 1].content += "\n" + currentMessage;
  } else {
    result.push({ role: "user", content: currentMessage });
  }

  return result;
}

async function simulateStream(text: string, onEvent: (e: StreamEvent) => void) {
  for (const tok of text.split(/(\s+)/)) {
    onEvent({ type: "token", content: tok });
    await new Promise<void>((r) => setTimeout(r, 15));
  }
}

export async function realStream(
  message: string,
  history: HistoryMessage[],
  onEvent: (e: StreamEvent) => void,
): Promise<void> {
  const messages = buildApiMessages(history, message);

  let data: { text: string; tool: { name: string; data: any } | null };
  try {
    data = await chatServerFn({ data: { messages } }) as typeof data;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "no_api_key") {
      throw Object.assign(new Error("no_api_key"), { code: "no_api_key" });
    }
    throw err;
  }

  if (data.text) {
    await simulateStream(data.text, onEvent);
  }

  if (data.tool) {
    onEvent({
      type: "tool_result",
      tool: data.tool.name as "search_cars" | "calc_emi" | "price_estimate",
      data: data.tool.data,
    });
  }

  onEvent({ type: "done" });
}
