-- Check what columns exist in the tables
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'document_chunks'
ORDER BY ordinal_position;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'documents'
ORDER BY ordinal_position;
