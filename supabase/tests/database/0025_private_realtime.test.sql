-- Private Realtime channels for presence and typing (ADR 0022).
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

select is(private.channel_workspace('presence:11111111-0000-0000-0000-000000000001'),
          '11111111-0000-0000-0000-000000000001'::uuid, 'presence channels name their workspace');
select is(private.channel_workspace('typing:11111111-0000-0000-0000-000000000001'),
          '11111111-0000-0000-0000-000000000001'::uuid, 'typing channels too');
select is(private.channel_workspace('chat:11111111-0000-0000-0000-000000000001'), null,
          'other topics are not admitted');
select is(private.channel_workspace('presence:not-a-uuid'), null, 'malformed topics are not admitted');
select ok(exists (select 1 from pg_policies where schemaname = 'realtime' and tablename = 'messages'
                   and policyname in ('luna_members_receive', 'luna_members_send')),
          'only members can join presence and typing channels');

select * from finish();
rollback;
