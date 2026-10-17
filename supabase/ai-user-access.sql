-- Supersedes family allowlisting. Any signed-in account has its own quota.
-- The old family tables are retained as historical usage, never read here.
begin;
create table if not exists nepnha_ai.user_limits (
 user_id uuid primary key references auth.users(id) on delete cascade,
 daily_limit integer not null default 20 check (daily_limit between 1 and 10000),
 enabled boolean not null default true
);
create table if not exists nepnha_ai.user_usage (
 user_id uuid not null references auth.users(id) on delete cascade,
 day date not null,
 used integer not null default 0 check (used >= 0),
 last_request_at timestamptz not null default now(),
 primary key(user_id,day)
);
alter table nepnha_ai.user_limits enable row level security;
alter table nepnha_ai.user_usage enable row level security;
revoke all on nepnha_ai.user_limits,nepnha_ai.user_usage from public,anon,authenticated;
create or replace function nepnha_ai.my_access(p_consume boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_user uuid := auth.uid(); v_limit integer := 20; v_enabled boolean := true;
 v_used integer; v_day date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
 if v_user is null then raise exception 'authentication_required'; end if;
 select daily_limit,enabled into v_limit,v_enabled from nepnha_ai.user_limits where user_id=v_user;
 if not found then v_limit := 20; v_enabled := true; end if;
 if not v_enabled then return jsonb_build_object('enabled',false); end if;
 if p_consume then
  insert into nepnha_ai.user_usage as u(user_id,day,used,last_request_at) values(v_user,v_day,1,now())
  on conflict(user_id,day) do update set used=u.used+1,last_request_at=now()
  where u.used<v_limit and u.last_request_at<now()-interval '2 seconds'
  returning used into v_used;
  if v_used is null then raise exception 'ai_rate_limit'; end if;
 else
  select used into v_used from nepnha_ai.user_usage where user_id=v_user and day=v_day;
 end if;
 return jsonb_build_object('enabled',true,'used',coalesce(v_used,0),'limit',v_limit,'day',v_day);
end;
$$;
revoke all on function nepnha_ai.my_access(boolean) from public,anon,authenticated;
commit;
