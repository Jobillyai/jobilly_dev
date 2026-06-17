-- Migration 0012: RLS policies — Mock Interviews

create policy "company_personas_select_all" on public.company_personas for select using (true);
create policy "company_personas_write_staff" on public.company_personas for all
  using (public.is_staff()) with check (public.is_staff());

create policy "interview_questions_select_all" on public.interview_questions for select using (true);
create policy "interview_questions_write_staff" on public.interview_questions for all
  using (public.is_staff()) with check (public.is_staff());

create policy "mock_interviews_own"
  on public.mock_interviews for all
  using (candidate_id = auth.uid() or public.is_staff())
  with check (candidate_id = auth.uid());

create policy "interview_feedback_own"
  on public.interview_feedback for all
  using (candidate_id = auth.uid() or public.is_staff())
  with check (candidate_id = auth.uid());
