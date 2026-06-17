-- Migration 0011: RLS policies — Career Advisory + Growth School

create policy "advisory_sessions_select"
  on public.advisory_sessions for select
  using (
    candidate_id = auth.uid()
    or mentor_id = auth.uid()
    or public.is_staff()
  );

create policy "advisory_sessions_insert_own"
  on public.advisory_sessions for insert
  with check (candidate_id = auth.uid());

create policy "advisory_sessions_update"
  on public.advisory_sessions for update
  using (candidate_id = auth.uid() or mentor_id = auth.uid() or public.is_staff())
  with check (candidate_id = auth.uid() or mentor_id = auth.uid() or public.is_staff());

-- Learning content (paths/modules/lessons/quizzes/sandbox challenges) is
-- shared, cached content — readable by any authenticated user; only staff
-- can author it.
create policy "learning_paths_select_all" on public.learning_paths for select using (true);
create policy "learning_paths_write_staff" on public.learning_paths for all
  using (public.is_staff()) with check (public.is_staff());

create policy "learning_modules_select_all" on public.learning_modules for select using (true);
create policy "learning_modules_write_staff" on public.learning_modules for all
  using (public.is_staff()) with check (public.is_staff());

create policy "lessons_select_all" on public.lessons for select using (true);
create policy "lessons_write_staff" on public.lessons for all
  using (public.is_staff()) with check (public.is_staff());

create policy "quizzes_select_all" on public.quizzes for select using (true);
create policy "quizzes_write_staff" on public.quizzes for all
  using (public.is_staff()) with check (public.is_staff());

create policy "quiz_embeddings_select_all" on public.quiz_embeddings for select using (true);
create policy "quiz_embeddings_write_staff" on public.quiz_embeddings for all
  using (public.is_staff()) with check (public.is_staff());

create policy "sandbox_challenges_select_all" on public.sandbox_challenges for select using (true);
create policy "sandbox_challenges_write_staff" on public.sandbox_challenges for all
  using (public.is_staff()) with check (public.is_staff());

-- Progress / attempts / submissions are personal — owner + staff only.
create policy "lesson_progress_own"
  on public.lesson_progress for all
  using (user_id = auth.uid() or public.is_staff())
  with check (user_id = auth.uid());

create policy "quiz_attempts_own"
  on public.quiz_attempts for all
  using (user_id = auth.uid() or public.is_staff())
  with check (user_id = auth.uid());

create policy "sandbox_submissions_own"
  on public.sandbox_submissions for all
  using (user_id = auth.uid() or public.is_staff())
  with check (user_id = auth.uid());
