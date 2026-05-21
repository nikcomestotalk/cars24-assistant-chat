import type { CollectedData, APIResult } from "../types";

// Mock inspection slot service — simulates Cars24's slot booking API.
// Real integration: GET /api/v1/slots?city=Delhi&date_from=...

export interface Slot {
  slotId: string;
  date: string;         // "Mon, 26 May"
  dayLabel: string;     // "Tomorrow" / "Monday" etc
  timeRange: string;    // "9 AM – 11 AM"
  available: boolean;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

function getDayLabel(d: Date, today: Date): string {
  const diff = Math.round((d.setHours(0,0,0,0) - today.setHours(0,0,0,0)) / 86400000);
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString("en-IN", { weekday: "long" });
}

export async function slotsApi(data: CollectedData): Promise<APIResult> {
  await new Promise(r => setTimeout(r, 400));

  const today = new Date();
  const slots: Slot[] = [];
  const times = ["9 AM – 11 AM", "11 AM – 1 PM", "2 PM – 4 PM", "4 PM – 6 PM"];

  for (let dayOffset = 1; dayOffset <= 3; dayOffset++) {
    const d = new Date(today);
    d.setDate(today.getDate() + dayOffset);
    const dateStr = formatDate(new Date(d));
    const dayLabel = getDayLabel(new Date(d), new Date(today));

    times.forEach((timeRange, i) => {
      // Randomly mark some slots unavailable (stable by day+time)
      const available = (dayOffset + i) % 3 !== 0;
      slots.push({
        slotId: `slot_${dayOffset}_${i}`,
        date: dateStr,
        dayLabel,
        timeRange,
        available,
      });
    });
  }

  return {
    success: true,
    data: { slots, city: String(data.city ?? "your city") },
  };
}
