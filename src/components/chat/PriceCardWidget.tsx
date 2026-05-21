import { TrendingUp, CheckCircle } from "lucide-react";

interface PriceCardData {
  priceMin: number;
  priceMax: number;
  priceEstimate: number;
  currency: string;
  factors?: string[];
}

export function PriceCardWidget({ data }: { data: PriceCardData }) {
  const fmt = (n: number) => n.toFixed(2);

  return (
    <div className="w-full max-w-[300px] rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-green-100 text-green-600">
          <TrendingUp size={16} />
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Estimated Value</p>
          <p className="text-[13px] font-semibold text-foreground">
            ₹{fmt(data.priceMin)}L – ₹{fmt(data.priceMax)}L
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-gradient-to-br from-cars24-red/10 to-cars24-red/5 px-4 py-3 text-center mb-3">
        <p className="text-[11px] text-muted-foreground mb-0.5">Best estimate</p>
        <p className="text-[26px] font-bold text-cars24-red">₹{fmt(data.priceEstimate)}L</p>
      </div>

      {data.factors && data.factors.length > 0 && (
        <ul className="space-y-1">
          {data.factors.map((f) => (
            <li key={f} className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <CheckCircle size={11} className="text-green-500 shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
