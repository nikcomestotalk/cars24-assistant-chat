import type { WorkflowDefinition, CollectedData } from "../types";
import { valuationApi } from "../adapters/valuationApi";
import { otpApi } from "../adapters/otpApi";
import { slotsApi } from "../adapters/slotsApi";
import { bookingApi } from "../adapters/bookingApi";

export const sellCarFlow: WorkflowDefinition = {
  id: "sell_car",
  name: "Sell My Car",
  triggerPhrases: [
    "sell", "selling", "want to sell", "sell my car",
    "car worth", "price of my car", "how much for my car",
    "inspection", "car valuation",
  ],
  firstStep: "collect_car_model",

  steps: {
    // ── Step 1: Car model ───────────────────────────────────────────────────
    collect_car_model: {
      id: "collect_car_model",
      prompt: "I'd love to help you sell your car! Which car would you like to sell? (Make and model, e.g. Maruti WagonR, Honda City)",
      requiredEntities: ["car_model"],
      entitySchema: {
        car_model: {
          type: "string",
          required: true,
          description: "Car make and model. Examples: Maruti WagonR, Honda City, Hyundai Creta",
          example: "Maruti WagonR",
        },
        year: {
          type: "number",
          required: false,
          description: "Year of manufacture between 2000–2025",
          example: "2019",
        },
        fuel_type: {
          type: "enum",
          required: false,
          options: ["Petrol", "Diesel", "CNG", "Electric"],
          description: "Fuel type if mentioned",
        },
      },
      nextStep: (data: CollectedData) => {
        if (data.year && data.fuel_type) return "collect_km";
        if (data.year) return "collect_fuel_type";
        return "collect_year";
      },
    },

    // ── Step 2: Year ────────────────────────────────────────────────────────
    collect_year: {
      id: "collect_year",
      prompt: "What year was your {{car_model}} manufactured?",
      requiredEntities: ["year"],
      entitySchema: {
        year: {
          type: "number",
          required: true,
          description: "Year of manufacture between 2000 and 2025",
          example: "2019",
        },
      },
      validate: (data: CollectedData) => {
        const y = Number(data.year);
        if (isNaN(y) || y < 2000 || y > 2025) return "Please share a valid year between 2000 and 2025.";
        return true;
      },
      nextStep: "collect_fuel_type",
    },

    // ── Step 3: Fuel type ───────────────────────────────────────────────────
    collect_fuel_type: {
      id: "collect_fuel_type",
      prompt: "Is your {{car_model}} ({{year}}) petrol, diesel, CNG, or electric?",
      requiredEntities: ["fuel_type"],
      entitySchema: {
        fuel_type: {
          type: "enum",
          required: true,
          options: ["Petrol", "Diesel", "CNG", "Electric"],
          description: "Fuel type of the car",
        },
      },
      nextStep: "collect_km",
    },

    // ── Step 4: Kilometres ──────────────────────────────────────────────────
    collect_km: {
      id: "collect_km",
      prompt: "Approximately how many kilometres has your car been driven?",
      requiredEntities: ["km_driven"],
      entitySchema: {
        km_driven: {
          type: "number",
          required: true,
          description: "Total kilometres driven. Number only, e.g. 45000",
          example: "45000",
        },
      },
      validate: (data: CollectedData) => {
        const km = Number(data.km_driven);
        if (isNaN(km) || km < 0 || km > 500000) return "Please share a valid kilometre reading (0–5,00,000).";
        return true;
      },
      nextStep: "collect_city",
    },

    // ── Step 5: City ────────────────────────────────────────────────────────
    collect_city: {
      id: "collect_city",
      prompt: "Which city are you in? This helps us find the best price for your area.",
      requiredEntities: ["city"],
      entitySchema: {
        city: {
          type: "string",
          required: true,
          description: "Indian city name, e.g. Delhi, Mumbai, Bangalore",
          example: "Delhi",
        },
      },
      nextStep: "fetch_valuation",
    },

    // ── Step 6: Fetch valuation (API) ───────────────────────────────────────
    fetch_valuation: {
      id: "fetch_valuation",
      prompt: "Calculating the best price for your car…",
      requiredEntities: [],
      entitySchema: {},
      apiCall: valuationApi,
      nextStep: "show_price",
    },

    // ── Step 7: Show price + offer inspection ───────────────────────────────
    show_price: {
      id: "show_price",
      prompt: "Your {{car_model}} ({{year}}, {{fuel_type}}, {{km_driven}} km) is estimated at ₹{{priceMin}}L–₹{{priceMax}}L. Would you like to book a free doorstep inspection to get a final confirmed offer?",
      uiComponent: "price_card",
      requiredEntities: ["wants_inspection"],
      entitySchema: {
        wants_inspection: {
          type: "boolean",
          required: true,
          description: "Whether the user wants to book an inspection. True if yes/ok/sure, false if no/later/skip",
        },
      },
      nextStep: (data: CollectedData) => data.wants_inspection ? "collect_phone" : "decline_inspection",
    },

    // ── Terminal: Declined inspection ────────────────────────────────────────
    decline_inspection: {
      id: "decline_inspection",
      prompt: "No problem! Your estimated value is ₹{{priceMin}}L–₹{{priceMax}}L. Whenever you're ready to sell, just come back and we'll get you a confirmed offer.",
      requiredEntities: [],
      entitySchema: {},
      nextStep: null,
      isTerminal: true,
    },

    // ── Step 8: Collect phone number ────────────────────────────────────────
    collect_phone: {
      id: "collect_phone",
      prompt: "To book your inspection, please share your mobile number.",
      requiredEntities: ["phone_number"],
      entitySchema: {
        phone_number: {
          type: "string",
          required: true,
          description: "10-digit Indian mobile number starting with 6, 7, 8, or 9",
          example: "9876543210",
        },
      },
      validate: (data: CollectedData) => {
        const phone = String(data.phone_number ?? "").replace(/\s/g, "");
        if (!/^[6-9]\d{9}$/.test(phone)) return "Please provide a valid 10-digit Indian mobile number.";
        return true;
      },
      apiCall: otpApi.send,
      nextStep: (_, apiResult) =>
        apiResult?.success ? "verify_otp" : "collect_phone",
      uiComponent: "otp_input",
    },

    // ── Step 9: OTP verification ────────────────────────────────────────────
    verify_otp: {
      id: "verify_otp",
      prompt: "I've sent a 6-digit OTP to {{phone_number}}. Please enter it to confirm.",
      requiredEntities: ["otp_code"],
      entitySchema: {
        otp_code: {
          type: "string",
          required: true,
          description: "6-digit OTP code sent to the user's mobile",
          example: "123456",
        },
      },
      apiCall: otpApi.verify,
      nextStep: (_, apiResult) =>
        apiResult?.success ? "fetch_slots" : "verify_otp",
      uiComponent: "otp_input",
    },

    // ── Step 10a: Fetch available slots (auto-advance) ──────────────────────
    fetch_slots: {
      id: "fetch_slots",
      prompt: "Fetching available slots…",
      requiredEntities: [],
      entitySchema: {},
      apiCall: slotsApi,
      nextStep: "select_slot",
    },

    // ── Step 10b: Slot selection ────────────────────────────────────────────
    select_slot: {
      id: "select_slot",
      prompt: "Phone verified! Please choose a convenient inspection slot:",
      requiredEntities: ["selected_slot"],
      entitySchema: {
        selected_slot: {
          type: "string",
          required: true,
          description: "The chosen inspection slot, e.g. 'Tomorrow, 9 AM – 11 AM'",
        },
      },
      nextStep: "book_inspection",
      uiComponent: "slot_picker",
    },

    // ── Step 11: Book inspection (API) ──────────────────────────────────────
    book_inspection: {
      id: "book_inspection",
      prompt: "Booking your inspection…",
      requiredEntities: [],
      entitySchema: {},
      apiCall: bookingApi,
      nextStep: "show_confirmation",
      uiComponent: "confirmation",
    },

    // ── Step 12: Confirmation (terminal) ────────────────────────────────────
    show_confirmation: {
      id: "show_confirmation",
      prompt: "Your inspection is confirmed! A Cars24 expert will visit you at {{selected_slot}}. Booking ID: {{bookingId}}.",
      requiredEntities: [],
      entitySchema: {},
      nextStep: null,
      isTerminal: true,
      uiComponent: "confirmation",
    },
  },
};
