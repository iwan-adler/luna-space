-- Usage panel (ADR 0022).
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email, aud, role, email_confirmed_at)
values ('aaaaaaaa-0000-0000-0000-00000000000a', 'a@pgtap-usage.test', 'authenticated', 'authenticated', now()),
       ('dddddddd-0000-0000-0000-00000000000d', 'o@pgtap-usage.test', 'authenticated', 'authenticated', now());
insert into public.workspaces (id, name) values ('11111111-0000-0000-0000-000000000001', 'Usage WS');
insert into public.workspace_members (workspace_id, user_id, seat, role)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 1, 'owner');
insert into public.files (workspace_id, owner_id, storage_path, file_name, mime_type, size_bytes, upload_state)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a',
        '11111111-0000-0000-0000-000000000001/f/a.pdf', 'a.pdf', 'application/pdf', 2048, 'stored');

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}', true);
set local role authenticated;
select is((public.workspace_usage() ->> 'storage_bytes')::int, 2048, 'storage counts stored files');
select ok((public.workspace_usage() ->> 'database_bytes')::bigint > 0, 'the database size is reported');

select set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-00000000000d","role":"authenticated"}', true);
select throws_ok($$select public.workspace_usage()$$, '42501', null, 'people outside a workspace get nothing');
reset role;
set local role anon;
select throws_ok($$select public.workspace_usage()$$, '42501', null, 'anonymous visitors cannot call it');

select * from finish();
rollback;
