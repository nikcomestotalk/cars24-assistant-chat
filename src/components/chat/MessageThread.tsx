import { useEffect, useRef } from "react";
import { Car } from "lucide-react";
import type { ChatMessage } from "./useChatStream";
import { CarCards } from "./CarCards";
import { EMIWidget } from "./EMIWidget";
import { FollowUpChips } from "./FollowUpChips";

function AssistantAvatar() {
  return (
    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cars24-red text-cars24-red-foreground">
      <Car size={13} />
    </div>
  );
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
    <div className="flex-1 overflow-y-auto" aria-live="polite">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div key={m.id} className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
              {!isUser && <AssistantAvatar />}

              <div className={`flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"} max-w-[80%]`}>
                {m.type === "text" && m.content && (
                  <div
                    className={
                      isUser
                        ? "rounded-2xl rounded-tr-md bg-cars24-red px-4 py-2.5 text-[14px] leading-relaxed text-cars24-red-foreground"
                        : "text-[14px] leading-relaxed text-foreground"
                    }
                  >
                    {m.content}
                  </div>
                )}

                {m.type === "car_cards" && (
                  <div className="w-[calc(100vw-120px)] max-w-xl sm:w-auto">
                    <CarCards
                      cars={m.data}
                      shortlisted={shortlisted}
                      onToggleShortlist={onToggleShortlist}
                    />
                  </div>
                )}

                {m.type === "emi_widget" && (
                  <div className="w-[280px]">
                    <EMIWidget data={m.data} />
                  </div>
                )}

                {(m.type !== "text" || m.content) && (
                  <div className={`text-[11px] text-muted-foreground ${isUser ? "pr-1" : "pl-0"}`}>
                    {formatTime(m.timestamp)}
                  </div>
                )}

                {!isUser && m.followUps && m.followUps.length > 0 && (
                  <FollowUpChips chips={m.followUps} onSelect={onFollowUp} />
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isStreaming &&
          messages.length > 0 &&
          messages[messages.length - 1].role === "assistant" &&
          !messages[messages.length - 1].content && (
            <div className="flex gap-3">
              <AssistantAvatar />
              <div className="flex items-center gap-1 rounded-2xl rounded-tl-md bg-muted px-4 py-3">
                <span className="cars24-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                <span className="cars24-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" style={{ animationDelay: "0.15s" }} />
                <span className="cars24-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" style={{ animationDelay: "0.3s" }} />
              </div>
            </div>
          )}

        <div ref={endRef} />
      </div>
    </div>
  );
}
