begin;
create schema if not exists nepnha_ai;
revoke all on schema nepnha_ai from public, anon, authenticated;
create table if not exists nepnha_ai.access (
 household_id uuid primary key references public.households(id) on delete cascade,
 daily_limit integer not null default 20 check (daily_limit between 1 and 100),
 enabled boolean not null default true
);
create table if not exists nepnha_ai.usage (
 household_id uuid not null references nepnha_ai.access(household_id) on delete cascade,
 day date not null,
 used integer not null default 0 check (used >= 0),
 last_request_at timestamptz not null default now(),
 primary key (household_id,day)
);
alter table nepnha_ai.access enable row level security;
alter table nepnha_ai.usage enable row level security;
revoke all on nepnha_ai.access,nepnha_ai.usage from public,anon,authenticated;
-- Only a privileged internal helper may access the private quota tables.
create or replace function nepnha_ai.my_access(p_consume boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_family uuid; v_limit integer; v_used integer; v_day date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 select a.household_id,a.daily_limit into v_family,v_limit
 from nepnha_ai.access a join public.household_members m on m.household_id=a.household_id
 where m.user_id=auth.uid() and a.enabled;
 if v_family is null then return jsonb_build_object('enabled',false); end if;
 if p_consume then
  insert into nepnha_ai.usage as u(household_id,day,used,last_request_at) values(v_family,v_day,1,now())
  on conflict(household_id,day) do update set used=u.used+1,last_request_at=now()
  where u.used<v_limit and u.last_request_at < now()-interval '2 seconds'
  returning used into v_used;
  if v_used is null then raise exception 'ai_rate_limit'; end if;
 else
  select used into v_used from nepnha_ai.usage where household_id=v_family and day=v_day;
 end if;
 return jsonb_build_object('enabled',true,'used',coalesce(v_used,0),'limit',v_limit,'day',v_day);
end;
$$;
revoke all on function nepnha_ai.my_access(boolean) from public,anon,authenticated;
-- Thin public wrappers use the private helper; no caller-supplied user or family ID.
create or replace function public.get_my_ai_access() returns jsonb
language plpgsql security definer set search_path='' as $$ begin if auth.uid() is null then raise exception 'authentication_required'; end if; return nepnha_ai.my_access(false); end; $$;
create or replace function public.consume_my_ai_request() returns jsonb
language plpgsql security definer set search_path='' as $$ begin if auth.uid() is null then raise exception 'authentication_required'; end if; return nepnha_ai.my_access(true); end; $$;
revoke all on function public.get_my_ai_access(),public.consume_my_ai_request() from public,anon,authenticated;
grant execute on function public.get_my_ai_access(),public.consume_my_ai_request() to authenticated;
commit;
