# Claude Token Economy System

## 🎯 Overview
Enterprise-grade token optimization system achieving **60-85% cost reduction** while preserving quality.

## 📊 Targets (Success Metrics)

- **Model Routing**: 95% Haiku, 5% Sonnet (Opus opt-in only)
- **Token Ratio**: Input:Output ≤ 6:1
- **Context Budget**: ≤ 2,000 tokens default (4,000 for detailed requests)
- **Output Caps**: Task-specific tight limits (256-4096 tokens)

## 🔄 Pre-Flight Pipeline (Input Compression)

### 1. Task Classification
Automatic classification of every request into:
- **QA**: Short questions (`what is`, `count`, `list`) → 256 tokens max
- **Bugfix**: Error messages, debugging → 512 tokens max
- **Code (Small)**: Single file/function → 768 tokens max
- **Code (Large)**: Multi-file, >150 LOC → 2048 tokens max (Sonnet)
- **Summarize**: Condensing content → 256 tokens max
- **Plan**: Architecture, design → 512 tokens max
- **Detailed**: Explicit quality requests → 4096 tokens max (preserve quality)

### 2. Model Selection (Ultra-Aggressive)
- **95% Haiku**: All simple tasks, QA, small code, bugfixes
- **5% Sonnet**: Large codegen (>800 chars), detailed analysis (>1000 chars)
- **0% Opus**: Manual selection only

### 3. Context Optimization
- **Rolling Summary**: After 8 turns or >1,000 tokens, create ≤150-token summary
- **Context Selector**: Keep only last 2-4 relevant turns
- **Target**: ≤2,000 tokens (≤4,000 for detailed)

### 4. Prompt Caching
- Cache frequent questions → Zero-token responses
- Revalidate on content change

## 📤 Output Compression (Structure & Style)

### System Instruction (Token Economy Contract)
```
You are Claude running under a strict Token Economy.
Always:
• Use ≤150 words (or one code block ≤120 lines)
• Never repeat the user's text
• Prefer 3 bullets over paragraphs; QA = bullets + one-line conclusion
• If context is large, ask for scope or output a plan first
• If unsure, ask one clarifying question (≤15 words)
• For bugfix: Diagnosis (≤3 bullets) → Patch (one block) → Test (≤2 lines)
• For summaries: 5 bullets, ≤20 words each
• Stop generating when sufficient
• No echo of instructions/prior content
```

### Response Patterns by Task
| Task | Format | Max Tokens |
|------|--------|------------|
| QA | 3 bullets + conclusion | 256 |
| Bugfix | Diagnosis → Patch → Test | 512 |
| Code (Small) | Single block + test | 768 |
| Code (Large) | Scaffold + TODOs | 2048 |
| Summarize | 5 bullets (≤20 words each) | 256 |
| Plan | Checklist + next steps | 512 |
| Detailed | Full explanation (quality mode) | 4096 |

## 🛡️ Guardrails (Token Savers)

1. **De-dupe**: Remove duplicate content in context
2. **No Echo**: Never repeat user prompt or prior messages
3. **One Code Block**: Consolidate fragments
4. **Ask-Then-Answer**: Clarify ambiguity before generating (≤15 words)
5. **Attachment Trims**: Keep first 40 + last 40 lines of logs
6. **Unit Requests**: Split multi-objective prompts into sub-tasks

## 📈 Telemetry & Monitoring

### Per-Request Logging
- Task class, model selected, input/output tokens
- Token ratio (flag if >6:1)
- Cap utilization (flag if <30% - over-provisioned)
- Context reduction %
- Cost per request

### Console Output Examples
```
📋 Task classified as: qa
🤖 Auto mode: Selected claude-3-5-haiku-latest for qa task
🚀 Token Economy: qa → haiku | max_tokens: 256 | context: 5 → 2 msgs (60% reduction)
✅ Complete: haiku | qa | In: 145 | Out: 89 | Cost: $0.000472 | Cap: 35% | Reduction: 60%
```

### Efficiency Flags
- ⚠️ Token ratio exceeds 6:1 threshold
- 💡 Cap underutilized (<30%) - consider lowering max_tokens
- ✅ Cache hit - ZERO API tokens used

## 🎓 Decision Table

| Condition | Action |
|-----------|--------|
| input:output > 6:1 | Trigger rolling summary + re-rank context |
| Thread > 8 turns | Force summary; keep last 2 turns |
| Task = QA | Haiku, 256 tokens, 3-bullet format |
| Task = Bugfix | Haiku, 512 tokens, diagnosis→patch→test |
| Task = Code (Small) | Haiku, 768 tokens, single block |
| Task = Code (Large) | Sonnet, 2048 tokens, plan-first |
| User says "detailed" | Increase cap to 4096, preserve quality |
| Cap utilization < 30% | Flag for optimization |
| Same doc in 24h | Serve cached response |

## 💰 Expected Results

- **30-60% input token reduction** (summarization + context selector)
- **25-50% output token reduction** (structure + caps + stop conditions)
- **70-85% total cost reduction** (combined with Haiku routing)
- **Lower latency** (Haiku faster, smaller payloads)
- **Quality preserved** for explicit detail requests

## 📝 Task Class Examples

**QA (256 tokens, Haiku)**
- "What is React?"
- "Count to 10"
- "List Python data types"

**Bugfix (512 tokens, Haiku)**
- "TypeError: Cannot read property 'x' of undefined"
- "My button isn't working"
- "Debug this error"

**Code Small (768 tokens, Haiku)**
- "Write a function to reverse a string"
- "Create a React button component"
- "Simple auth middleware"

**Code Large (2048 tokens, Sonnet)**
- "Build a complete user authentication system"
- "Implement multi-step checkout flow"
- "Create REST API with 5+ endpoints"

**Detailed (4096 tokens, Haiku/Sonnet)**
- "Explain React hooks in detail"
- "Comprehensive guide to async/await"
- "Detailed architecture for microservices"

## 🔧 Configuration

All settings in `apps/server/src/routes/chat.ts`:

```typescript
// Task classification keywords
function classifyTask(message: string): TaskClass

// Model selection logic
function selectOptimalModel(taskClass: TaskClass, messageLength: number): string

// Token caps by class
function getMaxTokensByClass(taskClass: TaskClass): number

// Context compression
function optimizeContext(messages: any[], taskClass: TaskClass): any[]

// Ratio monitoring
function checkTokenRatio(inputTokens: number, outputTokens: number): boolean
```

## 📊 Monitoring Dashboard (Future)

Track:
- Total tokens saved vs baseline
- Average cost per request
- Model distribution (% Haiku vs Sonnet)
- Token ratio trends
- Cap utilization by task class
- Cache hit rate

---

**Built**: October 2025  
**Version**: 1.0  
**Status**: Production-ready ✅
