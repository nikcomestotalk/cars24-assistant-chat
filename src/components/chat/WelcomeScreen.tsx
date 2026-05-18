import { Car, TrendingUp, Calculator, Settings, Search, ArrowRightLeft, Clock, IndianRupee, Fuel } from "lucide-react";
import type { BehaviorState, JourneyStage } from "./useUserBehavior";

const DEFAULT_SUGGESTIONS = [
  { icon: Search, label: "Find me a used car", sub: "Budget, fuel type, city", message: "I want to buy a used car" },
  { icon: TrendingUp, label: "Sell my car", sub: "Get best price estimate", message: "I want to sell my car" },
  { icon: Calculator, label: "Calculate EMI", sub: "Loan & tenure planner", message: "Help me calculate EMI for a car" },
  { icon: ArrowRightLeft, label: "Compare cars", sub: "Side-by-side specs", message: "Compare Hyundai i20 vs Maruti Baleno" },
  { icon: Car, label: "Cars under ₹10 Lakh", sub: "Best value options", message: "Show me good cars under 10 lakhs" },
  { icon: Settings, label: "My Orbit orders", sub: "Track service & orders", message: "Show my Orbit orders" },
];

const STAGE_SUGGESTIONS: Record<JourneyStage, Array<{ icon: React.ElementType; label: string; sub: string; message: string }>> = {
  researching: [
    { icon: Search, label: "Find a car", sub: "Budget, fuel, city", message: "I want to buy a used car" },
    { icon: ArrowRightLeft, label: "Compare models", sub: "Side-by-side specs", message: "Compare Hyundai i20 vs Maruti Baleno" },
    { icon: Calculator, label: "Check EMI", sub: "Loan planner", message: "Help me calculate EMI" },
    { icon: Car, label: "Cars under ₹10L", sub: "Best value picks", message: "Show me good cars under 10 lakhs" },
  ],
  buying: [
    { icon: Calculator, label: "Calculate EMI", sub: "Finalize your budget", message: "Help me calculate EMI" },
    { icon: ArrowRightLeft, label: "Final comparison", sub: "Pick the best one", message: "Help me compare my shortlisted cars" },
    { icon: Search, label: "Last-minute search", sub: "Check more options", message: "Show me more cars in my budget" },
    { icon: Settings, label: "Test drive tips", sub: "What to check", message: "What should I check during a test drive?" },
  ],
  owning: [
    { icon: Settings, label: "Book a service", sub: "Doorstep pickup", message: "I need to service my car" },
    { icon: TrendingUp, label: "Sell my car", sub: "Best price in 30 min", message: "I want to sell my car" },
    { icon: Calculator, label: "Upgrade & trade-in", sub: "Upgrade your ride", message: "I want to upgrade my car" },
    { icon: Car, label: "Insurance renewal", sub: "Best rates", message: "I need to renew my car insurance" },
  ],
  "re-selling": [
    { icon: TrendingUp, label: "Get car value", sub: "Instant price estimate", message: "How much is my car worth?" },
    { icon: Settings, label: "Pre-sell service", sub: "Boost your price", message: "How do I get the best price for my car?" },
    { icon: Search, label: "Find next car", sub: "Browse replacements", message: "Show me cars to replace mine" },
    { icon: Calculator, label: "Calculate upgrade cost", sub: "Old vs new", message: "Help me plan my car upgrade" },
  ],
};

function ReturnUserBanner({
  behavior,
  onSend,
}: {
  behavior: BehaviorState;
  onSend: (text: string) => void;
}) {
  const hasPrefs = behavior.budgetMax !== null || behavior.fuelPreference !== null || behavior.viewedCarNames.length > 0;
  if (!hasPrefs) return null;

  const continueMessage = behavior.viewedCarNames.length > 0
    ? `Show me more cars like ${behavior.viewedCarNames[0]}`
    : behavior.budgetMax
    ? `Show me cars under ${(behavior.budgetMax / 100000).toFixed(0)} lakhs`
    : "Show me car recommendations based on my preferences";

  return (
    <div className="mb-6 w-full max-w-xl rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cars24-red/10">
          <Clock size={15} className="text-cars24-red" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-foreground">Continue where you left off</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {behavior.budgetMax && (
              <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground">
                <IndianRupee size={9} />
                Under {(behavior.budgetMax / 100000).toFixed(0)}L
              </span>
            )}
            {behavior.fuelPreference && (
              <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground">
                <Fuel size={9} />
                {behavior.fuelPreference}
              </span>
            )}
            {behavior.viewedCarNames[0] && (
              <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground">
                <Car size={9} />
                Viewed {behavior.viewedCarNames[0]}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => onSend(continueMessage)}
            className="mt-2.5 rounded-lg bg-cars24-red px-3 py-1.5 text-[12px] font-semibold text-cars24-red-foreground hover:opacity-90 transition-opacity"
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}

export function WelcomeScreen({
  onSend,
  behavior,
}: {
  onSend: (text: string) => void;
  behavior: BehaviorState;
}) {
  const isReturn = behavior.isReturnUser;
  const suggestions = isReturn ? STAGE_SUGGESTIONS[behavior.journeyStage] : DEFAULT_SUGGESTIONS;

  const greeting = isReturn
    ? "Welcome back"
    : "What can I help you with?";

  const subtitle = isReturn
    ? {
        researching: "Still exploring? Here's what you can do next.",
        buying: "You're close to a decision — let's help you finalize.",
        owning: "Need help with your car? We've got you covered.",
        "re-selling": "Ready to sell? Let's get you the best price.",
      }[behavior.journeyStage]
    : "Buy, sell, finance or manage your car — ask me anything about Cars24";

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      {/* Hero */}
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cars24-red shadow-lg shadow-cars24-red/25">
          <Car size={30} className="text-cars24-red-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{greeting}</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{subtitle}</p>
      </div>

      {/* Return user context banner */}
      {isReturn && <ReturnUserBanner behavior={behavior} onSend={onSend} />}

      {/* Suggestion grid */}
      <div className="grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
        {suggestions.map(({ icon: Icon, label, sub, message }) => (
          <button
            key={label}
            type="button"
            onClick={() => onSend(message)}
            className="group flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-left shadow-sm transition-all hover:border-cars24-red/50 hover:shadow-md"
          >
            <span className="mt-0.5 text-muted-foreground transition-colors group-hover:text-cars24-red">
              <Icon size={16} />
            </span>
            <div>
              <div className="text-[13px] font-semibold text-foreground">{label}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
