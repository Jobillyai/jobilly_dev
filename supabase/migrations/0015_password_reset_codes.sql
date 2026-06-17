-- Password reset OTP codes (custom flow — Supabase free tier cannot customize recovery emails)

create table public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  verified_at timestamptz,
  session_token_hash text,
  session_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index password_reset_requests_email_created_at_idx
  on public.password_reset_requests (email, created_at desc);

alter table public.password_reset_requests enable row level security;
