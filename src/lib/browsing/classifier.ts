// Web Browsing System - Decision Gate
// Determines when browsing is needed based on query analysis

export interface BrowsingSignals {
  timeSensitive: boolean;
  wantsCitations: boolean;
  entityLookup: boolean;
  niche: boolean;
  lowConfidence: boolean;
  score: number;
}

export class BrowsingClassifier {
  
  // Main decision gate: should we browse?
  shouldBrowse(userQuery: string, userPreference?: 'always' | 'auto' | 'never'): boolean {
    if (userPreference === 'never') return false;
    if (userPreference === 'always') return true;
    
    const signals = this.classifyQuery(userQuery);
    
    // Browse if any strong signal is present
    return signals.score >= 0.6;
  }

  // Analyze query for browsing signals
  classifyQuery(query: string): BrowsingSignals {
    const lower = query.toLowerCase();
    let score = 0;
    
    // Time-sensitive indicators
    const timeSensitive = this.detectTimeSensitive(lower);
    if (timeSensitive) score += 0.4;
    
    // Citation requests
    const wantsCitations = this.detectCitationRequest(lower);
    if (wantsCitations) score += 0.3;
    
    // Entity lookup (people, places, products, companies)
    const entityLookup = this.detectEntityLookup(lower);
    if (entityLookup) score += 0.3;
    
    // Niche/specialized topics
    const niche = this.detectNicheTopic(lower);
    if (niche) score += 0.2;
    
    // Low confidence indicators
    const lowConfidence = this.detectLowConfidence(lower);
    if (lowConfidence) score += 0.3;
    
    return {
      timeSensitive,
      wantsCitations,
      entityLookup,
      niche,
      lowConfidence,
      score: Math.min(score, 1.0)
    };
  }

  private detectTimeSensitive(query: string): boolean {
    const timeSensitivePatterns = [
      // Explicit time references
      /\b(today|yesterday|this week|this month|current|now|recent|latest)\b/,
      /\b(as of|since|after|before)\s+\d{4}/,
      /\b(2024|2025|2026)\b/,
      
      // Time-sensitive topics
      /\b(news|price|stock|weather|schedule|event|deadline)\b/,
      /\b(election|vote|poll|result|winner)\b/,
      /\b(release|launch|announce|update)\b/,
      
      // Temporal questions
      /\b(when|what time|how long|until)\b/,
      /\b(is.*still|does.*now|has.*changed)\b/,
    ];
    
    return timeSensitivePatterns.some(p => p.test(query));
  }

  private detectCitationRequest(query: string): boolean {
    const citationPatterns = [
      /\b(source|cite|citation|reference|link|url)\b/,
      /\b(proof|evidence|verification|verify|confirm)\b/,
      /\b(where can i find|show me|point me to)\b/,
      /\b(official|authoritative|published)\b/,
      /\b(according to|based on)\b/,
    ];
    
    return citationPatterns.some(p => p.test(query));
  }

  private detectEntityLookup(query: string): boolean {
    const entityPatterns = [
      // People
      /\b(who is|about|biography|ceo|founder|president|director)\b/,
      
      // Companies/Products
      /\b(company|corporation|startup|product|service|app|software)\b/,
      
      // Places
      /\b(where is|location|address|country|city)\b/,
      
      // Specific lookups
      /\b(phone number|email|contact|website|homepage)\b/,
      /\b(review|rating|comparison)\b/,
    ];
    
    return entityPatterns.some(p => p.test(query));
  }

  private detectNicheTopic(query: string): boolean {
    const nichePatterns = [
      // Technical/specialized
      /\b(api|sdk|library|framework|protocol|specification)\b/,
      /\b(regulation|compliance|law|statute|guideline)\b/,
      /\b(research|study|paper|journal|publication)\b/,
      
      // Detailed information
      /\b(detailed|comprehensive|in-depth|complete|full)\b/,
      /\b(documentation|manual|guide|tutorial)\b/,
    ];
    
    return nichePatterns.some(p => p.test(query));
  }

  private detectLowConfidence(query: string): boolean {
    const lowConfidencePatterns = [
      // Explicit uncertainty
      /\b(is it true|fact check|debunk|myth|rumor)\b/,
      /\b(correct|accurate|real|actual|genuine)\b/,
      
      // Very specific queries
      /\b(exact|precise|specific|particular)\b/,
      
      // Recent developments (post-cutoff)
      /\b(new|breakthrough|discovery|advancement)\b/,
      /\b(change|update|revision|amendment)\b/,
    ];
    
    return lowConfidencePatterns.some(p => p.test(query));
  }

  // Generate explanation for why browsing was/wasn't triggered
  explainDecision(query: string, signals: BrowsingSignals): string {
    const reasons: string[] = [];
    
    if (signals.timeSensitive) reasons.push('time-sensitive query');
    if (signals.wantsCitations) reasons.push('citation requested');
    if (signals.entityLookup) reasons.push('entity lookup');
    if (signals.niche) reasons.push('specialized topic');
    if (signals.lowConfidence) reasons.push('verification needed');
    
    if (reasons.length === 0) {
      return 'No browsing needed - query can be answered from training data';
    }
    
    return `Browsing enabled: ${reasons.join(', ')} (confidence: ${(signals.score * 100).toFixed(0)}%)`;
  }
}

export const browsingClassifier = new BrowsingClassifier();