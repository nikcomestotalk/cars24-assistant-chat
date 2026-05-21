// ─── Step types ──────────────────────────────────────────────────────────────

export type StepType = "ask" | "api" | "widget" | "message" | "branch";

export interface FieldDef {
  key: string;         // e.g. "car_name"
  label: string;       // e.g. "Car Model"
  type: "text" | "number" | "select" | "date";
  required: boolean;
  options?: string[];  // for select type
  example?: string;    // hint shown to user
  sourceStep?: string; // if auto-filled from a previous step's output
}

export interface ApiParam {
  key: string;         // param name sent to API
  source: "user_input" | "step_output" | "hardcoded";
  fieldKey?: string;   // which user input field (if source=user_input)
  stepId?: string;     // which step's output to pull from (if source=step_output)
  outputKey?: string;  // which key in that step's output
  value?: string;      // hardcoded value
}

export interface FlowStep {
  id: string;
  type: StepType;
  label: string;       // e.g. "Ask for car details"

  // ask
  question?: string;
  fields?: FieldDef[];

  // api
  apiName?: string;    // e.g. "price_estimate", "book_inspection"
  apiEndpoint?: string;
  apiParams?: ApiParam[];
  apiOutputKey?: string; // what key to store the result under

  // widget
  widgetType?: "price_estimate" | "emi_calculator" | "car_cards" | "booking_calendar" | "confirmation";
  widgetDataStep?: string; // which step's output feeds this widget

  // message
  messageTemplate?: string; // can reference {{field}} from collected data

  // branch
  condition?: string;  // e.g. "user_confirms == true"
  branchYes?: string;  // step id to go to if true
  branchNo?: string;   // step id to go to if false

  // shared
  followUpChips?: string[];
  notes?: string;      // internal notes / description

  // visual editor
  nextStepId?: string;               // explicit next step (non-branch)
  position?: { x: number; y: number }; // canvas position
}

// ─── Flow ────────────────────────────────────────────────────────────────────

export interface ConversationFlow {
  id: string;
  name: string;
  description: string;
  icon: string;        // emoji
  color: string;       // tailwind color class for accent
  triggers: string[];  // keywords that start this flow
  steps: FlowStep[];
  dependencies: string[]; // other flow ids this depends on
  apiDependencies: string[]; // external APIs / services required
  status: "draft" | "active" | "archived";
  createdAt: number;
  updatedAt: number;
}

// ─── Seed data ───────────────────────────────────────────────────────────────

export const SEED_FLOWS: ConversationFlow[] = [
  {
    id: "sell_car",
    name: "Sell My Car",
    description: "End-to-end flow for a user who wants to sell their car — estimate → inspection booking → payment",
    icon: "💰",
    color: "green",
    triggers: ["sell", "selling", "want to sell", "car worth", "price of my car"],
    status: "active",
    dependencies: [],
    apiDependencies: ["price_estimate API", "book_inspection API", "RC verification API"],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    steps: [
      {
        id: "ask_car_details",
        type: "ask",
        label: "Ask for car details",
        question: "Which car do you want to sell? Please share the model, year, and approximate KMs driven.",
        fields: [
          { key: "car_name", label: "Car Model", type: "text", required: true, example: "Maruti WagonR VXI" },
          { key: "year", label: "Year of Manufacture", type: "number", required: false, example: "2020" },
          { key: "km", label: "KMs Driven", type: "number", required: false, example: "45000" },
          { key: "city", label: "City", type: "text", required: false, example: "Delhi" },
          { key: "fuel", label: "Fuel Type", type: "select", required: false, options: ["Petrol", "Diesel", "CNG", "Electric"] },
        ],
        notes: "Year and KMs are optional — if missing, use typical defaults and show hasDefaults=true warning",
      },
      {
        id: "fetch_estimate",
        type: "api",
        label: "Fetch price estimate",
        apiName: "price_estimate",
        apiEndpoint: "/api/price-estimate",
        apiParams: [
          { key: "car_name", source: "user_input", fieldKey: "car_name" },
          { key: "year", source: "user_input", fieldKey: "year" },
          { key: "km", source: "user_input", fieldKey: "km" },
          { key: "city", source: "user_input", fieldKey: "city" },
          { key: "fuel", source: "user_input", fieldKey: "fuel" },
        ],
        apiOutputKey: "price_estimate_result",
        notes: "Returns priceMin, priceMax, priceEstimate, factors[]",
      },
      {
        id: "show_estimate",
        type: "widget",
        label: "Show price estimate widget",
        widgetType: "price_estimate",
        widgetDataStep: "fetch_estimate",
        followUpChips: ["Book free inspection", "How to improve my price?", "Documents needed", "What happens next?"],
      },
      {
        id: "ask_inspection",
        type: "ask",
        label: "Ask if user wants inspection",
        question: "Would you like to book a free doorstep inspection? A Cars24 expert will visit you and give a final offer.",
        fields: [
          { key: "wants_inspection", label: "Book inspection?", type: "select", required: true, options: ["Yes, book it", "Not now"] },
        ],
      },
      {
        id: "ask_slot",
        type: "ask",
        label: "Ask for preferred time slot",
        question: "When would you like the inspection? Please share your preferred date and time.",
        fields: [
          { key: "inspection_date", label: "Preferred Date", type: "date", required: true },
          { key: "inspection_time", label: "Preferred Time", type: "select", required: true, options: ["9 AM–11 AM", "11 AM–1 PM", "2 PM–4 PM", "4 PM–6 PM"] },
          { key: "address", label: "Pickup Address", type: "text", required: true, example: "123 Main St, Delhi" },
        ],
      },
      {
        id: "book_inspection",
        type: "api",
        label: "Book inspection appointment",
        apiName: "book_inspection",
        apiEndpoint: "/api/book-inspection",
        apiParams: [
          { key: "car_name", source: "step_output", stepId: "ask_car_details", outputKey: "car_name" },
          { key: "date", source: "user_input", fieldKey: "inspection_date" },
          { key: "time_slot", source: "user_input", fieldKey: "inspection_time" },
          { key: "address", source: "user_input", fieldKey: "address" },
          { key: "estimated_price", source: "step_output", stepId: "fetch_estimate", outputKey: "priceEstimate" },
        ],
        apiOutputKey: "booking_result",
        notes: "Returns booking_id, confirmed_slot, executive_name, contact_number",
      },
      {
        id: "show_confirmation",
        type: "widget",
        label: "Show booking confirmation",
        widgetType: "confirmation",
        widgetDataStep: "book_inspection",
        followUpChips: ["Documents needed", "How to prepare for inspection?", "Cancel/Reschedule"],
        notes: "Show booking ID, executive name, slot time. Also show what happens next (30-min inspection → offer → payment in 30 min)",
      },
    ],
  },
  {
    id: "buy_car",
    name: "Buy a Used Car",
    description: "Help user find, shortlist, and finance a used car",
    icon: "🚗",
    color: "blue",
    triggers: ["buy", "looking for", "find a car", "show cars", "used car"],
    status: "active",
    dependencies: ["emi_calculator"],
    apiDependencies: ["search_cars API", "calc_emi API", "Cars24 inventory API"],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    steps: [
      {
        id: "ask_preferences",
        type: "ask",
        label: "Ask for car preferences",
        question: "What kind of car are you looking for?",
        fields: [
          { key: "budget", label: "Budget (₹)", type: "number", required: false, example: "800000" },
          { key: "body_type", label: "Body Type", type: "select", required: false, options: ["Hatchback", "Sedan", "SUV", "MUV", "Any"] },
          { key: "fuel", label: "Fuel Type", type: "select", required: false, options: ["Petrol", "Diesel", "CNG", "Electric", "Any"] },
          { key: "city", label: "City", type: "text", required: false, example: "Mumbai" },
        ],
      },
      {
        id: "search_cars",
        type: "api",
        label: "Search inventory",
        apiName: "search_cars",
        apiEndpoint: "/api/search-cars",
        apiParams: [
          { key: "budget_max", source: "user_input", fieldKey: "budget" },
          { key: "body_type", source: "user_input", fieldKey: "body_type" },
          { key: "fuel", source: "user_input", fieldKey: "fuel" },
          { key: "city", source: "user_input", fieldKey: "city" },
        ],
        apiOutputKey: "car_results",
      },
      {
        id: "show_cars",
        type: "widget",
        label: "Show car listings",
        widgetType: "car_cards",
        widgetDataStep: "search_cars",
        followUpChips: ["Compare these", "Calculate EMI", "Filter by diesel", "Show cheaper options"],
      },
    ],
  },
  {
    id: "emi_calculator",
    name: "EMI Calculator",
    description: "Calculate loan EMI for a specific car",
    icon: "🧮",
    color: "purple",
    triggers: ["emi", "loan", "finance", "monthly payment", "down payment"],
    status: "active",
    dependencies: [],
    apiDependencies: ["calc_emi API", "loan eligibility API"],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    steps: [
      {
        id: "ask_car_price",
        type: "ask",
        label: "Ask which car",
        question: "Which car would you like to calculate EMI for?",
        fields: [
          { key: "car_name", label: "Car Name", type: "text", required: true, example: "Honda City ZX" },
          { key: "price", label: "Car Price (₹)", type: "number", required: true, example: "895000" },
        ],
      },
      {
        id: "show_emi",
        type: "widget",
        label: "Show EMI calculator",
        widgetType: "emi_calculator",
        widgetDataStep: "ask_car_price",
        followUpChips: ["Apply for loan", "Lower the down payment", "Show me similar cars"],
      },
    ],
  },
];
