-- Run once in a dedicated Supabase project. Clients use authenticated RPCs only.
begin;
create table public.households (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (length(name) between 1 and 80),
 invite_code text not null unique default replace(gen_random_uuid()::text,'-',''),
 ledger jsonb not null default '{"version":1,"entries":[],"budgets":{}}',
 revision bigint not null default 0
);
create table public.household_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 household_id uuid not null references public.households(id) on delete cascade
);
alter table public.households enable row level security;
alter table public.household_members enable row level security;
revoke all on public.households,public.household_members from anon,authenticated;
create function public.get_my_household() returns jsonb language sql security definer set search_path='' as $$
 select to_jsonb(h) from public.households h join public.household_members m on m.household_id=h.id where m.user_id=auth.uid();
$$;
create function public.create_my_household(p_name text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 if exists(select 1 from public.household_members where user_id=auth.uid()) then raise exception 'already_in_household'; end if;
 insert into public.households(owner_id,name) values(auth.uid(),trim(p_name)) returning id into v_id;
 insert into public.household_members(user_id,household_id) values(auth.uid(),v_id);
 return public.get_my_household();
end;
$$;
create function public.join_household(p_code text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 if exists(select 1 from public.household_members where user_id=auth.uid()) then raise exception 'already_in_household'; end if;
 select id into v_id from public.households where invite_code=lower(trim(p_code));
 if v_id is null then raise exception 'invalid_invite_code'; end if;
 insert into public.household_members(user_id,household_id) values(auth.uid(),v_id);
 return public.get_my_household();
end;
$$;
create function public.validate_ledger(p jsonb) returns void language plpgsql set search_path='' as $$
declare e jsonb; b record; c record; income text[] := array['Lương','Thưởng','Kinh doanh / làm thêm','Lãi tiết kiệm / đầu tư','Quà tặng / trợ cấp','Thu khác']; expenses text[] := array['Ăn uống','Nhà ở','Điện nước / Internet','Đi lại','Con cái / học tập','Y tế','Mua sắm','Giải trí / du lịch','Hiếu hỉ / biếu tặng','Chi khác'];
begin
 if jsonb_array_length(p->'entries')>100000 then raise exception 'too_many_entries'; end if;
 for e in select value from jsonb_array_elements(p->'entries') loop
  if jsonb_typeof(e) is distinct from 'object' or jsonb_typeof(e->'id') is distinct from 'string' or coalesce(length(e->>'id'),0)=0
   or coalesce(e->>'kind','') not in ('income','expense')
   or jsonb_typeof(e->'amount') is distinct from 'number'
   or (e->>'amount')::numeric not between 1 and 1000000000000
   or trunc((e->>'amount')::numeric)<>(e->>'amount')::numeric
   or coalesce(e->>'date','') !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$|^2100-[0-9]{2}-[0-9]{2}$'
   or to_char((e->>'date')::date,'YYYY-MM-DD')<>e->>'date'
   or not(coalesce(e->>'category','')=any(case when e->>'kind'='income' then income else expenses end))
   or jsonb_typeof(e->'note') is distinct from 'string' or length(e->>'note')>1000
   or jsonb_typeof(e->'member') is distinct from 'string' or length(e->>'member')>1000
   or coalesce(e->>'payment','') not in ('Tiền mặt','Chuyển khoản','Thẻ','Ví điện tử') then raise exception 'invalid_entry'; end if;
 end loop;
 if (select count(*)<>count(distinct value->>'id') from jsonb_array_elements(p->'entries')) then raise exception 'duplicate_entry'; end if;
 if exists(select 1 from jsonb_array_elements(p->'entries') group by value->>'kind' having sum((value->>'amount')::numeric)>9007199254740991) then raise exception 'total_overflow'; end if;
 for b in select * from jsonb_each(p->'budgets') loop
  if b.key !~ '^(20[0-9]{2}|2100)-(0[1-9]|1[0-2])$' or jsonb_typeof(b.value)<>'object' then raise exception 'invalid_budget'; end if;
  for c in select * from jsonb_each(b.value) loop
   if not(c.key=any(expenses)) or jsonb_typeof(c.value)<>'number' or c.value::text::numeric not between 0 and 1000000000000 or trunc(c.value::text::numeric)<>c.value::text::numeric then raise exception 'invalid_budget'; end if;
  end loop;
 end loop;
end;
$$;
revoke all on function public.validate_ledger(jsonb) from public,anon,authenticated;
create function public.save_my_ledger(p_revision bigint,p_ledger jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_revision bigint;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 if p_ledger is null or octet_length(p_ledger::text)>20000000 or jsonb_typeof(p_ledger->'version') is distinct from 'number' or p_ledger->>'version' is distinct from '1' or jsonb_typeof(p_ledger->'entries') is distinct from 'array' or jsonb_typeof(p_ledger->'budgets') is distinct from 'object' then raise exception 'invalid_ledger'; end if;
 perform public.validate_ledger(p_ledger);
 select h.id,h.revision into v_id,v_revision from public.households h join public.household_members m on m.household_id=h.id where m.user_id=auth.uid() for update of h;
 if v_id is null then raise exception 'not_a_member'; end if;
 if p_revision is null or v_revision<>p_revision then raise exception 'revision_conflict'; end if;
 update public.households set ledger=p_ledger,revision=revision+1 where id=v_id;
 return public.get_my_household();
end;
$$;
create function public.rotate_invite_code() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 update public.households set invite_code=replace(gen_random_uuid()::text,'-','') where owner_id=auth.uid();
 return public.get_my_household();
end;
$$;
create function public.delete_my_account() returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 -- An owner's account deletion also removes their shared household and ledger.
 delete from auth.users where id=auth.uid();
end;
$$;
revoke all on function public.get_my_household(),public.create_my_household(text),public.join_household(text),public.save_my_ledger(bigint,jsonb),public.rotate_invite_code(),public.delete_my_account() from public,anon,authenticated;
grant execute on function public.get_my_household(),public.create_my_household(text),public.join_household(text),public.save_my_ledger(bigint,jsonb),public.rotate_invite_code(),public.delete_my_account() to authenticated;
commit;
