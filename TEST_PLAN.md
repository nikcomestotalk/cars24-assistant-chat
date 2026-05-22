# Test Plan: Reset Intent & LLM Context Handler

## Changes Made

### 1. ConversationController.ts
- **Removed hardcoded reset response**: Previously returned `"Got it! Let's start fresh. ${firstStep.prompt}"` directly
- **Now delegates to LLM**: Reset intent clears session data, then returns `null` to fall through to LLM
- **Fixed duplicate message logging**: Removed duplicate `SessionStore.addMessage(sessionId, "user", userMessage)` call at line 131

### 2. chatFn.ts
- **Enhanced workflow context**: Added explicit reset handling in INTERACTION RULES
- **Fixed TypeScript errors**: Added proper type annotations for collection filtering
- **Null safety**: Added check for `session.currentStepId` before accessing flow steps

## Implementation Flow

### Test Scenario 1: Reset Intent (Main Test)
**User Journey:**
1. User initiates sell workflow: "I want to sell my WagonR 2021 petrol"
2. User provides: car_model=WagonR, year=2021, fuel=Petrol
3. User decides: "Let me start from the beginning"

**Expected Behavior:**
1. ConversationController detects reset intent via regex: `/\b(reset|clear|start over|start fresh|begin again|from.{0,5}top|from scratch|cancel|restart)\b/i`
2. SessionStore.reset() clears collectedData: {} → empty
3. currentStepId reset to flow.firstStep
4. ConversationController returns null
5. chatFn builds workflow context showing:
   - COLLECTED DATA: "NONE — Session just started or was reset"
   - CURRENT STEP: "Which car would you like to sell?"
   - Pending fields: car_model, year, km_driven, fuel_type, city, etc.
6. LLM receives INTERACTION RULES: "If user requests reset... acknowledge warmly and ask first question"
7. **Expected LLM Response:** One of:
   - ✅ "Of course! Let's start fresh. Which car would you like to sell?"
   - ✅ "Got it, let's begin from the top. What car are you interested in selling?"
   - ✅ "Sure! Let's start over. Which car would you like to sell?"
   - ❌ "I'm your Cars24 assistant..."  (hardcoded/robotic)

**Test Steps:**
1. Start new chat (isolated session)
2. Enter: "I want to sell my WagonR 2021 petrol automatic"
3. Observe: Should extract car_model, year, fuel and advance
4. Enter: "Let me start from the beginning" or "Reset everything"
5. Observe: Response should be warm and natural, not robotic

---

### Test Scenario 2: Off-Topic Question (Secondary)
**User Journey:**
1. User in workflow: car details partially collected
2. User asks: "What other options do you have for me?"

**Expected Behavior:**
1. ConversationController extracts entities from message
2. No entities match current step schema → allEntities = {}
3. Message doesn't match reset intent pattern
4. Returns null
5. chatFn builds workflow context with current state
6. LLM responds to off-topic question, then guides back to workflow

**Expected Response Pattern:**
- ✅ Answers the question helpfully
- ✅ Acknowledges workflow context  
- ✅ Guides back: "But first, let me get your car details..."

---

### Test Scenario 3: Mid-Flow Correction (Tertiary)
**User Journey:**
1. User: "It's petrol"
2. Later: "Actually, it's CNG not petrol"

**Expected Behavior:**
1. Full-schema extraction captures the correction
2. `hasCorrections` flag = true
3. Response: "Got it, noted! [response]"
4. Correction applied to collectedData

**Expected Response:**
- ✅ "Got it, noted! Let me update that... [next step]"
- ✅ Acknowledges the change explicitly

---

### Test Scenario 4: New Chat Isolation (Regression)
**User Journey:**
1. Chat A: Sell WagonR 2021
2. Click "New Chat"
3. Chat B: Start fresh sell workflow

**Expected Behavior:**
1. Chat B has unique `activeChatId` (from useChatStream.ts)
2. SessionStore.get(newId) returns fresh session
3. No data leakage from Chat A
4. Each chat is completely isolated

---

## Key Code Verification

### Reset Intent Detection
```typescript
// Line 88 in ConversationController.ts
if (/\b(reset|clear|start over|start fresh|begin again|from.{0,5}top|from scratch|cancel|restart)\b/i.test(lower)) {
```
**Accepts:**
- ✅ "reset"
- ✅ "clear"
- ✅ "start over"
- ✅ "start fresh"
- ✅ "begin again"
- ✅ "from scratch"
- ✅ "cancel"
- ✅ "restart"

### Session Reset Logic
```typescript
// Line 90-93 in ConversationController.ts
const newSession = SessionStore.reset(sessionId);           // Fresh session
newSession.workflowId = session.workflowId as WorkflowId;  // Keep workflow type
newSession.currentStepId = flow.firstStep;                 // Reset step
SessionStore.set(newSession);                              // Persist
```
**Verification:**
- ✅ collectedData = {} (empty)
- ✅ workflowId preserved (continue same workflow)
- ✅ currentStepId = first step

### LLM Context for Reset
```typescript
// Line 213 in chatFn.ts
${collectedEntries.length > 0 ? collectedEntries.join("\n") : "NONE — Session just started or was reset"}
```
**Shows "NONE" when collectedData is empty after reset**

### INTERACTION RULES for Reset
```typescript
// Line 222-225 in chatFn.ts
- If user requests reset/restart/start over/begin again/from scratch/clear:
  * Acknowledge warmly and confirm you're clearing data: "Of course! Let's start fresh."
  * Clear all collected data and reset to beginning
  * Ask the first workflow question naturally (as if starting a new conversation)
```

---

## Success Criteria

✅ **Reset responses are warm and natural**
- Not system-like or robotic
- Acknowledges the request
- Asks first question conversationally

✅ **Session data is actually cleared**
- No previous car model persists after reset
- No previous year/fuel/km persists
- First step re-asks all questions

✅ **Off-topic questions are handled gracefully**
- Questions don't trigger repeated step prompts
- LLM context is passed and used
- Responses are conversational

✅ **No data leakage between chats**
- Each new chat has unique sessionId
- Previous chat data doesn't appear
- Sessions are properly isolated

✅ **Entity corrections acknowledged**
- Mid-flow changes are caught and stored
- Response explicitly says "Got it, noted!"
- Data is actually updated in collectedData

---

## Commands to Run Tests

```bash
# 1. Verify TypeScript compilation
npx tsc --noEmit

# 2. Start dev server (if not running)
npm run dev

# 3. Open browser to http://localhost:8080

# 4. Test in console:
# - Start new chat
# - Test reset scenario with reset keywords
# - Test off-topic handling
# - Test mid-flow corrections
# - Test new chat isolation

# 5. Build for production
npm run build
```

---

## Rollback Plan

If LLM responses are still generic/robotic:
1. Enhance INTERACTION RULES with more specific examples
2. Consider adding explicit "reset detected" flag to context
3. Try different reset phrasing in system prompt
4. Consider Claude 3 (Opus) if Haiku continues producing generic responses

If session reset isn't working:
1. Verify SessionStore.reset() is clearing collectedData
2. Check that workflowId is preserved
3. Verify currentStepId points to first step
4. Check buildFollowUps returns correct prompts for first step

