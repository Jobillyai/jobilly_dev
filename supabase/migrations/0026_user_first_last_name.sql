-- Migration 0026: First name + last name on users

alter table public.users
  add column if not exists first_name text,
  add column if not exists last_name text;

update public.users
set
  first_name = split_part(trim(name), ' ', 1),
  last_name = case
    when position(' ' in trim(name)) > 0 then
      trim(substring(trim(name) from position(' ' in trim(name)) + 1))
    else null
  end
where name is not null
  and trim(name) <> ''
  and first_name is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_first_name text;
  v_last_name text;
  v_full_name text;
begin
  v_first_name := nullif(trim(new.raw_user_meta_data ->> 'first_name'), '');
  v_last_name := nullif(trim(new.raw_user_meta_data ->> 'last_name'), '');
  v_full_name := nullif(trim(new.raw_user_meta_data ->> 'name'), '');

  if v_full_name is null and (v_first_name is not null or v_last_name is not null) then
    v_full_name := trim(concat_ws(' ', v_first_name, v_last_name));
  end if;

  if v_first_name is null and v_full_name is not null then
    v_first_name := split_part(v_full_name, ' ', 1);
    if position(' ' in v_full_name) > 0 then
      v_last_name := trim(substring(v_full_name from position(' ' in v_full_name) + 1));
    end if;
  end if;

  insert into public.users (id, email, name, first_name, last_name)
  values (new.id, new.email, v_full_name, v_first_name, v_last_name);
  return new;
end;
$$;
