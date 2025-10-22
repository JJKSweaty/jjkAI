# Auto-Cleanup Documents on Thread Deletion

## What This Does
When you delete a chat thread in your app, all associated PDFs and their chunks will be automatically deleted from Supabase.

## Setup Instructions

### 1. Run the SQL Migration

Open Supabase Dashboard → SQL Editor → New Query, then paste and run:

```sql
-- IMPORTANT: Remove the foreign key constraint if it exists (it causes timing issues)
ALTER TABLE documents
DROP CONSTRAINT IF EXISTS fk_documents_thread;

-- Create function to cleanup documents when thread is deleted
CREATE OR REPLACE FUNCTION cleanup_thread_documents()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete all documents associated with the deleted thread
  DELETE FROM documents WHERE thread_id = OLD.id;
  RAISE NOTICE 'Deleted documents for thread: %', OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on threads table to auto-delete documents
DROP TRIGGER IF EXISTS trigger_cleanup_thread_documents ON threads;
CREATE TRIGGER trigger_cleanup_thread_documents
BEFORE DELETE ON threads
FOR EACH ROW
EXECUTE FUNCTION cleanup_thread_documents();

-- Create function to cleanup document chunks when document is deleted
CREATE OR REPLACE FUNCTION cleanup_document_chunks()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete all chunks associated with the deleted document
  DELETE FROM document_chunks WHERE doc_id = OLD.doc_id;
  RAISE NOTICE 'Deleted chunks for document: %', OLD.doc_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on documents table to auto-delete chunks
DROP TRIGGER IF EXISTS trigger_cleanup_document_chunks ON documents;
CREATE TRIGGER trigger_cleanup_document_chunks
BEFORE DELETE ON documents
FOR EACH ROW
EXECUTE FUNCTION cleanup_document_chunks();
```

### 2. How It Works

```
User deletes thread
    ↓
trigger_cleanup_thread_documents fires
    ↓
documents table: All docs with thread_id get deleted
    ↓
trigger_cleanup_document_chunks fires for each document
    ↓
document_chunks table: All chunks for those docs get deleted
    ↓
✅ Complete cleanup!
```

### 3. Test It

1. Upload a PDF to a chat
2. Check Supabase: You'll see entries in `documents` and `document_chunks`
3. Delete the chat thread in your app
4. Check Supabase again: Both documents and chunks are gone! ✨

### 4. Verify It's Working

Run this in Supabase SQL Editor to check the triggers:

```sql
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%cleanup%';
```

You should see both triggers listed.

## Manual Cleanup (Optional)

If you want to clean up existing orphaned documents (documents whose threads no longer exist):

```sql
-- Find orphaned documents
SELECT d.doc_id, d.thread_id, d.title
FROM documents d
LEFT JOIN threads t ON d.thread_id = t.id
WHERE d.thread_id IS NOT NULL AND t.id IS NULL;

-- Delete orphaned documents (run if you want to clean up)
DELETE FROM documents d
WHERE d.thread_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM threads t WHERE t.id = d.thread_id);
```

## Status Check

After running the migration, check your current state:

```sql
SELECT 
  'Documents' as table_name,
  COUNT(*) as total_rows,
  COUNT(thread_id) as with_thread
FROM documents
UNION ALL
SELECT 
  'Document Chunks' as table_name,
  COUNT(*) as total_rows,
  0 as with_thread
FROM document_chunks;
```

---

**That's it!** Now your documents will automatically clean up when you delete chat threads! 🎉
