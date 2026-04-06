-- Check actual schema of tables
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name IN ('stock_additions', 'external_dispatches')
ORDER BY table_name, ordinal_position;
