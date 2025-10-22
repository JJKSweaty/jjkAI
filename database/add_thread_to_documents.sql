-- Add thread_id to documents for session-based context
-- This allows PDFs to be scoped to specific chat threads

-- Add thread_id column to documents
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS thread_id UUID;

-- Add index for fast thread lookup
CREATE INDEX IF NOT EXISTS idx_documents_thread_id ON documents(thread_id);

-- Add foreign key constraint (optional - ensures thread exists)
-- Note: This requires a 'threads' table to exist
-- ALTER TABLE documents
-- ADD CONSTRAINT fk_documents_thread
-- FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE;

-- Update comment
COMMENT ON COLUMN documents.thread_id IS 'Thread ID for session-based document context. Documents are only accessible within this thread.';

-- Add cleanup function for thread deletion
CREATE OR REPLACE FUNCTION delete_thread_documents()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete all documents associated with the deleted thread
  DELETE FROM documents WHERE thread_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-delete documents when thread is deleted
-- Note: This requires a 'threads' table with triggers enabled
-- DROP TRIGGER IF EXISTS cleanup_thread_documents ON threads;
-- CREATE TRIGGER cleanup_thread_documents
-- AFTER DELETE ON threads
-- FOR EACH ROW
-- EXECUTE FUNCTION delete_thread_documents();

