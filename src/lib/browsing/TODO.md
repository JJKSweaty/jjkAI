# Web Browsing System - Implementation Checklist

## ✅ Completed

### Core Architecture
- [x] **Classifier** (`classifier.ts`) - Decision gate with signal detection
- [x] **Tool APIs** (`tools.ts`) - search_web, fetch_url, parse_pdf
- [x] **PRRA Controller** (`controller.ts`) - Planner → Retriever → Reader → Answerer
- [x] **Citations** (`citations.ts`) - Inline [1][2] format with source list
- [x] **Integration** (`integration.ts`) - Depth mode config + auto-continuation
- [x] **Index exports** (`index.ts`) - Clean public API
- [x] **Documentation** (`README.md`) - Comprehensive guide

### Features Implemented
- [x] Signal-based browsing detection (5 signals: time/citation/entity/niche/lowConf)
- [x] Multi-query planning (main, recency, site-scoped)
- [x] Diverse source selection (max 2 per domain)
- [x] Quality ranking (0-1 score, boost .gov/.edu)
- [x] Source summarization (≤60 tokens per source)
- [x] Inline citation formatting ([1], [2], [1][2])
- [x] Source list attachment at end of answer
- [x] Relative → absolute date conversion
- [x] Citation deduplication
- [x] Depth mode integration (Quick/Standard/DeepDive)
- [x] Cache system (1-hour in-memory)
- [x] Rate limiting (1 req/domain/sec)
- [x] URL canonicalization (remove tracking params)
- [x] Content extraction (HTML → readable text)

## 🔄 In Progress

### Tool API Stubs
- [ ] Replace `performSearch()` stub with real search API
  - Options: Google Custom Search, Bing, SearXNG, DuckDuckGo
  - Required: API key configuration
  - Priority: HIGH

- [ ] Improve HTML content extraction
  - Replace regex with `@mozilla/readability`
  - Better article detection
  - Handle dynamic content (JavaScript-rendered)
  - Priority: MEDIUM

- [ ] Implement PDF parsing
  - Add `pdf-parse` dependency
  - Handle large PDFs (streaming)
  - Extract metadata (author, date)
  - Priority: MEDIUM

### Backend Integration
- [ ] Connect to chat route (`apps/server/src/routes/chat.ts`)
  - Add browsing option to request body
  - Call `browsingIntegration.enhanceWithBrowsing()`
  - Stream results with source metadata
  - See: `INTEGRATION_EXAMPLE.ts`
  - Priority: HIGH

- [ ] Database schema for browsing metadata
  - Add `sources` JSON field to messages table
  - Add `browsingMetadata` field (searches/tokens used)
  - Migration script
  - Priority: MEDIUM

- [ ] Environment configuration
  - Add `ENABLE_WEB_BROWSING` flag
  - Add `SEARCH_API_KEY` and `SEARCH_API_URL`
  - Add cache config (TTL, max size)
  - Priority: HIGH

### Frontend Integration
- [ ] Add browsing toggle to UI
  - Checkbox in EnhancedComposer
  - "Enable web browsing" option
  - Show browsing indicator when active
  - Priority: MEDIUM

- [ ] Display sources in message
  - Render citation links as clickable
  - Show source list below message
  - Add "Sources" expandable section
  - Priority: HIGH

- [ ] Browsing metadata badge
  - Show "🌐 Browsed 3 sources" badge
  - Display token usage
  - Show search queries used
  - Priority: LOW

## ⏳ TODO

### Enhancements

#### Search Integration
- [ ] Implement Google Custom Search API client
  ```typescript
  async performSearch(params: SearchWebParams): Promise<SearchResult[]> {
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?` +
      `key=${process.env.GOOGLE_API_KEY}&` +
      `cx=${process.env.GOOGLE_CSE_ID}&` +
      `q=${encodeURIComponent(params.q)}&` +
      `num=${params.maxResults || 10}`
    );
    return response.json();
  }
  ```

- [ ] Add fallback search providers (Bing, DuckDuckGo)
- [ ] Implement search result caching (Redis)
- [ ] Add search query suggestions

#### Content Processing
- [ ] Install and integrate `@mozilla/readability`
  ```bash
  npm install @mozilla/readability jsdom
  ```
  
- [ ] Install and integrate `pdf-parse`
  ```bash
  npm install pdf-parse
  ```

- [ ] Add image analysis (if query asks for visual info)
- [ ] Handle paginated content (forums, long articles)

#### Quality & Reliability
- [ ] Implement retry logic with exponential backoff
  ```typescript
  async fetchWithRetry(url: string, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fetch(url);
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await sleep(2 ** i * 1000);
      }
    }
  }
  ```

- [ ] Add robots.txt checking before fetching
- [ ] Implement source reliability tracking
- [ ] Add conflict resolution UI (show both sides)
- [ ] Track citation accuracy over time

#### Performance
- [ ] Replace in-memory cache with Redis
  ```typescript
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  await redis.setex(cacheKey, 3600, JSON.stringify(result));
  ```

- [ ] Implement request batching (combine similar queries)
- [ ] Add CDN caching for common queries
- [ ] Parallelize source fetching (already done, but optimize)

#### User Experience
- [ ] Add "Show more sources" button (load 4-8 sources)
- [ ] Implement source preview on hover
- [ ] Add "Refresh sources" button (bypass cache)
- [ ] Show loading states ("Searching...", "Reading 3 sources...")
- [ ] Add browsing history view (past searches)

#### Advanced Features
- [ ] Semantic deduplication (vector similarity)
  ```typescript
  // Use embeddings to detect duplicate content
  const embeddings = await getEmbeddings(sources.map(s => s.text));
  const duplicates = findSimilar(embeddings, threshold=0.9);
  ```

- [ ] Multi-modal support (image search, screenshots)
- [ ] Live data streams (stock prices, sports scores)
- [ ] Cross-language search and translation
- [ ] Fact-checking mode (verify claims against sources)

#### Testing
- [ ] Unit tests for classifier signals
  ```typescript
  test('detects time-sensitive queries', () => {
    expect(browsingClassifier.classifyQuery('latest news').timeSensitive).toBe(true);
  });
  ```

- [ ] Integration tests for PRRA loop
- [ ] E2E tests for full browsing flow
- [ ] Load testing (concurrent requests)
- [ ] Citation accuracy validation

#### Monitoring
- [ ] Add telemetry for browsing usage
  - Queries per day
  - Average sources used
  - Token savings vs. full scraping
  - Citation click-through rate

- [ ] Error tracking (failed fetches, timeouts)
- [ ] Performance monitoring (latency, cache hit rate)
- [ ] Cost tracking (search API costs)

## 🚀 Deployment Readiness

### Before Production
- [ ] Set up search API accounts (Google CSE, Bing)
- [ ] Configure Redis for distributed caching
- [ ] Add rate limiting at API gateway level
- [ ] Set up monitoring and alerts
- [ ] Load test with realistic traffic
- [ ] Security audit (prevent SSRF, validate URLs)
- [ ] Cost estimation (search API calls × price)

### Launch Plan
1. **Beta phase**: Enable for 10% of users
2. **Monitoring**: Track success rate, latency, costs
3. **Iterate**: Fix issues, tune parameters
4. **Full rollout**: Enable for all users
5. **A/B test**: Browsing vs. no browsing quality

## 📝 Notes

### Token Budget Validation
- Quick mode: ~200 tokens (1 search, 2 sources × 40 tokens)
- Standard mode: ~380 tokens (2 searches, 3 sources × 60 tokens)
- DeepDive mode: ~480 tokens (3 searches, 4 sources × 80 tokens)

**vs. Full webpage scraping**: 50,000+ tokens ✅ **90% savings**

### API Cost Estimation
- Google Custom Search: $5 per 1,000 queries
- Bing Web Search: $3 per 1,000 transactions
- Estimated: $0.005 per browsing request (2 searches avg)

**For 10,000 users × 5 browsing requests/day = 50,000 requests/day**
- Cost: $250/day = $7,500/month
- Compare to OpenAI tokens saved: ~$15,000/month
- **Net savings: ~$7,500/month** ✅

### Next Steps (Priority Order)
1. ✅ Complete core architecture (DONE)
2. 🔄 Integrate real search API (Google Custom Search)
3. 🔄 Connect to chat route with SSE streaming
4. 🔄 Add frontend UI for sources display
5. ⏳ Deploy to staging environment
6. ⏳ Beta test with select users
7. ⏳ Production rollout

---

**Status**: Core system complete, ready for API integration and deployment ✨