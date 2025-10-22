# Testing Phase 1 - Document Processing

## Prerequisites

1. **Database Migration**: Run the SQL schema in Supabase
2. **Server Running**: Start the server with document routes
3. **Test File**: Use the provided test-document.md

## Step 1: Run Database Migration

Go to your Supabase project:
1. Open SQL Editor
2. Copy and paste the contents of `database/documents_schema.sql`
3. Click "Run" to create the tables

Or via CLI:
```bash
psql -h your-db.supabase.co -U postgres -d postgres -f database/documents_schema.sql
```

## Step 2: Start the Server

```bash
cd apps/server
npm run dev
```

You should see:
```
✅ Server running on 0.0.0.0:8787
📡 Health check: /health
💬 Chat endpoint: /api/chat/stream
```

## Step 3: Test Document Upload

### Using curl:

```bash
curl -X POST http://localhost:8787/api/documents/upload \
  -F "file=@test-document.md"
```

### Using PowerShell:

```powershell
$uri = "http://localhost:8787/api/documents/upload"
$filePath = "test-document.md"
$form = @{
    file = Get-Item -Path $filePath
}
Invoke-RestMethod -Uri $uri -Method Post -Form $form
```

### Expected Response:

```json
{
  "success": true,
  "document": {
    "id": "uuid-here",
    "title": "test-document",
    "filename": "test-document.md",
    "mime": "text/markdown",
    "pages": null,
    "blocks": 8,
    "chunks": 2,
    "status": "success"
  }
}
```

## Step 4: List Documents

```bash
curl http://localhost:8787/api/documents
```

## Step 5: Get Document Details

```bash
curl http://localhost:8787/api/documents/{doc-id}
```

## Step 6: Delete Document

```bash
curl -X DELETE http://localhost:8787/api/documents/{doc-id}
```

## Testing Different File Types

### Test with a PDF:
```bash
# Find any PDF file
curl -X POST http://localhost:8787/api/documents/upload \
  -F "file=@sample.pdf"
```

### Test with DOCX:
```bash
curl -X POST http://localhost:8787/api/documents/upload \
  -F "file=@sample.docx"
```

## Verify in Database

Check Supabase to see the data:

```sql
-- View all documents
SELECT * FROM documents;

-- View all chunks
SELECT doc_id, chunk_id, page_start, page_end, 
       LEFT(text, 100) as preview 
FROM document_chunks;

-- Count chunks per document
SELECT d.title, d.filename, COUNT(c.chunk_id) as chunk_count
FROM documents d
LEFT JOIN document_chunks c ON d.doc_id = c.doc_id
GROUP BY d.doc_id, d.title, d.filename;
```

## Troubleshooting

### Error: "Database not configured"
- Check that `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are in `.env`

### Error: "relation 'documents' does not exist"
- Run the database migration SQL first

### Error: "Cannot find module 'file-type'"
- Run `npm install` in `apps/server`

### File not uploading
- Check file size (max 50MB)
- Check MIME type is supported
- Check server logs for detailed errors
