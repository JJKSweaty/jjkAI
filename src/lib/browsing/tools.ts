// Web Browsing Tools - Minimal API contracts
// Three core tools: search_web, fetch_url, parse_pdf

export interface SearchWebParams {
  q: string;
  recencyDays?: number;
  site?: string;
  maxResults?: number;
}

export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  published?: string;
  domain: string;
  score?: number;
}

export interface FetchUrlParams {
  url: string;
  timeout?: number;
}

export interface FetchUrlResult {
  url: string;
  status: number;
  contentType: string;
  text?: string;
  html?: string;
  pdfBytesRef?: string;
  title?: string;
  published?: string;
  error?: string;
}

export interface ParsedSource {
  url: string;
  title: string;
  published?: string;
  domain: string;
  text: string;
  facts: string[];
  quality: number;
}

export class WebTools {
  private cache = new Map<string, { result: any; timestamp: number }>();
  private cacheExpiry = 3600000; // 1 hour
  private domainRequests = new Map<string, number>();
  private rateLimit = 1000; // 1 request per domain per second

  // Tool 1: Search the web
  async search_web(params: SearchWebParams): Promise<SearchResult[]> {
    const cacheKey = `search:${JSON.stringify(params)}`;
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      // Use multiple search APIs with fallback
      const results = await this.performSearch(params);
      
      // Deduplicate by domain and URL
      const unique = this.deduplicateResults(results);
      
      // Rank by freshness and quality
      const ranked = this.rankResults(unique, params.recencyDays);
      
      this.setCache(cacheKey, ranked);
      return ranked;
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  // Tool 2: Fetch URL content
  async fetch_url(params: FetchUrlParams): Promise<FetchUrlResult> {
    const cacheKey = `fetch:${params.url}`;
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    // Rate limiting
    await this.enforceRateLimit(new URL(params.url).hostname);

    try {
      const response = await fetch(params.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ClaudeBot/1.0)',
          'Accept': 'text/html,application/pdf,application/json',
        },
        signal: AbortSignal.timeout(params.timeout || 10000),
      });

      if (!response.ok) {
        return {
          url: params.url,
          status: response.status,
          contentType: '',
          error: `HTTP ${response.status}`,
        };
      }

      const contentType = response.headers.get('content-type') || '';
      const result: FetchUrlResult = {
        url: params.url,
        status: response.status,
        contentType,
      };

      if (contentType.includes('application/pdf')) {
        // Handle PDF
        const buffer = await response.arrayBuffer();
        result.pdfBytesRef = Buffer.from(buffer).toString('base64');
      } else if (contentType.includes('text/html')) {
        // Handle HTML
        result.html = await response.text();
        const extracted = this.extractReadable(result.html, params.url);
        result.text = extracted.text;
        result.title = extracted.title;
        result.published = extracted.published;
      } else if (contentType.includes('application/json')) {
        result.text = await response.text();
      } else {
        result.text = await response.text();
      }

      this.setCache(cacheKey, result);
      return result;
    } catch (error: any) {
      return {
        url: params.url,
        status: 0,
        contentType: '',
        error: error.message,
      };
    }
  }

  // Tool 3: Parse PDF (simplified - would use pdf-parse in production)
  async parse_pdf(pdfBytesRef: string): Promise<{ text: string; pages: any[] }> {
    // In production: use pdf-parse or similar
    // For now, return placeholder
    return {
      text: 'PDF parsing requires pdf-parse library',
      pages: [],
    };
  }

  // Extract readable content from HTML
  private extractReadable(html: string, url: string): {
    text: string;
    title: string;
    published?: string;
  } {
    // Simple extraction - in production use Readability.js or similar
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : new URL(url).hostname;

    // Extract date from meta tags or content
    const datePatterns = [
      /<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i,
      /<time[^>]+datetime=["']([^"']+)["']/i,
      /(\d{4}-\d{2}-\d{2})/,
    ];

    let published: string | undefined;
    for (const pattern of datePatterns) {
      const match = html.match(pattern);
      if (match) {
        published = match[1];
        break;
      }
    }

    // Extract text (remove scripts, styles, extract body)
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Limit to reasonable length
    text = text.substring(0, 10000);

    return { text, title, published };
  }

  // Perform actual search (stub - implement with real API)
  private async performSearch(params: SearchWebParams): Promise<SearchResult[]> {
    // In production: integrate with Google Custom Search, Bing API, SearXNG, etc.
    // For now, return mock results
    console.log('Searching:', params);
    return [];
  }

  // Deduplicate search results
  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    const unique: SearchResult[] = [];

    for (const result of results) {
      // Canonicalize URL
      const canonical = this.canonicalizeUrl(result.url);
      
      if (!seen.has(canonical)) {
        seen.add(canonical);
        unique.push({ ...result, url: canonical });
      }
    }

    return unique;
  }

  // Canonicalize URL (remove tracking params, mobile variants)
  private canonicalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      
      // Remove common tracking parameters
      const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid'];
      paramsToRemove.forEach(param => parsed.searchParams.delete(param));
      
      // Convert mobile to desktop
      parsed.hostname = parsed.hostname
        .replace(/^m\./, '')
        .replace(/^mobile\./, '');
      
      return parsed.toString();
    } catch {
      return url;
    }
  }

  // Rank results by freshness and quality
  private rankResults(results: SearchResult[], recencyDays?: number): SearchResult[] {
    const now = Date.now();
    const recencyCutoff = recencyDays ? now - (recencyDays * 24 * 60 * 60 * 1000) : 0;

    return results
      .map(result => {
        let score = 0;

        // Freshness boost
        if (result.published && recencyDays) {
          const publishedTime = new Date(result.published).getTime();
          if (publishedTime > recencyCutoff) {
            score += 0.4;
          }
        }

        // Domain quality (simple heuristic)
        const qualityDomains = [
          '.gov', '.edu', '.org',
          'wikipedia.org', 'reuters.com', 'bbc.com', 'apnews.com',
          'nature.com', 'science.org', 'nih.gov'
        ];
        
        if (qualityDomains.some(d => result.domain.includes(d))) {
          score += 0.3;
        }

        // Downrank SEO farms and low-quality domains
        const lowQualityIndicators = ['?ref=', 'affiliate', 'ads', 'promo'];
        if (lowQualityIndicators.some(i => result.url.includes(i))) {
          score -= 0.2;
        }

        return { ...result, score };
      })
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  // Rate limiting per domain
  private async enforceRateLimit(domain: string): Promise<void> {
    const lastRequest = this.domainRequests.get(domain) || 0;
    const timeSince = Date.now() - lastRequest;
    
    if (timeSince < this.rateLimit) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimit - timeSince));
    }
    
    this.domainRequests.set(domain, Date.now());
  }

  // Cache management
  private getCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.result;
    }
    return null;
  }

  private setCache(key: string, result: any): void {
    this.cache.set(key, { result, timestamp: Date.now() });
    
    // Cleanup old cache entries
    if (this.cache.size > 100) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      entries.slice(0, 20).forEach(([key]) => this.cache.delete(key));
    }
  }
}

export const webTools = new WebTools();