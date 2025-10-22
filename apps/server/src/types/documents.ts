/**
 * Universal Document Format
 * All file types (PDF, DOCX, PPTX, etc.) normalize to this schema
 */

export type BlockType = 
  | "heading" 
  | "paragraph" 
  | "table" 
  | "code" 
  | "figure" 
  | "caption" 
  | "list";

export interface DocumentBlock {
  id: string;                     // stable UUID
  page?: number;                  // slide or page index (1-based)
  type: BlockType;
  text?: string;                  // markdown-safe text
  table?: {
    headers: string[];
    rows: string[][];
  };
  meta?: {
    bbox?: number[];              // [x, y, width, height] for PDF
    lang?: string;                // detected language
    level?: number;               // heading level (1-6)
    path?: string;                // section path like "Chapter 1 > Section 1.1"
    slideTitle?: string;          // for PPTX
    sheetName?: string;           // for XLSX
  };
}

export interface UniversalDoc {
  docId: string;
  title: string;
  sourceFilename: string;
  mime: string;
  pages?: number;
  createdAt: string;
  hash: string;                   // SHA256 for deduplication
  blocks: DocumentBlock[];
  metadata?: {
    author?: string;
    createdDate?: string;
    modifiedDate?: string;
    keywords?: string[];
    language?: string;
  };
}

export interface DocumentChunk {
  id: string;
  docId: string;
  text: string;                   // concatenated markdown from blocks
  embedding?: number[];           // vector for retrieval
  meta: {
    title: string;
    sourceFilename: string;
    mime: string;
    pageStart?: number;
    pageEnd?: number;
    sectionPath?: string;
    blockIds: string[];           // blocks included in this chunk
    hash: string;
  };
}

export interface FileDetectionResult {
  mime: string;
  hash: string;
  filename: string;
  size: number;
  isScanned?: boolean;            // for PDFs
}

export interface ExtractionResult {
  doc: UniversalDoc;
  chunks: DocumentChunk[];
  status: "success" | "partial" | "failed";
  errors?: string[];
  warnings?: string[];
}

export interface CitationSource {
  index: number;                  // [1], [2], etc.
  docId: string;
  title: string;
  filename: string;
  pageStart?: number;
  pageEnd?: number;
  slideNumber?: number;
  sheetName?: string;
  cellRange?: string;             // e.g., "A2:D20"
  url?: string;                   // deep link to exact page/section
}

export interface RetrievalResult {
  answer: string;
  citations: CitationSource[];
  chunks: DocumentChunk[];
  confidence: number;
}
