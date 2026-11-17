-- Local development seed data only (never applied to production; `supabase db reset` runs it).
-- Test accounts (password for all: luna-dev-password):
--   asha@example.test     — member, seat 1 of workspace "Moonshot"
--   bala@example.test     — member, seat 2 of workspace "Moonshot"
--   outsider@example.test — member of a separate workspace (isolation checks)
--   newbie@example.test   — confirmed account with no workspace (onboarding)

do $$
declare
  users constant jsonb := '[
    {"id":"a1111111-1111-4111-8111-111111111111","email":"asha@example.test","name":"Asha"},
    {"id":"b2222222-2222-4222-8222-222222222222","email":"bala@example.test","name":"Bala"},
    {"id":"d4444444-4444-4444-8444-444444444444","email":"outsider@example.test","name":"Olu"},
    {"id":"e5555555-5555-4555-8555-555555555555","email":"newbie@example.test","name":"Neha"}
  ]';
  u jsonb;
begin
  for u in select * from jsonb_array_elements(users) loop
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                            confirmation_token, email_change, email_change_token_new, recovery_token)
    values ('00000000-0000-0000-0000-000000000000', (u ->> 'id')::uuid, 'authenticated', 'authenticated',
            u ->> 'email', extensions.crypt('luna-dev-password', extensions.gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}', jsonb_build_object('display_name', u ->> 'name'),
            now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at,
                                 created_at, updated_at)
    values (gen_random_uuid(), (u ->> 'id')::uuid, u ->> 'id',
            jsonb_build_object('sub', u ->> 'id', 'email', u ->> 'email', 'email_verified', true),
            'email', now(), now(), now());
  end loop;

  insert into public.workspaces (id, name, created_by)
  values ('f0000000-0000-4000-8000-000000000001', 'Moonshot', 'a1111111-1111-4111-8111-111111111111'),
         ('f0000000-0000-4000-8000-000000000002', 'Outsider space', 'd4444444-4444-4444-8444-444444444444');
  insert into public.workspace_members (workspace_id, user_id, seat)
  values ('f0000000-0000-4000-8000-000000000001', 'a1111111-1111-4111-8111-111111111111', 1),
         ('f0000000-0000-4000-8000-000000000001', 'b2222222-2222-4222-8222-222222222222', 2),
         ('f0000000-0000-4000-8000-000000000002', 'd4444444-4444-4444-8444-444444444444', 1);
  insert into public.workspace_member_history (workspace_id, user_id, seat, display_name, joined_at)
  values ('f0000000-0000-4000-8000-000000000001', 'a1111111-1111-4111-8111-111111111111', 1, 'Asha', now()),
         ('f0000000-0000-4000-8000-000000000001', 'b2222222-2222-4222-8222-222222222222', 2, 'Bala', now()),
         ('f0000000-0000-4000-8000-000000000002', 'd4444444-4444-4444-8444-444444444444', 1, 'Olu', now());
end;
$$;
