create or replace function public.validate_ledger(p jsonb) returns void language plpgsql set search_path='' as $$
declare e jsonb; b record; c record; k text; names jsonb; income text[] := array['Lương','Thưởng','Kinh doanh / làm thêm','Lãi tiết kiệm / đầu tư','Quà tặng / trợ cấp','Thu khác']; expenses text[] := array['Ăn uống','Nhà ở','Điện nước / Internet','Đi lại','Con cái / học tập','Y tế','Mua sắm','Giải trí / du lịch','Hiếu hỉ / biếu tặng','Chi khác'];
begin
 if p ? 'categories' then
  if jsonb_typeof(p->'categories') is distinct from 'object' then raise exception 'invalid_categories'; end if;
  foreach k in array array['income','expense'] loop
   names := p->'categories'->k;
   if jsonb_typeof(names) is distinct from 'array' then raise exception 'invalid_categories'; end if;
   if jsonb_array_length(names) not between 1 and 100 then raise exception 'invalid_categories'; end if;
   if exists(select 1 from jsonb_array_elements(names) n(value)
    where jsonb_typeof(value) is distinct from 'string'
    or length(value #>> '{}') not between 1 and 60
    or (value #>> '{}') <> btrim(value #>> '{}')
    or lower(value #>> '{}') in ('__proto__','constructor','prototype'))
    then raise exception 'invalid_categories'; end if;
   if (select count(*) <> count(distinct lower(value #>> '{}')) from jsonb_array_elements(names) n(value))
    then raise exception 'duplicate_category'; end if;
  end loop;
  select array_agg(value) into income from jsonb_array_elements_text(p->'categories'->'income');
  select array_agg(value) into expenses from jsonb_array_elements_text(p->'categories'->'expense');
 end if;
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
