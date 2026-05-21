import type { SellEstimateData } from "./SellEstimateWidget";

type HistoryMessage = { role: "user" | "assistant"; content: string; type: string };

export type StreamEvent =
  | { type: "token"; content: string }
  | { type: "tool_result"; tool: "search_cars" | "calc_emi" | "price_estimate" | "price_card" | "slot_picker" | "otp_input" | "confirmation"; data: any }
  | { type: "done"; followUps?: string[] };

export const MOCK_CARS = [
  { id: 1, name: "Maruti Swift VXI",   year: 2021, km: 32000, fuel: "Petrol", price: 595000,  image: null as string | null },
  { id: 2, name: "Honda City ZX",      year: 2020, km: 45000, fuel: "Petrol", price: 895000,  image: null as string | null },
  { id: 3, name: "Hyundai i20 Asta",   year: 2022, km: 18000, fuel: "Petrol", price: 785000,  image: null as string | null },
  { id: 4, name: "Maruti Baleno Alpha",year: 2021, km: 28000, fuel: "Petrol", price: 665000,  image: null as string | null },
  { id: 5, name: "Tata Nexon XZ+",     year: 2022, km: 21000, fuel: "Petrol", price: 910000,  image: null as string | null },
];

const SELL_CAR_PROFILES: Array<{
  pattern: RegExp;
  name: string;
  priceMin: number;
  priceMax: number;
  priceEstimate: number;
}> = [
  { pattern: /wagon\s*r/i,   name: "Maruti WagonR VXI",    priceMin: 310000, priceMax: 490000, priceEstimate: 405000 },
  { pattern: /alto/i,        name: "Maruti Alto K10",       priceMin: 200000, priceMax: 340000, priceEstimate: 275000 },
  { pattern: /dzire/i,       name: "Maruti Dzire ZXI",      priceMin: 410000, priceMax: 610000, priceEstimate: 510000 },
  { pattern: /swift/i,       name: "Maruti Swift VXi",      priceMin: 380000, priceMax: 560000, priceEstimate: 475000 },
  { pattern: /baleno/i,      name: "Maruti Baleno Alpha",   priceMin: 490000, priceMax: 710000, priceEstimate: 610000 },
  { pattern: /ertiga/i,      name: "Maruti Ertiga ZXI",     priceMin: 580000, priceMax: 840000, priceEstimate: 710000 },
  { pattern: /brezza/i,      name: "Maruti Brezza ZXI",     priceMin: 670000, priceMax: 980000, priceEstimate: 840000 },
  { pattern: /i20/i,         name: "Hyundai i20 Asta",      priceMin: 520000, priceMax: 770000, priceEstimate: 650000 },
  { pattern: /creta/i,       name: "Hyundai Creta SX",      priceMin: 780000, priceMax: 1150000, priceEstimate: 960000 },
  { pattern: /venue/i,       name: "Hyundai Venue SX",      priceMin: 640000, priceMax: 920000, priceEstimate: 780000 },
  { pattern: /verna/i,       name: "Hyundai Verna SX",      priceMin: 560000, priceMax: 830000, priceEstimate: 700000 },
  { pattern: /city/i,        name: "Honda City ZX",         priceMin: 620000, priceMax: 900000, priceEstimate: 760000 },
  { pattern: /amaze/i,       name: "Honda Amaze VX",        priceMin: 460000, priceMax: 660000, priceEstimate: 560000 },
  { pattern: /nexon/i,       name: "Tata Nexon XZ+",        priceMin: 710000, priceMax: 1060000, priceEstimate: 880000 },
  { pattern: /punch/i,       name: "Tata Punch Creative",   priceMin: 560000, priceMax: 810000, priceEstimate: 690000 },
  { pattern: /altroz/i,      name: "Tata Altroz XZ",        priceMin: 490000, priceMax: 730000, priceEstimate: 620000 },
  { pattern: /innova/i,      name: "Toyota Innova Crysta",  priceMin: 1100000, priceMax: 1700000, priceEstimate: 1380000 },
  { pattern: /fortuner/i,    name: "Toyota Fortuner",       priceMin: 2200000, priceMax: 3100000, priceEstimate: 2650000 },
  { pattern: /scorpio/i,     name: "Mahindra Scorpio",      priceMin: 690000, priceMax: 1050000, priceEstimate: 860000 },
  { pattern: /xuv\s*700/i,   name: "Mahindra XUV700 AX7",  priceMin: 1500000, priceMax: 2100000, priceEstimate: 1780000 },
  { pattern: /xuv/i,         name: "Mahindra XUV300",       priceMin: 610000, priceMax: 890000, priceEstimate: 750000 },
];

function buildEstimate(message: string): SellEstimateData & { hasDefaults: boolean } {
  const profile = SELL_CAR_PROFILES.find((p) => p.pattern.test(message));
  const base = profile ?? { name: "Your Car", priceMin: 380000, priceMax: 620000, priceEstimate: 500000 };

  const yearMatch = message.match(/20\d{2}/);
  const year = yearMatch ? parseInt(yearMatch[0]) : 2021;

  const kmMatch = message.match(/(\d+)\s*(?:k\b|km|thousand)/i);
  let km = 42000;
  if (kmMatch) {
    const n = parseInt(kmMatch[1]);
    km = /k\b|thousand/i.test(kmMatch[0]) ? n * 1000 : n;
  }
  const hasDefaults = !yearMatch && !kmMatch;

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
    hasDefaults,
    factors: [
      { label: "Single owner",                                               impact: "positive" },
      { label: highMileage ? "High mileage" : "Low mileage",                impact: highMileage ? "negative" : "positive" },
      { label: fuel === "Diesel" ? "Diesel (high demand)" : fuel,           impact: fuel === "Diesel" ? "positive" : "neutral" },
      { label: oldModel ? "Older model year" : "Recent model",              impact: oldModel ? "negative" : "positive" },
      { label: "Original paint",                                             impact: "positive" },
      { label: "Insurance active",                                           impact: "neutral" },
    ],
  };
}

// Returns true if the message has enough detail to generate an estimate.
// A car name alone is sufficient — year/KMs refine but aren't required.
function hasSellDetail(m: string) {
  return (
    SELL_CAR_PROFILES.some((p) => p.pattern.test(m)) ||
    /20\d{2}/.test(m) ||
    /\d+\s*(?:k\b|km|thousand)/i.test(m)
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function streamText(text: string, onEvent: (e: StreamEvent) => void) {
  for (const tok of text.split(/(\s+)/)) {
    onEvent({ type: "token", content: tok });
    await sleep(15);
  }
}

// Scan recent history to extract sell context
function sellContextFromHistory(history: HistoryMessage[]): {
  inSellFlow: boolean;
  carMessage: string | null;
} {
  const recent = history.slice(-10);
  const inSellFlow =
    recent.some((h) => h.type === "price_estimate") ||
    recent.some(
      (h) => h.role === "user" && /(sell|selling|want to sell)/.test(h.content.toLowerCase()),
    );
  const carMessage =
    [...recent].reverse().find(
      (h) => h.role === "user" && SELL_CAR_PROFILES.some((p) => p.pattern.test(h.content)),
    )?.content ?? null;
  return { inSellFlow, carMessage };
}

export async function mockStream(
  message: string,
  history: HistoryMessage[],
  onEvent: (e: StreamEvent) => void,
) {
  const m = message.toLowerCase();

  // Intent flags
  const isSell       = /(sell|selling|want to sell|how much.*my car|car.*worth|get.*price)/.test(m);
  const isFinance    = /(emi|loan|finance|down\s?payment|tenure)/.test(m);
  const isBuy        = /(buy|looking for|show.*car|swift|honda|hyundai|suv|sedan|cheaper|compare|find.*car|replace)/.test(m);
  const isInspection = /(book|inspection|schedule|appointment)/.test(m);
  const isImprove    = /(improve|better.*price|tip|maximiz|higher price)/.test(m);
  const isDocs       = /(document|docs?|papers?|rc|what.*need|required)/.test(m);

  // --- Context-aware: refining a previous sell estimate ---
  const { inSellFlow, carMessage } = sellContextFromHistory(history);
  const hasNewDetail = /20\d{2}/.test(m) || /\d+\s*(?:k\b|km|thousand)/i.test(m);
  const isRefinement = !isSell && inSellFlow && hasNewDetail;

  if (isRefinement) {
    const combined = carMessage ? `${carMessage} ${message}` : message;
    const estimate = buildEstimate(combined);
    await streamText(
      `Got it! Here's a refined estimate for your ${estimate.carName} with those details.`,
      onEvent,
    );
    await sleep(120);
    onEvent({ type: "tool_result", tool: "price_estimate", data: { ...estimate, hasDefaults: false } });
    await sleep(80);
    onEvent({ type: "done", followUps: ["Book free inspection", "How to improve my price?", "Documents needed"] });
    return;
  }

  let followUps: string[] = [];

  if (isDocs) {
    await streamText(
      "Here are the documents you'll need to sell your car on Cars24:\n\n" +
      "• Original RC (Registration Certificate)\n" +
      "• Valid insurance certificate\n" +
      "• PAN card (for payment)\n" +
      "• Aadhaar card\n" +
      "• Service history (optional but improves price)\n" +
      "• NOC if car is from another state\n\n" +
      "Cars24 handles the RC transfer — no need to visit the RTO yourself.",
      onEvent,
    );
    followUps = ["Book free inspection", "How to improve my price?", "Find my next car"];

  } else if (isImprove) {
    await streamText(
      "Here are the top ways to improve your sale price:\n\n" +
      "• Get a professional wash and interior clean (+₹5,000–15,000)\n" +
      "• Fix minor dents and scratches before inspection\n" +
      "• Have a full service done — shows maintenance history\n" +
      "• Gather all service records — documented care adds trust\n" +
      "• Make sure insurance is active and not expired\n" +
      "• Selling in Oct–Feb gets 5–8% higher prices (wedding season demand)\n\n" +
      "A clean, well-documented car can fetch up to ₹30,000 more.",
      onEvent,
    );
    followUps = ["Book free inspection", "Documents needed", "Find my next car"];

  } else if (isInspection) {
    await streamText(
      "Great choice! Here's how the free inspection works:\n\n" +
      "1. Pick a slot — a Cars24 executive visits your location\n" +
      "2. 30-minute inspection covering engine, body, electricals\n" +
      "3. You get a firm offer on the spot\n" +
      "4. Accept → payment in 30 minutes, RC transfer handled by us\n\n" +
      "Slots available today and tomorrow. Tap the button in the estimate card above to book.",
      onEvent,
    );
    followUps = ["Documents needed", "How to improve my price?", "Find my next car"];

  } else if (isSell && hasSellDetail(m)) {
    const estimate = buildEstimate(message);
    const prefix = estimate.hasDefaults
      ? `Here's a market estimate for your ${estimate.carName}. I've used typical values — share the year and KMs to refine it.`
      : `Based on current market data, here's what your ${estimate.carName} is worth. A free inspection locks in your final offer.`;
    await streamText(prefix, onEvent);
    await sleep(120);
    onEvent({ type: "tool_result", tool: "price_estimate", data: estimate });
    followUps = estimate.hasDefaults
      ? ["Share year and KMs", "Book free inspection", "How to improve my price?"]
      : ["Book free inspection", "Documents needed", "How to improve my price?"];

  } else if (isSell) {
    await streamText(
      "I can get you an estimate right away! What car do you drive? Share the model, year, and approximate KMs — for example: \"WagonR 2020, 45k km, Delhi\".",
      onEvent,
    );
    followUps = ["WagonR 2020, 45k km", "Swift 2019, 60k km", "Creta 2021, 30k km"];

  } else if (isFinance) {
    await streamText(
      "Sure — here's an EMI calculator for the Honda City ZX. Adjust the sliders to match your budget.",
      onEvent,
    );
    await sleep(120);
    onEvent({ type: "tool_result", tool: "calc_emi", data: { carId: 2, carName: "Honda City ZX", price: 895000 } });
    followUps = ["Lower the down payment", "Show cheaper options", "Apply for loan"];

  } else if (isBuy) {
    await streamText(
      "Found a few options that match. Tap any car to learn more or shortlist your favourites.",
      onEvent,
    );
    await sleep(120);
    onEvent({ type: "tool_result", tool: "search_cars", data: MOCK_CARS });
    followUps = ["Compare these cars", "Calculate EMI", "Show diesel options"];

  } else {
    await streamText(
      "I'm your Cars24 assistant — I can help you buy a car, get a price for yours, calculate EMI, or book a free inspection. What would you like to do?",
      onEvent,
    );
    followUps = ["Buy a used car", "Sell my car", "Calculate loan EMI"];
  }

  await sleep(80);
  onEvent({ type: "done", followUps });
}
