// ─── Core types for the deterministic workflow engine ──────────────────────

export type WorkflowId = "sell_car" | "buy_car" | "emi_calculator" | "insurance";

export type StepId = string;

export type FieldType = "string" | "number" | "boolean" | "enum";

export interface EntityField {
  type: FieldType;
  required: boolean;
  options?: string[];       // for enum types
  description: string;      // shown in LLM extraction prompt
  example?: string;
}

export type EntitySchema = Record<string, EntityField>;

export type CollectedData = Record<string, string | number | boolean | null>;

export interface APIResult {
  success: boolean;
  data: Record<string, unknown>;
  error?: string;
}

export type UIComponentType =
  | "price_card"
  | "slot_picker"
  | "otp_input"
  | "confirmation"
  | "car_cards"
  | "emi_result";

export interface WorkflowStep {
  id: StepId;
  /** Question or message to show user at this step */
  prompt: string;
  /** Entity keys that must be in collectedData before advancing */
  requiredEntities: string[];
  /** JSON schema the LLM uses to extract entities from user message */
  entitySchema: EntitySchema;
  /** Optional validation — return error string or true */
  validate?: (data: CollectedData) => true | string;
  /** Optional API call executed when this step is entered (after entities collected) */
  apiCall?: (data: CollectedData) => Promise<APIResult>;
  /** Next step ID, or function for branching, or null for terminal */
  nextStep: StepId | ((data: CollectedData, apiResult?: APIResult) => StepId) | null;
  /** Optional UI widget to render alongside response */
  uiComponent?: UIComponentType;
  /** If true, workflow ends after this step */
  isTerminal?: boolean;
}

export interface WorkflowDefinition {
  id: WorkflowId;
  name: string;
  triggerPhrases: string[];
  firstStep: StepId;
  steps: Record<StepId, WorkflowStep>;
}

// ─── Session state ────────────────────────────────────────────────────────────

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface WorkflowSession {
  sessionId: string;
  workflowId: WorkflowId | null;
  currentStepId: StepId | null;
  collectedData: CollectedData;
  apiResults: Record<StepId, APIResult>;
  isComplete: boolean;
  history: ConversationMessage[];
  createdAt: number;
  updatedAt: number;
}

// ─── Orchestration results ────────────────────────────────────────────────────

export interface ExtractedEntities {
  entities: CollectedData;
  confidence: number;
  isOffTopic: boolean;
  clarificationNeeded?: string;
}

export interface StepAdvanceResult {
  advanced: boolean;
  newStepId: StepId | null;
  validationError?: string;
  apiResult?: APIResult;
  isComplete: boolean;
}

export interface ConversationOutput {
  text: string;
  sessionId: string;
  currentStepId: StepId | null;
  isComplete: boolean;
  widget?: {
    type: UIComponentType;
    data: Record<string, unknown>;
  };
  followUps?: string[];
}
