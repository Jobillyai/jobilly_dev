-- Migration 0047: complete mock checkout atomically.

create or replace function public.complete_mock_checkout_transaction(
  p_user_id uuid,
  p_plan text,
  p_billing_name text,
  p_billing_email text,
  p_billing_phone text,
  p_billing_address_line1 text,
  p_billing_address_line2 text,
  p_billing_city text,
  p_billing_state text,
  p_billing_postal_code text,
  p_billing_country text,
  p_transaction_reference text,
  p_receipt_number text,
  p_amount_usd numeric,
  p_paid_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_subscription_id uuid;
begin
  if p_plan not in ('mock-interviews', 'job-applications', 'mock-and-job') then
    raise exception 'Invalid candidate plan';
  end if;

  update public.job_subscriptions
  set
    status = 'cancelled',
    end_date = p_paid_at::date,
    updated_at = p_paid_at
  where user_id = p_user_id
    and status = 'active';

  insert into public.job_subscriptions (
    user_id,
    plan,
    status,
    billing_name,
    billing_email,
    billing_phone,
    billing_address_line1,
    billing_address_line2,
    billing_city,
    billing_state,
    billing_postal_code,
    billing_country,
    source,
    paid_at,
    transaction_reference,
    receipt_number,
    amount_usd,
    currency,
    updated_at
  )
  values (
    p_user_id,
    p_plan,
    'active',
    p_billing_name,
    p_billing_email,
    p_billing_phone,
    p_billing_address_line1,
    nullif(p_billing_address_line2, ''),
    p_billing_city,
    p_billing_state,
    p_billing_postal_code,
    p_billing_country,
    'mock_checkout',
    p_paid_at,
    p_transaction_reference,
    p_receipt_number,
    p_amount_usd,
    'USD',
    p_paid_at
  )
  returning id into new_subscription_id;

  insert into public.candidate_profiles (
    user_id,
    subscription_status,
    updated_at
  )
  values (
    p_user_id,
    'active',
    p_paid_at
  )
  on conflict (user_id) do update
  set
    subscription_status = 'active',
    updated_at = excluded.updated_at;

  update public.users
  set role = 'subscribed_candidate'
  where id = p_user_id;

  if not found then
    raise exception 'Candidate user not found';
  end if;

  return new_subscription_id;
end;
$$;

revoke all on function public.complete_mock_checkout_transaction(
  uuid, text, text, text, text, text, text, text, text, text, text,
  text, text, numeric, timestamptz
) from public, anon, authenticated;

grant execute on function public.complete_mock_checkout_transaction(
  uuid, text, text, text, text, text, text, text, text, text, text,
  text, text, numeric, timestamptz
) to service_role;
