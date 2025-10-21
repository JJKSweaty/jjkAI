// Citation Mechanics - Format inline citations and source lists

export interface Source {
  index: number;
  url: string;
  title: string;
  published?: string;
  domain?: string;
}

export interface CitedText {
  text: string;
  citations: number[];
}

export class CitationFormatter {
  // Format inline citation (e.g., [1], [2], [1][2])
  static formatInlineCitation(indices: number[]): string {
    return indices.map(i => `[${i}]`).join('');
  }

  // Attach source list at the end of an answer
  static attachSourceList(answer: string, sources: Source[]): string {
    if (sources.length === 0) return answer;

    let output = answer;
    
    // Add separator if answer doesn't end with punctuation
    if (!/[.!?]$/.test(output.trim())) {
      output += '.';
    }

    output += '\n\n**Sources:**\n';

    sources.forEach(source => {
      const date = source.published 
        ? ` (${this.formatDate(source.published)})`
        : '';
      
      output += `[${source.index}] [${source.title}](${source.url})${date}\n`;
    });

    return output;
  }

  // Parse citations from text (extract [1], [2], etc.)
  static extractCitations(text: string): number[] {
    const pattern = /\[(\d+)\]/g;
    const citations = new Set<number>();
    
    let match;
    while ((match = pattern.exec(text)) !== null) {
      citations.add(parseInt(match[1], 10));
    }

    return Array.from(citations).sort((a, b) => a - b);
  }

  // Verify all citations are valid (reference existing sources)
  static validateCitations(text: string, sources: Source[]): {
    valid: boolean;
    invalid: number[];
  } {
    const citations = this.extractCitations(text);
    const validIndices = new Set(sources.map(s => s.index));
    const invalid = citations.filter(c => !validIndices.has(c));

    return {
      valid: invalid.length === 0,
      invalid,
    };
  }

  // Detect conflicting information from sources
  static detectConflicts(
    sources: Array<{ text: string; index: number }>
  ): Array<{
    topic: string;
    conflictingSources: number[];
  }> {
    // Simple conflict detection based on negation words near similar phrases
    // In production: use semantic similarity + negation detection
    const conflicts: Array<{ topic: string; conflictingSources: number[] }> = [];

    // Check for explicit disagreement keywords
    const disagreementPatterns = [
      /however[,\s]/i,
      /but[,\s]/i,
      /contrary to/i,
      /in contrast/i,
      /disagree/i,
      /dispute/i,
      /not accurate/i,
      /incorrect/i,
    ];

    sources.forEach((source, i) => {
      const hasDisagreement = disagreementPatterns.some(p => p.test(source.text));
      
      if (hasDisagreement && i > 0) {
        conflicts.push({
          topic: 'General disagreement detected',
          conflictingSources: [i, i + 1],
        });
      }
    });

    return conflicts;
  }

  // Format conflicting views attribution
  static formatConflict(
    statement1: string,
    source1: number,
    statement2: string,
    source2: number
  ): string {
    return `According to [${source1}], ${statement1}. However, [${source2}] states that ${statement2}.`;
  }

  // Normalize date to absolute format
  static normalizeDate(
    dateStr: string,
    userTimezone: string = 'UTC'
  ): string {
    try {
      const date = new Date(dateStr);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return dateStr;
      }

      // Return absolute date format
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: userTimezone,
      });
    } catch {
      return dateStr;
    }
  }

  // Format date for display (helper)
  private static formatDate(dateStr: string): string {
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

  // Convert relative dates to absolute
  static convertRelativeToAbsolute(text: string, referenceDate?: Date): string {
    const now = referenceDate || new Date();
    let result = text;

    // Replace relative time expressions
    const replacements: Array<[RegExp, () => string]> = [
      [/\btoday\b/gi, () => this.normalizeDate(now.toISOString())],
      [/\byesterday\b/gi, () => {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return this.normalizeDate(yesterday.toISOString());
      }],
      [/\blast week\b/gi, () => {
        const lastWeek = new Date(now);
        lastWeek.setDate(lastWeek.getDate() - 7);
        return `the week of ${this.normalizeDate(lastWeek.toISOString())}`;
      }],
      [/\blast month\b/gi, () => {
        const lastMonth = new Date(now);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return this.normalizeDate(lastMonth.toISOString());
      }],
      [/\brecently\b/gi, () => 'as of ' + this.normalizeDate(now.toISOString())],
    ];

    replacements.forEach(([pattern, replacement]) => {
      result = result.replace(pattern, replacement());
    });

    return result;
  }

  // Build attribution text for a fact
  static attributeFact(fact: string, sourceIndices: number[]): string {
    if (sourceIndices.length === 0) return fact;
    
    const citation = this.formatInlineCitation(sourceIndices);
    
    // If fact already ends with punctuation, insert citation before it
    if (/[.!?]$/.test(fact)) {
      return fact.slice(0, -1) + citation + fact.slice(-1);
    }
    
    return fact + citation;
  }

  // Merge duplicate citations (e.g., [1][1] → [1])
  static dedupeCitations(text: string): string {
    // Find sequences like [1][1] or [1][2][1]
    return text.replace(/(\[\d+\])+/g, (match) => {
      const indices = this.extractCitations(match);
      const unique = Array.from(new Set(indices)).sort((a, b) => a - b);
      return this.formatInlineCitation(unique);
    });
  }

  // Check if text has any citations
  static hasCitations(text: string): boolean {
    return /\[\d+\]/.test(text);
  }

  // Count citations in text
  static countCitations(text: string): number {
    const citations = this.extractCitations(text);
    return citations.length;
  }
}

// Helper class for building cited answers
export class CitedAnswerBuilder {
  private segments: Array<{ text: string; citations?: number[] }> = [];

  // Add text without citation
  addText(text: string): this {
    this.segments.push({ text });
    return this;
  }

  // Add cited text
  addCitedText(text: string, citations: number[]): this {
    this.segments.push({ text, citations });
    return this;
  }

  // Build final answer with inline citations
  build(): string {
    return this.segments
      .map(seg => {
        if (seg.citations && seg.citations.length > 0) {
          return CitationFormatter.attributeFact(seg.text, seg.citations);
        }
        return seg.text;
      })
      .join('');
  }

  // Build with source list attached
  buildWithSources(sources: Source[]): string {
    const answer = this.build();
    return CitationFormatter.attachSourceList(answer, sources);
  }
}

export const citationFormatter = CitationFormatter;