/**
 * Document Extraction Orchestrator
 * Routes to appropriate parser based on MIME type
 */

import { v4 as uuid } from "uuid";
import type { UniversalDoc, ExtractionResult, FileDetectionResult } from "../types/documents";
import { detectFile, isSupportedMimeType } from "./fileDetection";
import { chunkDocument, chunkPlainText } from "./chunking";
import { extractPDF } from "./parsers/pdf";
import { extractDOCX } from "./parsers/docx";

/**
 * Main extraction function - routes to appropriate parser
 */
export async function extractDocument(
  buffer: Buffer,
  filename: string
): Promise<ExtractionResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Step 1: Detect file type
    const detection = await detectFile(buffer, filename);

    // Step 2: Check if supported
    if (!isSupportedMimeType(detection.mime)) {
      return {
        doc: createEmptyDoc(detection),
        chunks: [],
        status: "failed",
        errors: [`Unsupported file type: ${detection.mime}`],
      };
    }

    // Step 3: Extract based on MIME type
    let doc: UniversalDoc;

    switch (detection.mime) {
      case "application/pdf":
        doc = await extractPDF(buffer, filename, detection.hash);
        break;

      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      case "application/msword":
        doc = await extractDOCX(buffer, filename, detection.hash);
        break;

      case "text/plain":
      case "text/markdown":
        doc = extractPlainText(buffer, filename, detection);
        break;

      default:
        return {
          doc: createEmptyDoc(detection),
          chunks: [],
          status: "failed",
          errors: [`Parser not yet implemented for: ${detection.mime}`],
        };
    }

    // Step 4: Chunk the document
    const chunks = chunkDocument(doc);

    return {
      doc,
      chunks,
      status: "success",
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    console.error("Document extraction error:", error);
    return {
      doc: createEmptyDoc({
        mime: "application/octet-stream",
        hash: "",
        filename,
        size: buffer.length,
      }),
      chunks: [],
      status: "failed",
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

/**
 * Extract plain text files
 */
function extractPlainText(
  buffer: Buffer,
  filename: string,
  detection: FileDetectionResult
): UniversalDoc {
  const text = buffer.toString("utf-8");

  // Split into paragraphs
  const blocks = text
    .split(/\n{2,}/)
    .filter((p) => p.trim().length > 0)
    .map((p) => ({
      id: uuid(),
      type: "paragraph" as const,
      text: p.trim(),
    }));

  return {
    docId: uuid(),
    title: filename.replace(/\.[^.]+$/, ""),
    sourceFilename: filename,
    mime: detection.mime,
    createdAt: new Date().toISOString(),
    hash: detection.hash,
    blocks,
  };
}

/**
 * Create empty doc for error cases
 */
function createEmptyDoc(detection: FileDetectionResult): UniversalDoc {
  return {
    docId: uuid(),
    title: detection.filename.replace(/\.[^.]+$/, ""),
    sourceFilename: detection.filename,
    mime: detection.mime,
    createdAt: new Date().toISOString(),
    hash: detection.hash,
    blocks: [],
  };
}

/**
 * Check if document already exists by hash
 */
export async function documentExistsByHash(hash: string): Promise<string | null> {
  // TODO: Query database for existing document with this hash
  // For now, return null (no deduplication)
  return null;
}
