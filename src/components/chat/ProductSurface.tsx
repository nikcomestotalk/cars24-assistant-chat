import { CreditCard, Shield, Car, Wrench, TrendingUp, ArrowRight } from "lucide-react";
import type { JourneyStage } from "./useUserBehavior";

interface Product {
  id: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  cta: string;
  accent: string;
  bg: string;
}

const PRODUCTS: Record<string, Product> = {
  loan: {
    id: "loan",
    icon: CreditCard,
    title: "CARS24 Capital",
    subtitle: "Pre-approved loan in 2 min. From 8.5% p.a.",
    cta: "Check eligibility",
    accent: "text-blue-600",
    bg: "bg-blue-50",
  },
  insurance: {
    id: "insurance",
    icon: Shield,
    title: "Car Insurance",
    subtitle: "Comprehensive cover from ₹2,499/yr",
    cta: "Get quote",
    accent: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  orbit: {
    id: "orbit",
    icon: Car,
    title: "Cars24 Orbit",
    subtitle: "Subscribe & drive, from ₹12,999/month",
    cta: "Explore Orbit",
    accent: "text-violet-600",
    bg: "bg-violet-50",
  },
  service: {
    id: "service",
    icon: Wrench,
    title: "Car Service",
    subtitle: "Doorstep service & repair. Free pickup.",
    cta: "Book now",
    accent: "text-orange-600",
    bg: "bg-orange-50",
  },
  sell: {
    id: "sell",
    icon: TrendingUp,
    title: "Sell Your Car",
    subtitle: "Best price in 30 min. Free inspection.",
    cta: "Get price",
    accent: "text-cars24-red",
    bg: "bg-cars24-red/5",
  },
};

const STAGE_PRODUCTS: Record<JourneyStage, string[]> = {
  researching: ["orbit", "loan"],
  buying: ["loan", "insurance"],
  owning: ["service", "insurance", "sell"],
  "re-selling": ["sell", "service"],
};

export function ProductSurface({ stage }: { stage: JourneyStage }) {
  const ids = STAGE_PRODUCTS[stage];
  const products = ids.map((id) => PRODUCTS[id]).filter(Boolean);
  if (!products.length) return null;

  return (
    <div className="border-t border-border bg-background px-4 py-3">
      <div className="mx-auto max-w-2xl">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Cars24 for you
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {products.map((p) => {
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                type="button"
                className={`group flex min-w-[168px] flex-col rounded-xl border border-border p-3 text-left transition-all hover:border-cars24-red/30 hover:shadow-sm ${p.bg}`}
              >
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-background shadow-sm ${p.accent}`}>
                  <Icon size={14} />
                </div>
                <div className="mt-2 text-[13px] font-semibold text-foreground">{p.title}</div>
                <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{p.subtitle}</div>
                <div className={`mt-2 flex items-center gap-0.5 text-[12px] font-semibold ${p.accent}`}>
                  {p.cta}
                  <ArrowRight size={11} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
