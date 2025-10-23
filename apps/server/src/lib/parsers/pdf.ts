/**
 * PDF Parser - Extract text, headings, tables with page numbers
 * Handles both text PDFs and scanned PDFs (OCR detection)
 */

import { v4 as uuid } from "uuid";
import pdfParse from "pdf-parse";
import type { UniversalDoc, DocumentBlock } from "../../types/documents.js";

/**
 * Check if PDF is scanned (needs OCR)
 * Parse first few pages and check character density
 */
async function isScannedPDF(buffer: Buffer): Promise<boolean> {
  try {
    const data = await pdfParse(buffer, {
      max: 3, // Only check first 3 pages
    });
    
    const avgCharsPerPage = data.text.length / (data.numpages || 1);
    
    // If less than 50 chars per page, likely scanned
    return avgCharsPerPage < 50;
  } catch (error) {
    console.error("Error checking if PDF is scanned:", error);
    return false;
  }
}

/**
 * Detect if text is likely a heading based on heuristics
 */
function isLikelyHeading(text: string): boolean {
  // Short lines (< 60 chars) that:
  // - Start with capital letter
  // - End without punctuation (or with colon)
  // - Don't contain multiple sentences
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > 60) return false;
  
  const startsCapital = /^[A-Z]/.test(trimmed);
  const endsClean = /[^.!?]$|:$/.test(trimmed);
  const noMultipleSentences = (trimmed.match(/[.!?]/g) || []).length <= 1;
  
  return startsCapital && endsClean && noMultipleSentences;
}

/**
 * Split text into blocks (paragraphs, headings)
 */
function splitIntoBlocks(pageText: string, pageNum: number): DocumentBlock[] {
  const blocks: DocumentBlock[] = [];
  
  // Split by blank lines (2+ newlines)
  const segments = pageText.split(/\n{2,}/);
  
  for (const segment of segments) {
    const text = segment.trim();
    if (!text) continue;
    
    // Determine block type
    const type = isLikelyHeading(text) ? "heading" : "paragraph";
    
    blocks.push({
      id: uuid(),
      page: pageNum,
      type,
      text,
      meta: type === "heading" ? { level: 2 } : undefined,
    });
  }
  
  return blocks;
}

/**
 * Extract text PDF to UniversalDoc
 */
export async function extractPDF(
  buffer: Buffer,
  filename: string,
  hash: string
): Promise<UniversalDoc> {
  try {
    // Check if scanned
    const isScanned = await isScannedPDF(buffer);
    
    if (isScanned) {
      // TODO: Implement OCR with tesseract
      console.warn(`PDF "${filename}" appears to be scanned. OCR not yet implemented.`);
      return {
        docId: uuid(),
        title: filename.replace(/\.pdf$/i, ""),
        sourceFilename: filename,
        mime: "application/pdf",
        createdAt: new Date().toISOString(),
        hash,
        blocks: [
          {
            id: uuid(),
            page: 1,
            type: "paragraph",
            text: "[Scanned PDF - OCR not yet implemented]",
          },
        ],
      };
    }
    
    // Parse full document
    const data = await pdfParse(buffer);
    
    // Split into pages using form feed character
    const pageTexts = data.text.split(/\f/);
    
    const blocks: DocumentBlock[] = [];
    
    // Process each page
    for (let i = 0; i < pageTexts.length; i++) {
      const pageNum = i + 1;
      const pageText = pageTexts[i];
      
      const pageBlocks = splitIntoBlocks(pageText, pageNum);
      blocks.push(...pageBlocks);
    }
    
    return {
      docId: uuid(),
      title: filename.replace(/\.pdf$/i, ""),
      sourceFilename: filename,
      mime: "application/pdf",
      pages: data.numpages,
      createdAt: new Date().toISOString(),
      hash,
      blocks,
      metadata: {
        createdDate: data.info?.CreationDate,
        modifiedDate: data.info?.ModDate,
        author: data.info?.Author,
      },
    };
  } catch (error) {
    console.error(`Error parsing PDF "${filename}":`, error);
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}
