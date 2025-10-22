/**
 * Document Retrieval - Full-text search with ranking
 * Uses PostgreSQL FTS (to_tsvector, ts_rank) for BM25-style keyword search
 */

import { supabase } from "./supabase";
import type { DocumentChunk, CitationSource } from "../types/documents";

export interface SearchOptions {
  query: string;
  docIds?: string[]; // Filter by specific documents
  limit?: number; // Max results (default: 10)
  minScore?: number; // Minimum relevance score (0-1)
}

export interface SearchResult {
  chunk: DocumentChunk;
  score: number; // Relevance score (0-1)
  rank: number; // Result position (1-indexed)
}

/**
 * Search document chunks using full-text search
 * Returns ranked results with relevance scores
 */
export async function searchChunks(
  options: SearchOptions
): Promise<SearchResult[]> {
  if (!supabase) {
    throw new Error("Database not configured");
  }

  const { query, docIds, limit = 10, minScore = 0.01 } = options;

  // Call PostgreSQL function with all parameters
  // Uses ts_rank for relevance scoring
  const { data, error } = await supabase.rpc("search_chunks", {
    search_query: query,
    max_results: limit,
    min_score: minScore,
    filter_doc_ids: docIds || null,
  });

  if (error) {
    console.error("Search error:", error);
    throw new Error(`Search failed: ${error.message}`);
  }

  // Map results to SearchResult format
  return (data || []).map((row: any, index: number) => ({
    chunk: {
      id: row.chunk_id,
      docId: row.doc_id,
      text: row.text,
      meta: {
        title: row.title,
        sourceFilename: row.filename,
        mime: row.mime_type,
        pageStart: row.page_start,
        pageEnd: row.page_end,
        sectionPath: row.section_path,
        blockIds: row.block_ids || [],
        hash: row.hash,
      },
    },
    score: row.score || 0,
    rank: index + 1,
  }));
}

/**
 * Generate citations from search results
 * Groups by document and formats with page numbers
 */
export function generateCitations(
  results: SearchResult[]
): CitationSource[] {
  const citationMap = new Map<string, CitationSource>();

  results.forEach((result) => {
    const docId = result.chunk.docId;

    if (!citationMap.has(docId)) {
      citationMap.set(docId, {
        index: citationMap.size + 1,
        docId,
        title: result.chunk.meta.title,
        filename: result.chunk.meta.sourceFilename,
        pageStart: result.chunk.meta.pageStart,
        pageEnd: result.chunk.meta.pageEnd,
      });
    } else {
      // Extend page range if needed
      const existing = citationMap.get(docId)!;
      if (result.chunk.meta.pageStart && existing.pageStart) {
        existing.pageStart = Math.min(
          existing.pageStart,
          result.chunk.meta.pageStart
        );
      }
      if (result.chunk.meta.pageEnd && existing.pageEnd) {
        existing.pageEnd = Math.max(
          existing.pageEnd,
          result.chunk.meta.pageEnd
        );
      }
    }
  });

  return Array.from(citationMap.values());
}

/**
 * Format citation for display
 * Examples:
 *   [1] "Annual Report 2024" — pages 12-13
 *   [2] "Product Spec" — page 7
 *   [3] "Presentation" — Slide 5
 */
export function formatCitation(citation: CitationSource): string {
  let location = "";

  if (citation.slideNumber) {
    location = `Slide ${citation.slideNumber}`;
  } else if (citation.pageStart && citation.pageEnd) {
    if (citation.pageStart === citation.pageEnd) {
      location = `page ${citation.pageStart}`;
    } else {
      location = `pages ${citation.pageStart}-${citation.pageEnd}`;
    }
  } else if (citation.sheetName && citation.cellRange) {
    location = `Sheet: ${citation.sheetName}, ${citation.cellRange}`;
  } else if (citation.sheetName) {
    location = `Sheet: ${citation.sheetName}`;
  }

  return `[${citation.index}] "${citation.title}"${location ? ` — ${location}` : ""}`;
}

/**
 * Build context for LLM from search results
 * Formats chunks with citation markers and metadata
 */
export function buildContext(
  results: SearchResult[],
  citations: CitationSource[]
): string {
  const citationMap = new Map(
    citations.map((c) => [c.docId, c.index])
  );

  const contextChunks = results.map((result) => {
    const citationIndex = citationMap.get(result.chunk.docId) || 0;
    const pageInfo = result.chunk.meta.pageStart
      ? ` (p.${result.chunk.meta.pageStart}${
          result.chunk.meta.pageEnd &&
          result.chunk.meta.pageEnd !== result.chunk.meta.pageStart
            ? `-${result.chunk.meta.pageEnd}`
            : ""
        })`
      : "";

    const header = `[${citationIndex}] ${result.chunk.meta.title}${pageInfo}`;
    const section = result.chunk.meta.sectionPath
      ? `Section: ${result.chunk.meta.sectionPath}`
      : "";

    return `${header}${section ? `\n${section}` : ""}\n${result.chunk.text}`;
  });

  return contextChunks.join("\n\n---\n\n");
}
