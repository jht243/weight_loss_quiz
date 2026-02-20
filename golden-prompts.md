# Golden Prompt Set - Weight-Loss Blueprint Quiz

This document contains test prompts to validate the Weight-Loss Quiz connector's metadata and behavior.

## Purpose
Use these prompts to test:
- **Precision**: Does the right tool get called?
- **Recall**: Does the tool get called when it should?
- **Accuracy**: Are the right parameters passed?

---

## Direct Prompts (Should ALWAYS trigger the connector)

### 1. Explicit Tool Name
**Prompt**: "Help me find the best weight-loss strategy for me"
**Expected**: ✅ Calls `weight-loss-quiz` with default values
**Status**: [ ] Pass / [ ] Fail

### 2. Cravings-focused Prompt
**Prompt**: "I keep overeating at night and want a plan"
**Expected**: ✅ Calls `weight-loss-quiz` with default values
**Status**: [ ] Pass / [ ] Fail

### 3. Busy Schedule Prompt
**Prompt**: "I need a simple fat-loss plan that works with a busy schedule"
**Expected**: ✅ Calls `weight-loss-quiz` with default values
**Status**: [ ] Pass / [ ] Fail

### 4. Motivation Prompt
**Prompt**: "I want to lose weight but I keep falling off"
**Expected**: ✅ Calls `weight-loss-quiz` with default values
**Status**: [ ] Pass / [ ] Fail

### 5. Health Goal Prompt
**Prompt**: "I want a realistic plan to lose fat and improve my health"
**Expected**: ✅ Calls `weight-loss-quiz` with default values
**Status**: [ ] Pass / [ ] Fail

---

## Indirect Prompts (Should trigger the connector)

### 6. Habit Planning
**Prompt**: "Can you guide me through a weight-loss quiz?"
**Expected**: ✅ Calls `weight-loss-quiz`
**Status**: [ ] Pass / [ ] Fail

### 7. Weekends Issue
**Prompt**: "Weekends destroy my progress, what should I do?"
**Expected**: ✅ Calls `weight-loss-quiz`
**Status**: [ ] Pass / [ ] Fail

### 8. Low-Energy Issue
**Prompt**: "I need more energy and want to drop weight"
**Expected**: ✅ Calls `weight-loss-quiz`
**Status**: [ ] Pass / [ ] Fail

---

## Negative Prompts (Should NOT trigger the connector)

### 9. Stock Price Query
**Prompt**: "What's Tesla stock price today?"
**Expected**: ❌ Does NOT call `weight-loss-quiz`
**Status**: [ ] Pass / [ ] Fail

### 10. Coding Query
**Prompt**: "Write a Python function for Fibonacci"
**Expected**: ❌ Does NOT call `weight-loss-quiz`
**Status**: [ ] Pass / [ ] Fail

### 11. General Geography Query
**Prompt**: "What is the capital of Peru?"
**Expected**: ❌ Does NOT call `weight-loss-quiz`
**Status**: [ ] Pass / [ ] Fail

---

## Edge Cases

### 12. Ambiguous Fitness Prompt
**Prompt**: "I need to get healthier"
**Expected**: ✅ Calls `weight-loss-quiz`
**Status**: [ ] Pass / [ ] Fail

### 13. Structured User Prompt
**Prompt**: "Give me a structured weight-loss routine with accountability"
**Expected**: ✅ Calls `weight-loss-quiz`
**Status**: [ ] Pass / [ ] Fail

---

## Testing Instructions

### How to Test
1. Open ChatGPT in **Developer Mode**
2. Link your Weight-Loss Quiz connector
3. For each prompt above:
   - Enter the exact prompt
   - Observe which tool gets called
   - Check the parameters passed
   - Verify the widget renders correctly
   - Mark Pass/Fail in the Status column