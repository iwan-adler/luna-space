begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

select has_extension('pg_trgm', 'pg_trgm is installed');
select has_extension('unaccent', 'unaccent is installed');
select has_extension('pgcrypto', 'pgcrypto is installed');
select has_extension('pg_cron', 'pg_cron is installed');
select has_extension('pg_net', 'pg_net is installed');
select has_schema('private', 'private schema exists');
select ok(
  not has_schema_privilege('anon', 'private', 'usage'),
  'anon cannot use the private schema'
);

select * from finish();
rollback;
