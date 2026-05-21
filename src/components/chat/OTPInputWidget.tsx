import { useState, useRef } from "react";
import { Shield, ArrowRight } from "lucide-react";

interface OTPInputData {
  message?: string;
  expiresIn?: number;
}

export function OTPInputWidget({
  data,
  onSubmit,
}: {
  data: OTPInputData;
  onSubmit: (otp: string) => void;
}) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[idx] = digit;
    setDigits(next);
    if (digit && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (paste.length === 6) {
      setDigits(paste.split(""));
      refs.current[5]?.focus();
    }
    e.preventDefault();
  };

  const code = digits.join("");
  const isComplete = code.length === 6;

  return (
    <div className="w-full max-w-[300px] rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-blue-100 text-blue-600">
          <Shield size={15} />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-foreground">Enter OTP</p>
          <p className="text-[11px] text-muted-foreground">{data.message ?? "Check your SMS"}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-3" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="h-10 w-10 rounded-lg border border-border bg-background text-center text-[16px] font-semibold focus:border-cars24-red focus:outline-none focus:ring-1 focus:ring-cars24-red transition-colors"
          />
        ))}
      </div>

      <button
        type="button"
        disabled={!isComplete}
        onClick={() => isComplete && onSubmit(code)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-cars24-red px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-40 transition-opacity hover:opacity-90"
      >
        Verify OTP <ArrowRight size={14} />
      </button>

      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        Demo: use <span className="font-mono font-semibold">123456</span>
      </p>
    </div>
  );
}
