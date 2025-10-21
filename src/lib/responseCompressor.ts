// Response compression utility for reducing token usage
export class ResponseCompressor {
  
  // Compress response by removing redundant words and phrases
  compress(text: string, targetReduction: number = 0.25): string {
    let compressed = text;
    
    // Step 1: Remove hedging words (saves ~5-10%)
    compressed = this.removeHedgingWords(compressed);
    
    // Step 2: Compress redundant transitions (saves ~5-8%)
    compressed = this.compressTransitions(compressed);
    
    // Step 3: Simplify verbose constructions (saves ~8-12%)
    compressed = this.simplifyVerboseConstructions(compressed);
    
    // Step 4: Optimize lists and formatting (saves ~3-7%)
    compressed = this.optimizeLists(compressed);
    
    // Step 5: Remove excessive whitespace (saves ~2-5%)
    compressed = this.normalizeWhitespace(compressed);
    
    // Check if we achieved target reduction
    const actualReduction = (text.length - compressed.length) / text.length;
    
    // If we didn't reach target, apply more aggressive compression
    if (actualReduction < targetReduction) {
      compressed = this.aggressiveCompress(compressed, targetReduction - actualReduction);
    }
    
    return compressed;
  }

  private removeHedgingWords(text: string): string {
    const hedgingPatterns = [
      // Remove hedging words
      /\b(perhaps|maybe|possibly|likely|probably|seems?|appears?|tends?)\s+/gi,
      
      // Remove qualification phrases
      /\b(it is important to note that|it should be noted that|it's worth mentioning that)\s+/gi,
      /\b(generally speaking|in most cases|typically|usually)\s+/gi,
      
      // Remove filler phrases
      /\b(as you can see|as mentioned|as noted|obviously|clearly)\s+/gi,
      /\b(in other words|to put it simply|basically|essentially)\s+/gi,
    ];
    
    let result = text;
    hedgingPatterns.forEach(pattern => {
      result = result.replace(pattern, '');
    });
    
    return result;
  }

  private compressTransitions(text: string): string {
    const transitionReplacements = [
      // Compress long transitions to shorter ones
      [/\b(furthermore|moreover|additionally|in addition)\b/gi, 'Also'],
      [/\b(however|nevertheless|nonetheless)\b/gi, 'But'],
      [/\b(therefore|consequently|as a result)\b/gi, 'So'],
      [/\b(for example|for instance|such as)\b/gi, 'e.g.'],
      [/\b(that is to say|in other words)\b/gi, 'i.e.'],
      
      // Remove redundant connectors
      [/\b(first and foremost|first of all)\b/gi, 'First'],
      [/\b(last but not least|finally and most importantly)\b/gi, 'Finally'],
      [/\b(on the other hand|in contrast)\b/gi, 'Conversely'],
    ];
    
    let result = text;
    transitionReplacements.forEach(([pattern, replacement]) => {
      result = result.replace(pattern as RegExp, replacement as string);
    });
    
    return result;
  }

  private simplifyVerboseConstructions(text: string): string {
    const verboseReplacements = [
      // Simplify verbose phrases
      [/\bmake a decision\b/gi, 'decide'],
      [/\bcome to a conclusion\b/gi, 'conclude'],
      [/\btake into consideration\b/gi, 'consider'],
      [/\bgive consideration to\b/gi, 'consider'],
      [/\bput emphasis on\b/gi, 'emphasize'],
      [/\bmake an improvement\b/gi, 'improve'],
      [/\bcarry out\b/gi, 'do'],
      [/\bput forward\b/gi, 'propose'],
      [/\bin order to\b/gi, 'to'],
      [/\bdue to the fact that\b/gi, 'because'],
      [/\bin spite of the fact that\b/gi, 'although'],
      [/\bfor the purpose of\b/gi, 'for'],
      [/\bwith regard to\b/gi, 'regarding'],
      [/\bin relation to\b/gi, 'about'],
      
      // Simplify wordy constructions
      [/\ba (number|variety|range) of\b/gi, 'several'],
      [/\ba (large|significant) (number|amount) of\b/gi, 'many'],
      [/\ba (small|limited) (number|amount) of\b/gi, 'few'],
      [/\bis able to\b/gi, 'can'],
      [/\bis capable of\b/gi, 'can'],
      [/\bhas the ability to\b/gi, 'can'],
      [/\bhas the potential to\b/gi, 'might'],
    ];
    
    let result = text;
    verboseReplacements.forEach(([pattern, replacement]) => {
      result = result.replace(pattern as RegExp, replacement as string);
    });
    
    return result;
  }

  private optimizeLists(text: string): string {
    // Convert verbose list introductions to shorter forms
    let result = text.replace(
      /Here are the (main |key |primary |important )?(\w+):/gi, 
      '$2:'
    );
    
    // Simplify list item introductions
    result = result.replace(
      /^(\s*[-*]\s+)(The\s+)?(first|second|third|next|another)\s+(thing|item|point|aspect)\s+(is|that)/gim,
      '$1'
    );
    
    // Remove redundant "that" in lists
    result = result.replace(
      /^(\s*[-*]\s+)(\w+)\s+that\s+/gim,
      '$1$2: '
    );
    
    return result;
  }

  private normalizeWhitespace(text: string): string {
    return text
      // Remove multiple spaces
      .replace(/\s{2,}/g, ' ')
      // Remove multiple newlines (keep max 2 for paragraph breaks)
      .replace(/\n{3,}/g, '\n\n')
      // Remove trailing spaces on lines
      .replace(/[ \t]+$/gm, '')
      // Remove leading/trailing whitespace
      .trim();
  }

  private aggressiveCompress(text: string, additionalReduction: number): string {
    if (additionalReduction <= 0) return text;
    
    let result = text;
    
    // More aggressive measures
    if (additionalReduction > 0.1) {
      // Remove adjectives and adverbs
      result = result.replace(/\b(very|quite|rather|extremely|highly|particularly|especially)\s+/gi, '');
      result = result.replace(/\b(good|great|excellent|amazing|wonderful|fantastic)\s+/gi, '');
    }
    
    if (additionalReduction > 0.15) {
      // Shorten sentences by removing subordinate clauses
      result = result.replace(/,\s+which\s+[^,.]+(,|\.|$)/gi, '$1');
      result = result.replace(/\s+that\s+[^,.]+[,.]?/gi, '');
    }
    
    if (additionalReduction > 0.2) {
      // Remove parenthetical information
      result = result.replace(/\s*\([^)]+\)\s*/g, ' ');
      
      // Remove example details but keep the core example
      result = result.replace(/for example,\s+[^.]+\./gi, 'e.g. [example].');
    }
    
    return this.normalizeWhitespace(result);
  }

  // Check if compression should be applied based on mode and content
  shouldCompress(depthMode: string, responseLength: number, minLength: number = 300): boolean {
    // Only compress for Quick and Standard modes
    if (depthMode === 'DeepDive') return false;
    
    // Only compress if response is long enough to benefit
    if (responseLength < minLength) return false;
    
    return true;
  }

  // Get compression statistics
  getCompressionStats(original: string, compressed: string): {
    originalLength: number;
    compressedLength: number;
    bytesReduced: number;
    percentageReduced: number;
    estimatedTokensSaved: number;
  } {
    const originalLength = original.length;
    const compressedLength = compressed.length;
    const bytesReduced = originalLength - compressedLength;
    const percentageReduced = (bytesReduced / originalLength) * 100;
    const estimatedTokensSaved = Math.ceil(bytesReduced / 4); // Rough token estimate
    
    return {
      originalLength,
      compressedLength,
      bytesReduced,
      percentageReduced,
      estimatedTokensSaved
    };
  }
}

// Export singleton instance
export const responseCompressor = new ResponseCompressor();