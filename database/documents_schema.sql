-- Document Storage Schema
-- Stores documents and their chunks for RAG retrieval

-- Documents table: metadata about uploaded files
CREATE TABLE IF NOT EXISTS documents (
  id BIGSERIAL PRIMARY KEY,
  doc_id UUID UNIQUE NOT NULL,
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  hash TEXT NOT NULL,  -- SHA256 for deduplication
  pages INTEGER,
  block_count INTEGER DEFAULT 0,
  chunk_count INTEGER DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast hash lookup (deduplication)
CREATE INDEX IF NOT EXISTS idx_documents_hash ON documents(hash);

-- Index for document ID lookup
CREATE INDEX IF NOT EXISTS idx_documents_doc_id ON documents(doc_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

-- Document chunks table: chunked text with embeddings for vector search
CREATE TABLE IF NOT EXISTS document_chunks (
  id BIGSERIAL PRIMARY KEY,
  chunk_id UUID UNIQUE NOT NULL,
  doc_id UUID NOT NULL REFERENCES documents(doc_id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  page_start INTEGER,
  page_end INTEGER,
  section_path TEXT,
  block_ids JSONB,  -- Array of block IDs included in this chunk
  embedding vector(1536),  -- OpenAI ada-002 or similar (1536 dimensions)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for document lookup
CREATE INDEX IF NOT EXISTS idx_chunks_doc_id ON document_chunks(doc_id);

-- Index for chunk ID lookup
CREATE INDEX IF NOT EXISTS idx_chunks_chunk_id ON document_chunks(chunk_id);

-- Vector similarity search index (requires pgvector extension)
-- CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Full-text search index for BM25/keyword search
CREATE INDEX IF NOT EXISTS idx_chunks_text_fts ON document_chunks USING gin(to_tsvector('english', text));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies (Row Level Security)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own documents
-- Note: You may want to add a user_id column to documents table for multi-user support
CREATE POLICY "Users can read all documents" ON documents FOR SELECT USING (true);
CREATE POLICY "Users can insert documents" ON documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their documents" ON documents FOR UPDATE USING (true);
CREATE POLICY "Users can delete their documents" ON documents FOR DELETE USING (true);

CREATE POLICY "Users can read all chunks" ON document_chunks FOR SELECT USING (true);
CREATE POLICY "Users can insert chunks" ON document_chunks FOR INSERT WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE documents IS 'Stores metadata about uploaded documents';
COMMENT ON TABLE document_chunks IS 'Stores chunked text from documents with embeddings for RAG retrieval';
COMMENT ON COLUMN document_chunks.embedding IS 'Vector embedding for semantic search (1536 dimensions for ada-002)';
COMMENT ON COLUMN documents.hash IS 'SHA256 hash of file content for deduplication';
COMMENT ON COLUMN document_chunks.block_ids IS 'Array of block IDs from the original document';
