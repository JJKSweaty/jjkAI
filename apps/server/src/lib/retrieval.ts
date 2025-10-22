/**
 * Document Retrieval - Full-text search with ranking
 * Supports keyword, vector, and hybrid search
 */

import { supabase } from "./supabase";
import type { DocumentChunk, CitationSource } from "../types/documents";
import { generateQueryEmbedding } from "./embeddings";

export interface SearchOptions {
  query: string;
  docIds?: string[]; // Filter by specific documents
  limit?: number; // Max results (default: 10)
  minScore?: number; // Minimum relevance score (0-1)
  mode?: "keyword" | "vector" | "hybrid"; // Search mode (default: keyword)
  keywordWeight?: number; // Weight for keyword score in hybrid (default: 0.3)
  vectorWeight?: number; // Weight for vector score in hybrid (default: 0.7)
}

export interface SearchResult {
  chunk: DocumentChunk;
  score: number; // Relevance score (0-1)
  rank: number; // Result position (1-indexed)
  keywordScore?: number; // Keyword score (hybrid mode only)
  vectorScore?: number; // Vector score (hybrid mode only)
}

/**
 * Search document chunks using full-text search, vector search, or hybrid
 * Returns ranked results with relevance scores
 */
export async function searchChunks(
  options: SearchOptions
): Promise<SearchResult[]> {
  if (!supabase) {
    throw new Error("Database not configured");
  }

  const {
    query,
    docIds,
    limit = 10,
    minScore = 0.01,
    mode = "keyword",
    keywordWeight = 0.3,
    vectorWeight = 0.7,
  } = options;

  // Keyword search (default)
  if (mode === "keyword") {
    const params: any = {
      search_query: query,
      max_results: limit,
      min_score: minScore,
    };

    if (docIds && docIds.length > 0) {
      params.filter_doc_ids = docIds;
    }

    const { data, error } = await supabase.rpc("search_chunks", params);

    if (error) {
      console.error("Keyword search error:", error);
      throw new Error(`Search failed: ${error.message}`);
    }

    return (data || []).map((row: any, index: number) => ({
      chunk: mapRowToChunk(row),
      score: row.score || 0,
      rank: index + 1,
    }));
  }

  // Vector search
  if (mode === "vector") {
    const embedding = await generateQueryEmbedding(query);

    const params: any = {
      query_embedding: JSON.stringify(embedding),
      max_results: limit,
      min_similarity: minScore,
    };

    if (docIds && docIds.length > 0) {
      params.filter_doc_ids = docIds;
    }

    const { data, error } = await supabase.rpc("search_chunks_vector", params);

    if (error) {
      console.error("Vector search error:", error);
      throw new Error(`Vector search failed: ${error.message}`);
    }

    return (data || []).map((row: any, index: number) => ({
      chunk: mapRowToChunk(row),
      score: row.similarity || 0,
      rank: index + 1,
    }));
  }

  // Hybrid search (keyword + vector)
  if (mode === "hybrid") {
    const embedding = await generateQueryEmbedding(query);

    const params: any = {
      search_query: query,
      query_embedding: JSON.stringify(embedding),
      max_results: limit,
      keyword_weight: keywordWeight,
      vector_weight: vectorWeight,
    };

    if (docIds && docIds.length > 0) {
      params.filter_doc_ids = docIds;
    }

    const { data, error } = await supabase.rpc("search_chunks_hybrid", params);

    if (error) {
      console.error("Hybrid search error:", error);
      throw new Error(`Hybrid search failed: ${error.message}`);
    }

    return (data || []).map((row: any, index: number) => ({
      chunk: mapRowToChunk(row),
      score: row.score || 0,
      keywordScore: row.keyword_score,
      vectorScore: row.vector_score,
      rank: index + 1,
    }));
  }

  throw new Error(`Invalid search mode: ${mode}`);
}

/**
 * Helper: Map database row to DocumentChunk
 */
function mapRowToChunk(row: any): DocumentChunk {
  return {
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
  };
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

/**
 * Thread-specific retrieval helpers
 */

/**
 * Check if a thread has any documents
 */
export async function hasThreadDocuments(threadId: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { data, error } = await supabase
      .from('documents')
      .select('doc_id')
      .eq('thread_id', threadId)
      .limit(1);

    return !error && !!data && data.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get all document IDs for a thread
 */
export async function getThreadDocumentIds(threadId: string): Promise<string[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('documents')
      .select('doc_id')
      .eq('thread_id', threadId);

    if (error || !data) return [];
    return data.map(d => d.doc_id);
  } catch {
    return [];
  }
}

/**
 * Search documents within a specific thread
 */
export async function searchThreadDocuments(
  threadId: string,
  query: string,
  options: Partial<SearchOptions> = {}
): Promise<SearchResult[]> {
  // Get document IDs for this thread
  const docIds = await getThreadDocumentIds(threadId);
  
  if (docIds.length === 0) {
    return [];
  }

  // Search within those documents
  return searchChunks({
    query,
    docIds,
    limit: options.limit || 5,
    mode: options.mode || 'keyword',
    ...options,
  });
}

/**
 * Get document summary for a thread
 */
export async function getThreadDocumentsSummary(threadId: string) {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('documents')
    .select('doc_id, title, filename, pages, chunk_count, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching thread documents:', error);
    return [];
  }

  return data || [];
}

/**
 * Get first N chunks from thread documents (fallback for "what is this about?" queries)
 * Retrieves leading chunks which typically contain summaries, intros, etc.
 */
export async function getFirstChunks(threadId: string, limit: number = 5): Promise<SearchResult[]> {
  if (!supabase) return [];

  // Get document IDs for this thread
  const docIds = await getThreadDocumentIds(threadId);
  if (docIds.length === 0) return [];

  // Get first chunks from these documents, ordered by page/position
  const { data, error } = await supabase
    .from('document_chunks')
    .select(`
      chunk_id,
      doc_id,
      text,
      page_start,
      page_end,
      section_path,
      block_ids,
      documents!inner (
        title,
        filename,
        mime_type,
        hash
      )
    `)
    .in('doc_id', docIds)
    .order('page_start', { ascending: true })
    .order('chunk_id', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching first chunks:', error);
    return [];
  }

  return (data || []).map((row: any, index: number) => ({
    chunk: {
      id: row.chunk_id,
      docId: row.doc_id,
      text: row.text,
      meta: {
        title: row.documents.title,
        sourceFilename: row.documents.filename,
        mime: row.documents.mime_type,
        pageStart: row.page_start,
        pageEnd: row.page_end,
        sectionPath: row.section_path,
        blockIds: row.block_ids || [],
        hash: row.documents.hash,
      },
    },
    score: 1.0 - (index * 0.1), // Decreasing score for later chunks
    rank: index + 1,
  }));
}
