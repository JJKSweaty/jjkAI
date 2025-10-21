# Auto-Continuation System - Configuration

## Continuation Limits by Task Type

The system now automatically continues responses with **very high limits for coding**, only prompting when costs become extreme.

### Automatic Continuation Limits

| Task Type | Continuations | When It Applies | Cost Before Prompt |
|-----------|--------------|-----------------|-------------------|
| **Small Code** | **50** | Single function/component | **$0.25** |
| **Large Code** | **100** | Multi-file projects | **$0.50** |
| **Bugfix** | **50** | Error fixing | **$0.25** |
| **Planning** | **50** | Architecture/strategy | **$0.25** |
| **Detailed/DeepDive** | **100** | Comprehensive analysis | **$0.50** |
| **QA/Quick** | 3 | Simple questions | $0.015 |
| **Default** | 20 | General tasks | $0.10 |

## How It Works

### 1. Automatic Continuation (No User Prompt)
```
User: "Build me a full React app with authentication"
Task: codegen-large
Limit: 100 continuations

Response starts...
[hits token limit at 768 tokens]
🔄 Auto-continuing (1/100)...
[continues seamlessly]
[hits limit again]
🔄 Auto-continuing (2/100)...
[continues...]
...continues up to 100 times automatically
```

**Result: Complete app code, zero interruptions, even for massive projects**

### 2. User Prompt (Extreme Edge Case)
```
[After 100 continuations - essentially never happens]
⚠️ This is an extremely long response. Continue generating?
   Cost so far: $0.5000+
   Continuations: 100

[User clicks "Continue" button]
[Resumes generation]
```

**Reality: You'd need to generate 200,000+ tokens (500+ pages) to see this**

## Cost Estimates

### Per Continuation (Haiku Model)
- Input: ~500 tokens × $0.80/million = $0.0004
- Output: ~1000 tokens × $4/million = $0.004
- **Total per continuation: ~$0.005**

### Mode Comparison

**Quick Mode (QA):**
- Max 1 continuation
- Total: ~$0.005
- Use case: "What is React?"

**Standard Mode (Balanced):**
- Max 6-10 continuations
- Total: ~$0.030-$0.050
- Use case: "Explain how to build a REST API"

**DeepDive Mode:**
- Max 15 continuations
- Total: ~$0.075
- Use case: "Write a complete authentication system with docs"

## Frontend Integration

### Handling Continuation Prompts

When the backend sends a `continuation_prompt` event:

```typescript
// In your SSE handler
if (event.type === 'continuation_prompt') {
  // Show user a confirmation dialog
  const shouldContinue = await showContinuationDialog({
    message: event.message,
    cost: event.cost,
    continuationCount: event.continuationCount
  });

  if (shouldContinue) {
    // Call the force continuation endpoint
    await fetch('/api/chat/continue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        threadId: currentThreadId,
        previousResponse: accumulatedResponse,
        model: currentModel,
        maxTokens: 2048
      })
    });
  }
}
```

### Example UI

```tsx
{showContinuePrompt && (
  <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
    <AlertCircle className="w-5 h-5 text-yellow-600" />
    <div className="flex-1">
      <p className="text-sm font-medium">Long response detected</p>
      <p className="text-xs text-gray-600">
        Cost so far: ${promptData.cost.toFixed(4)} ({promptData.continuationCount} continuations)
      </p>
    </div>
    <Button 
      size="sm" 
      onClick={handleContinue}
      disabled={isContinuing}
    >
      {isContinuing ? 'Continuing...' : 'Continue'}
    </Button>
    <Button 
      size="sm" 
      variant="ghost"
      onClick={() => setShowContinuePrompt(false)}
    >
      Stop
    </Button>
  </div>
)}
```

## Configuration

### Adjusting Limits

Edit `apps/server/src/utils/autoContinuation.ts`:

```typescript
private continuationLimits = {
  'codegen-small': 2,    // Increase if users frequently need more
  'codegen-large': 10,   // Increase for complex projects
  'detailed': 15,        // Increase for research tasks
  // ...
};
```

### Cost Calculation

The system estimates costs based on:
- Average input: 500 tokens per continuation
- Average output: 1000 tokens per continuation
- Haiku pricing: $0.80/$4 per million tokens

Adjust in `estimateContinuationCost()` if using different models.

## Benefits

✅ **Seamless UX**: Users rarely see interruptions for normal tasks
✅ **Cost Control**: Prompts only for expensive operations (>$0.05)
✅ **Flexible**: Different limits per task type
✅ **Transparent**: Shows cost and continuation count
✅ **Override**: Users can force continue if needed

## Testing

### Test Automatic Continuation
```bash
# Should auto-continue 10 times without prompting
curl -X POST http://localhost:3001/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Write a complete Express.js REST API with authentication, CRUD operations, error handling, validation, and tests. Include detailed comments."
      }
    ],
    "mode": "auto",
    "threadId": "test-123"
  }'
```

### Test User Prompt
```bash
# Manually trigger 15+ continuations to hit limit
# (In production, this would happen naturally with very long responses)
```

## Monitoring

Check logs for continuation behavior:

```
🔄 Response hit token limit (max_tokens) - attempting auto-continuation...
🔄 Auto-continuing (1/10)...
✅ Continuation complete: +987 tokens
🔄 Auto-continuing (2/10)...
...
⚠️ Continuation limit reached. Cost so far: $0.0500
```

## Future Enhancements

- [ ] Per-user continuation budgets
- [ ] Daily/monthly cost caps
- [ ] Smarter continuation detection (check if answer is "done")
- [ ] Cache continuation prompts
- [ ] Adaptive limits based on user patterns
- [ ] Real-time cost display in UI
- [ ] Continuation history in database