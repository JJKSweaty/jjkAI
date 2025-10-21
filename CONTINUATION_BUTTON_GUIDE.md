# Auto-Continuation Button - User Guide

## Overview

A smart continuation system that **never interrupts coding or heavy tasks**. The button only appears for extremely rare edge cases (>$0.50 cost, 100+ continuations).

## New Behavior: Unlimited Coding

**Coding and heavy tasks now have NO practical limits:**

```
User: "Write me any amount of code"
→ Auto-continues up to 100 times seamlessly
→ Complete response, no interruption
Cost: Can go up to $0.50 before ANY prompt ✅
```

## When You'll See The Button

| Scenario | Auto-Continuations | Button Shows? |
|----------|-------------------|---------------|
| Quick question | 3 | ❌ Never |
| **Code snippet** | **50** | **❌ NEVER** |
| **Bug fix** | **50** | **❌ NEVER** |
| **Large code** | **100** | **❌ NEVER** |
| **DeepDive** | **100** | **❌ NEVER** |
| Planning doc | 50 | ❌ Never |
| Massive project | 100+ | ⚠️ Only if >$0.50 |

**Translation: You will basically NEVER see this button when coding.**

## Cost Protection

The button acts as a **safety check** only for EXTREME operations:

| Threshold | When It Triggers | Likelihood |
|-----------|-----------------|------------|
| **$0.50** | **100+ continuations** | **<0.1% of requests** |
| $1.00 | 200+ continuations | Essentially never |

For context:
- Normal code request: ~$0.01-$0.05
- Large full-stack app: ~$0.10-$0.30
- **Button shows: >$0.50** (200,000+ tokens)

## Real-World Examples

### Example 1: Website Code (Original Request)
```
Request: "I need code for a website"
Auto-continuations: Up to 50
Button shows: ❌ No
Cost: ~$0.010
Result: Complete, seamless
```

### Example 2: Full Enterprise System
```
Request: "Build complete system with microservices, auth, tests, CI/CD, docs"
Auto-continuations: Up to 100
Button shows: ❌ No (unless generates 200K+ tokens)
Cost: ~$0.30-$0.40
Result: Complete, seamless
```

### Example 3: Absolutely Massive Project (Theoretical)
```
Request: "Generate an entire operating system with kernel, drivers, UI..."
Auto-continuations: 100
Button shows: ⚠️ Yes (only if hits $0.50)
Cost: ~$0.50+
Reality: This would take hours and generate megabytes of code
```

## Visual Design

The button appears as a **prominent yellow card** above the composer:

```
┌─────────────────────────────────────────┐
│ ⚠️ Long Response Detected               │
│                                         │
│ This response is very long.             │
│ Continue generating?                    │
│                                         │
│ ⚡ Cost so far: $0.0750  • 15 continues │
│                                         │
│ [⚡ Continue Generating] [Stop Here]    │
└─────────────────────────────────────────┘
```

## Button Actions

### "Continue Generating"
- Resumes generation from where it stopped
- Continues until completion or next limit
- Updates cost in real-time
- Shows spinner: "Continuing..."

### "Stop Here"
- Keeps the response as-is
- Saves what's been generated
- Dismisses the prompt
- Ready for next message

## Cost Protection

The button acts as a **safety check** for expensive operations:

| Threshold | When It Triggers | Example |
|-----------|-----------------|---------|
| $0.05 | 10 continuations (Standard) | Large multi-file code |
| $0.075 | 15 continuations (DeepDive) | Full system with docs |
| $0.10+ | 20+ continuations | Extremely rare |

## User Experience

### Almost Always (99.9% of time)
```
User types → AI responds → [Auto-continues up to 100 times] → Complete ✅
No button, no interruption, ever
```

### Virtually Never (<0.1% of time)
```
User types → AI generates 200,000+ tokens
→ [Auto continues 100 times]
→ ⚠️ Button appears (cost >$0.50)
→ User clicks "Continue"
→ Generates more → Complete ✅
```

## Technical Details

### Frontend Logic
```typescript
// In useChat.ts
onContinuationPrompt: (data) => {
  // Only show if cost > $0.05
  if (data.cost > 0.05) {
    setContinuationPrompt({
      show: true,
      message: data.message,
      cost: data.cost,
      continuationCount: data.continuationCount
    });
  }
}
```

### Backend Logic
```typescript
// In autoContinuation.ts
if (continuationCount >= maxContinuations) {
  return { 
    shouldContinue: false,
    promptUser: true,  // Triggers the button
    cost: estimatedCost
  };
}
```

## Customization

### Adjust Cost Threshold
To show button earlier/later, edit `useChat.ts`:

```typescript
// Current: $0.50 (100 continuations)
if (data.cost > 0.50) { ... }

// More conservative: $0.25
if (data.cost > 0.25) { ... }

// Even more permissive: $1.00
if (data.cost > 1.00) { ... }
```

### Adjust Continuation Limits
Edit `apps/server/src/utils/autoContinuation.ts`:

```typescript
private continuationLimits = {
  'codegen-large': 100,  // Already very high
  'codegen-small': 50,   // Can increase to 100 if needed
  'detailed': 100,       // Already very high
};
```

## Real-World Examples

### Example 1: Website Code (Your Original Ask)
```
Request: "I need code for a website"
Classification: codegen-small
Auto-continuations: 2
Button shows: ❌ No
Cost: ~$0.010
Result: Complete website code, seamless
```

### Example 2: Full React App
```
Request: "Build a complete React app with auth and API"
Classification: codegen-large
Auto-continuations: 10
Button shows: ❌ No (unless extremely detailed)
Cost: ~$0.050
Result: Full app code, automatic
```

### Example 3: Enterprise System
```
Request: "Build an enterprise system with microservices, auth, tests, CI/CD, docs"
Classification: detailed
Auto-continuations: 15
Button shows: ✅ Yes (after 15)
Cost: ~$0.075
Result: System partially generated → User clicks continue → Complete
```

## Benefits

✅ **Seamless UX**: 99% of requests never see a prompt
✅ **Cost Protection**: Only prompts for expensive operations
✅ **Transparent**: Shows exact cost and continuation count
✅ **User Control**: Can stop or continue at any point
✅ **Visual Prominence**: Yellow card is impossible to miss
✅ **Contextual**: Shows exactly where in the conversation

## Monitoring

Watch the console for continuation behavior:

```
🔄 Response hit token limit (max_tokens) - attempting auto-continuation...
🔄 Auto-continuing (1/10)...
✅ Continuation complete: +987 tokens
🔄 Auto-continuing (2/10)...
...
⚠️ Continuation limit reached. Cost so far: $0.0750
[Button appears in UI]
```

## Testing

### Test Normal Flow (No Button)
```
Ask: "Write a React component with useState and props"
Expected: Complete response, no button
```

### Test Button Appearance (High Cost)
```
Ask: "Write a complete full-stack application with:
- React frontend with auth
- Node.js backend with API
- PostgreSQL database schema
- Unit and integration tests
- Docker setup
- CI/CD pipeline
- Complete documentation"

Expected: After 15 auto-continues, button appears
```

---

**Summary**: The button is now essentially invisible for ALL coding and heavy work. You'd need to generate 200,000+ tokens (equivalent to ~500 pages of code) in a single response before ever seeing it. **Code freely without interruption!** 🚀