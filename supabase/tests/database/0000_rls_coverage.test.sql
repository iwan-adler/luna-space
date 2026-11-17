-- Guard for PRD NFR-SEC-01 / TRD TR-SEC-01: every table in the exposed `public`
-- schema must have Row Level Security enabled. Runs on every PR from day one.
begin;
create extension if not exists pgtap with schema extensions;
select plan(1);

select is(
  array(
    select c.relname::text
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind in ('r', 'p')
       and not c.relrowsecurity
     order by 1
  ),
  array[]::text[],
  'every public table has RLS enabled'
);

select * from finish();
rollback;
