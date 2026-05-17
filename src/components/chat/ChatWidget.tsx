import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, History, Plus, Trash2, ArrowLeft } from "lucide-react";
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
  const [showHistory, setShowHistory] = useState(false);
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

  const formatRelative = (ts: number) => {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  };

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
          <div className="flex items-center gap-2">
            {showHistory && (
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                aria-label="Back to chat"
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <div className="text-base font-bold tracking-tight text-cars24-red">CARS24</div>
              <div className="text-[11px] text-muted-foreground">
                {showHistory ? "Chat history" : "AI Assistant"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!showHistory && (
              <>
                <button
                  type="button"
                  onClick={chat.newChat}
                  aria-label="New chat"
                  title="New chat"
                  className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted"
                >
                  <Plus size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowHistory(true)}
                  aria-label="Show chat history"
                  title="Chat history"
                  className="relative grid h-9 w-9 place-items-center rounded-full hover:bg-muted"
                >
                  <History size={18} />
                  {chat.chats.length > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-cars24-red px-1 text-[10px] font-semibold text-cars24-red-foreground">
                      {chat.chats.length}
                    </span>
                  )}
                </button>
              </>
            )}
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
        </div>

        <div className="h-px bg-border" />

        {showHistory ? (
          <div className="flex-1 overflow-y-auto px-3 py-3">
            {chat.chats.length === 0 ? (
              <div className="grid h-full place-items-center px-6 text-center">
                <div>
                  <History size={28} className="mx-auto text-muted-foreground" />
                  <div className="mt-2 text-sm font-medium text-foreground">No previous chats</div>
                  <div className="mt-1 text-[12px] text-muted-foreground">
                    Your conversations will appear here.
                  </div>
                </div>
              </div>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {chat.chats.map((c) => {
                  const isActive = c.id === chat.activeChatId;
                  return (
                    <li
                      key={c.id}
                      className={`group flex items-center gap-2 rounded-lg border px-3 py-2.5 ${
                        isActive
                          ? "border-cars24-red bg-cars24-red/5"
                          : "border-border hover:border-cars24-red/40 hover:bg-muted"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          chat.loadChat(c.id);
                          setShowHistory(false);
                        }}
                        className="flex-1 text-left"
                      >
                        <div className="line-clamp-1 text-[13px] font-medium text-foreground">
                          {c.title}
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {c.messages.length} messages · {formatRelative(c.updatedAt)}
                          {isActive ? " · current" : ""}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => chat.deleteChat(c.id)}
                        aria-label="Delete chat"
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-background hover:text-cars24-red"
                      >
                        <Trash2 size={15} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </>
  );
}