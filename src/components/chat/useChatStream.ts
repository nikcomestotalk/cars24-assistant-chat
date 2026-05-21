import { useCallback, useEffect, useRef, useState } from "react";
import { mockStream, type StreamEvent } from "./mockStream";
import { realStream } from "./realStream";

export type MessageType = "text" | "car_cards" | "emi_widget" | "price_estimate" | "price_card" | "slot_picker" | "otp_input" | "confirmation";
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  type: MessageType;
  data?: any;
  followUps?: string[];
  timestamp: number;
}

export interface SavedChat {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
}

const uuid = () =>
  (crypto as any).randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);

const CHATS_KEY = "cars24_chats";
const ACTIVE_KEY = "cars24_active_chat";

function loadChats(): SavedChat[] {
  try {
    const raw = localStorage.getItem(CHATS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useChatStream() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [shortlisted, setShortlisted] = useState<number[]>([]);
  const [chats, setChats] = useState<SavedChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>("");
  const cancelRef = useRef(false);
  const hydratedRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const existing = localStorage.getItem("cars24_session_id");
    const sid = existing ?? uuid();
    if (!existing) localStorage.setItem("cars24_session_id", sid);
    setSessionId(sid);
    try {
      const s = JSON.parse(localStorage.getItem("cars24_shortlist") || "[]");
      if (Array.isArray(s)) setShortlisted(s);
    } catch {}

    const all = loadChats();
    setChats(all);
    const activeId = localStorage.getItem(ACTIVE_KEY) || "";
    const active = all.find((c) => c.id === activeId);
    if (active) {
      setActiveChatId(active.id);
      setMessages(active.messages);
    } else {
      setActiveChatId(uuid());
    }
    hydratedRef.current = true;
  }, []);

  // Keep ref in sync so sendMessage always sees current history
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Persist current chat whenever messages change
  useEffect(() => {
    if (!hydratedRef.current || !activeChatId) return;
    if (typeof window === "undefined") return;
    if (messages.length === 0) return;
    const firstUser = messages.find((m) => m.role === "user");
    const title = firstUser?.content?.slice(0, 60) || "New chat";
    setChats((prev) => {
      const others = prev.filter((c) => c.id !== activeChatId);
      const next: SavedChat[] = [
        { id: activeChatId, title, updatedAt: Date.now(), messages },
        ...others,
      ].slice(0, 30);
      try {
        localStorage.setItem(CHATS_KEY, JSON.stringify(next));
        localStorage.setItem(ACTIVE_KEY, activeChatId);
      } catch {}
      return next;
    });
  }, [messages, activeChatId]);

  const toggleShortlist = useCallback((id: number) => {
    setShortlisted((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try { localStorage.setItem("cars24_shortlist", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const newChat = useCallback(() => {
    if (isStreaming) { cancelRef.current = true; setIsStreaming(false); }
    const id = uuid();
    setActiveChatId(id);
    setMessages([]);
    try { localStorage.setItem(ACTIVE_KEY, id); } catch {}
  }, [isStreaming]);

  const loadChat = useCallback((id: string) => {
    if (isStreaming) { cancelRef.current = true; setIsStreaming(false); }
    const chat = chats.find((c) => c.id === id);
    if (!chat) return;
    setActiveChatId(id);
    setMessages(chat.messages);
    try { localStorage.setItem(ACTIVE_KEY, id); } catch {}
  }, [chats, isStreaming]);

  const deleteChat = useCallback((id: string) => {
    setChats((prev) => {
      const next = prev.filter((c) => c.id !== id);
      try { localStorage.setItem(CHATS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
    if (id === activeChatId) {
      const fresh = uuid();
      setActiveChatId(fresh);
      setMessages([]);
      try { localStorage.setItem(ACTIVE_KEY, fresh); } catch {}
    }
  }, [activeChatId]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      const userMsg: ChatMessage = {
        id: uuid(), role: "user", content: trimmed, type: "text", timestamp: Date.now(),
      };
      const assistantId = uuid();
      const assistantMsg: ChatMessage = {
        id: assistantId, role: "assistant", content: "", type: "text", timestamp: Date.now(),
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
            setMessages((prev) => [...prev, {
              id: uuid(), role: "assistant", content: "", type: "car_cards",
              data: e.data, timestamp: Date.now(),
            }]);
          } else if (e.tool === "calc_emi") {
            setMessages((prev) => [...prev, {
              id: uuid(), role: "assistant", content: "", type: "emi_widget",
              data: e.data, timestamp: Date.now(),
            }]);
          } else if (e.tool === "price_estimate") {
            setMessages((prev) => [...prev, {
              id: uuid(), role: "assistant", content: "", type: "price_estimate",
              data: e.data, timestamp: Date.now(),
            }]);
          } else if (e.tool === "price_card") {
            setMessages((prev) => [...prev, {
              id: uuid(), role: "assistant", content: "", type: "price_card",
              data: e.data, timestamp: Date.now(),
            }]);
          } else if (e.tool === "slot_picker") {
            setMessages((prev) => [...prev, {
              id: uuid(), role: "assistant", content: "", type: "slot_picker",
              data: e.data, timestamp: Date.now(),
            }]);
          } else if (e.tool === "otp_input") {
            setMessages((prev) => [...prev, {
              id: uuid(), role: "assistant", content: "", type: "otp_input",
              data: e.data, timestamp: Date.now(),
            }]);
          } else if (e.tool === "confirmation") {
            setMessages((prev) => [...prev, {
              id: uuid(), role: "assistant", content: "", type: "confirmation",
              data: e.data, timestamp: Date.now(),
            }]);
          }
        } else if (e.type === "done") {
          // Apply follow-ups from AI to the last assistant message
          const followUps = e.followUps ?? [];
          setMessages((prev) => {
            const lastIdx = [...prev].reverse().findIndex((m) => m.role === "assistant");
            if (lastIdx === -1) return prev;
            const idx = prev.length - 1 - lastIdx;
            return prev.map((m, i) =>
              i === idx ? { ...m, followUps } : m,
            );
          });
          setIsStreaming(false);
        }
      };

      try {
        await realStream(trimmed, messagesRef.current, handle, sessionId || undefined);
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        if (code === "no_api_key" || !navigator.onLine) {
          try {
            await mockStream(trimmed, messagesRef.current, handle);
          } catch (mockErr) {
            console.error(mockErr);
            setIsStreaming(false);
          }
        } else {
          console.error(err);
          setIsStreaming(false);
        }
      }
    },
    [isStreaming],
  );

  return {
    messages, isStreaming, sessionId, shortlisted, toggleShortlist,
    sendMessage, chats, activeChatId, newChat, loadChat, deleteChat,
  };
}
