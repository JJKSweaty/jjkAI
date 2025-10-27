/**
 * Response compression utility for reducing token usage on the server
 */
export class ResponseCompressor {
  private static readonly PHRASE_REPLACEMENTS: [RegExp, string][] = [
    [/\bfor example\b/gi, 'e.g.'],
    [/\bfor instance\b/gi, 'e.g.'],
    [/\bthat is\b/gi, 'i.e.'],
    [/\bhowever\b/gi, 'but'],
    [/\btherefore\b/gi, 'so'],
    [/\badditionally\b/gi, 'also'],
    [/\bnevertheless\b/gi, 'still'],
    [/\bin order to\b/gi, 'to'],
    [/\bdue to the fact that\b/gi, 'because'],
  ];

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

  static compress(text: string, targetReduction = 0.3): string {
    if (!text || typeof text !== 'string') return '';

    let compressed = text
      .replace(/\s+/g, ' ')
      .replace(/\s+([.,;:!?])/g, '$1')
      .trim();

    for (const [pattern, replacement] of this.PHRASE_REPLACEMENTS) {
      compressed = compressed.replace(pattern, replacement);
    }

    const nonEssentialRegex = new RegExp(
      `\\b(${this.NON_ESSENTIAL_WORDS.join('|')})\\b`,
      'gi'
    );
    compressed = compressed.replace(nonEssentialRegex, '');

    compressed = compressed
      .replace(/\s+/g, ' ')
      .replace(/\s+([.,;:!?])/g, '$1')
      .trim();

    const targetLength = Math.floor(compressed.length * (1 - targetReduction));
    if (targetLength > 0 && compressed.length > targetLength) {
      compressed = compressed.substring(0, targetLength).replace(/\s+\S*$/, '');
      if (!/[.!?]$/.test(compressed)) compressed += '...';
    }

    return compressed;
  }

  static async optimizeForContext(text: string): Promise<string> {
    const firstPass = this.compress(text, 0.2);

    return firstPass
      .replace(/\s*\([^)]*\)/g, '')
      .replace(/,[^,]+?(?=,|$)/g, '')
      .replace(/\b(?:very|extremely|highly|incredibly|remarkably|exceptionally)\s+\w+\b/gi, '')
      .replace(/\b\w+ly\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  static estimateTokens(text: string): number {
    return Math.ceil((text?.length || 0) / 4);
  }
}

export const responseCompressor = new ResponseCompressor();
