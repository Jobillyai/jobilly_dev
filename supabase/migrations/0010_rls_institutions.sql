-- Migration 0010: RLS policies — institutions
-- Per-tenant isolation: an institution admin sees only their own
-- institution's candidates, never another institution's.

create policy "institutions_select"
  on public.institutions for select
  using (
    admin_user_id = auth.uid()
    or public.current_user_role() = 'admin'
    or id in (
      select institution_id from public.institution_candidates
      where user_id = auth.uid()
    )
  );

create policy "institutions_update_own"
  on public.institutions for update
  using (admin_user_id = auth.uid() or public.current_user_role() = 'admin')
  with check (admin_user_id = auth.uid() or public.current_user_role() = 'admin');

create policy "institution_candidates_select"
  on public.institution_candidates for select
  using (
    user_id = auth.uid()
    or public.current_user_role() = 'admin'
    or institution_id in (
      select id from public.institutions where admin_user_id = auth.uid()
    )
  );

create policy "institution_candidates_insert_by_admin"
  on public.institution_candidates for insert
  with check (
    public.current_user_role() = 'admin'
    or institution_id in (
      select id from public.institutions where admin_user_id = auth.uid()
    )
  );
