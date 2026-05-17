export type StreamEvent =
  | { type: "token"; content: string }
  | { type: "tool_result"; tool: "search_cars" | "calc_emi"; data: any }
  | { type: "done" };

export const MOCK_CARS = [
  { id: 1, name: "Maruti Swift VXI", year: 2021, km: 32000, fuel: "Petrol", price: 595000, image: null as string | null },
  { id: 2, name: "Honda City ZX", year: 2020, km: 45000, fuel: "Petrol", price: 895000, image: null as string | null },
  { id: 3, name: "Hyundai i20 Asta", year: 2022, km: 18000, fuel: "Petrol", price: 785000, image: null as string | null },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function streamText(text: string, onEvent: (e: StreamEvent) => void) {
  const tokens = text.split(/(\s+)/);
  for (const tok of tokens) {
    onEvent({ type: "token", content: tok });
    await sleep(15);
  }
}

export async function mockStream(message: string, onEvent: (e: StreamEvent) => void) {
  const m = message.toLowerCase();
  const buy = /(buy|car|swift|honda|hyundai|suv|sedan|show)/.test(m);
  const finance = /(emi|loan|finance|down\s?payment|tenure)/.test(m);

  if (finance) {
    await streamText("Sure — here's an EMI calculator for the Honda City ZX. Adjust the sliders to match your budget.", onEvent);
    await sleep(120);
    onEvent({
      type: "tool_result",
      tool: "calc_emi",
      data: { carId: 2, carName: "Honda City ZX", price: 895000 },
    });
  } else if (buy) {
    await streamText("Found a few options that match. Tap any car to learn more or shortlist your favourites.", onEvent);
    await sleep(120);
    onEvent({ type: "tool_result", tool: "search_cars", data: MOCK_CARS });
  } else {
    await streamText(
      "I'm your Cars24 assistant — I can help you buy a car, sell yours, calculate EMI, or track your Orbit order. What would you like to do?",
      onEvent,
    );
  }
  await sleep(80);
  onEvent({ type: "done" });
}