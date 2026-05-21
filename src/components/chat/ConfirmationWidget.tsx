import { CheckCircle, User, Phone, Clock, FileText } from "lucide-react";

interface ConfirmationData {
  bookingId: string;
  confirmedSlot: string;
  city: string;
  executiveName: string;
  executiveContact: string;
  estimatedDuration: string;
  instructions?: string[];
}

export function ConfirmationWidget({ data }: { data: ConfirmationData }) {
  return (
    <div className="w-full max-w-[320px] rounded-2xl border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle size={20} className="text-green-600 shrink-0" />
        <div>
          <p className="text-[13px] font-semibold text-foreground">Inspection Confirmed!</p>
          <p className="text-[11px] text-muted-foreground font-mono">{data.bookingId}</p>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 text-[12px] text-foreground">
          <Clock size={12} className="text-cars24-red shrink-0" />
          <span className="font-medium">{data.confirmedSlot}</span>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-foreground">
          <User size={12} className="text-cars24-red shrink-0" />
          <span>{data.executiveName}</span>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-foreground">
          <Phone size={12} className="text-cars24-red shrink-0" />
          <span>{data.executiveContact}</span>
        </div>
      </div>

      {data.instructions && data.instructions.length > 0 && (
        <div className="rounded-xl bg-white/70 dark:bg-white/5 p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <FileText size={11} className="text-muted-foreground" />
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Checklist
            </p>
          </div>
          <ul className="space-y-1">
            {data.instructions.map((ins) => (
              <li key={ins} className="text-[11px] text-foreground flex items-start gap-1.5">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cars24-red shrink-0" />
                {ins}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
