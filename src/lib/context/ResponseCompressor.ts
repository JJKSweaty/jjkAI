/**
 * Response compression and optimization utility for reducing token usage
 */
export class ResponseCompressor {
  // Common phrase replacements for compression
  private static readonly PHRASE_REPLACEMENTS: [RegExp, string][] = [
    [/\bfor example\b/gi, 'e.g.'],
    [/\bthat is\b/gi, 'i.e.'],
    [/\bhowever\b/gi, 'but'],
    [/\btherefore\b/gi, 'so'],
    [/\badditionally\b/gi, 'also'],
    [/\bnevertheless\b/gi, 'still'],
    [/\bfor instance\b/gi, 'e.g.'],
    [/\bin order to\b/gi, 'to'],
    [/\bdue to the fact that\b/gi, 'because'],
    [/\n\s*\n\s*\n+/g, '\n\n']  // Remove extra newlines
  ];

  // Non-essential words that can often be removed
  private static readonly NON_ESSENTIAL_WORDS = [
    'very', 'really', 'quite', 'somewhat', 'slightly', 'highly', 'extremely',
    'completely', 'totally', 'absolutely', 'utterly', 'perfectly', 'practically',
    'virtually', 'nearly', 'almost', 'just', 'only', 'simply', 'literally',
    'basically', 'actually', 'generally', 'typically', 'usually', 'normally',
    'often', 'frequently', 'sometimes', 'occasionally', 'rarely', 'seldom',
    'constantly', 'continually', 'continuously', 'permanently', 'temporarily',
    'initially', 'finally', 'eventually', 'ultimately', 'consequently', 'thus',
    'hence', 'accordingly', 'furthermore', 'moreover', 'similarly', 'likewise',
    'nonetheless', 'indeed', 'certainly', 'definitely', 'probably', 'perhaps',
    'maybe', 'possibly', 'seem', 'seems', 'appear', 'appears', 'tend', 'tends'
  ];

  /**
   * Compress text to reduce token usage while preserving meaning
   * @param text Input text to compress
   * @param targetReduction Target reduction ratio (0-1)
   * @returns Compressed text
   */
  static compress(text: string, targetReduction = 0.3): string {
    if (!text || typeof text !== 'string') return '';
    
    // Remove extra whitespace and normalize
    let compressed = text
      .replace(/\s+/g, ' ')
      .replace(/\s+([.,;:!?])/g, '$1')
      .replace(/([^\s])\s+([.,;:!?])/g, '$1$2')
      .trim();

    // Apply phrase replacements
    for (const [pattern, replacement] of ResponseCompressor.PHRASE_REPLACEMENTS) {
      compressed = compressed.replace(pattern, replacement);
    }

    // Remove non-essential words
    const nonEssentialRegex = new RegExp(
      `\\b(${ResponseCompressor.NON_ESSENTIAL_WORDS.join('|')})\\b`,
      'gi'
    );
    compressed = compressed.replace(nonEssentialRegex, '');

    // Remove extra spaces that might have been created
    compressed = compressed
      .replace(/\s+/g, ' ')
      .replace(/\s+([.,;:!?])/g, '$1')
      .trim();

    // Calculate target length and truncate if needed
    const targetLength = Math.floor(compressed.length * (1 - targetReduction));
    if (compressed.length > targetLength) {
      compressed = compressed.substring(0, targetLength).replace(/\s+\S*$/, '');
      if (!/[.!?]$/.test(compressed)) compressed += '...';
    }

    return compressed;
  }

  /**
   * Optimize text for context usage (more aggressive compression)
   * @param text Text to optimize
   * @returns Optimized text
   */
  static async optimizeForContext(text: string): Promise<string> {
    // First pass with standard compression
    let optimized = this.compress(text, 0.2);
    
    // Additional context-specific optimizations
    optimized = optimized
      // Remove optional sentence components in parentheses
      .replace(/\s*\([^)]*\)/g, '')
      // Remove optional sentence components after commas
      .replace(/,[^,]+?(?=,|$)/g, '')
      // Remove redundant adjectives
      .replace(/\b(?:very|extremely|highly|incredibly|remarkably|exceptionally)\s+\w+\b/gi, '')
      // Remove unnecessary adverbs
      .replace(/\b\w+ly\b/gi, '')
      // Clean up any double spaces
      .replace(/\s+/g, ' ')
      .trim();

    return optimized;
  }

  /**
   * Estimate token count (rough approximation)
   */
  static estimateTokens(text: string): number {
    // Rough estimate: ~1 token per 4 characters in English
    return Math.ceil(text.length / 4);
  }
}

// Export a singleton instance
export const responseCompressor = new ResponseCompressor();
