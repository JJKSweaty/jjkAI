/**
 * File Detection - MIME type detection with magic bytes
 * Don't trust file extensions - verify content
 */

import { fileTypeFromBuffer } from "file-type";
import crypto from "crypto";
import type { FileDetectionResult } from "../types/documents.js";

/**
 * Guess MIME type from file extension (fallback)
 */
function guessMimeByExtension(filename: string): string | null {
  const ext = filename.toLowerCase().split(".").pop();
  const map: Record<string, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ppt: "application/vnd.ms-powerpoint",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls: "application/vnd.ms-excel",
    csv: "text/csv",
    txt: "text/plain",
    md: "text/markdown",
    html: "text/html",
    htm: "text/html",
    json: "application/json",
    xml: "application/xml",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    mp4: "video/mp4",
  };
  return ext ? (map[ext] ?? null) : null;
}

/**
 * Detect file type using magic bytes + extension fallback
 * Compute SHA256 hash for deduplication
 */
export async function detectFile(
  buffer: Buffer,
  filename: string
): Promise<FileDetectionResult> {
  // Magic bytes detection (most reliable)
  const fileType = await fileTypeFromBuffer(buffer);
  
  // Fallback to extension
  const extensionGuess = guessMimeByExtension(filename);
  
  // Use magic bytes if available, otherwise extension
  const mime =
    fileType?.mime ?? extensionGuess ?? "application/octet-stream";
  
  // Compute content hash (SHA256) for deduplication
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  
  return {
    mime,
    hash,
    filename,
    size: buffer.length,
  };
}

/**
 * Check if MIME type is supported for extraction
 */
export function isSupportedMimeType(mime: string): boolean {
  const supported = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
    "text/plain",
    "text/markdown",
    "text/html",
    "image/png",
    "image/jpeg",
    "image/gif",
  ];
  return supported.includes(mime);
}

/**
 * Get human-readable file type label
 */
export function getFileTypeLabel(mime: string): string {
  const labels: Record<string, string> = {
    "application/pdf": "PDF Document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "Word Document",
    "application/msword": "Word Document (Legacy)",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      "PowerPoint Presentation",
    "application/vnd.ms-powerpoint": "PowerPoint (Legacy)",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      "Excel Spreadsheet",
    "application/vnd.ms-excel": "Excel (Legacy)",
    "text/csv": "CSV Spreadsheet",
    "text/plain": "Text File",
    "text/markdown": "Markdown Document",
    "text/html": "HTML Document",
    "image/png": "PNG Image",
    "image/jpeg": "JPEG Image",
    "image/gif": "GIF Image",
  };
  return labels[mime] ?? "Unknown File";
}
