-- Account upgrade. Execute once after testing; clears all pre-upgrade transactions.
begin;
create table public.app_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '' check(length(display_name)<=80),
 ai_consent boolean not null default false
);
alter table public.app_profiles enable row level security;
revoke all on public.app_profiles from public,anon,authenticated;
alter table public.households add column is_family boolean not null default true;
create unique index households_one_owner on public.households(owner_id);
create index household_members_household on public.household_members(household_id);
create table public.entry_authors (
 book_id uuid references public.households(id) on delete cascade,
 entry_id text not null,
 creator_id uuid references auth.users(id) on delete set null,
 primary key(book_id,entry_id)
);
create table public.ledger_audit (
 id bigint generated always as identity primary key,
 book_id uuid not null references public.households(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null,
 actor_name text not null,
 action text not null,
 entry_id text,
 before_value jsonb,
 after_value jsonb,
 occurred_at timestamptz not null default now()
);
create index ledger_audit_book on public.ledger_audit(book_id,id desc);
create index ledger_audit_actor on public.ledger_audit(actor_id);
create index entry_authors_creator on public.entry_authors(creator_id);
alter table public.entry_authors enable row level security;
alter table public.ledger_audit enable row level security;
revoke all on public.entry_authors,public.ledger_audit from public,anon,authenticated;
-- Explicitly authorized reset. Do not infer authorship from the editable member field.
update public.households set ledger=jsonb_set(ledger,'{entries}','[]') || jsonb_build_object('categories',coalesce(ledger->'categories','{"income":["Lương","Thưởng","Kinh doanh / làm thêm","Lãi tiết kiệm / đầu tư","Quà tặng / trợ cấp","Thu khác"],"expense":["Ăn uống","Nhà ở","Điện nước / Internet","Đi lại","Con cái / học tập","Y tế","Mua sắm","Giải trí / du lịch","Hiếu hỉ / biếu tặng","Chi khác"]}'::jsonb)),revision=revision+1;

create or replace function public.get_my_household() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 select to_jsonb(h) into result from public.households h join public.household_members m on m.household_id=h.id where m.user_id=auth.uid();
 if result is null then select to_jsonb(h) into result from public.households h where h.owner_id=auth.uid() and not h.is_family; end if;
 return result;
end;
$$;
create function public.get_my_account() returns jsonb language plpgsql security definer set search_path='' as $$
declare profile jsonb;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 insert into public.app_profiles(user_id) values(auth.uid()) on conflict do nothing;
 insert into public.households(owner_id,name,is_family,ledger) values(auth.uid(),'Sổ cá nhân',false,'{"version":1,"entries":[],"budgets":{},"categories":{"income":["Lương","Thưởng","Kinh doanh / làm thêm","Lãi tiết kiệm / đầu tư","Quà tặng / trợ cấp","Thu khác"],"expense":["Ăn uống","Nhà ở","Điện nước / Internet","Đi lại","Con cái / học tập","Y tế","Mua sắm","Giải trí / du lịch","Hiếu hỉ / biếu tặng","Chi khác"]}}'::jsonb) on conflict(owner_id) do nothing;
 select to_jsonb(p) into profile from public.app_profiles p where user_id=auth.uid();
 return jsonb_build_object('profile',profile,'book',public.get_my_household());
end;
$$;
create function public.set_my_name(p_name text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 if p_name is null or length(btrim(p_name)) not between 1 and 80 then raise exception 'invalid_display_name'; end if;
 insert into public.app_profiles(user_id,display_name) values(auth.uid(),btrim(p_name)) on conflict(user_id) do update set display_name=excluded.display_name;
 return public.get_my_account();
end;
$$;
create function public.set_my_ai_consent(p_enabled boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 if p_enabled is null then raise exception 'invalid_consent'; end if;
 update public.app_profiles set ai_consent=p_enabled where user_id=auth.uid() and display_name<>'';
 if not found then raise exception 'name_required'; end if;
end;
$$;
create or replace function public.create_my_household(p_name text) returns jsonb language plpgsql security definer set search_path='' as $$
declare book jsonb;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 perform public.get_my_account();
 if not exists(select 1 from public.app_profiles where user_id=auth.uid() and display_name<>'') then raise exception 'name_required'; end if;
 if p_name is null or length(btrim(p_name)) not between 1 and 80 then raise exception 'invalid_family_name'; end if;
 if exists(select 1 from public.household_members where user_id=auth.uid()) then raise exception 'already_in_household'; end if;
 update public.households set is_family=true,name=btrim(p_name),revision=revision+1,
 invite_code=replace(gen_random_uuid()::text,'-','') where owner_id=auth.uid();
 insert into public.household_members(user_id,household_id) select auth.uid(),id from public.households where owner_id=auth.uid();
 return public.get_my_household();
end;
$$;
create or replace function public.join_household(p_code text) returns jsonb language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 perform public.get_my_account();
 if not exists(select 1 from public.app_profiles where user_id=auth.uid() and display_name<>'') then raise exception 'name_required'; end if;
 if exists(select 1 from public.household_members where user_id=auth.uid()) then raise exception 'already_in_household'; end if;
 select id into target from public.households where is_family and invite_code=lower(btrim(p_code)) for update;
 if target is null then raise exception 'invalid_invite_code'; end if;
 insert into public.household_members(user_id,household_id) values(auth.uid(),target);
 return public.get_my_household();
end;
$$;
create function public.leave_my_family() returns jsonb language plpgsql security definer set search_path='' as $$
declare book jsonb;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 book:=public.get_my_household();
 perform 1 from public.households where id=(book->>'id')::uuid for update;
 if coalesce((book->>'is_family')::boolean,false)=false then raise exception 'not_in_family'; end if;
 if book->>'owner_id'=auth.uid()::text then raise exception 'owner_must_disband'; end if;
 delete from public.household_members where user_id=auth.uid();
 return public.get_my_account();
end;
$$;
create function public.disband_my_family() returns jsonb language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select id into target from public.households where owner_id=auth.uid() and is_family for update;
 if target is null then raise exception 'owner_required'; end if;
 delete from public.household_members where household_id=target;
 update public.households set is_family=false,name='Sổ cá nhân',revision=revision+1,invite_code=replace(gen_random_uuid()::text,'-','') where id=target;
 return public.get_my_account();
end;
$$;
create function public.remove_family_member(p_user_id uuid,p_rotate boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 if p_user_id is null or p_user_id=auth.uid() then raise exception 'cannot_remove_owner'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
 select id into target from public.households where owner_id=auth.uid() and is_family for update;
 if target is null then raise exception 'owner_required'; end if;
 delete from public.household_members where household_id=target and user_id=p_user_id;
 if not found then raise exception 'member_not_found'; end if;
 if p_rotate then update public.households set invite_code=replace(gen_random_uuid()::text,'-','') where id=target; end if;
end;
$$;
create or replace function public.rotate_invite_code() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 update public.households set invite_code=replace(gen_random_uuid()::text,'-','') where owner_id=auth.uid() and is_family;
 if not found then raise exception 'owner_required'; end if;
 return public.get_my_household();
end;
$$;
create function public.list_my_family_members() returns jsonb language plpgsql security definer set search_path='' as $$
declare book jsonb;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 book:=public.get_my_household();
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'display_name',coalesce(nullif(p.display_name,''),'Chưa đặt tên'),'is_owner',m.user_id=(book->>'owner_id')::uuid) order by m.user_id)
 from public.household_members m left join public.app_profiles p on p.user_id=m.user_id where m.household_id=(book->>'id')::uuid),'[]');
end;
$$;
drop function public.save_my_ledger(bigint,jsonb);
create function public.save_my_ledger(p_revision bigint,p_ledger jsonb,p_book_id uuid,p_client_epoch text) returns jsonb language plpgsql security definer set search_path='' as $$
declare book jsonb; old_ledger jsonb; e jsonb; old_entry jsonb; creator uuid; author_name text; result_entries jsonb:='[]'; action_name text;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 if p_client_epoch is distinct from 'accounts-v2' then raise exception 'upgrade_required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 book:=public.get_my_household();
 if book is null or (book->>'id')::uuid is distinct from p_book_id then raise exception 'book_changed'; end if;
 perform 1 from public.households where id=p_book_id for update;
 book:=public.get_my_household();
 if book is null or (book->>'id')::uuid is distinct from p_book_id then raise exception 'book_changed'; end if;
 select ledger into old_ledger from public.households where id=p_book_id;
 if not exists(select 1 from public.households where id=p_book_id and revision=p_revision) then raise exception 'revision_conflict'; end if;
 select display_name into author_name from public.app_profiles where user_id=auth.uid();
 if coalesce(author_name,'')='' then raise exception 'name_required'; end if;
 if p_ledger is null or octet_length(p_ledger::text)>20000000 or p_ledger->>'version' is distinct from '1' or jsonb_typeof(p_ledger->'entries') is distinct from 'array' or jsonb_typeof(p_ledger->'budgets') is distinct from 'object' then raise exception 'invalid_ledger'; end if;
 perform public.validate_ledger(p_ledger);
 -- Members cannot rename categories or replace family budgets through a forged request.
 if book->>'owner_id'<>auth.uid()::text and (old_ledger->'categories' is distinct from p_ledger->'categories' or old_ledger->'budgets' is distinct from p_ledger->'budgets') then raise exception 'owner_required'; end if;
 for e in select value-'created_by' from jsonb_array_elements(p_ledger->'entries') loop
  select value-'created_by' into old_entry from jsonb_array_elements(old_ledger->'entries') where value->>'id'=e->>'id';
  select creator_id into creator from public.entry_authors where book_id=p_book_id and entry_id=e->>'id';
  if old_entry is null or old_entry<>e then
   if creator is not null and creator<>auth.uid() and book->>'owner_id'<>auth.uid()::text then raise exception 'entry_permission_denied'; end if;
   if creator is null and exists(select 1 from public.entry_authors where book_id=p_book_id and entry_id=e->>'id') and book->>'owner_id'<>auth.uid()::text then raise exception 'entry_permission_denied'; end if;
   if not exists(select 1 from public.entry_authors where book_id=p_book_id and entry_id=e->>'id') then
    insert into public.entry_authors values(p_book_id,e->>'id',auth.uid()); creator:=auth.uid();
   end if;
   insert into public.ledger_audit(book_id,actor_id,actor_name,action,entry_id,before_value,after_value) values(p_book_id,auth.uid(),author_name,case when old_entry is null then 'create' else 'update' end,e->>'id',old_entry,e);
  end if;
  result_entries:=result_entries||jsonb_build_array(e||jsonb_build_object('created_by',creator));
 end loop;
 for old_entry in select o.value from jsonb_array_elements(old_ledger->'entries') o where not exists(select 1 from jsonb_array_elements(p_ledger->'entries') n where n.value->>'id'=o.value->>'id') loop
  select creator_id into creator from public.entry_authors where book_id=p_book_id and entry_id=old_entry->>'id';
  if creator is distinct from auth.uid() and book->>'owner_id'<>auth.uid()::text then raise exception 'entry_permission_denied'; end if;
  insert into public.ledger_audit(book_id,actor_id,actor_name,action,entry_id,before_value) values(p_book_id,auth.uid(),author_name,'delete',old_entry->>'id',old_entry-'created_by');
 end loop;
 if old_ledger->'categories' is distinct from p_ledger->'categories' or old_ledger->'budgets' is distinct from p_ledger->'budgets' then
  insert into public.ledger_audit(book_id,actor_id,actor_name,action,before_value,after_value) values(p_book_id,auth.uid(),author_name,'settings',old_ledger-'entries',p_ledger-'entries');
 end if;
 update public.households set ledger=jsonb_set(p_ledger,'{entries}',result_entries),revision=revision+1 where id=p_book_id;
 return public.get_my_household();
end;
$$;
create function public.get_my_audit(p_before bigint default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare book jsonb;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 book:=public.get_my_household();
 return coalesce((select jsonb_agg(to_jsonb(a) order by id desc) from (select * from public.ledger_audit where book_id=(book->>'id')::uuid and (p_before is null or id<p_before) order by id desc limit 30) a),'[]');
end;
$$;
create or replace function public.delete_my_account() returns void language plpgsql security definer set search_path='' as $$
declare affected record;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if exists(select 1 from public.households where owner_id=auth.uid() and is_family) then raise exception 'disband_before_account_deletion'; end if;
 for affected in select h.id from public.households h where exists(select 1 from public.entry_authors e where e.book_id=h.id and e.creator_id=auth.uid()) order by h.id for update of h loop
  update public.households h set ledger=jsonb_set(h.ledger,'{entries}',(select coalesce(jsonb_agg(case when e.value->>'created_by'=auth.uid()::text then e.value||jsonb_build_object('created_by',null) else e.value end),'[]') from jsonb_array_elements(h.ledger->'entries') e)),revision=revision+1 where h.id=affected.id;
 end loop;
 update public.ledger_audit set actor_name='Tài khoản đã xóa' where actor_id=auth.uid();
 delete from auth.sessions where user_id=auth.uid();
 delete from auth.users where id=auth.uid();
end;
$$;
-- Revoke default PUBLIC execution on every new entry point.
revoke all on function public.get_my_account(),public.set_my_name(text),public.set_my_ai_consent(boolean),public.leave_my_family(),public.disband_my_family(),public.remove_family_member(uuid,boolean),public.list_my_family_members(),public.save_my_ledger(bigint,jsonb,uuid,text),public.get_my_audit(bigint) from public,anon,authenticated;
grant execute on function public.get_my_account(),public.set_my_name(text),public.set_my_ai_consent(boolean),public.leave_my_family(),public.disband_my_family(),public.remove_family_member(uuid,boolean),public.list_my_family_members(),public.save_my_ledger(bigint,jsonb,uuid,text),public.get_my_audit(bigint) to authenticated;
-- Keep privileged implementations out of the exposed API schema. Public RPCs
-- are invoker wrappers; the private implementation still verifies auth.uid().
create schema nepnha_accounts;
revoke all on schema nepnha_accounts from public,anon;
grant usage on schema nepnha_accounts to authenticated;
do $upgrade$
declare f record; forward_args text;
begin
 for f in select p.proname,pg_get_function_arguments(p.oid) args,pg_get_function_identity_arguments(p.oid) identity_args,pg_get_function_result(p.oid) result_type,p.pronargs
 from pg_proc p where p.pronamespace='public'::regnamespace and p.proname=any(array['get_my_household','get_my_account','set_my_name','set_my_ai_consent','create_my_household','join_household','leave_my_family','disband_my_family','remove_family_member','rotate_invite_code','list_my_family_members','save_my_ledger','get_my_audit','delete_my_account']) loop
  select coalesce(string_agg('$'||i,','),'') into forward_args from generate_series(1,f.pronargs) i;
  execute format('alter function public.%I(%s) set schema nepnha_accounts',f.proname,f.identity_args);
  execute format('revoke all on function nepnha_accounts.%I(%s) from public,anon',f.proname,f.identity_args);
  execute format('grant execute on function nepnha_accounts.%I(%s) to authenticated',f.proname,f.identity_args);
  execute format('create function public.%I(%s) returns %s language sql security invoker set search_path = %L as %L',f.proname,f.args,f.result_type,'',format('select nepnha_accounts.%I(%s)',f.proname,forward_args));
  execute format('revoke all on function public.%I(%s) from public,anon,authenticated',f.proname,f.identity_args);
  execute format('grant execute on function public.%I(%s) to authenticated',f.proname,f.identity_args);
 end loop;
end;
$upgrade$;
notify pgrst,'reload schema';
commit;
