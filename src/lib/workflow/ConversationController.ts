import type { ConversationOutput, WorkflowId } from "./types";
import { SessionStore } from "./SessionStore";
import { extractEntities } from "./EntityExtractor";
import { advanceSession, detectWorkflowIntent, getFlow, getStep } from "./WorkflowEngine";

/**
 * Main orchestrator. Called by the server route for every chat message.
 *
 * Responsibilities:
 *  1. Load (or create) session
 *  2. If no active workflow → detect intent → initialize workflow
 *  3. Extract entities from user message (LLM)
 *  4. Advance deterministic state machine
 *  5. Build response with optional widget data
 *
 * The LLM never controls flow — it only extracts entities and (optionally) refines text.
 */
export async function processWorkflowMessage(
  sessionId: string,
  userMessage: string,
  apiKey: string,
): Promise<ConversationOutput | null> {
  let session = SessionStore.get(sessionId);

  // ── 1. Detect intent if no active workflow ────────────────────────────────
  if (!session.workflowId) {
    const intentId = detectWorkflowIntent(userMessage);
    if (!intentId) return null; // not a workflow message — fall through to free-form chat

    const flow = getFlow(intentId)!;
    session = SessionStore.reset(sessionId);
    session.workflowId = intentId as WorkflowId;
    session.currentStepId = flow.firstStep;
    SessionStore.set(session);

    // Return the first step's prompt immediately
    const firstStep = flow.steps[flow.firstStep];
    SessionStore.addMessage(sessionId, "user", userMessage);
    const responseText = firstStep.prompt;
    SessionStore.addMessage(sessionId, "assistant", responseText);

    return {
      text: responseText,
      sessionId,
      currentStepId: flow.firstStep,
      isComplete: false,
    };
  }

  // ── 2. Workflow is active — extract entities for current step ─────────────
  const currentStep = getStep(session.workflowId, session.currentStepId!);
  if (!currentStep) return null;

  SessionStore.addMessage(sessionId, "user", userMessage);

  const { entities } = await extractEntities(
    userMessage,
    currentStep.entitySchema,
    apiKey,
  );

  // ── 3. Advance the state machine ──────────────────────────────────────────
  const { session: updatedSession, currentStep: landedStep, responseText, apiResult } =
    await advanceSession(session, entities);

  SessionStore.addMessage(sessionId, "assistant", responseText);

  // ── 4. Build widget data if the landed step has a UI component ─────────────
  let widget: ConversationOutput["widget"] | undefined;
  if (landedStep?.uiComponent && apiResult) {
    widget = {
      type: landedStep.uiComponent,
      data: apiResult.data,
    };
  } else if (landedStep?.uiComponent && updatedSession.currentStepId) {
    // Widget from a previously stored API result (e.g. slot_picker stays on step)
    const flow = getFlow(updatedSession.workflowId!)!;
    // Find the most recent relevant API result for this step type
    const stepWithApi = Object.values(flow.steps).find(
      (s) => s.uiComponent === landedStep.uiComponent && updatedSession.apiResults[s.id],
    );
    if (stepWithApi) {
      widget = {
        type: landedStep.uiComponent,
        data: updatedSession.apiResults[stepWithApi.id].data,
      };
    }
  }

  // ── 5. Follow-ups based on current step ───────────────────────────────────
  const followUps = buildFollowUps(updatedSession.currentStepId, updatedSession.workflowId);

  return {
    text: responseText,
    sessionId,
    currentStepId: updatedSession.currentStepId,
    isComplete: updatedSession.isComplete,
    widget,
    followUps,
  };
}

function buildFollowUps(stepId: string | null, workflowId: string | null): string[] {
  if (!stepId || !workflowId) return [];
  const map: Record<string, string[]> = {
    collect_year: ["My car is from 2022", "It's a 2020 model"],
    collect_fuel_type: ["Petrol", "Diesel", "CNG"],
    collect_km: ["Around 30,000 km", "About 60,000 km"],
    collect_city: ["Delhi", "Mumbai", "Bangalore"],
    show_price: ["Yes, book inspection", "Not right now"],
    collect_phone: [],
    verify_otp: [],
    select_slot: [],
  };
  return map[stepId] ?? [];
}

/** Check if a session is currently in an active workflow */
export function isInWorkflow(sessionId: string): boolean {
  const session = SessionStore.get(sessionId);
  return !!session.workflowId && !session.isComplete;
}

/** Reset workflow session (e.g. user starts new chat) */
export function resetWorkflow(sessionId: string): void {
  SessionStore.reset(sessionId);
}
