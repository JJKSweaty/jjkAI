# JJK.AI Test Document

This is a test document for the document processing system.

## Introduction

The document processing system can handle multiple file types including PDF, DOCX, TXT, and Markdown files.

## Features

- File detection using magic bytes
- SHA256 hash-based deduplication
- Page-aware chunking
- Structured content extraction

## Technical Details

The system uses a pipeline approach:

1. **Upload** - User uploads file
2. **Detect** - Verify MIME type and compute hash
3. **Extract** - Parse content with appropriate parser
4. **Normalize** - Convert to UniversalDoc format
5. **Chunk** - Split into retrieval-optimized chunks
6. **Store** - Save to database with metadata

## Code Example

Here's a simple example:

```typescript
const result = await extractDocument(buffer, filename);
console.log(`Extracted ${result.chunks.length} chunks`);
```

## Conclusion

This document processing system enables JJK.AI to read and cite documents with accurate page numbers and structured content.
