import type { ConversationFlow, FlowStep, FieldDef } from "../flowTypes";
import type { WorkflowDefinition, WorkflowStep, EntitySchema, CollectedData, APIResult } from "./types";
import { valuationApi } from "./adapters/valuationApi";
import { otpApi } from "./adapters/otpApi";
import { slotsApi } from "./adapters/slotsApi";
import { bookingApi } from "./adapters/bookingApi";
import { rcApi } from "./adapters/rcApi";

// ── API registry: visual name → runtime function ──────────────────────────────

const API_REGISTRY: Record<string, (data: CollectedData) => Promise<APIResult>> = {
  price_estimate: valuationApi,
  book_inspection: bookingApi,
  send_otp: otpApi.send,
  verify_otp: otpApi.verify,
  fetch_slots: slotsApi,
  rc_lookup: rcApi,
};

// ── Widget type mapping: Flow Builder → runtime uiComponent ──────────────────

const WIDGET_MAP: Record<string, string> = {
  price_estimate: "price_card",
  emi_calculator: "emi_widget",
  car_cards: "car_cards",
  booking_calendar: "slot_picker",
  confirmation: "confirmation",
  otp_input: "otp_input",
  slot_picker: "slot_picker",
};

// ── Entity schema builder ─────────────────────────────────────────────────────

function buildEntitySchema(fields: FieldDef[]): EntitySchema {
  const schema: EntitySchema = {};
  for (const f of fields) {
    schema[f.key] = {
      type: f.type === "select" ? "enum" : f.type === "number" ? "number" : "string",
      required: f.required,
      description: f.label + (f.example ? `. Example: ${f.example}` : ""),
      options: f.options,
      example: f.example,
    };
  }
  return schema;
}

// ── Built-in validators keyed by field key ────────────────────────────────────

function buildValidate(
  fields: FieldDef[],
  validateAnyOf?: string[],
): ((data: CollectedData) => true | string) | undefined {
  const validators: Array<(data: CollectedData) => true | string> = [];

  // OR validation: at least one of these keys must be present
  if (validateAnyOf && validateAnyOf.length > 0) {
    const keys = validateAnyOf;
    validators.push((data) => {
      const hasAny = keys.some((k) => data[k] !== undefined && data[k] !== null && data[k] !== "");
      if (!hasAny) return `Please provide either ${keys.join(" or ")}.`;
      return true;
    });
  }

  for (const f of fields) {
    if (!f.required) continue;
    if (f.key === "phone_number") {
      validators.push((data) => {
        const phone = String(data.phone_number ?? "").replace(/\s/g, "");
        if (!/^[6-9]\d{9}$/.test(phone)) return "Please provide a valid 10-digit Indian mobile number.";
        return true;
      });
    }
    if (f.key === "otp_code") {
      validators.push((data) => {
        if (!/^\d{6}$/.test(String(data.otp_code ?? ""))) return "Please enter the 6-digit OTP.";
        return true;
      });
    }
    if (f.key === "year") {
      validators.push((data) => {
        const y = Number(data.year);
        if (isNaN(y) || y < 2000 || y > 2025) return "Please share a valid year between 2000 and 2025.";
        return true;
      });
    }
    if (f.key === "km_driven") {
      validators.push((data) => {
        const km = Number(data.km_driven);
        if (isNaN(km) || km < 0 || km > 500000) return "Please share a valid kilometre reading (0–5,00,000).";
        return true;
      });
    }
  }

  if (validators.length === 0) return undefined;
  return (data) => {
    for (const v of validators) {
      const result = v(data);
      if (result !== true) return result;
    }
    return true;
  };
}

// ── Condition evaluator ───────────────────────────────────────────────────────

function evaluateCondition(condition: string, data: CollectedData): boolean {
  const trimmed = condition.trim();
  // equality: "key == 'value'"
  const eqMatch = trimmed.match(/^(\w+)\s*==\s*['"](.+)['"]$/);
  if (eqMatch) {
    const actual = String(data[eqMatch[1]] ?? "").toLowerCase();
    return actual === eqMatch[2].toLowerCase() || actual.startsWith(eqMatch[2].toLowerCase().slice(0, 3));
  }
  // truthy: "key"
  const val = data[trimmed];
  if (typeof val === "boolean") return val;
  if (typeof val === "string") {
    const lower = val.toLowerCase();
    return lower !== "no" && lower !== "false" && lower !== "" && lower !== "not now" && lower !== "skip";
  }
  return !!val;
}

// ── Step converter ────────────────────────────────────────────────────────────

function convertStep(
  step: FlowStep,
  allSteps: FlowStep[],
  index: number,
): WorkflowStep {
  const defaultNext = step.nextStepId ?? allSteps[index + 1]?.id ?? null;

  // ── ask ──────────────────────────────────────────────────────────────────────
  if (step.type === "ask") {
    const fields = step.fields ?? [];
    // If validateAnyOf is set, no individual field is "required" — the OR check handles it
    const requiredKeys = step.validateAnyOf?.length
      ? []
      : fields.filter((f) => f.required).map((f) => f.key);

    const workflowStep: WorkflowStep = {
      id: step.id,
      prompt: step.question ?? "",
      requiredEntities: requiredKeys,
      entitySchema: buildEntitySchema(fields),
      validate: buildValidate(fields, step.validateAnyOf),
      nextStep: step.apiOnComplete
        ? (_data: CollectedData, apiResult?: APIResult): string =>
            apiResult?.success !== false
              ? (step.onSuccessStep ?? defaultNext ?? "")
              : (step.onFailStep ?? step.id)
        : defaultNext,
    };

    // Attach API call if apiOnComplete is set
    if (step.apiOnComplete) {
      const apiFn = API_REGISTRY[step.apiOnComplete];
      if (apiFn) workflowStep.apiCall = apiFn;
    }

    // uiComponent for ask steps that show a widget (e.g. OTP input)
    if (step.widgetType) {
      const uiComp = WIDGET_MAP[step.widgetType];
      if (uiComp) workflowStep.uiComponent = uiComp as WorkflowStep["uiComponent"];
    }

    // skipIfPresent: use a synthetic nextStep that skips if all keys present
    if (step.skipIfPresent && step.skipIfPresent.length > 0) {
      const skipKeys = step.skipIfPresent;
      const originalNextStep = workflowStep.nextStep;
      // We encode skip logic into the validate: if all skip keys present, no validation needed
      // and the engine will advance. The skip works because requiredEntities are satisfied
      // when the data already has them — the engine advances without prompting the user.
      // We mark the step as skippable by removing required entities that are already present.
      // This is handled at runtime in the controller, but we can also do it here:
      workflowStep.nextStep = originalNextStep; // keep linear; engine auto-skips via missing check
    }

    return workflowStep;
  }

  // ── api (auto-advance) ───────────────────────────────────────────────────────
  if (step.type === "api") {
    const apiFn = step.apiName ? API_REGISTRY[step.apiName] : undefined;
    return {
      id: step.id,
      prompt: `Processing…`,
      requiredEntities: [],
      entitySchema: {},
      apiCall: apiFn,
      nextStep: defaultNext,
    };
  }

  // ── widget (optionally also collects input) ───────────────────────────────────
  if (step.type === "widget") {
    const fields = step.fields ?? [];
    const requiredKeys = fields.filter((f) => f.required).map((f) => f.key);
    const uiComp = step.widgetType ? WIDGET_MAP[step.widgetType] : undefined;

    // Branch logic for widget steps that collect input (e.g. show_price)
    let nextStep: WorkflowStep["nextStep"] = defaultNext;
    if (step.condition && (step.branchYes || step.branchNo)) {
      const cond = step.condition;
      const yes = step.branchYes ?? defaultNext;
      const no = step.branchNo ?? defaultNext;
      nextStep = (data: CollectedData) => (evaluateCondition(cond, data) ? yes : no) as string;
    }

    const isTerminal = !defaultNext && !step.condition;

    return {
      id: step.id,
      prompt: step.question ?? step.messageTemplate ?? "",
      requiredEntities: requiredKeys,
      entitySchema: buildEntitySchema(fields),
      validate: buildValidate(fields, step.validateAnyOf),
      nextStep,
      uiComponent: uiComp as WorkflowStep["uiComponent"],
      isTerminal,
    };
  }

  // ── message ───────────────────────────────────────────────────────────────────
  if (step.type === "message") {
    return {
      id: step.id,
      prompt: step.messageTemplate ?? "",
      requiredEntities: [],
      entitySchema: {},
      nextStep: defaultNext,
      isTerminal: !defaultNext,
    };
  }

  // ── branch ────────────────────────────────────────────────────────────────────
  if (step.type === "branch") {
    const cond = step.condition ?? "";
    const yes = step.branchYes ?? null;
    const no = step.branchNo ?? null;
    return {
      id: step.id,
      prompt: "",
      requiredEntities: [],
      entitySchema: {},
      nextStep: (data: CollectedData) => (evaluateCondition(cond, data) ? yes : no) as string,
    };
  }

  // fallback
  return {
    id: step.id,
    prompt: "",
    requiredEntities: [],
    entitySchema: {},
    nextStep: defaultNext,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function convertFlow(flow: ConversationFlow): WorkflowDefinition {
  const steps: Record<string, WorkflowStep> = {};
  for (let i = 0; i < flow.steps.length; i++) {
    const ws = convertStep(flow.steps[i], flow.steps, i);
    steps[ws.id] = ws;
  }
  return {
    id: flow.id as WorkflowDefinition["id"],
    name: flow.name,
    triggerPhrases: flow.triggers,
    firstStep: flow.steps[0]?.id ?? "",
    steps,
  };
}

export function convertAllFlows(flows: ConversationFlow[]): Record<string, WorkflowDefinition> {
  const result: Record<string, WorkflowDefinition> = {};
  for (const flow of flows) {
    if (flow.status === "active") {
      result[flow.id] = convertFlow(flow);
    }
  }
  return result;
}
