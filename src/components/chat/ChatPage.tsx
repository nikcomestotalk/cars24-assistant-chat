import { useState } from "react";
import { Menu, Plus } from "lucide-react";
import { useChatStream } from "./useChatStream";
import { Sidebar } from "./Sidebar";
import { WelcomeScreen } from "./WelcomeScreen";
import { MessageThread } from "./MessageThread";
import { InputBar } from "./InputBar";

export function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const chat = useChatStream();
  const hasMessages = chat.messages.length > 0;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        chats={chat.chats}
        activeChatId={chat.activeChatId}
        onNewChat={chat.newChat}
        onLoadChat={chat.loadChat}
        onDeleteChat={chat.deleteChat}
      />

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <Menu size={18} />
          </button>
          <span className="text-[15px] font-bold text-cars24-red">Cars24</span>
          <button
            type="button"
            onClick={chat.newChat}
            aria-label="New chat"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <Plus size={18} />
          </button>
        </header>

        {/* Desktop top bar — only show new chat button when there are messages */}
        {hasMessages && (
          <div className="hidden items-center justify-end border-b border-border px-6 py-2.5 md:flex">
            <button
              type="button"
              onClick={chat.newChat}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Plus size={14} />
              New chat
            </button>
          </div>
        )}

        {/* Scrollable area */}
        <div className="flex flex-1 flex-col min-h-0">
          {hasMessages ? (
            <MessageThread
              messages={chat.messages}
              isStreaming={chat.isStreaming}
              shortlisted={chat.shortlisted}
              onToggleShortlist={chat.toggleShortlist}
              onFollowUp={chat.sendMessage}
            />
          ) : (
            <WelcomeScreen onSend={chat.sendMessage} />
          )}
        </div>

        {/* Input always visible at bottom */}
        <InputBar onSend={chat.sendMessage} disabled={chat.isStreaming} />
      </div>
    </div>
  );
}
