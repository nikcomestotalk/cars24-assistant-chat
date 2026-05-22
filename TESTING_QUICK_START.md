# Quick Start: Testing Reset Intent & LLM Context

## One-Minute Overview

The system now detects when users say "reset", "start over", "let's start fresh", etc., and passes this to the LLM with rich context. The LLM generates warm, natural responses instead of hardcoded or robotic ones.

**What changed:**
- ❌ OLD: ConversationController returns hardcoded "Got it! Let's start fresh. Which car..."
- ✅ NEW: Controller clears data and returns null, LLM decides response with context

## Quick Test Steps (3 minutes)

### Step 1: Start the App
```bash
# Dev server should already be running at http://localhost:8080
# If not:
npm run dev
```

### Step 2: Test Reset Intent
**Scenario A: Basic Reset**
1. Open browser → http://localhost:8080
2. Click "New Chat"
3. Type: `I want to sell my Maruti Swift 2021 petrol`
4. Observe: Should show fields like Year, Fuel Type, etc.
5. Type: `let me start from the beginning`
6. **Expected Result:**
   - ✅ Response is warm: "Of course! Let's start fresh. Which car..."
   - ✅ NOT: "I'm your Cars24 assistant..."
   - ✅ NOT: "Restarting workflow. First step..."
7. Observe: First question about car model should appear again

**Scenario B: Other Reset Keywords**
Test each keyword to verify they all work:
- `reset` → should work
- `clear` → should work
- `start over` → should work
- `start fresh` → should work
- `begin again` → should work
- `from the top` → should work
- `from scratch` → should work
- `cancel` → should work
- `restart` → should work

### Step 3: Test Off-Topic Questions
**Scenario: Questions During Workflow**
1. Type: `I want to sell my WagonR 2021 CNG automatic`
2. Observe: Should advance workflow
3. Type: `What cars do you recommend?` (off-topic)
4. **Expected Result:**
   - ✅ LLM answers the question
   - ✅ Then guides back to workflow: "But first, let me..."
   - ✅ NOT: Repeated workflow step prompt

### Step 4: Test Mid-Flow Corrections
**Scenario: Changing Previous Answer**
1. Type: `I want to sell my WagonR 2021 petrol`
2. Observe: Car model, year, and fuel extracted
3. Type: `Actually, it's diesel not petrol`
4. **Expected Result:**
   - ✅ Response acknowledges: "Got it, noted!..."
   - ✅ Data is updated (fuel changed from petrol to diesel)

### Step 5: Test Session Isolation
**Scenario: Multiple Chats**
1. Chat A: Type `I want to sell my WagonR`
2. Click "New Chat" → Chat B opens
3. Type: `What car should I sell?`
4. **Expected Result:**
   - ✅ Chat B doesn't know about WagonR
   - ✅ Each chat has completely isolated data
   - ✅ Clicking back to Chat A still shows WagonR

## What to Check

### ✅ Good Signs
- [ ] Reset responses are warm and human-like
- [ ] Session data is cleared after reset
- [ ] First step re-prompts all questions
- [ ] Off-topic questions are answered + guided back
- [ ] Corrections are acknowledged explicitly
- [ ] New chats don't inherit previous data
- [ ] No TypeScript errors in console
- [ ] Build completes without errors

### ❌ Bad Signs (Report as Bug)
- [ ] Response is robotic: "I'm your Cars24 assistant..."
- [ ] Response is mechanical: "Restarting workflow. Step 1: collect car model"
- [ ] Previous data persists after reset
- [ ] First step doesn't re-prompt
- [ ] Off-topic questions trigger step repetition
- [ ] Corrections not acknowledged
- [ ] New chats show old chat's data
- [ ] Console has TypeScript/JavaScript errors

## Browser Console

While testing, open browser DevTools (F12) and check:
- Console tab for any errors
- Network tab to see API calls to chatServerFn
- Look for response structure: { text, tool, widget, followUps, isWorkflow }

## Files to Review During Testing

If LLM response is still not natural:
1. Check `src/lib/chatFn.ts` line 222-243 → INTERACTION RULES section
2. Check examples of good vs bad responses
3. Consider adjusting system prompt with more specific guidance

If session reset isn't working:
1. Check `src/lib/workflow/ConversationController.ts` line 90-93 → reset logic
2. Verify SessionStore.reset() is clearing data
3. Check that currentStepId points to flow.firstStep

## Rollback Commands

If you need to revert these changes:
```bash
# See what changed
git diff src/lib/workflow/ConversationController.ts
git diff src/lib/chatFn.ts

# Revert to previous version
git checkout HEAD~ -- src/lib/workflow/ConversationController.ts
git checkout HEAD~ -- src/lib/chatFn.ts
```

## Success Metrics

Track these metrics while testing:
- **Natural Response Rate**: % of reset responses that sound human-like
- **Session Isolation**: % of new chats with no data leakage
- **Correction Acknowledgment**: % of corrections that get "Got it, noted!"
- **Off-Topic Handling**: % of off-topic questions answered + guided back

## Questions?

Refer to these documents:
- `TEST_PLAN.md` - Detailed test scenarios
- `IMPLEMENTATION_SUMMARY.md` - Technical details
- `ConversationController.ts` line 88-102 - Reset detection logic
- `chatFn.ts` line 222-243 - LLM interaction rules

