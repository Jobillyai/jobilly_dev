-- Migration 0025: Unique member IDs — JAC (candidate), JAE (admin/mentor), JAM (manager)

alter table public.users
  add column if not exists member_id text;

create unique index if not exists idx_users_member_id
  on public.users (member_id)
  where member_id is not null;

create table if not exists public.member_id_counters (
  prefix text primary key check (prefix in ('JAC', 'JAE', 'JAM')),
  last_value integer not null default 0
);

insert into public.member_id_counters (prefix, last_value)
values ('JAC', 0), ('JAE', 0), ('JAM', 0)
on conflict (prefix) do nothing;

create or replace function public.member_id_prefix_for_role(role user_role)
returns text
language sql
immutable
as $$
  select case
    when role = 'manager' then 'JAM'
    when role in ('admin', 'employee') then 'JAE'
    when role in ('free_candidate', 'subscribed_candidate', 'institution_candidate') then 'JAC'
    else null
  end;
$$;

create or replace function public.allocate_member_id(p_role user_role)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefix text;
  v_next_val integer;
begin
  v_prefix := public.member_id_prefix_for_role(p_role);
  if v_prefix is null then
    return null;
  end if;

  insert into public.member_id_counters (prefix, last_value)
  values (v_prefix, 1)
  on conflict (prefix) do update
    set last_value = member_id_counters.last_value + 1
  returning last_value into v_next_val;

  return v_prefix || lpad(v_next_val::text, 4, '0');
end;
$$;

create or replace function public.assign_member_id_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.member_id is null then
    new.member_id := public.allocate_member_id(new.role);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_users_assign_member_id on public.users;
create trigger trg_users_assign_member_id
  before insert on public.users
  for each row
  execute function public.assign_member_id_on_insert();

-- Backfill existing users (ordered by signup date within each prefix)
do $$
declare
  user_row record;
  v_prefix text;
  v_next_val integer;
begin
  for user_row in
    select id, role
    from public.users
    where member_id is null
      and public.member_id_prefix_for_role(role) is not null
    order by created_at asc
  loop
    v_prefix := public.member_id_prefix_for_role(user_row.role);

    insert into public.member_id_counters (prefix, last_value)
    values (v_prefix, 1)
    on conflict (prefix) do update
      set last_value = member_id_counters.last_value + 1
    returning last_value into v_next_val;

    update public.users
    set member_id = v_prefix || lpad(v_next_val::text, 4, '0')
    where id = user_row.id;
  end loop;
end $$;
