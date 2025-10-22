-- Auto-cleanup documents when thread is deleted
-- Run this in Supabase SQL Editor

-- 1. First, ensure we have the foreign key constraint (if not already added)
-- This ensures thread_id references a valid thread
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_documents_thread'
  ) THEN
    ALTER TABLE documents
    ADD CONSTRAINT fk_documents_thread
    FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Foreign key constraint added: documents.thread_id -> threads.id';
  ELSE
    RAISE NOTICE 'Foreign key constraint already exists';
  END IF;
END $$;

-- 2. Create function to delete document chunks when document is deleted
CREATE OR REPLACE FUNCTION cleanup_document_chunks()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete all chunks associated with the deleted document
  DELETE FROM document_chunks WHERE doc_id = OLD.doc_id;
  RAISE NOTICE 'Deleted chunks for document: %', OLD.doc_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger on documents table to auto-delete chunks
DROP TRIGGER IF EXISTS trigger_cleanup_document_chunks ON documents;
CREATE TRIGGER trigger_cleanup_document_chunks
BEFORE DELETE ON documents
FOR EACH ROW
EXECUTE FUNCTION cleanup_document_chunks();

-- Test the cleanup (optional - comment out if you don't want to test)
-- This will show how many documents would be deleted for orphaned threads
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM documents d
  LEFT JOIN threads t ON d.thread_id = t.id
  WHERE d.thread_id IS NOT NULL AND t.id IS NULL;
  
  RAISE NOTICE 'Found % documents with orphaned thread_ids', orphaned_count;
  
  -- Uncomment to clean up orphaned documents
  -- DELETE FROM documents d
  -- WHERE d.thread_id IS NOT NULL 
  --   AND NOT EXISTS (SELECT 1 FROM threads t WHERE t.id = d.thread_id);
END $$;

-- Summary
SELECT 
  'Documents' as table_name,
  COUNT(*) as total_rows,
  COUNT(thread_id) as with_thread,
  COUNT(*) - COUNT(thread_id) as without_thread
FROM documents
UNION ALL
SELECT 
  'Document Chunks' as table_name,
  COUNT(*) as total_rows,
  0 as with_thread,
  0 as without_thread
FROM document_chunks;
