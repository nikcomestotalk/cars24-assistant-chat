import type { ConversationOutput, WorkflowId } from "./types";
import { SessionStore } from "./SessionStore";
import { extractEntities } from "./EntityExtractor";
import { advanceSession, detectWorkflowIntent, getFlow, getStep, resolveTemplate } from "./WorkflowEngine";

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

    // Build a combined entity schema from the first several steps so we can
    // pre-populate data the user already provided in their trigger message
    // (e.g. "I want to sell my WagonR 2023 CNG" → skip year + fuel steps).
    const combinedSchema = Object.values(flow.steps).reduce(
      (acc, s) => ({ ...acc, ...s.entitySchema }),
      {} as import("./types").EntitySchema,
    );
    const { entities: preloadEntities } = await extractEntities(userMessage, combinedSchema, apiKey);
    session.collectedData = preloadEntities;
    SessionStore.set(session);

    SessionStore.addMessage(sessionId, "user", userMessage);

    // Advance using any pre-extracted entities — this may skip several steps
    const firstStep = flow.steps[flow.firstStep];
    const { session: updatedSession, currentStep: landedStep, responseText, apiResult } =
      await advanceSession(session, preloadEntities);

    SessionStore.addMessage(sessionId, "assistant", responseText);

    let widget: ConversationOutput["widget"] | undefined;
    if (landedStep?.uiComponent && apiResult) {
      widget = { type: landedStep.uiComponent, data: apiResult.data };
    }

    return {
      text: responseText,
      sessionId,
      currentStepId: updatedSession.currentStepId,
      isComplete: updatedSession.isComplete,
      widget,
      followUps: buildFollowUps(updatedSession.currentStepId, updatedSession.workflowId),
    };
  }

  // ── 2. Workflow is active — extract entities for current step ─────────────
  const currentStep = getStep(session.workflowId, session.currentStepId!);
  if (!currentStep) return null;

  // Extract against the full flow schema so mid-flow corrections (e.g.
  // "actually it's petrol not CNG") update previously collected fields.
  const flow = getFlow(session.workflowId)!;
  const combinedSchema = Object.values(flow.steps).reduce(
    (acc, s) => ({ ...acc, ...s.entitySchema }),
    {} as import("./types").EntitySchema,
  );
  const { entities: allEntities } = await extractEntities(userMessage, combinedSchema, apiKey);

  // If nothing was extracted at all, check for reset intent
  if (Object.keys(allEntities).length === 0) {
    const lower = userMessage.toLowerCase();

    // Detect reset intent
    if (/\b(reset|clear|start over|start fresh|begin again|from.{0,5}top|from scratch|cancel|restart)\b/i.test(lower)) {
      // Clear session data but keep workflow active
      const newSession = SessionStore.reset(sessionId);
      newSession.workflowId = session.workflowId as import("./types").WorkflowId;
      newSession.currentStepId = flow.firstStep;
      SessionStore.set(newSession);
      SessionStore.addMessage(sessionId, "user", userMessage);
      // Return null to fall through to LLM, which will see empty collectedData
      // and generate a natural warm response for the reset request
      return null;
    }

    // For all other off-topic (questions, clarifications, etc.), let LLM handle with full context
    SessionStore.addMessage(sessionId, "user", userMessage);
    return null;
  }

  SessionStore.addMessage(sessionId, "user", userMessage);

  // Entities scoped to current step drive advancement; the combined set updates
  // corrections to any previously collected field via collectedData merge.
  const currentStepEntities = Object.fromEntries(
    Object.entries(allEntities).filter(([k]) => k in currentStep.entitySchema),
  );
  // Pre-apply corrections for fields outside the current step
  const corrections = Object.fromEntries(
    Object.entries(allEntities).filter(([k]) => !(k in currentStep.entitySchema)),
  );
  const hasCorrections = Object.keys(corrections).length > 0;
  if (hasCorrections) {
    session = { ...session, collectedData: { ...session.collectedData, ...corrections } };
    SessionStore.set(session);
  }

  // ── 3. Advance the state machine ──────────────────────────────────────────
  const { session: updatedSession, currentStep: landedStep, responseText, apiResult } =
    await advanceSession(session, currentStepEntities);

  // If we applied corrections to previous fields, acknowledge the change
  let finalResponseText = responseText;
  if (hasCorrections) {
    finalResponseText = `Got it, noted! ${responseText}`;
  }

  SessionStore.addMessage(sessionId, "assistant", finalResponseText);

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
    text: finalResponseText,
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
