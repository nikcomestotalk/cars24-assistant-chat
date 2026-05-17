import { useCallback, useEffect, useRef, useState } from "react";
import { mockStream, type StreamEvent } from "./mockStream";

export type MessageType = "text" | "car_cards" | "emi_widget";
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  type: MessageType;
  data?: any;
  followUps?: string[];
  timestamp: number;
}

const uuid = () =>
  (crypto as any).randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);

const FOLLOWUPS_BUY = ["Compare these", "Show me cheaper options", "Calculate EMI"];
const FOLLOWUPS_EMI = ["Apply for loan", "Try a different car", "Lower the down payment"];
const FOLLOWUPS_DEFAULT = ["Buy a car", "Sell my car", "Check EMI"];

export function useChatStream() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [shortlisted, setShortlisted] = useState<number[]>([]);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let sid: string | null = localStorage.getItem("cars24_session_id");
    if (!sid) {
      sid = uuid();
      localStorage.setItem("cars24_session_id", sid);
    }
    setSessionId(sid!);
    try {
      const s = JSON.parse(localStorage.getItem("cars24_shortlist") || "[]");
      if (Array.isArray(s)) setShortlisted(s);
    } catch {}
  }, []);

  const toggleShortlist = useCallback((id: number) => {
    setShortlisted((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem("cars24_shortlist", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      const userMsg: ChatMessage = {
        id: uuid(),
        role: "user",
        content: trimmed,
        type: "text",
        timestamp: Date.now(),
      };
      const assistantId = uuid();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        type: "text",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);
      cancelRef.current = false;

      const handle = (e: StreamEvent) => {
        if (cancelRef.current) return;
        if (e.type === "token") {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + e.content } : m)),
          );
        } else if (e.type === "tool_result") {
          if (e.tool === "search_cars") {
            setMessages((prev) => [
              ...prev,
              {
                id: uuid(),
                role: "assistant",
                content: "",
                type: "car_cards",
                data: e.data,
                followUps: FOLLOWUPS_BUY,
                timestamp: Date.now(),
              },
            ]);
          } else if (e.tool === "calc_emi") {
            setMessages((prev) => [
              ...prev,
              {
                id: uuid(),
                role: "assistant",
                content: "",
                type: "emi_widget",
                data: e.data,
                followUps: FOLLOWUPS_EMI,
                timestamp: Date.now(),
              },
            ]);
          }
        } else if (e.type === "done") {
          setMessages((prev) =>
            prev.map((m, i, arr) => {
              if (i !== arr.length - 1) return m;
              if (m.followUps) return m;
              return { ...m, followUps: FOLLOWUPS_DEFAULT };
            }),
          );
          setIsStreaming(false);
        }
      };

      try {
        await mockStream(trimmed, handle);
      } catch (err) {
        console.error(err);
        setIsStreaming(false);
      }
    },
    [isStreaming],
  );

  return { messages, isStreaming, sessionId, shortlisted, toggleShortlist, sendMessage };
}