CREATE OR REPLACE FUNCTION public.ops_db_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT jsonb_build_object(
    'database_bytes', pg_database_size(current_database()),
    'largest_tables', (
      SELECT jsonb_agg(t) FROM (
        SELECT c.relname AS table_name,
               pg_total_relation_size(c.oid) AS bytes,
               c.reltuples::bigint AS approx_rows
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'
        ORDER BY pg_total_relation_size(c.oid) DESC
        LIMIT 10
      ) t
    ),
    'active_connections', (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database())
  )
$$;

REVOKE ALL ON FUNCTION public.ops_db_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ops_db_stats() TO service_role;