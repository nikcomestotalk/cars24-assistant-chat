import { useEffect, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { useChatStream } from "./useChatStream";
import { MessageThread } from "./MessageThread";
import { InputBar } from "./InputBar";

const INTENT_CHIPS = [
  { label: "🚗 Buy a car", message: "I want to buy a car" },
  { label: "💰 Sell my car", message: "I want to sell my car" },
  { label: "📊 Check EMI", message: "Help me calculate EMI" },
  { label: "🔧 My car (Orbit)", message: "Show my Orbit orders" },
];

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const chat = useChatStream();

  const openSheet = () => {
    setIsOpen(true);
    setHasUnread(false);
  };

  // Esc to close + focus management
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
      if (e.key === "Tab" && sheetRef.current) {
        const focusables = sheetRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    closeBtnRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const showIntents = chat.messages.length === 0;

  return (
    <>
      {/* Floating trigger */}
      <button
        type="button"
        onClick={openSheet}
        aria-label="Open Cars24 AI assistant"
        aria-expanded={isOpen}
        className={`fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-cars24-red text-cars24-red-foreground shadow-lg ${
          !isOpen ? "cars24-pulse" : ""
        }`}
        style={{ display: isOpen ? "none" : "grid" }}
      >
        <MessageCircle size={24} />
        {hasUnread && (
          <span
            className="absolute right-1 top-1 h-3 w-3 rounded-full border-2 border-background bg-cars24-red"
            aria-hidden
          />
        )}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/30"
          aria-hidden
        />
      )}

      {/* Sheet — note: never unmounts to preserve state */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Cars24 AI Assistant"
        className={`fixed bottom-0 left-1/2 z-50 flex w-full max-w-[420px] -translate-x-1/2 flex-col overflow-hidden rounded-t-2xl bg-background shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-y-0 cars24-slide-up" : "translate-y-full"
        }`}
        style={{ height: "90vh", pointerEvents: isOpen ? "auto" : "none" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2">
          <div className="h-1 w-10 rounded-full bg-border" aria-hidden />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <div className="text-base font-bold tracking-tight text-cars24-red">CARS24</div>
            <div className="text-[11px] text-muted-foreground">AI Assistant</div>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Minimize chat"
            className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted"
          >
            <X size={18} />
          </button>
        </div>

        <div className="h-px bg-border" />

        {/* Intents */}
        {showIntents && (
          <div className="px-4 pt-3">
            <div className="text-[12px] text-muted-foreground">
              Hi! How can I help you today?
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {INTENT_CHIPS.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => chat.sendMessage(c.message)}
                  className="rounded-full border border-border bg-background px-3 py-2 text-[13px] font-medium text-foreground hover:border-cars24-red hover:text-cars24-red"
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <MessageThread
          messages={chat.messages}
          isStreaming={chat.isStreaming}
          shortlisted={chat.shortlisted}
          onToggleShortlist={chat.toggleShortlist}
          onFollowUp={chat.sendMessage}
        />

        <InputBar onSend={chat.sendMessage} disabled={chat.isStreaming} />
      </div>
    </>
  );
}