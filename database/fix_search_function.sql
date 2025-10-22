-- Drop the old function first to avoid ambiguity
DROP FUNCTION IF EXISTS search_chunks(TEXT, INT, FLOAT);
DROP FUNCTION IF EXISTS search_chunks(TEXT, INT, FLOAT, UUID[]);
DROP FUNCTION IF EXISTS search_chunks(TEXT, INT, DOUBLE PRECISION, UUID[]);

-- Then create the new one with 4 parameters
CREATE OR REPLACE FUNCTION search_chunks(
  search_query TEXT,
  max_results INT DEFAULT 10,
  min_score FLOAT DEFAULT 0.01,
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
  score REAL
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
    ts_rank(
      to_tsvector('english', c.text),
      plainto_tsquery('english', search_query)
    ) as score
  FROM document_chunks c
  JOIN documents d ON c.doc_id = d.doc_id
  WHERE to_tsvector('english', c.text) @@ plainto_tsquery('english', search_query)
    AND ts_rank(
      to_tsvector('english', c.text),
      plainto_tsquery('english', search_query)
    ) >= min_score
    AND (filter_doc_ids IS NULL OR c.doc_id = ANY(filter_doc_ids))
  ORDER BY score DESC
  LIMIT max_results;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_chunks(TEXT, INT, FLOAT, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION search_chunks(TEXT, INT, FLOAT, UUID[]) TO anon;
GRANT EXECUTE ON FUNCTION search_chunks(TEXT, INT, FLOAT, UUID[]) TO service_role;
