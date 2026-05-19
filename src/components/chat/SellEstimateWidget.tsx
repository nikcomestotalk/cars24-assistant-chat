import { Car, CheckCircle2, AlertCircle, MinusCircle, Gauge, MapPin } from "lucide-react";

export interface SellFactor {
  label: string;
  impact: "positive" | "negative" | "neutral";
}

export interface SellEstimateData {
  carName: string;
  year: number;
  km: number;
  fuel: string;
  city: string;
  priceMin: number;
  priceMax: number;
  priceEstimate: number;
  factors: SellFactor[];
}

const fmt = (p: number) => `₹${(p / 100000).toFixed(1)}L`;

const FACTOR_ICON = {
  positive: CheckCircle2,
  negative: AlertCircle,
  neutral: MinusCircle,
};
const FACTOR_COLOR = {
  positive: "text-emerald-600",
  negative: "text-red-500",
  neutral: "text-muted-foreground",
};

export function SellEstimateWidget({ data }: { data: SellEstimateData }) {
  const range = data.priceMax - data.priceMin;
  const pct = Math.min(100, Math.max(0, ((data.priceEstimate - data.priceMin) / range) * 100));

  return (
    <div className="w-[300px] overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Car header */}
      <div className="flex items-center gap-3 border-b border-border bg-cars24-red/5 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cars24-red/10">
          <Car size={17} className="text-cars24-red" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[14px] font-semibold text-foreground">
            {data.carName} {data.year}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Gauge size={9} />
            <span>{(data.km / 1000).toFixed(0)}k km</span>
            <span>·</span>
            <span>{data.fuel}</span>
            <span>·</span>
            <MapPin size={9} />
            <span>{data.city}</span>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Price estimate */}
        <div className="mb-4">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Market value range</span>
            <span className="font-medium text-foreground">
              {fmt(data.priceMin)} – {fmt(data.priceMax)}
            </span>
          </div>

          {/* Range bar */}
          <div className="relative h-2 rounded-full bg-muted">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-cars24-red"
              style={{ width: `${pct}%` }}
            />
            <div
              className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cars24-red bg-background shadow"
              style={{ left: `${pct}%` }}
            />
          </div>

          <div className="mt-3 text-center">
            <div className="text-[28px] font-bold leading-none text-foreground">
              {fmt(data.priceEstimate)}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">Your estimated price</div>
          </div>
        </div>

        {/* Value factors */}
        <div className="mb-4">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Price factors
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
            {data.factors.map((f) => {
              const Icon = FACTOR_ICON[f.impact];
              return (
                <div key={f.label} className="flex items-center gap-1.5 text-[12px] text-foreground">
                  <Icon size={12} className={FACTOR_COLOR[f.impact]} />
                  {f.label}
                </div>
              );
            })}
          </div>
        </div>

        {/* Trust strip */}
        <div className="mb-3 flex items-center justify-around rounded-lg bg-muted/60 py-2">
          <span className="text-[10px] text-muted-foreground">⚡ 30-min inspection</span>
          <span className="text-[10px] text-muted-foreground">💰 Instant payment</span>
          <span className="text-[10px] text-muted-foreground">📄 Free RC transfer</span>
        </div>

        {/* CTAs */}
        <button
          type="button"
          className="w-full rounded-xl bg-cars24-red py-2.5 text-[14px] font-bold text-cars24-red-foreground transition-opacity hover:opacity-90"
        >
          Book Free Inspection
        </button>
        <button
          type="button"
          className="mt-2 w-full text-[12px] font-medium text-cars24-red hover:underline"
        >
          How to improve your price →
        </button>
      </div>
    </div>
  );
}
