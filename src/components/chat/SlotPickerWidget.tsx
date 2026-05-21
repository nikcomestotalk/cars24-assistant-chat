import { Calendar, Clock } from "lucide-react";

interface Slot {
  slotId: string;
  date: string;
  dayLabel: string;
  timeRange: string;
  available: boolean;
}

interface SlotPickerData {
  slots: Slot[];
  city: string;
}

export function SlotPickerWidget({
  data,
  onSelect,
}: {
  data: SlotPickerData;
  onSelect: (text: string) => void;
}) {
  const { slots, city } = data;
  const days = Array.from(new Set(slots.map((s) => s.dayLabel)));

  return (
    <div className="w-full max-w-[340px] rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={15} className="text-cars24-red" />
        <p className="text-[13px] font-semibold text-foreground">
          Choose Inspection Slot — {city}
        </p>
      </div>

      <div className="space-y-3">
        {days.map((day) => {
          const daySlots = slots.filter((s) => s.dayLabel === day);
          return (
            <div key={day}>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                {daySlots[0].date} · {day}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {daySlots.map((slot) => (
                  <button
                    key={slot.slotId}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => onSelect(`${day}, ${slot.timeRange}`)}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[12px] transition-colors text-left ${
                      slot.available
                        ? "border border-border hover:border-cars24-red hover:bg-cars24-red/5 hover:text-cars24-red cursor-pointer"
                        : "border border-border bg-muted text-muted-foreground/40 cursor-not-allowed line-through"
                    }`}
                  >
                    <Clock size={11} className="shrink-0" />
                    {slot.timeRange}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
