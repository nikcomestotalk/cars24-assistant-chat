import { useCallback, useEffect, useRef, useState } from "react";

export type JourneyStage = "researching" | "buying" | "owning" | "re-selling";

export interface BehaviorState {
  journeyStage: JourneyStage;
  recentSearches: string[];
  budgetMax: number | null;
  fuelPreference: string | null;
  bodyTypePreference: string | null;
  viewedCarNames: string[];
  sessionCount: number;
  isReturnUser: boolean;
  lastVisit: number | null;
}

const STORAGE_KEY = "cars24_behavior";

function load(): Partial<BehaviorState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persist(state: BehaviorState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function inferStage(text: string, current: JourneyStage): JourneyStage {
  const t = text.toLowerCase();
  if (/sell\b|selling|how much.*my car|car.*worth|price.*my car/.test(t)) return "re-selling";
  if (/\bmy car\b|service|maintenance|repair|insurance.*my|warranty|orbit|subscription/.test(t)) return "owning";
  if (/shortlist|compare|emi|loan|finance|down payment|book.*test/.test(t)) return "buying";
  return current;
}

function extractBudget(text: string): number | null {
  const match = text.match(
    /(?:under|below|within|upto|up to|max|budget.*?)\s*(?:₹\s*)?(\d+(?:\.\d+)?)\s*(?:l(?:akh)?|lac)/i,
  );
  if (match) {
    const n = parseFloat(match[1]);
    if (n > 0 && n < 200) return Math.round(n * 100000);
  }
  return null;
}

function extractFuel(text: string): string | null {
  if (/\belectric\b|\bev\b/i.test(text)) return "Electric";
  if (/\bdiesel\b/i.test(text)) return "Diesel";
  if (/\bcng\b/i.test(text)) return "CNG";
  if (/\bpetrol\b/i.test(text)) return "Petrol";
  return null;
}

function extractBodyType(text: string): string | null {
  if (/\bsuv\b/i.test(text)) return "SUV";
  if (/\bsedan\b/i.test(text)) return "Sedan";
  if (/\bhatchback\b/i.test(text)) return "Hatchback";
  if (/\bmuv\b|\bmpv\b/i.test(text)) return "MUV";
  return null;
}

export function useUserBehavior(shortlistedCount: number) {
  const [state, setState] = useState<BehaviorState>({
    journeyStage: "researching",
    recentSearches: [],
    budgetMax: null,
    fuelPreference: null,
    bodyTypePreference: null,
    viewedCarNames: [],
    sessionCount: 1,
    isReturnUser: false,
    lastVisit: null,
  });

  const hydratedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = load();
    const sessionCount = (saved.sessionCount ?? 0) + 1;
    const isReturnUser = (saved.sessionCount ?? 0) >= 1;
    const next: BehaviorState = {
      journeyStage: saved.journeyStage ?? "researching",
      recentSearches: saved.recentSearches ?? [],
      budgetMax: saved.budgetMax ?? null,
      fuelPreference: saved.fuelPreference ?? null,
      bodyTypePreference: saved.bodyTypePreference ?? null,
      viewedCarNames: saved.viewedCarNames ?? [],
      sessionCount,
      isReturnUser,
      lastVisit: saved.lastVisit ?? null,
    };
    setState(next);
    persist({ ...next, lastVisit: Date.now() });
    hydratedRef.current = true;
  }, []);

  // Buying signal when shortlist grows
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (shortlistedCount >= 2) {
      setState((prev) => {
        if (prev.journeyStage !== "researching") return prev;
        const next = { ...prev, journeyStage: "buying" as JourneyStage };
        persist(next);
        return next;
      });
    }
  }, [shortlistedCount]);

  const trackMessage = useCallback((text: string) => {
    if (!text.trim()) return;
    setState((prev) => {
      const journeyStage = inferStage(text, prev.journeyStage);
      const budgetMax = extractBudget(text) ?? prev.budgetMax;
      const fuelPreference = extractFuel(text) ?? prev.fuelPreference;
      const bodyTypePreference = extractBodyType(text) ?? prev.bodyTypePreference;
      const recentSearches = [
        text.slice(0, 70),
        ...prev.recentSearches.filter((s) => s !== text.slice(0, 70)),
      ].slice(0, 6);
      const next = { ...prev, journeyStage, budgetMax, fuelPreference, bodyTypePreference, recentSearches };
      persist(next);
      return next;
    });
  }, []);

  const trackCarView = useCallback((carName: string) => {
    setState((prev) => {
      const viewedCarNames = [
        carName,
        ...prev.viewedCarNames.filter((n) => n !== carName),
      ].slice(0, 10);
      const next = { ...prev, viewedCarNames };
      persist(next);
      return next;
    });
  }, []);

  const resetBehavior = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setState({
      journeyStage: "researching",
      recentSearches: [],
      budgetMax: null,
      fuelPreference: null,
      bodyTypePreference: null,
      viewedCarNames: [],
      sessionCount: 1,
      isReturnUser: false,
      lastVisit: null,
    });
  }, []);

  return { ...state, trackMessage, trackCarView, resetBehavior };
}
