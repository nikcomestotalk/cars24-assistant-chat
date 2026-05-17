import { createFileRoute } from "@tanstack/react-router";
import { ChatWidget } from "@/components/chat";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border px-5 py-4">
        <div className="text-xl font-bold tracking-tight text-cars24-red">CARS24</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Buy & sell used cars — AI assistant preview
        </p>
      </header>
      <section className="px-5 py-10">
        <h1 className="text-2xl font-bold text-foreground">
          Find your next car
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Tap the chat bubble in the bottom-right to talk to our AI assistant.
          Try “buy a car” or “calculate EMI” to see live results.
        </p>
      </section>
      <ChatWidget />
    </main>
  );
}
}
