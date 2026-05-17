import { useEffect, useRef } from "react";
import type { ChatMessage } from "./useChatStream";
import { CarCards } from "./CarCards";
import { EMIWidget } from "./EMIWidget";
import { FollowUpChips } from "./FollowUpChips";

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function MessageThread({
  messages,
  isStreaming,
  shortlisted,
  onToggleShortlist,
  onFollowUp,
}: {
  messages: ChatMessage[];
  isStreaming: boolean;
  shortlisted: number[];
  onToggleShortlist: (id: number) => void;
  onFollowUp: (text: string) => void;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isStreaming]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3" aria-live="polite">
      <div className="flex flex-col gap-3">
        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div key={m.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
              {m.type === "text" && m.content && (
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[14px] leading-snug ${
                    isUser
                      ? "rounded-br-md bg-cars24-red text-cars24-red-foreground"
                      : "rounded-bl-md bg-bubble-assistant text-bubble-assistant-foreground"
                  }`}
                >
                  {m.content}
                </div>
              )}
              {m.type === "car_cards" && (
                <div className="w-full">
                  <CarCards
                    cars={m.data}
                    shortlisted={shortlisted}
                    onToggleShortlist={onToggleShortlist}
                  />
                </div>
              )}
              {m.type === "emi_widget" && (
                <div className="w-full">
                  <EMIWidget data={m.data} />
                </div>
              )}
              {m.type !== "text" || m.content ? (
                <div className={`mt-1 text-[11px] text-muted-foreground ${isUser ? "pr-1" : "pl-1"}`}>
                  {formatTime(m.timestamp)}
                </div>
              ) : null}
              {!isUser && m.followUps && m.followUps.length > 0 && (
                <FollowUpChips chips={m.followUps} onSelect={onFollowUp} />
              )}
            </div>
          );
        })}

        {isStreaming &&
          messages.length > 0 &&
          messages[messages.length - 1].role === "assistant" &&
          !messages[messages.length - 1].content && (
            <div className="flex items-start">
              <div className="flex gap-1 rounded-2xl rounded-bl-md bg-bubble-assistant px-3.5 py-3">
                <span className="cars24-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                <span
                  className="cars24-dot h-1.5 w-1.5 rounded-full bg-muted-foreground"
                  style={{ animationDelay: "0.15s" }}
                />
                <span
                  className="cars24-dot h-1.5 w-1.5 rounded-full bg-muted-foreground"
                  style={{ animationDelay: "0.3s" }}
                />
              </div>
            </div>
          )}
        <div ref={endRef} />
      </div>
    </div>
  );
}