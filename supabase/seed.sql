-- Local dev seed data. Run automatically by `supabase db reset`.
-- Mirrors the risk mitigation in the plan: "Seed AI-generated baselines:
-- 6 companies x 5 roles x 3 rounds = 90 sets" — this is a small starter
-- subset for local development, not the full seed set.

insert into public.company_personas (company_name, interview_style, focus_areas, persona_prompt)
values
  ('Acme Corp', 'Behavioral + technical mix', array['communication', 'problem-solving'], 'You are a friendly but rigorous interviewer at Acme Corp...'),
  ('Globex Systems', 'Fast-paced technical drilling', array['system design', 'coding'], 'You are a no-nonsense senior engineer at Globex Systems...');
