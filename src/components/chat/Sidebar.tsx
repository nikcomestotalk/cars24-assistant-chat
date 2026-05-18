import { Plus, MessageSquare, Trash2, X } from "lucide-react";
import type { SavedChat } from "./useChatStream";

const LOGO_PATH =
  "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z";

function Cars24Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect width="24" height="24" rx="6" fill="currentColor" />
      <text x="12" y="17" textAnchor="middle" fontSize="11" fontWeight="800" fill="white" fontFamily="system-ui">
        C24
      </text>
    </svg>
  );
}

function relativeTime(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function Sidebar({
  open,
  onClose,
  chats,
  activeChatId,
  onNewChat,
  onLoadChat,
  onDeleteChat,
}: {
  open: boolean;
  onClose: () => void;
  chats: SavedChat[];
  activeChatId: string;
  onNewChat: () => void;
  onLoadChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
}) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-[oklch(0.975_0.005_265)]
          border-r border-border transition-transform duration-300
          md:relative md:translate-x-0 md:z-auto
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between px-4 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-cars24-red">
              <Cars24Logo size={30} />
            </span>
            <div>
              <div className="text-[15px] font-bold leading-tight text-cars24-red">Cars24</div>
              <div className="text-[10px] text-muted-foreground leading-tight">AI Assistant</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted md:hidden"
          >
            <X size={16} />
          </button>
        </div>

        {/* New Chat */}
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5 text-[13px] font-medium text-foreground shadow-sm hover:border-cars24-red/40 hover:shadow transition-all"
          >
            <Plus size={15} className="text-cars24-red" />
            New chat
          </button>
        </div>

        <div className="mx-3 mb-2 h-px bg-border" />

        {/* History */}
        <div className="flex-1 overflow-y-auto px-2 py-1">
          {chats.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              No previous chats
            </div>
          ) : (
            <>
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Recent
              </div>
              <div className="flex flex-col gap-0.5">
                {chats.map((c) => {
                  const isActive = c.id === activeChatId;
                  return (
                    <div
                      key={c.id}
                      className={`group flex items-center gap-1 rounded-lg transition-colors ${
                        isActive
                          ? "bg-cars24-red/8 border border-cars24-red/20"
                          : "hover:bg-muted border border-transparent"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onLoadChat(c.id);
                          onClose();
                        }}
                        className="flex flex-1 items-center gap-2 px-2.5 py-2 text-left min-w-0"
                      >
                        <MessageSquare
                          size={13}
                          className={`shrink-0 ${isActive ? "text-cars24-red" : "text-muted-foreground"}`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="line-clamp-1 text-[13px] text-foreground">{c.title}</div>
                          <div className="text-[10px] text-muted-foreground">{relativeTime(c.updatedAt)}</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteChat(c.id)}
                        aria-label="Delete chat"
                        className="mr-1.5 hidden h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-destructive group-hover:grid"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-3">
          <div className="text-[11px] text-muted-foreground">
            Cars24 · AI-powered car guide
          </div>
        </div>
      </aside>
    </>
  );
}
