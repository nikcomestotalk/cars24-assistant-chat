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

  // ask (also usable on widget steps that collect input)
  question?: string;
  fields?: FieldDef[];
  skipIfPresent?: string[];   // skip this step if all these entity keys are already collected
  validateAnyOf?: string[];   // at least one of these field keys must be present

  // api callback on ask completion (e.g. send OTP after collecting phone)
  apiOnComplete?: string;   // API name to call after entities collected
  onSuccessStep?: string;   // step id if API succeeds
  onFailStep?: string;      // step id if API fails (defaults to current step)

  // api
  apiName?: string;    // e.g. "price_estimate", "book_inspection"
  apiEndpoint?: string;
  apiParams?: ApiParam[];
  apiOutputKey?: string; // what key to store the result under

  // widget
  widgetType?: "price_estimate" | "emi_calculator" | "car_cards" | "booking_calendar" | "confirmation" | "otp_input" | "slot_picker";
  widgetDataStep?: string; // which step's output feeds this widget

  // message
  messageTemplate?: string; // can reference {{field}} from collected data

  // branch
  condition?: string;  // e.g. "wants_inspection" or "field == 'value'"
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
    description: "End-to-end flow: collect car details → price estimate → inspection booking → OTP verification → slot selection → confirmation",
    icon: "💰",
    color: "green",
    triggers: ["sell", "selling", "want to sell", "car worth", "price of my car", "how much for my car", "inspection", "car valuation"],
    status: "active",
    dependencies: [],
    apiDependencies: ["price_estimate", "send_otp", "verify_otp", "fetch_slots", "book_inspection"],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    steps: [
      {
        id: "collect_car_or_rc",
        type: "ask",
        label: "Ask for car name or RC number",
        question: "Which car would you like to sell? You can type the car name (e.g. Maruti Swift, Honda City) or share your RC number (e.g. MH02AB1234) and we'll fetch the details automatically.",
        fields: [
          { key: "car_model", label: "Car Name", type: "text", required: false, example: "Maruti WagonR" },
          { key: "rc_number", label: "RC Number", type: "text", required: false, example: "MH02AB1234" },
        ],
        validateAnyOf: ["car_model", "rc_number"],
        nextStepId: "check_rc_or_model",
      },
      {
        id: "check_rc_or_model",
        type: "branch",
        label: "RC or manual?",
        condition: "rc_number",
        branchYes: "fetch_rc_details",
        branchNo: "collect_year",
      },
      {
        id: "fetch_rc_details",
        type: "api",
        label: "Fetch RC details",
        apiName: "rc_lookup",
        apiOutputKey: "rc_result",
        nextStepId: "collect_year",
        notes: "Returns car_model and city from RC number. Year, fuel, km still collected manually.",
      },
      {
        id: "collect_year",
        type: "ask",
        label: "Ask for year",
        question: "What year was your {{car_model}} manufactured?",
        fields: [{ key: "year", label: "Year", type: "number", required: true, example: "2019" }],
        skipIfPresent: ["year"],
        nextStepId: "collect_fuel_type",
      },
      {
        id: "collect_fuel_type",
        type: "ask",
        label: "Ask for fuel type",
        question: "Is your {{car_model}} ({{year}}) petrol, diesel, CNG, or electric?",
        fields: [{ key: "fuel_type", label: "Fuel Type", type: "select", required: true, options: ["Petrol", "Diesel", "CNG", "Electric"] }],
        skipIfPresent: ["fuel_type"],
        nextStepId: "collect_km",
      },
      {
        id: "collect_km",
        type: "ask",
        label: "Ask for km driven",
        question: "Approximately how many kilometres has your car been driven?",
        fields: [{ key: "km_driven", label: "KMs Driven", type: "number", required: true, example: "45000" }],
        nextStepId: "collect_city",
      },
      {
        id: "collect_city",
        type: "ask",
        label: "Ask for city",
        question: "Which city are you in? This helps us find the best price for your area.",
        fields: [{ key: "city", label: "City", type: "text", required: true, example: "Delhi" }],
        skipIfPresent: ["city"],
        nextStepId: "fetch_valuation",
      },
      {
        id: "fetch_valuation",
        type: "api",
        label: "Fetch valuation",
        apiName: "price_estimate",
        apiEndpoint: "/api/price-estimate",
        apiParams: [
          { key: "car_name", source: "user_input", fieldKey: "car_model" },
          { key: "year", source: "user_input", fieldKey: "year" },
          { key: "km", source: "user_input", fieldKey: "km_driven" },
          { key: "city", source: "user_input", fieldKey: "city" },
          { key: "fuel", source: "user_input", fieldKey: "fuel_type" },
        ],
        apiOutputKey: "valuation_result",
        nextStepId: "show_price",
      },
      {
        id: "show_price",
        type: "widget",
        label: "Show price card + ask inspection",
        widgetType: "price_estimate",
        widgetDataStep: "fetch_valuation",
        question: "Your {{car_model}} ({{year}}, {{fuel_type}}, {{km_driven}} km) is estimated at ₹{{priceMin}}L–₹{{priceMax}}L. Would you like to book a free doorstep inspection to get a final confirmed offer?",
        fields: [{ key: "wants_inspection", label: "Book inspection?", type: "select", required: true, options: ["Yes", "No"] }],
        condition: "wants_inspection",
        branchYes: "collect_phone",
        branchNo: "decline_inspection",
        followUpChips: ["Yes, book inspection", "Not right now"],
      },
      {
        id: "decline_inspection",
        type: "message",
        label: "Decline message",
        messageTemplate: "No problem! Your estimated value is ₹{{priceMin}}L–₹{{priceMax}}L. Whenever you're ready to sell, just come back and we'll get you a confirmed offer.",
      },
      {
        id: "collect_phone",
        type: "ask",
        label: "Collect phone number",
        question: "To book your inspection, please share your mobile number.",
        fields: [{ key: "phone_number", label: "Phone Number", type: "text", required: true, example: "9876543210" }],
        apiOnComplete: "send_otp",
        onSuccessStep: "verify_otp",
        onFailStep: "collect_phone",
        nextStepId: "verify_otp",
      },
      {
        id: "verify_otp",
        type: "ask",
        label: "Verify OTP",
        question: "I've sent a 6-digit OTP to {{phone_number}}. Please enter it to confirm.",
        fields: [{ key: "otp_code", label: "OTP Code", type: "text", required: true, example: "123456" }],
        widgetType: "otp_input",
        apiOnComplete: "verify_otp",
        onSuccessStep: "fetch_slots",
        onFailStep: "verify_otp",
        nextStepId: "fetch_slots",
      },
      {
        id: "fetch_slots",
        type: "api",
        label: "Fetch available slots",
        apiName: "fetch_slots",
        apiOutputKey: "slots_result",
        nextStepId: "select_slot",
      },
      {
        id: "select_slot",
        type: "widget",
        label: "Select inspection slot",
        widgetType: "slot_picker",
        widgetDataStep: "fetch_slots",
        question: "Phone verified! Please choose a convenient inspection slot:",
        fields: [{ key: "selected_slot", label: "Selected Slot", type: "text", required: true }],
        nextStepId: "book_inspection",
        followUpChips: [],
      },
      {
        id: "book_inspection",
        type: "api",
        label: "Book inspection",
        apiName: "book_inspection",
        apiOutputKey: "booking_result",
        nextStepId: "show_confirmation",
      },
      {
        id: "show_confirmation",
        type: "widget",
        label: "Show confirmation",
        widgetType: "confirmation",
        widgetDataStep: "book_inspection",
        messageTemplate: "Your inspection is confirmed! A Cars24 expert will visit you at {{selected_slot}}. Booking ID: {{bookingId}}.",
        followUpChips: ["Documents needed", "How to prepare?", "Cancel/Reschedule"],
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
