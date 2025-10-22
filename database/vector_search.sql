-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Vector similarity search function
-- Uses cosine similarity for semantic search
-- Note: Using 384 dimensions (all-MiniLM-L6-v2 local model)
CREATE OR REPLACE FUNCTION search_chunks_vector(
  query_embedding vector(384),
  max_results INT DEFAULT 10,
  min_similarity FLOAT DEFAULT 0.7,
  filter_doc_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  chunk_id UUID,
  doc_id UUID,
  text TEXT,
  page_start INT,
  page_end INT,
  section_path TEXT,
  block_ids JSONB,
  title TEXT,
  filename TEXT,
  mime_type TEXT,
  hash TEXT,
  similarity REAL
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.chunk_id,
    c.doc_id,
    c.text,
    c.page_start,
    c.page_end,
    c.section_path,
    c.block_ids,
    d.title,
    d.filename,
    d.mime_type,
    d.hash,
    (1 - (c.embedding <=> query_embedding)) as similarity
  FROM document_chunks c
  JOIN documents d ON c.doc_id = d.doc_id
  WHERE c.embedding IS NOT NULL
    AND (1 - (c.embedding <=> query_embedding)) >= min_similarity
    AND (filter_doc_ids IS NULL OR c.doc_id = ANY(filter_doc_ids))
  ORDER BY c.embedding <=> query_embedding
  LIMIT max_results;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_chunks_vector(vector(384), INT, FLOAT, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION search_chunks_vector(vector(384), INT, FLOAT, UUID[]) TO anon;
GRANT EXECUTE ON FUNCTION search_chunks_vector(vector(384), INT, FLOAT, UUID[]) TO service_role;

-- Create vector index for fast similarity search
-- Using ivfflat index (good balance of speed and accuracy)
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Hybrid search function (combines keyword + vector)
CREATE OR REPLACE FUNCTION search_chunks_hybrid(
  search_query TEXT,
  query_embedding vector(384),
  max_results INT DEFAULT 10,
  keyword_weight FLOAT DEFAULT 0.3,
  vector_weight FLOAT DEFAULT 0.7,
  filter_doc_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  chunk_id UUID,
  doc_id UUID,
  text TEXT,
  page_start INT,
  page_end INT,
  section_path TEXT,
  block_ids JSONB,
  title TEXT,
  filename TEXT,
  mime_type TEXT,
  hash TEXT,
  score REAL,
  keyword_score REAL,
  vector_score REAL
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH keyword_results AS (
    SELECT 
      c.chunk_id,
      ts_rank(
        to_tsvector('english', c.text),
        plainto_tsquery('english', search_query)
      ) as k_score
    FROM document_chunks c
    WHERE to_tsvector('english', c.text) @@ plainto_tsquery('english', search_query)
      AND (filter_doc_ids IS NULL OR c.doc_id = ANY(filter_doc_ids))
  ),
  vector_results AS (
    SELECT 
      c.chunk_id,
      (1 - (c.embedding <=> query_embedding)) as v_score
    FROM document_chunks c
    WHERE c.embedding IS NOT NULL
      AND (filter_doc_ids IS NULL OR c.doc_id = ANY(filter_doc_ids))
  )
  SELECT 
    c.chunk_id,
    c.doc_id,
    c.text,
    c.page_start,
    c.page_end,
    c.section_path,
    c.block_ids,
    d.title,
    d.filename,
    d.mime_type,
    d.hash,
    (COALESCE(k.k_score, 0) * keyword_weight + COALESCE(v.v_score, 0) * vector_weight) as score,
    COALESCE(k.k_score, 0) as keyword_score,
    COALESCE(v.v_score, 0) as vector_score
  FROM document_chunks c
  JOIN documents d ON c.doc_id = d.doc_id
  LEFT JOIN keyword_results k ON c.chunk_id = k.chunk_id
  LEFT JOIN vector_results v ON c.chunk_id = v.chunk_id
  WHERE (k.k_score IS NOT NULL OR v.v_score IS NOT NULL)
    AND (filter_doc_ids IS NULL OR c.doc_id = ANY(filter_doc_ids))
  ORDER BY score DESC
  LIMIT max_results;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_chunks_hybrid(TEXT, vector(384), INT, FLOAT, FLOAT, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION search_chunks_hybrid(TEXT, vector(384), INT, FLOAT, FLOAT, UUID[]) TO anon;
GRANT EXECUTE ON FUNCTION search_chunks_hybrid(TEXT, vector(384), INT, FLOAT, FLOAT, UUID[]) TO service_role;

-- Example usage:
-- SELECT * FROM search_chunks_vector('[0.1, 0.2, ...]'::vector(384), 10, 0.7, NULL);
-- SELECT * FROM search_chunks_hybrid('document system', '[0.1, 0.2, ...]'::vector(384), 10, 0.3, 0.7, NULL);
