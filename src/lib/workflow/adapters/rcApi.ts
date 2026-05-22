import type { CollectedData, APIResult } from "../types";

// Mock RC lookup — maps common state+series patterns to realistic cars
const RC_PROFILES: Array<{ pattern: RegExp; model: string; city: string }> = [
  { pattern: /^MH/i, model: "Maruti Swift VXI",    city: "Mumbai" },
  { pattern: /^DL/i, model: "Hyundai i20 Asta",    city: "Delhi" },
  { pattern: /^KA/i, model: "Toyota Innova Crysta", city: "Bangalore" },
  { pattern: /^TN/i, model: "Honda City ZX",        city: "Chennai" },
  { pattern: /^TS/i, model: "Hyundai Creta SX",     city: "Hyderabad" },
  { pattern: /^GJ/i, model: "Maruti Baleno Alpha",  city: "Ahmedabad" },
  { pattern: /^RJ/i, model: "Maruti WagonR VXI",    city: "Jaipur" },
  { pattern: /^UP/i, model: "Tata Nexon XZ+",       city: "Lucknow" },
  { pattern: /^WB/i, model: "Honda Amaze VX",       city: "Kolkata" },
  { pattern: /^PB/i, model: "Mahindra Scorpio",     city: "Chandigarh" },
];

export async function rcApi(data: CollectedData): Promise<APIResult> {
  const rc = String(data.rc_number ?? "").toUpperCase().replace(/[\s-]/g, "");

  // Validate RC format: 2 letters + 2 digits + 1-3 letters + 4 digits
  if (!/^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}$/.test(rc)) {
    return {
      success: false,
      data: {},
      error: "Invalid RC number format. Please use format like MH02AB1234.",
    };
  }

  const profile = RC_PROFILES.find((p) => p.pattern.test(rc)) ?? {
    model: "Maruti Swift VXI",
    city: "Delhi",
  };

  // Simulate slight API delay
  await new Promise((r) => setTimeout(r, 400));

  return {
    success: true,
    data: {
      car_model: profile.model,
      city: profile.city,
      rc_number: rc,
      rc_verified: true,
    },
  };
}
