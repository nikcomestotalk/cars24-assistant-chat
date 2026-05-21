import type {
  WorkflowSession,
  WorkflowStep,
  WorkflowDefinition,
  CollectedData,
  APIResult,
} from "./types";
import { sellCarFlow } from "./flows/sellCarFlow";
import { SessionStore } from "./SessionStore";

const FLOWS: Record<string, WorkflowDefinition> = {
  sell_car: sellCarFlow,
};

export function getFlow(id: string): WorkflowDefinition | null {
  return FLOWS[id] ?? null;
}

export function getStep(workflowId: string, stepId: string): WorkflowStep | null {
  return FLOWS[workflowId]?.steps[stepId] ?? null;
}

/** Interpolates {{key}} placeholders from collected data */
export function resolveTemplate(template: string, data: CollectedData): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = data[key];
    return val !== undefined && val !== null ? String(val) : `[${key}]`;
  });
}

/** Detect which workflow (if any) the message should trigger */
export function detectWorkflowIntent(message: string): string | null {
  const lower = message.toLowerCase();
  for (const [id, flow] of Object.entries(FLOWS)) {
    if (flow.triggerPhrases.some((phrase) => lower.includes(phrase))) {
      return id;
    }
  }
  return null;
}

export interface AdvanceResult {
  session: WorkflowSession;
  /** The step the session is now ON (after advancing) */
  currentStep: WorkflowStep | null;
  /** Text to show user — either validation error or resolved step prompt */
  responseText: string;
  /** Whether step advancement happened (entities were accepted) */
  advanced: boolean;
  /** Validation error if applicable */
  validationError?: string;
  /** API result from the step that was just completed */
  apiResult?: APIResult;
}

/**
 * Core deterministic advance logic.
 * Merges entities into session, validates, calls API, moves to next step.
 * Returns the updated session and what to show the user.
 */
export async function advanceSession(
  session: WorkflowSession,
  entities: CollectedData,
): Promise<AdvanceResult> {
  if (!session.workflowId || !session.currentStepId) {
    return {
      session,
      currentStep: null,
      responseText: "Something went wrong. Let's start over.",
      advanced: false,
    };
  }

  const flow = getFlow(session.workflowId)!;
  const step = flow.steps[session.currentStepId];
  if (!step) {
    return { session, currentStep: null, responseText: "", advanced: false };
  }

  // Merge new entities into collectedData
  const mergedData: CollectedData = { ...session.collectedData, ...entities };

  // Check all required entities are present
  const missing = step.requiredEntities.filter(
    (key) => mergedData[key] === undefined || mergedData[key] === null || mergedData[key] === "",
  );
  if (missing.length > 0) {
    // Stay on current step, just merge what we got
    const updated = { ...session, collectedData: mergedData };
    SessionStore.set(updated);
    return {
      session: updated,
      currentStep: step,
      responseText: resolveTemplate(step.prompt, mergedData),
      advanced: false,
    };
  }

  // Run validation
  if (step.validate) {
    const result = step.validate(mergedData);
    if (result !== true) {
      const updated = { ...session, collectedData: mergedData };
      SessionStore.set(updated);
      return {
        session: updated,
        currentStep: step,
        responseText: result,
        advanced: false,
        validationError: result,
      };
    }
  }

  // Execute API call (if any) for the current step
  let apiResult: APIResult | undefined;
  if (step.apiCall) {
    try {
      apiResult = await step.apiCall(mergedData);
      // Flatten scalar API result fields into collectedData for template use
      if (apiResult?.data) {
        for (const [k, v] of Object.entries(apiResult.data)) {
          if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
            mergedData[k] = v;
          }
        }
      }
    } catch (err) {
      apiResult = { success: false, data: {}, error: String(err) };
    }
  }

  // Determine next step
  let nextStepId: string | null;
  if (typeof step.nextStep === "function") {
    nextStepId = step.nextStep(mergedData, apiResult);
  } else {
    nextStepId = step.nextStep;
  }

  // Build updated session pointing at next step
  let updatedSession: WorkflowSession = {
    ...session,
    collectedData: mergedData,
    currentStepId: nextStepId,
    apiResults: apiResult
      ? { ...session.apiResults, [step.id]: apiResult }
      : session.apiResults,
    isComplete: nextStepId === null,
  };

  // Auto-advance through API-only steps (requiredEntities === [])
  // These steps just call an API and forward — no user input needed
  while (nextStepId) {
    const nextStep = flow.steps[nextStepId];
    if (!nextStep || nextStep.requiredEntities.length > 0) break;
    if (nextStep.isTerminal) break; // terminal steps need to show their prompt

    // Auto-run API call for this passthrough step
    let autoApiResult: APIResult | undefined;
    if (nextStep.apiCall) {
      try {
        autoApiResult = await nextStep.apiCall(mergedData);
        if (autoApiResult?.data) {
          for (const [k, v] of Object.entries(autoApiResult.data)) {
            if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
              mergedData[k] = v;
            }
          }
        }
      } catch (err) {
        autoApiResult = { success: false, data: {}, error: String(err) };
      }
    }

    let autoNextId: string | null;
    if (typeof nextStep.nextStep === "function") {
      autoNextId = nextStep.nextStep(mergedData, autoApiResult);
    } else {
      autoNextId = nextStep.nextStep;
    }

    updatedSession = {
      ...updatedSession,
      collectedData: mergedData,
      currentStepId: autoNextId,
      apiResults: autoApiResult
        ? { ...updatedSession.apiResults, [nextStep.id]: autoApiResult }
        : updatedSession.apiResults,
      isComplete: autoNextId === null,
    };

    // Use the last api result as the one to return (for widget data)
    if (autoApiResult) apiResult = autoApiResult;

    nextStepId = autoNextId;
  }

  SessionStore.set(updatedSession);

  const landedStep = nextStepId ? flow.steps[nextStepId] : null;
  const responseText = landedStep
    ? resolveTemplate(landedStep.prompt, mergedData)
    : "All done!";

  return {
    session: updatedSession,
    currentStep: landedStep,
    responseText,
    advanced: true,
    apiResult,
  };
}
