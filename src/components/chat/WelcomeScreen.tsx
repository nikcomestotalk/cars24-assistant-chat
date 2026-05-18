import { Car, TrendingUp, Calculator, Settings, Search, ArrowRightLeft } from "lucide-react";

const SUGGESTIONS = [
  {
    icon: Search,
    label: "Find me a used car",
    sub: "Budget, fuel type, city",
    message: "I want to buy a used car",
  },
  {
    icon: TrendingUp,
    label: "Sell my car",
    sub: "Get best price estimate",
    message: "I want to sell my car",
  },
  {
    icon: Calculator,
    label: "Calculate EMI",
    sub: "Loan & tenure planner",
    message: "Help me calculate EMI for a car",
  },
  {
    icon: ArrowRightLeft,
    label: "Compare cars",
    sub: "Side-by-side specs",
    message: "Compare Hyundai i20 vs Maruti Baleno",
  },
  {
    icon: Car,
    label: "Cars under ₹10 Lakh",
    sub: "Best value options",
    message: "Show me good cars under 10 lakhs",
  },
  {
    icon: Settings,
    label: "My Orbit orders",
    sub: "Track service & orders",
    message: "Show my Orbit orders",
  },
];

export function WelcomeScreen({ onSend }: { onSend: (text: string) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      {/* Hero */}
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cars24-red shadow-lg shadow-cars24-red/25">
          <Car size={30} className="text-cars24-red-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          What can I help you with?
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Buy, sell, finance or manage your car — ask me anything about Cars24
        </p>
      </div>

      {/* Suggestion grid */}
      <div className="grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {SUGGESTIONS.map(({ icon: Icon, label, sub, message }) => (
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
