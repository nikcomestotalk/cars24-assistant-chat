import type { CollectedData, APIResult } from "../types";

// Mock inspection booking service.
// Real integration: POST /api/v1/inspections/book

const EXECUTIVES = [
  { name: "Rahul Sharma",   contact: "98765 43210" },
  { name: "Priya Menon",    contact: "87654 32109" },
  { name: "Arjun Patel",    contact: "76543 21098" },
  { name: "Sneha Kapoor",   contact: "96543 10987" },
];

function pickExecutive(seed: string) {
  const idx = seed.charCodeAt(0) % EXECUTIVES.length;
  return EXECUTIVES[idx];
}

function generateBookingId() {
  return "C24-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function bookingApi(data: CollectedData): Promise<APIResult> {
  await new Promise(r => setTimeout(r, 500));

  const slot      = String(data.selected_slot ?? "Tomorrow, 10 AM");
  const city      = String(data.city ?? "your city");
  const executive = pickExecutive(slot);
  const bookingId = generateBookingId();

  return {
    success: true,
    data: {
      bookingId,
      confirmedSlot: slot,
      city,
      executiveName: executive.name,
      executiveContact: executive.contact,
      estimatedDuration: "30 minutes",
      instructions: [
        "Keep RC, insurance, and ID proof handy",
        "Ensure the car is clean for accurate assessment",
        "Our executive will call 30 mins before arrival",
      ],
    },
  };
}
