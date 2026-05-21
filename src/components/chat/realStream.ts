import { chatServerFn } from "../../lib/chatFn";
import type { StreamEvent } from "./mockStream";

type HistoryMessage = { role: "user" | "assistant"; content: string; type: string };

function buildApiMessages(
  history: HistoryMessage[],
  currentMessage: string,
): Array<{ role: string; content: string }> {
  const result: Array<{ role: string; content: string }> = [];

  for (const m of history) {
    let content: string;
    if (m.type === "text") {
      if (!m.content) continue;
      content = m.content;
    } else {
      const label: Record<string, string> = {
        car_cards:      "[Showed car listing results]",
        emi_widget:     "[Showed EMI calculator]",
        price_estimate: "[Showed price estimate widget]",
      };
      content = label[m.type] ?? "[Showed widget]";
    }

    if (result.length > 0 && result[result.length - 1].role === m.role) {
      result[result.length - 1].content += "\n" + content;
    } else {
      result.push({ role: m.role, content });
    }
  }

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

  const data = await chatServerFn({ data: { messages } }) as {
    text: string;
    tool: { name: string; data: any } | null;
    followUps: string[];
    error?: string;
  };

  if (data.error) {
    throw Object.assign(new Error(data.error), { code: data.error });
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

  onEvent({ type: "done", followUps: data.followUps ?? [] });
}
