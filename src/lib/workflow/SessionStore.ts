import type { WorkflowSession } from "./types";

// In-memory store — survives within a single Worker isolate / Node process.
// Replace with Cloudflare KV / Redis for production persistence.
const store = new Map<string, WorkflowSession>();

const TTL_MS = 30 * 60 * 1000; // 30 minutes

function newSession(sessionId: string): WorkflowSession {
  return {
    sessionId,
    workflowId: null,
    currentStepId: null,
    collectedData: {},
    apiResults: {},
    isComplete: false,
    history: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export const SessionStore = {
  get(sessionId: string): WorkflowSession {
    const session = store.get(sessionId);
    if (!session) return newSession(sessionId);
    // Auto-expire
    if (Date.now() - session.updatedAt > TTL_MS) {
      store.delete(sessionId);
      return newSession(sessionId);
    }
    return session;
  },

  set(session: WorkflowSession): void {
    store.set(session.sessionId, { ...session, updatedAt: Date.now() });
  },

  reset(sessionId: string): WorkflowSession {
    const fresh = newSession(sessionId);
    store.set(sessionId, fresh);
    return fresh;
  },

  addMessage(sessionId: string, role: "user" | "assistant", content: string): void {
    const session = SessionStore.get(sessionId);
    session.history.push({ role, content, timestamp: Date.now() });
    // Keep last 20 messages to bound memory
    if (session.history.length > 20) session.history = session.history.slice(-20);
    SessionStore.set(session);
  },
};
