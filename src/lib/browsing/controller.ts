// PRRA Loop Controller: Planner → Retriever → Reader → Answerer
// Orchestrates web browsing with token budgeting and auto-continuation

import { webTools, type SearchWebParams, type ParsedSource } from './tools';
import { browsingClassifier } from './classifier';
import { AutoContinuationHandler } from '../autoContinuation';

export interface BrowsingConfig {
  maxSearches: number;
  maxSources: number;
  maxTokensPerSource: number;
  recencyDays?: number;
  userTimezone: string;
}

export interface BrowsingResult {
  answer: string;
  sources: Array<{
    index: number;
    url: string;
    title: string;
    published?: string;
  }>;
  searchesUsed: number;
  sourcesUsed: number;
  tokensUsed: number;
}

export class BrowsingController {
  private config: BrowsingConfig = {
    maxSearches: 3,
    maxSources: 4,
    maxTokensPerSource: 60,
    userTimezone: 'UTC',
  };

  private continuationHandler = new AutoContinuationHandler();

  constructor(config?: Partial<BrowsingConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  // Main entry point: answer a query with web browsing
  async answerWithBrowsing(
    query: string,
    conversationContext?: string,
    userPreference: 'always' | 'auto' | 'never' = 'auto'
  ): Promise<BrowsingResult | null> {
    // Step 0: Decision gate - should we browse?
    const shouldBrowse = browsingClassifier.shouldBrowse(query, userPreference);
    
    if (!shouldBrowse) {
      return null; // Let normal chat handle it
    }

    try {
      // Step 1: PLANNER - Generate search queries
      const searchQueries = this.planSearches(query);

      // Step 2: RETRIEVER - Execute searches and fetch diverse sources
      const allResults = await this.executeSearches(searchQueries);
      const topDiverse = this.selectTopDiverse(allResults);
      const fetchedSources = await this.fetchAllSources(topDiverse);

      // Step 3: READER - Parse, rank, and summarize sources
      const parsedSources = await this.parseAndRankSources(fetchedSources);
      const summarizedSources = this.summarizeSources(parsedSources);

      // Step 4: ANSWERER - Build grounded prompt and generate answer
      const groundedPrompt = this.buildGroundedPrompt(query, summarizedSources, conversationContext);
      const answer = await this.generateAnswer(groundedPrompt);

      return {
        answer,
        sources: summarizedSources.map((s, i) => ({
          index: i + 1,
          url: s.url,
          title: s.title,
          published: s.published,
        })),
        searchesUsed: searchQueries.length,
        sourcesUsed: summarizedSources.length,
        tokensUsed: this.estimateTokens(groundedPrompt + answer),
      };
    } catch (error) {
      console.error('Browsing error:', error);
      return null;
    }
  }

  // PLANNER: Generate 1-3 focused search queries
  private planSearches(query: string): SearchWebParams[] {
    const searches: SearchWebParams[] = [];

    // Main query
    searches.push({
      q: query,
      maxResults: 8,
    });

    // Detect if recency matters
    const recencyPatterns = /today|latest|recent|current|2024|this (week|month|year)|news/i;
    if (recencyPatterns.test(query)) {
      searches.push({
        q: query,
        recencyDays: 30,
        maxResults: 6,
      });
    }

    // Detect if specific site might help
    const sitePatterns = /documentation|api|official|government|research/i;
    if (sitePatterns.test(query)) {
      const siteDomain = this.guessSiteDomain(query);
      if (siteDomain) {
        searches.push({
          q: query,
          site: siteDomain,
          maxResults: 4,
        });
      }
    }

    // Limit to maxSearches
    return searches.slice(0, this.config.maxSearches);
  }

  // Guess relevant site domain based on query
  private guessSiteDomain(query: string): string | undefined {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('python')) return 'docs.python.org';
    if (lowerQuery.includes('javascript') || lowerQuery.includes('node')) return 'developer.mozilla.org';
    if (lowerQuery.includes('react')) return 'react.dev';
    if (lowerQuery.includes('typescript')) return 'typescriptlang.org';
    if (lowerQuery.includes('government') || lowerQuery.includes('regulation')) return '.gov';
    if (lowerQuery.includes('research') || lowerQuery.includes('study')) return '.edu';
    
    return undefined;
  }

  // RETRIEVER: Execute all searches in parallel
  private async executeSearches(queries: SearchWebParams[]): Promise<any[]> {
    const results = await Promise.all(
      queries.map(params => webTools.search_web(params))
    );
    
    return results.flat();
  }

  // Select top diverse results (different domains)
  private selectTopDiverse(results: any[]): any[] {
    const seenDomains = new Set<string>();
    const diverse: any[] = [];

    for (const result of results) {
      if (diverse.length >= this.config.maxSources * 2) break;

      const domain = new URL(result.url).hostname.replace(/^www\./, '');
      
      // Prefer diversity: take at most 2 results per domain
      const domainCount = Array.from(seenDomains).filter(d => d === domain).length;
      if (domainCount < 2) {
        diverse.push(result);
        seenDomains.add(domain);
      }
    }

    return diverse;
  }

  // Fetch all sources in parallel
  private async fetchAllSources(results: any[]): Promise<any[]> {
    const fetches = await Promise.all(
      results.map(result =>
        webTools.fetch_url({ url: result.url })
          .then(fetched => ({ ...result, ...fetched }))
          .catch(error => ({ ...result, error: error.message }))
      )
    );

    // Filter out errors
    return fetches.filter(f => f.text && !f.error);
  }

  // READER: Parse and rank sources by quality
  private async parseAndRankSources(sources: any[]): Promise<ParsedSource[]> {
    const parsed: ParsedSource[] = sources.map(source => {
      const domain = new URL(source.url).hostname.replace(/^www\./, '');
      
      // Extract key facts from text (simple approach)
      const facts = this.extractKeyFacts(source.text);
      
      // Calculate quality score
      const quality = this.calculateQualityScore(source);

      return {
        url: source.url,
        title: source.title || domain,
        published: source.published,
        domain,
        text: source.text,
        facts,
        quality,
      };
    });

    // Sort by quality (descending)
    parsed.sort((a, b) => b.quality - a.quality);

    return parsed;
  }

  // Extract 2-3 key facts from source text
  private extractKeyFacts(text: string): string[] {
    // Split into sentences
    const sentences = text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20 && s.length < 200);

    // Take first 3 substantive sentences
    return sentences.slice(0, 3);
  }

  // Calculate source quality score
  private calculateQualityScore(source: any): number {
    let score = 0;

    const domain = new URL(source.url).hostname;

    // High-quality domains
    const highQuality = ['.gov', '.edu', '.org', 'wikipedia.org', 'reuters.com', 'bbc.com', 'nature.com', 'nih.gov'];
    if (highQuality.some(d => domain.includes(d))) {
      score += 0.5;
    }

    // Has published date
    if (source.published) {
      score += 0.2;
    }

    // Recent publication
    if (source.published) {
      const publishedTime = new Date(source.published).getTime();
      const daysSince = (Date.now() - publishedTime) / (1000 * 60 * 60 * 24);
      if (daysSince < 30) score += 0.3;
      else if (daysSince < 90) score += 0.2;
      else if (daysSince < 365) score += 0.1;
    }

    // Content length (prefer substantial content)
    if (source.text.length > 1000) score += 0.2;
    if (source.text.length > 3000) score += 0.1;

    // Penalize low-quality indicators
    if (source.url.includes('ads') || source.url.includes('affiliate')) {
      score -= 0.3;
    }

    return Math.max(0, Math.min(1, score));
  }

  // Summarize each source to ≤60 tokens
  private summarizeSources(sources: ParsedSource[]): ParsedSource[] {
    const top = sources.slice(0, this.config.maxSources);

    return top.map(source => {
      // Take first 2-3 facts, concatenate
      const summary = source.facts.slice(0, 3).join('. ');
      
      // Estimate tokens (rough: 1 token ≈ 4 chars)
      const estimatedTokens = summary.length / 4;
      
      // Truncate if over budget
      let finalSummary = summary;
      if (estimatedTokens > this.config.maxTokensPerSource) {
        const maxChars = this.config.maxTokensPerSource * 4;
        finalSummary = summary.substring(0, maxChars) + '...';
      }

      return {
        ...source,
        text: finalSummary,
      };
    });
  }

  // ANSWERER: Build grounded prompt with source matrix
  private buildGroundedPrompt(
    query: string,
    sources: ParsedSource[],
    conversationContext?: string
  ): string {
    let prompt = '';

    // Add conversation context if available
    if (conversationContext) {
      prompt += `Context: ${conversationContext}\n\n`;
    }

    // Add source matrix (compact format)
    prompt += `Sources (cite as [1], [2], etc.):\n`;
    sources.forEach((source, i) => {
      const index = i + 1;
      const date = source.published ? ` (${this.formatDate(source.published)})` : '';
      prompt += `[${index}] ${source.title}${date}\n${source.text}\n\n`;
    });

    // Add user query
    prompt += `Query: ${query}\n\n`;
    
    // Add instructions
    prompt += `Instructions:
- Answer using the sources above
- Cite sources inline with [1], [2], etc.
- If sources conflict, mention both views
- Use absolute dates (not "recently")
- If sources lack info, say so clearly
- Be concise but complete`;

    return prompt;
  }

  // Generate answer (stub - integrate with your LLM API)
  private async generateAnswer(prompt: string): Promise<string> {
    // In production: call your LLM API with the grounded prompt
    // For now, return placeholder
    console.log('Generating answer with prompt:', prompt.length, 'chars');
    
    // This should call your Claude API with:
    // - The grounded prompt
    // - Auto-continuation enabled
    // - Appropriate token budget
    
    return 'Answer would be generated here with inline citations [1][2]';
  }

  // Format date (convert to absolute if needed)
  private formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  // Estimate tokens (rough)
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

export const browsingController = new BrowsingController();