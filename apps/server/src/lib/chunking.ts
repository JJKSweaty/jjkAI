/**
 * Document Chunking - Page-aware splitting with overlap
 * Never split tables or code blocks mid-content
 */

import { v4 as uuid } from "uuid";
import type { UniversalDoc, DocumentBlock, DocumentChunk } from "../types/documents";

const TARGET_CHUNK_SIZE = 300; // tokens
const OVERLAP_SIZE = 50; // tokens (~10-15% overlap)

/**
 * Estimate token count (rough approximation)
 * Real tokenizer would be better, but this is fast
 */
function estimateTokens(text: string): number {
  // ~1 token per 4 characters (rough estimate)
  return Math.ceil(text.length / 4);
}

/**
 * Convert table to markdown format
 */
function tableToMarkdown(table: { headers: string[]; rows: string[][] }): string {
  const header = `| ${table.headers.join(" | ")} |`;
  const separator = `| ${table.headers.map(() => "---").join(" | ")} |`;
  const rows = table.rows.map((row) => `| ${row.join(" | ")} |`);
  return [header, separator, ...rows].join("\n");
}

/**
 * Convert block to text
 */
function blockToText(block: DocumentBlock): string {
  if (block.table) {
    return tableToMarkdown(block.table);
  }
  if (block.type === "heading" && block.meta?.level) {
    const prefix = "#".repeat(block.meta.level);
    return `${prefix} ${block.text || ""}`;
  }
  return block.text || "";
}

/**
 * Chunk blocks with page awareness and overlap
 * - Target 200-400 tokens per chunk
 * - 10-15% overlap to preserve context
 * - Never split tables or code blocks
 * - Don't cross page boundaries unless continuous paragraph
 */
export function chunkDocument(doc: UniversalDoc): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let buffer: DocumentBlock[] = [];
  let tokenCount = 0;
  let currentPage = doc.blocks[0]?.page ?? 1;

  for (let i = 0; i < doc.blocks.length; i++) {
    const block = doc.blocks[i];
    const blockText = blockToText(block);
    const blockTokens = estimateTokens(blockText);

    // Check if we need to split
    const wouldSplitTable = block.type === "table" && tokenCount > 0;
    const wouldSplitCode = block.type === "code" && tokenCount > 0;
    const pageBoundary = block.page && block.page !== currentPage;
    const tooLarge = tokenCount + blockTokens > TARGET_CHUNK_SIZE;

    const shouldSplit =
      wouldSplitTable ||
      wouldSplitCode ||
      (pageBoundary && tokenCount > 100) ||
      (tooLarge && tokenCount > 200);

    if (shouldSplit && buffer.length > 0) {
      // Create chunk from buffer
      chunks.push(createChunk(buffer, doc));

      // Overlap: keep last block if it's a paragraph and not too large
      const lastBlock = buffer[buffer.length - 1];
      const lastTokens = estimateTokens(blockToText(lastBlock));
      if (
        lastBlock.type === "paragraph" &&
        lastTokens < OVERLAP_SIZE &&
        lastTokens > 10
      ) {
        buffer = [lastBlock];
        tokenCount = lastTokens;
      } else {
        buffer = [];
        tokenCount = 0;
      }

      // Update current page
      if (block.page) {
        currentPage = block.page;
      }
    }

    // Add current block to buffer
    buffer.push(block);
    tokenCount += blockTokens;
  }

  // Final chunk
  if (buffer.length > 0) {
    chunks.push(createChunk(buffer, doc));
  }

  return chunks;
}

/**
 * Create a chunk from a buffer of blocks
 */
function createChunk(
  blocks: DocumentBlock[],
  doc: UniversalDoc
): DocumentChunk {
  const text = blocks.map(blockToText).join("\n\n");

  // Find page range
  const pages = blocks
    .map((b) => b.page)
    .filter((p): p is number => p !== undefined);
  const pageStart = pages.length > 0 ? Math.min(...pages) : undefined;
  const pageEnd = pages.length > 0 ? Math.max(...pages) : undefined;

  // Build section path from headings
  const headings = blocks.filter((b) => b.type === "heading");
  const sectionPath =
    headings.length > 0
      ? headings.map((h) => h.text).join(" > ")
      : undefined;

  return {
    id: uuid(),
    docId: doc.docId,
    text,
    meta: {
      title: doc.title,
      sourceFilename: doc.sourceFilename,
      mime: doc.mime,
      pageStart,
      pageEnd,
      sectionPath,
      blockIds: blocks.map((b) => b.id),
      hash: doc.hash,
    },
  };
}

/**
 * Chunk plain text (for simple files like TXT, Markdown)
 */
export function chunkPlainText(
  text: string,
  doc: Partial<UniversalDoc>
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  const paragraphs = text.split(/\n{2,}/);
  let buffer: string[] = [];
  let tokenCount = 0;

  for (const para of paragraphs) {
    const paraTokens = estimateTokens(para);

    if (tokenCount + paraTokens > TARGET_CHUNK_SIZE && buffer.length > 0) {
      chunks.push({
        id: uuid(),
        docId: doc.docId!,
        text: buffer.join("\n\n"),
        meta: {
          title: doc.title!,
          sourceFilename: doc.sourceFilename!,
          mime: doc.mime!,
          blockIds: [],
          hash: doc.hash!,
        },
      });

      // Overlap: keep last paragraph if small
      const lastPara = buffer[buffer.length - 1];
      const lastTokens = estimateTokens(lastPara);
      if (lastTokens < OVERLAP_SIZE && lastTokens > 10) {
        buffer = [lastPara];
        tokenCount = lastTokens;
      } else {
        buffer = [];
        tokenCount = 0;
      }
    }

    buffer.push(para);
    tokenCount += paraTokens;
  }

  if (buffer.length > 0) {
    chunks.push({
      id: uuid(),
      docId: doc.docId!,
      text: buffer.join("\n\n"),
      meta: {
        title: doc.title!,
        sourceFilename: doc.sourceFilename!,
        mime: doc.mime!,
        blockIds: [],
        hash: doc.hash!,
      },
    });
  }

  return chunks;
}
