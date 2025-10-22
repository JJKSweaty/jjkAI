# Document Processing & RAG System

Production-ready document processing system for JJK.AI that enables the AI to read, understand, and cite PDFs, DOCX, PPTX, and other documents.

## Architecture Overview

```
Upload → Detect → Extract → Normalize → Chunk → Embed → Store → Retrieve → Cite
```

### Pipeline Stages

1. **Upload**: User uploads file via multipart form
2. **Detect**: MIME detection with magic bytes + SHA256 hash
3. **Extract**: Type-specific parsers (PDF, DOCX, PPTX, etc.)
4. **Normalize**: Convert to UniversalDoc format
5. **Chunk**: Page-aware splitting with overlap
6. **Embed**: Generate vector embeddings (TODO)
7. **Store**: Save to Supabase (documents + chunks)
8. **Retrieve**: Hybrid search (keyword + vector)
9. **Cite**: Generate citations with page numbers

## File Support

### Currently Implemented ✅
- **PDF**: Text-based PDFs with page numbers
- **DOCX**: Word documents with headings/paragraphs
- **TXT/MD**: Plain text and Markdown

### Coming Soon 🚧
- **Scanned PDFs**: OCR with Tesseract
- **PPTX**: PowerPoint with slide numbers
- **XLSX/CSV**: Spreadsheets with table preservation
- **HTML**: Web pages with Readability
- **Images**: OCR for text extraction
- **Audio**: Transcription with Whisper

## Data Schema

### UniversalDoc Format

All file types normalize to this structure:

```typescript
{
  docId: "uuid",
  title: "Document Title",
  sourceFilename: "report.pdf",
  mime: "application/pdf",
  pages: 42,
  hash: "sha256...",
  blocks: [
    {
      id: "block-uuid",
      page: 5,
      type: "heading" | "paragraph" | "table" | "code" | "figure",
      text: "Content here",
      meta: { level: 2, bbox: [x, y, w, h] }
    }
  ]
}
```

### Document Chunks

Chunks are optimized for retrieval:

```typescript
{
  id: "chunk-uuid",
  docId: "doc-uuid",
  text: "concatenated markdown from blocks",
  embedding: [0.1, 0.2, ...],  // 1536-dim vector
  meta: {
    title: "Document Title",
    pageStart: 5,
    pageEnd: 7,
    sectionPath: "Chapter 1 > Section 1.1",
    blockIds: ["block-1", "block-2"]
  }
}
```

## Chunking Strategy

### Rules
- Target: 200-400 tokens per chunk
- Overlap: 10-15% (last paragraph from previous chunk)
- **Never split**:
  - Tables
  - Code blocks
  - Page boundaries (unless continuous paragraph)

### Example

```
Page 5: [heading] [para1] [para2] [table]
       └─ Chunk 1: heading + para1 + para2
       └─ Chunk 2: table (standalone, not split)

Page 6: [para3] [para4] [para5]
       └─ Chunk 3: para3 + para4 (with para2 overlap)
       └─ Chunk 4: para4 + para5 (with para4 overlap)
```

## PDF Parsing

### Text PDFs
- Uses `pdf-parse` for extraction
- Splits by form feed (`\f`) for pages
- Detects headings via heuristics:
  - Short lines (< 60 chars)
  - Start with capital
  - No ending punctuation or colon
- Preserves page numbers for citations

### Scanned PDFs (TODO)
- Detect: < 50 chars/page = scanned
- OCR with Tesseract + language packs
- Preserve page structure for citations

## DOCX Parsing

- Uses `mammoth` for conversion to HTML
- Extracts:
  - Headings (H1-H6) with levels
  - Paragraphs
  - Lists (converted to markdown)
- Strips HTML tags cleanly
- Preserves document structure

## API Endpoints

### `POST /api/documents/upload`
Upload and process a document.

**Request**: `multipart/form-data` with file

**Response**:
```json
{
  "success": true,
  "document": {
    "id": "uuid",
    "title": "Report 2024",
    "filename": "report.pdf",
    "mime": "application/pdf",
    "pages": 42,
    "blocks": 156,
    "chunks": 38,
    "status": "success"
  },
  "warnings": []
}
```

### `GET /api/documents`
List all uploaded documents.

### `GET /api/documents/:docId`
Get document details.

### `DELETE /api/documents/:docId`
Delete document and all chunks.

## Database Schema

```sql
-- Documents table
CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  doc_id UUID UNIQUE,
  title TEXT,
  filename TEXT,
  mime_type TEXT,
  hash TEXT,  -- SHA256 for deduplication
  pages INTEGER,
  block_count INTEGER,
  chunk_count INTEGER,
  status TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
);

-- Chunks table with vector embeddings
CREATE TABLE document_chunks (
  id BIGSERIAL PRIMARY KEY,
  chunk_id UUID UNIQUE,
  doc_id UUID REFERENCES documents(doc_id),
  text TEXT,
  page_start INTEGER,
  page_end INTEGER,
  section_path TEXT,
  block_ids JSONB,
  embedding vector(1536),  -- pgvector
  created_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_documents_hash ON documents(hash);
CREATE INDEX idx_chunks_doc_id ON document_chunks(doc_id);
CREATE INDEX idx_chunks_text_fts ON document_chunks USING gin(to_tsvector('english', text));
-- CREATE INDEX idx_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops);
```

## Citation Format

### PDF/DOCX
```
[1] "Annual Report 2024" — pages 12-13
[2] "Product Spec v2.1" — page 7
```

### PPTX (Coming Soon)
```
[1] "Q4 Presentation" — Slide 5
[2] "Product Roadmap" — Slides 7-9
```

### XLSX (Coming Soon)
```
[1] "Sales Data" — Sheet: Q4, A2:D20
```

## Installation

### Required Packages

```bash
cd apps/server
npm install file-type pdf-parse mammoth uuid @fastify/multipart
npm install -D @types/pdf-parse @types/uuid
```

### Database Setup

```bash
# Run migration in Supabase
psql -h your-db.supabase.co -U postgres -d postgres -f database/documents_schema.sql

# Enable pgvector extension (for embeddings)
CREATE EXTENSION IF NOT EXISTS vector;
```

## Usage Example

### Upload Document

```typescript
const formData = new FormData();
formData.append('file', fileBlob, 'report.pdf');

const response = await fetch('http://localhost:8787/api/documents/upload', {
  method: 'POST',
  body: formData,
});

const result = await response.json();
console.log(result.document.chunks); // 38 chunks ready for RAG
```

### Query with Citations (TODO)

```typescript
const response = await fetch('/api/chat/with-docs', {
  method: 'POST',
  body: JSON.stringify({
    query: "What was the revenue in Q4?",
    docIds: ["doc-uuid-1", "doc-uuid-2"]
  })
});

// Response includes citations
{
  "answer": "Q4 revenue was $5.2M [1], up 23% from Q3 [2].",
  "citations": [
    {
      "index": 1,
      "title": "Annual Report 2024",
      "pageStart": 12,
      "pageEnd": 13
    }
  ]
}
```

## Roadmap

### Phase 1: Core Extraction ✅
- [x] File detection (magic bytes + hash)
- [x] PDF parser (text-based)
- [x] DOCX parser
- [x] Plain text/Markdown
- [x] UniversalDoc schema
- [x] Page-aware chunking
- [x] Database schema
- [x] Upload API

### Phase 2: Advanced Parsing 🚧
- [ ] Scanned PDF OCR (Tesseract)
- [ ] PPTX parser (slides + notes)
- [ ] XLSX parser (tables preserved)
- [ ] HTML parser (Readability)
- [ ] Image OCR
- [ ] Table detection (Camelot/Tabula)

### Phase 3: Embeddings & Retrieval 🚧
- [ ] Generate embeddings (OpenAI/local)
- [ ] Vector search (pgvector)
- [ ] Hybrid search (BM25 + vector)
- [ ] Re-ranking
- [ ] Citation generation

### Phase 4: UI & UX 🚧
- [ ] File upload component
- [ ] Processing status indicator
- [ ] Document library view
- [ ] Click-to-page navigation
- [ ] "Find in doc" search
- [ ] Source chips in responses

### Phase 5: Production Features 🚧
- [ ] Background job queue (BullMQ)
- [ ] Streaming extraction
- [ ] Hash-based deduplication
- [ ] PII redaction
- [ ] Password-protected PDFs
- [ ] Multi-user permissions

## Performance Tips

1. **Stream large files**: Process page-by-page instead of loading entire file
2. **Cache embeddings**: Check hash before re-processing
3. **Queue long jobs**: OCR/PPTX extraction via BullMQ
4. **Materialize TOC**: Pre-compute table of contents for fast navigation
5. **Rate-limit OCR**: CPU-intensive, use worker pool

## Security Considerations

- ✅ Validate MIME types (don't trust extensions)
- ✅ Compute SHA256 hash for deduplication
- ⚠️ TODO: Strip hidden content (tracked changes, comments)
- ⚠️ TODO: Redact PII (configurable)
- ⚠️ TODO: Handle password-protected PDFs
- ⚠️ TODO: Sanitize HTML (DOMPurify)
- ✅ Record provenance (who uploaded, when)

## Testing Checklist

- [ ] PDF with selectable text → headings preserved, page numbers correct
- [ ] Scanned PDF → OCR triggers, language detected
- [ ] DOCX with lists/tables → structure preserved
- [ ] Large file (100+ pages) → streams, doesn't timeout
- [ ] Duplicate upload → hash match, skips re-processing
- [ ] Invalid file → fails gracefully with error
- [ ] Citation accuracy → page numbers match source

## Troubleshooting

### "PDF returns empty text"
- **Cause**: Scanned PDF with no selectable text
- **Fix**: Enable OCR (Tesseract integration coming soon)

### "Tables are garbled"
- **Cause**: PDF tables have complex structure
- **Fix**: Use table-aware parser (Camelot/Tabula) - TODO

### "Answers cite wrong page"
- **Cause**: Chunks lost page metadata during splitting
- **Fix**: Ensure page-aware chunking preserves pageStart/pageEnd

### "High latency on big docs"
- **Cause**: Processing entire 100+ page PDF synchronously
- **Fix**: Stream extraction, queue embedding jobs

## References

- [pdf-parse](https://www.npmjs.com/package/pdf-parse) - PDF text extraction
- [mammoth](https://www.npmjs.com/package/mammoth) - DOCX to HTML/text
- [file-type](https://www.npmjs.com/package/file-type) - Magic byte detection
- [pgvector](https://github.com/pgvector/pgvector) - Postgres vector extension
- [Tesseract](https://tesseract-ocr.github.io/) - OCR engine (planned)

## License

MIT
