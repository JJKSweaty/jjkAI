/**
 * DOCX Parser - Extract text from Word documents with structure preservation
 * Uses mammoth to convert DOCX to clean HTML/text with heading detection
 */

import mammoth from "mammoth";
import { v4 as uuid } from "uuid";
import type { UniversalDoc, DocumentBlock } from "../../types/documents";

/**
 * Extract DOCX to UniversalDoc
 */
export async function extractDOCX(
  buffer: Buffer,
  filename: string,
  hash: string
): Promise<UniversalDoc> {
  try {
    // Extract with structure (HTML for better formatting detection)
    const result = await mammoth.convertToHtml({ buffer });
    
    // Parse HTML to extract structured content
    const blocks = parseHTML(result.value);
    
    return {
      docId: uuid(),
      title: filename.replace(/\.docx?$/i, ""),
      sourceFilename: filename,
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      createdAt: new Date().toISOString(),
      hash,
      blocks,
    };
  } catch (error) {
    console.error(`Error parsing DOCX "${filename}":`, error);
    throw new Error(`Failed to parse DOCX: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Parse HTML to extract blocks
 * Simple parser - for production, use jsdom or htmlparser2
 */
function parseHTML(html: string): DocumentBlock[] {
  const blocks: DocumentBlock[] = [];
  
  // Match headings: <h1>, <h2>, etc.
  const headingRegex = /<h([1-6])>(.*?)<\/h\1>/gi;
  const paragraphRegex = /<p>(.*?)<\/p>/gi;
  const listItemRegex = /<li>(.*?)<\/li>/gi;
  
  // Track position for ordering
  let position = 0;
  const elements: Array<{ pos: number; block: DocumentBlock }> = [];
  
  // Extract headings
  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1]);
    const text = stripTags(match[2]).trim();
    
    if (text) {
      elements.push({
        pos: match.index,
        block: {
          id: uuid(),
          type: "heading",
          text,
          meta: { level },
        },
      });
    }
  }
  
  // Extract paragraphs
  while ((match = paragraphRegex.exec(html)) !== null) {
    const text = stripTags(match[1]).trim();
    
    if (text) {
      elements.push({
        pos: match.index,
        block: {
          id: uuid(),
          type: "paragraph",
          text,
        },
      });
    }
  }
  
  // Extract list items
  while ((match = listItemRegex.exec(html)) !== null) {
    const text = stripTags(match[1]).trim();
    
    if (text) {
      elements.push({
        pos: match.index,
        block: {
          id: uuid(),
          type: "list",
          text: `• ${text}`,
        },
      });
    }
  }
  
  // Sort by position in document
  elements.sort((a, b) => a.pos - b.pos);
  
  return elements.map((e) => e.block);
}

/**
 * Strip HTML tags from text
 */
function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, "") // Remove tags
    .replace(/&nbsp;/g, " ") // Replace nbsp
    .replace(/&amp;/g, "&") // Replace amp
    .replace(/&lt;/g, "<") // Replace lt
    .replace(/&gt;/g, ">") // Replace gt
    .replace(/&quot;/g, '"') // Replace quot
    .replace(/&#39;/g, "'"); // Replace apos
}
