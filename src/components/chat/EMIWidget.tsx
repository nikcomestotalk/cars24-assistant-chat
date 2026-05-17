import { useMemo, useState } from "react";

const TENURES = [12, 24, 36, 48, 60];

function calcEmi(principal: number, annualRate: number, months: number) {
  if (principal <= 0) return 0;
  const r = annualRate / 12 / 100;
  const n = months;
  const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Math.round(emi);
}

export function EMIWidget({ data }: { data: { carName: string; price: number } }) {
  const [downPct, setDownPct] = useState(20);
  const [tenureIdx, setTenureIdx] = useState(2);
  const tenure = TENURES[tenureIdx];
  const down = Math.round((data.price * downPct) / 100);
  const principal = data.price - down;
  const emi = useMemo(() => calcEmi(principal, 10.5, tenure), [principal, tenure]);

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-foreground">{data.carName}</div>
        <div className="text-sm font-bold text-cars24-red">
          ₹{(data.price / 100000).toFixed(2)} L
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Down payment</span>
          <span className="font-medium text-foreground">
            {downPct}% · ₹{(down / 1000).toFixed(0)}k
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={50}
          step={1}
          value={downPct}
          onChange={(e) => setDownPct(Number(e.target.value))}
          aria-label="Down payment percentage"
          className="mt-1 w-full accent-[color:var(--cars24-red)]"
        />
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Tenure</span>
          <span className="font-medium text-foreground">{tenure} months</span>
        </div>
        <input
          type="range"
          min={0}
          max={TENURES.length - 1}
          step={1}
          value={tenureIdx}
          onChange={(e) => setTenureIdx(Number(e.target.value))}
          aria-label="Loan tenure"
          className="mt-1 w-full accent-[color:var(--cars24-red)]"
        />
      </div>

      <div className="mt-3 rounded-lg bg-bubble-assistant p-3 text-center">
        <div className="text-[11px] text-muted-foreground">Estimated EMI</div>
        <div className="text-2xl font-bold text-foreground">
          ₹{emi.toLocaleString("en-IN")}{" "}
          <span className="text-xs font-medium text-muted-foreground">/ month</span>
        </div>
      </div>

      <button
        type="button"
        className="mt-3 w-full rounded-lg bg-cars24-red py-2.5 text-sm font-semibold text-cars24-red-foreground hover:opacity-90"
      >
        Apply for loan
      </button>
    </div>
  );
}