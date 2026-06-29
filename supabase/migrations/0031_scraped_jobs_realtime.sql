-- Migration 0031: Enable Supabase Realtime on scraped_jobs (replaces aggressive client polling)

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'scraped_jobs'
  ) then
    alter publication supabase_realtime add table public.scraped_jobs;
  end if;
end $$;
