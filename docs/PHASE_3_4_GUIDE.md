# Phase 3 & 4 Implementation Guide

## Phase 3: Embeddings + Vector Search ✨

### Overview
Phase 3 adds semantic search capabilities using OpenAI embeddings and pgvector for similarity search.

### What's New
- **Embedding Generation**: Automatic embedding generation for all uploaded documents
- **Vector Search**: Semantic similarity search using pgvector
- **Hybrid Search**: Combines keyword (BM25) + vector (semantic) search for best results
- **Search Modes**: Choose between `keyword`, `vector`, or `hybrid` search

### Setup Instructions

#### 1. Install Dependencies

```bash
# Server dependencies
cd apps/server
npm install openai

# Frontend dependencies
cd ../..
npm install @radix-ui/react-progress
```

#### 2. Enable pgvector in Supabase

Go to Supabase SQL Editor and run:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
```

#### 3. Run Vector Search Migration

Copy and run `database/vector_search.sql` in Supabase SQL Editor. This creates:
- `search_chunks_vector()` function for semantic search
- `search_chunks_hybrid()` function for combined search
- Vector index on `document_chunks.embedding` column

#### 4. Add OpenAI API Key

Add to your `.env` file:

```bash
OPENAI_API_KEY=sk-...
```

#### 5. Restart Server

```bash
cd apps/server
npm run dev
```

### How It Works

#### Automatic Embedding Generation

When you upload a document, embeddings are automatically generated:

```typescript
// apps/server/src/routes/documents.ts
const embeddingResults = await generateEmbeddingBatch(
  result.chunks.map((c) => c.text)
);
```

#### Search Modes

**Keyword Search** (default without OpenAI key):
```bash
curl -X POST http://localhost:8787/api/chat/with-docs \
  -H "Content-Type: application/json" \
  -d '{"query": "document processing", "searchMode": "keyword"}'
```

**Vector Search** (semantic similarity):
```bash
curl -X POST http://localhost:8787/api/chat/with-docs \
  -H "Content-Type: application/json" \
  -d '{"query": "how files are handled", "searchMode": "vector"}'
```

**Hybrid Search** (best of both - DEFAULT with OpenAI key):
```bash
curl -X POST http://localhost:8787/api/chat/with-docs \
  -H "Content-Type: application/json" \
  -d '{"query": "document processing system", "searchMode": "hybrid"}'
```

#### Hybrid Search Weights

Customize the balance between keyword and vector scores:

```bash
curl -X POST http://localhost:8787/api/chat/with-docs \
  -H "Content-Type: application/json" \
  -d '{
    "query": "document processing",
    "searchMode": "hybrid",
    "keywordWeight": 0.3,
    "vectorWeight": 0.7
  }'
```

### Files Created

- `apps/server/src/lib/embeddings.ts` - OpenAI embedding generation
- `apps/server/src/lib/retrieval.ts` - Updated with vector/hybrid search
- `database/vector_search.sql` - PostgreSQL functions for vector search

---

## Phase 4: File Upload UI 🎨

### Overview
Phase 4 adds a complete document management interface with drag-drop upload, document library, and citation display.

### Components

#### 1. DocumentUploader
Drag-and-drop file upload with progress tracking.

**Features:**
- Drag and drop files
- Multi-file upload
- Upload progress indicators
- File type validation (PDF, DOCX, TXT, MD)
- Error handling

**Usage:**
```tsx
import { DocumentUploader } from "@/components/chat/DocumentUploader";

<DocumentUploader onUploadComplete={(docId) => console.log(docId)} />
```

#### 2. DocumentLibrary
Grid view of all uploaded documents with search and selection.

**Features:**
- Search documents by title/filename
- Grid layout with metadata (pages, chunks, date)
- Multi-select for chat
- Delete documents
- Responsive design (1/2/3 columns)

**Usage:**
```tsx
import { DocumentLibrary } from "@/components/chat/DocumentLibrary";

<DocumentLibrary
  onSelectDocument={(docId) => console.log(docId)}
  selectedDocIds={["doc-1", "doc-2"]}
/>
```

#### 3. CitationCard
Display sources with citation numbers in chat responses.

**Features:**
- Citation numbers [1], [2], [3]
- Page numbers (p.12 or pp.12-15)
- Clickable citations
- Document titles and filenames

**Usage:**
```tsx
import { CitationCard } from "@/components/chat/CitationCard";

<CitationCard
  citations={[
    {
      index: 1,
      title: "Report",
      filename: "report.pdf",
      pageStart: 12,
      pageEnd: 15,
      formatted: "[1] \"Report\" — pp.12-15"
    }
  ]}
  onCitationClick={(citation) => console.log(citation)}
/>
```

### New Pages

#### /documents
Full-featured document management page with tabs for Library and Upload.

**Features:**
- Upload tab with DocumentUploader
- Library tab with DocumentLibrary
- Multi-select documents
- "Chat with N documents" floating action button
- Responsive container (max-w-6xl)

**Access:**
```
http://localhost:3000/documents
```

### Files Created

- `src/components/chat/DocumentUploader.tsx` - Upload component
- `src/components/chat/DocumentLibrary.tsx` - Library component
- `src/components/chat/CitationCard.tsx` - Citation display
- `src/components/ui/progress.tsx` - Progress bar component
- `src/app/documents/page.tsx` - Documents page

---

## Testing

### Test Phase 3 (Embeddings)

1. **Upload a document with embeddings:**
```bash
curl -X POST http://localhost:8787/api/documents/upload \
  -F "file=@test-document.md"
```

Check server logs - should see:
```
Generated 1 embeddings
```

2. **Test hybrid search:**
```bash
curl -X POST http://localhost:8787/api/chat/with-docs \
  -H "Content-Type: application/json" \
  -d '{"query": "how does file processing work?", "searchMode": "hybrid"}'
```

Response includes `keywordScore` and `vectorScore` for each chunk.

### Test Phase 4 (UI)

1. **Start frontend:**
```bash
npm run dev
```

2. **Visit documents page:**
```
http://localhost:3000/documents
```

3. **Upload a file:**
- Click "Upload" tab
- Drag and drop a PDF/DOCX/MD file
- Watch progress indicator
- See it appear in Library tab

4. **Select and chat:**
- Click "My Documents" tab
- Click a document to select it
- Click "Chat with 1 document" button
- Ask questions about the document

---

## Environment Variables

### Server (.env in apps/server/)
```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Optional (enables embeddings + hybrid search)
OPENAI_API_KEY=sk-...
```

### Frontend (.env.local in root)
```bash
NEXT_PUBLIC_SERVER_URL=http://localhost:8787
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

## Architecture

### Search Flow

```
User Query
    ↓
┌───────────────┐
│  Search Mode  │
│  Selection    │
└───────┬───────┘
        │
    ┌───┴────┬────────┬────────┐
    │        │        │        │
Keyword   Vector   Hybrid   Auto
  FTS    Embeddings  Both   Detect
    │        │        │        │
    └────────┴────────┴────────┘
                │
        ┌───────┴────────┐
        │   Supabase     │
        │   RPC Call     │
        └───────┬────────┘
                │
        ┌───────┴────────┐
        │ Ranked Results │
        │ + Citations    │
        └───────┬────────┘
                │
        ┌───────┴────────┐
        │  LLM Context   │
        │  + Answer      │
        └────────────────┘
```

### Upload Flow

```
File Drop/Select
    ↓
┌─────────────────┐
│  Frontend       │
│  Upload Widget  │
└────────┬────────┘
         │
    ┌────┴─────┐
    │ Multipart│
    │ Upload   │
    └────┬─────┘
         │
┌────────┴───────────┐
│  Server            │
│  /api/documents    │
└────────┬───────────┘
         │
    ┌────┴──────┬──────────┬──────────┐
    │           │          │          │
  Detect    Extract    Chunk    Generate
   MIME      Text     200-400   Embeddings
   Hash     Blocks    tokens    (OpenAI)
    │           │          │          │
    └───────────┴──────────┴──────────┘
                      │
            ┌─────────┴─────────┐
            │   Store in        │
            │   Supabase        │
            │ - documents       │
            │ - document_chunks │
            └───────────────────┘
```

---

## Performance

### Embedding Generation
- Model: `text-embedding-3-small` (1536 dimensions)
- Speed: ~1000 tokens/second
- Cost: $0.02 per 1M tokens
- Example: 10-page PDF (~5000 tokens) = $0.0001

### Vector Search
- Index: `ivfflat` (100 lists)
- Query time: < 100ms for 10k chunks
- Similarity: Cosine distance (< =>)

### Hybrid Search
- Combines ts_rank (keyword) + cosine similarity (vector)
- Default weights: 30% keyword, 70% vector
- Optimal for mixed queries (keywords + concepts)

---

## Next Steps

### Potential Enhancements
1. **OCR for Scanned PDFs** - Use Tesseract or Cloud Vision API
2. **PPTX Support** - Extract slides with speaker notes
3. **Excel Support** - Parse spreadsheets with formulas
4. **Image Analysis** - Use GPT-4 Vision for images in documents
5. **Audio Transcription** - Whisper API for audio files
6. **Re-ranking** - Cohere or cross-encoder for better relevance
7. **Document Versioning** - Track changes over time
8. **Collaborative Annotations** - Allow users to highlight/comment
9. **Advanced Citations** - Link directly to PDF page viewer
10. **Batch Upload** - Upload entire folders at once

---

## Troubleshooting

### Embeddings not generating
- Check `OPENAI_API_KEY` is set in server `.env`
- Check server logs for API errors
- Verify OpenAI account has credits

### Vector search not working
- Run `CREATE EXTENSION IF NOT EXISTS vector;` in Supabase
- Run `database/vector_search.sql` migration
- Check `embedding` column exists in `document_chunks`

### UI not showing documents
- Check `NEXT_PUBLIC_SERVER_URL` in frontend `.env.local`
- Verify server is running on correct port
- Check browser console for CORS errors

### Citations not appearing
- Verify chunks have `page_start`/`page_end` metadata
- Check search results include document metadata
- Look for citation generation errors in server logs

---

## API Reference

### Upload Document
```
POST /api/documents/upload
Content-Type: multipart/form-data

file: <binary>
```

Response:
```json
{
  "success": true,
  "document": {
    "id": "uuid",
    "title": "Document Title",
    "filename": "file.pdf",
    "mime": "application/pdf",
    "blocks": 10,
    "chunks": 5,
    "status": "success"
  }
}
```

### Chat with Documents
```
POST /api/chat/with-docs
Content-Type: application/json

{
  "query": "What is X?",
  "docIds": ["uuid1", "uuid2"],
  "searchMode": "hybrid",
  "model": "claude-3-7-sonnet-20250219",
  "maxResults": 8
}
```

Response:
```json
{
  "answer": "Based on the documents [1][2]...",
  "citations": [
    {
      "index": 1,
      "docId": "uuid",
      "title": "Document",
      "filename": "doc.pdf",
      "pageStart": 5,
      "pageEnd": 7,
      "formatted": "[1] \"Document\" — pp.5-7"
    }
  ],
  "chunks": [
    {
      "text": "...",
      "score": 0.85,
      "keywordScore": 0.3,
      "vectorScore": 0.9,
      "source": "Document"
    }
  ],
  "usage": {
    "input_tokens": 450,
    "output_tokens": 220
  }
}
```

---

## Credits

Built with:
- **OpenAI** - text-embedding-3-small for embeddings
- **Anthropic** - Claude 3.7 Sonnet for chat
- **Supabase** - PostgreSQL + pgvector for storage
- **Next.js** - React framework
- **Fastify** - Server framework
- **Radix UI** - Component primitives
- **Tailwind CSS** - Styling

