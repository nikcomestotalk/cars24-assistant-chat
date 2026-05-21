import type { CollectedData, APIResult } from "../types";

// Mock valuation — simulates Cars24's pricing API.
// Real integration: POST /api/v1/valuation with car details.

const BASE_PRICES: Record<string, number> = {
  // Maruti
  "wagonr": 4.5, "swift": 6.0, "baleno": 7.5, "alto": 3.0, "brezza": 10.0, "ertiga": 9.0,
  // Hyundai
  "i20": 7.0, "creta": 13.0, "venue": 10.0, "i10": 4.0, "verna": 9.0,
  // Honda
  "city": 9.0, "amaze": 6.5, "jazz": 6.0, "wr-v": 8.0, "hrv": 12.0,
  // Tata
  "nexon": 9.0, "harrier": 14.0, "safari": 16.0, "tiago": 5.0, "tigor": 6.0, "altroz": 7.0,
  // Toyota
  "fortuner": 25.0, "innova": 14.0, "glanza": 7.0,
  // Default
  "default": 6.0,
};

const KM_ADJUSTMENT: { max: number; factor: number }[] = [
  { max: 20000,  factor:  0.10 },
  { max: 40000,  factor:  0.03 },
  { max: 60000,  factor:  0.00 },
  { max: 80000,  factor: -0.05 },
  { max: 100000, factor: -0.10 },
  { max: Infinity, factor: -0.18 },
];

const FUEL_FACTOR: Record<string, number> = {
  petrol: 1.0, diesel: 1.05, cng: 0.90, electric: 1.15,
};

const CITY_FACTOR: Record<string, number> = {
  mumbai: 1.08, delhi: 1.06, bangalore: 1.05, hyderabad: 1.04, chennai: 1.03,
  pune: 1.02, ahmedabad: 1.01, kolkata: 1.00,
};

function findBasePrice(model: string): number {
  const normalized = model.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const [key, price] of Object.entries(BASE_PRICES)) {
    if (normalized.includes(key.replace("-", ""))) return price;
  }
  return BASE_PRICES.default;
}

function yearDepreciation(year: number): number {
  const age = new Date().getFullYear() - year;
  // 15% first year, 10% thereafter, floor at 35% of original
  const factor = Math.max(0.35, 1 - (0.15 + Math.max(0, age - 1) * 0.10));
  return factor;
}

export async function valuationApi(data: CollectedData): Promise<APIResult> {
  // Simulate network delay
  await new Promise(r => setTimeout(r, 600));

  const model    = String(data.car_model ?? "car");
  const year     = Number(data.year ?? 2019);
  const km       = Number(data.km_driven ?? 50000);
  const fuel     = String(data.fuel_type ?? "Petrol").toLowerCase();
  const city     = String(data.city ?? "delhi").toLowerCase();

  const base      = findBasePrice(model);
  const depFactor = yearDepreciation(year);
  const kmFactor  = 1 + (KM_ADJUSTMENT.find(r => km <= r.max)?.factor ?? -0.18);
  const fuelFac   = FUEL_FACTOR[fuel] ?? 1.0;
  const cityFac   = CITY_FACTOR[city] ?? 1.0;

  const estimate  = +(base * depFactor * kmFactor * fuelFac * cityFac).toFixed(2);
  const spread    = +(estimate * 0.05).toFixed(2); // ±5%
  const priceMin  = +(estimate - spread).toFixed(2);
  const priceMax  = +(estimate + spread).toFixed(2);

  return {
    success: true,
    data: {
      priceMin,
      priceMax,
      priceEstimate: estimate,
      currency: "INR_LAKHS",
      factors: [
        `${new Date().getFullYear() - year} year old vehicle`,
        `${km.toLocaleString()} km driven`,
        `${fuel.charAt(0).toUpperCase() + fuel.slice(1)} fuel`,
      ],
    },
  };
}
