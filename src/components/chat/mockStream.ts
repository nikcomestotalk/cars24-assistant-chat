import type { SellEstimateData } from "./SellEstimateWidget";

export type StreamEvent =
  | { type: "token"; content: string }
  | { type: "tool_result"; tool: "search_cars" | "calc_emi" | "price_estimate"; data: any }
  | { type: "done" };

export const MOCK_CARS = [
  { id: 1, name: "Maruti Swift VXI", year: 2021, km: 32000, fuel: "Petrol", price: 595000, image: null as string | null },
  { id: 2, name: "Honda City ZX", year: 2020, km: 45000, fuel: "Petrol", price: 895000, image: null as string | null },
  { id: 3, name: "Hyundai i20 Asta", year: 2022, km: 18000, fuel: "Petrol", price: 785000, image: null as string | null },
];

const SELL_CAR_PROFILES: Array<{
  pattern: RegExp;
  name: string;
  priceMin: number;
  priceMax: number;
  priceEstimate: number;
}> = [
  { pattern: /swift/i,   name: "Maruti Swift VXi",   priceMin: 380000, priceMax: 540000, priceEstimate: 475000 },
  { pattern: /baleno/i,  name: "Maruti Baleno Alpha", priceMin: 490000, priceMax: 700000, priceEstimate: 610000 },
  { pattern: /i20/i,     name: "Hyundai i20 Asta",    priceMin: 520000, priceMax: 760000, priceEstimate: 650000 },
  { pattern: /creta/i,   name: "Hyundai Creta SX",    priceMin: 780000, priceMax: 1150000, priceEstimate: 960000 },
  { pattern: /city/i,    name: "Honda City ZX",       priceMin: 620000, priceMax: 890000, priceEstimate: 750000 },
  { pattern: /nexon/i,   name: "Tata Nexon XZ+",      priceMin: 720000, priceMax: 1050000, priceEstimate: 890000 },
  { pattern: /brezza/i,  name: "Maruti Brezza ZXI",   priceMin: 680000, priceMax: 980000, priceEstimate: 840000 },
  { pattern: /verna/i,   name: "Hyundai Verna SX",    priceMin: 560000, priceMax: 820000, priceEstimate: 700000 },
  { pattern: /dzire/i,   name: "Maruti Dzire ZXI",    priceMin: 420000, priceMax: 610000, priceEstimate: 520000 },
];

function buildEstimate(message: string): SellEstimateData {
  const profile = SELL_CAR_PROFILES.find((p) => p.pattern.test(message));
  const base = profile ?? {
    name: "Your Car",
    priceMin: 420000,
    priceMax: 680000,
    priceEstimate: 550000,
  };

  const yearMatch = message.match(/20\d{2}/);
  const year = yearMatch ? parseInt(yearMatch[0]) : 2021;

  const kmMatch = message.match(/(\d+)\s*(?:k\b|km|thousand)/i);
  let km = 42000;
  if (kmMatch) {
    const n = parseInt(kmMatch[1]);
    km = /k\b|thousand/i.test(kmMatch[0]) ? n * 1000 : n;
  }

  const fuel = /diesel/i.test(message) ? "Diesel"
    : /electric|ev/i.test(message) ? "Electric"
    : /cng/i.test(message) ? "CNG"
    : "Petrol";

  const city = /mumbai/i.test(message) ? "Mumbai"
    : /bangalore|bengaluru/i.test(message) ? "Bangalore"
    : /pune/i.test(message) ? "Pune"
    : /hyderabad/i.test(message) ? "Hyderabad"
    : /chennai/i.test(message) ? "Chennai"
    : "Delhi";

  const age = new Date().getFullYear() - year;
  const highMileage = km > 60000;
  const oldModel = age > 4;

  return {
    carName: profile?.name ?? "Your Car",
    year,
    km,
    fuel,
    city,
    priceMin: base.priceMin,
    priceMax: base.priceMax,
    priceEstimate: base.priceEstimate,
    factors: [
      { label: "Single owner",         impact: "positive" },
      { label: highMileage ? "High mileage" : "Low mileage", impact: highMileage ? "negative" : "positive" },
      { label: fuel === "Diesel" ? "Diesel (higher demand)" : fuel === "Petrol" ? "Petrol" : fuel, impact: fuel === "Diesel" ? "positive" : "neutral" },
      { label: oldModel ? "Older model year" : "Recent model", impact: oldModel ? "negative" : "positive" },
      { label: "Original paint",        impact: "positive" },
      { label: "Insurance active",      impact: "neutral" },
    ],
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function streamText(text: string, onEvent: (e: StreamEvent) => void) {
  const tokens = text.split(/(\s+)/);
  for (const tok of tokens) {
    onEvent({ type: "token", content: tok });
    await sleep(15);
  }
}

// Detect if message has enough car detail to show an estimate
function hasSellDetail(m: string) {
  const hasCarName = SELL_CAR_PROFILES.some((p) => p.pattern.test(m));
  const hasYear = /20\d{2}/.test(m);
  const hasKm = /\d+\s*(?:k\b|km|thousand)/i.test(m);
  return hasCarName || hasYear || hasKm;
}

export async function mockStream(message: string, onEvent: (e: StreamEvent) => void) {
  const m = message.toLowerCase();

  const isSell    = /(sell|selling|want to sell|how much.*my car|car.*worth|get.*price)/.test(m);
  const isFinance = /(emi|loan|finance|down\s?payment|tenure)/.test(m);
  const isBuy     = /(buy|looking for|show.*car|swift|honda|hyundai|suv|sedan)/.test(m);

  if (isSell && hasSellDetail(m)) {
    // Has car details — skip to estimate
    await streamText(
      "Based on current market data, here's what your car is worth. Prices vary by condition — a free inspection locks in your final offer.",
      onEvent,
    );
    await sleep(120);
    onEvent({
      type: "tool_result",
      tool: "price_estimate",
      data: buildEstimate(message),
    });

  } else if (isSell) {
    // No details yet — ask conversationally
    await streamText(
      "I can get you an estimate right away! Just tell me: what car do you drive? Share the model, year, and approximate KMs — for example, \"Maruti Swift 2020, 45k km, Delhi\".",
      onEvent,
    );

  } else if (isFinance) {
    await streamText(
      "Sure — here's an EMI calculator for the Honda City ZX. Adjust the sliders to match your budget.",
      onEvent,
    );
    await sleep(120);
    onEvent({ type: "tool_result", tool: "calc_emi", data: { carId: 2, carName: "Honda City ZX", price: 895000 } });

  } else if (isBuy) {
    await streamText(
      "Found a few options that match. Tap any car to learn more or shortlist your favourites.",
      onEvent,
    );
    await sleep(120);
    onEvent({ type: "tool_result", tool: "search_cars", data: MOCK_CARS });

  } else {
    await streamText(
      "I'm your Cars24 assistant — I can help you buy a car, get a price for yours, calculate EMI, or track your Orbit order. What would you like to do?",
      onEvent,
    );
  }

  await sleep(80);
  onEvent({ type: "done" });
}
