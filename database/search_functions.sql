-- Search Functions for Document Retrieval (RAG)
-- Run this in Supabase SQL Editor

-- 1. KEYWORD SEARCH FUNCTION
-- Uses PostgreSQL full-text search (tsvector)
-- Note: embedding column type can be JSONB or VECTOR depending on setup
CREATE OR REPLACE FUNCTION search_chunks_keyword(
  search_query TEXT,
  max_results INT DEFAULT 10,
  min_score FLOAT DEFAULT 0.0,
  filter_doc_ids TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  chunk_id TEXT,
  doc_id TEXT,
  text TEXT,
  title TEXT,
  filename TEXT,
  mime_type TEXT,
  page_start INT,
  page_end INT,
  section_path TEXT[],
  block_ids TEXT[],
  hash TEXT,
  score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.chunk_id,
    dc.doc_id,
    dc.text,
    d.title,
    d.filename,
    d.mime_type,
    dc.page_start,
    dc.page_end,
    dc.section_path,
    dc.block_ids,
    d.hash,
    ts_rank(to_tsvector('english', dc.text), plainto_tsquery('english', search_query)) AS score
  FROM document_chunks dc
  JOIN documents d ON dc.doc_id = d.doc_id
  WHERE 
    to_tsvector('english', dc.text) @@ plainto_tsquery('english', search_query)
    AND (filter_doc_ids IS NULL OR d.doc_id = ANY(filter_doc_ids))
    AND ts_rank(to_tsvector('english', dc.text), plainto_tsquery('english', search_query)) >= min_score
  ORDER BY score DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- 2. VECTOR SEARCH FUNCTION (for semantic search)
-- Requires pgvector extension
CREATE OR REPLACE FUNCTION search_chunks_vector(
  query_embedding VECTOR(384),
  max_results INT DEFAULT 10,
  min_similarity FLOAT DEFAULT 0.0,
  filter_doc_ids TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  chunk_id TEXT,
  doc_id TEXT,
  text TEXT,
  title TEXT,
  filename TEXT,
  mime_type TEXT,
  page_start INT,
  page_end INT,
  section_path TEXT,
  block_ids TEXT[],
  hash TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.chunk_id,
    dc.doc_id,
    dc.text,
    d.title,
    d.filename,
    d.mime_type,
    dc.page_start,
    dc.page_end,
    dc.section_path,
    dc.block_ids,
    d.hash,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  JOIN documents d ON dc.doc_id = d.doc_id
  WHERE 
    dc.embedding IS NOT NULL
    AND (filter_doc_ids IS NULL OR d.doc_id = ANY(filter_doc_ids))
    AND (1 - (dc.embedding <=> query_embedding)) >= min_similarity
  ORDER BY dc.embedding <=> query_embedding
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- 3. HYBRID SEARCH FUNCTION (keyword + vector combined)
CREATE OR REPLACE FUNCTION search_chunks_hybrid(
  search_query TEXT,
  query_embedding VECTOR(384),
  max_results INT DEFAULT 10,
  keyword_weight FLOAT DEFAULT 0.5,
  vector_weight FLOAT DEFAULT 0.5,
  filter_doc_ids TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  chunk_id TEXT,
  doc_id TEXT,
  text TEXT,
  title TEXT,
  filename TEXT,
  mime_type TEXT,
  page_start INT,
  page_end INT,
  section_path TEXT,
  block_ids TEXT[],
  hash TEXT,
  score FLOAT,
  keyword_score FLOAT,
  vector_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.chunk_id,
    dc.doc_id,
    dc.text,
    d.title,
    d.filename,
    d.mime_type,
    dc.page_start,
    dc.page_end,
    dc.section_path,
    dc.block_ids,
    d.hash,
    (keyword_weight * ts_rank(to_tsvector('english', dc.text), plainto_tsquery('english', search_query)) +
     vector_weight * (1 - (dc.embedding <=> query_embedding))) AS score,
    ts_rank(to_tsvector('english', dc.text), plainto_tsquery('english', search_query)) AS keyword_score,
    (1 - (dc.embedding <=> query_embedding)) AS vector_score
  FROM document_chunks dc
  JOIN documents d ON dc.doc_id = d.doc_id
  WHERE 
    (
      to_tsvector('english', dc.text) @@ plainto_tsquery('english', search_query)
      OR dc.embedding IS NOT NULL
    )
    AND (filter_doc_ids IS NULL OR d.doc_id = ANY(filter_doc_ids))
  ORDER BY score DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- 4. Add full-text search index (if not already exists)
CREATE INDEX IF NOT EXISTS idx_document_chunks_fts 
ON document_chunks USING gin(to_tsvector('english', text));

-- 5. Add vector index (if not already exists and pgvector is enabled)
-- Uncomment if you have pgvector extension enabled:
-- CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding 
-- ON document_chunks USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 100);

-- Test the functions
SELECT 'Keyword search function created successfully' AS status;
SELECT 'Vector search function created successfully' AS status;
SELECT 'Hybrid search function created successfully' AS status;
