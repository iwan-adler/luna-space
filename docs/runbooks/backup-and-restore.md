# Backup and restore

How Luna Space's data is backed up, and how to restore it (Implementation Plan §14, ADR 0022).

## What is backed up

| What                                              | How                                                                                                                                      | Kept                          |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Database (roles, schema, all rows)                | `Backup` GitHub workflow, nightly at 03:11 IST: `supabase db dump`, then encrypted with AES-256                                          | 30 days as workflow artifacts |
| Uploaded files (Storage bucket `workspace-files`) | Supabase's own storage durability. They are not in the nightly dump; download a copy with the Supabase CLI (below) before risky changes. | Until deleted                 |
| Supabase's own daily backups                      | Included in the paid plans only (not the free plan)                                                                                      | Plan-dependent                |

## One-time setup

1. In GitHub, go to **Settings → Secrets and variables → Actions** and add two repository
   secrets:
   - `SUPABASE_DB_URL`: in the Supabase dashboard, open **Connect → Session pooler** and copy the
     connection string, with the database password filled in.
   - `BACKUP_PASSPHRASE`: a long random passphrase. **Save a copy in your password manager.**
     Without it the backups can't be opened.
2. Go to **Actions → Backup → Run workflow** once and check that it uploads an artifact.

Until both secrets exist, the workflow runs and skips itself.

## Restore drill (do this once now, then every few months)

Restore into the **local** stack, never straight into production.

```bash
# 1. Download the newest artifact from Actions → Backup, then decrypt and unpack it
gpg --decrypt luna-space-<stamp>.tar.gz.gpg > backup.tar.gz
mkdir restore && tar -xzf backup.tar.gz -C restore

# 2. Start an empty local database
npx supabase stop --no-backup && npx supabase start -x studio,imgproxy,vector,logflare,supavisor

# 3. Load roles, schema and data (the local stack's database URL)
DB=postgresql://postgres:postgres@127.0.0.1:54322/postgres
psql "$DB" -f restore/roles.sql
psql "$DB" -f restore/schema.sql
psql "$DB" -c "SET session_replication_role = replica" -f restore/data.sql

# 4. Check: row counts look right and the app can sign in against it
psql "$DB" -c "select count(*) from public.workspaces; select count(*) from public.opportunities;"
npm run dev
```

Write down the date of the drill and anything that didn't work at the end of this file.

## Restoring production (only after a real loss)

1. Pause writing: tell the members, and turn off the nightly maintenance purge (Supabase
   dashboard → Integrations → Cron → `nightly-maintenance`).
2. Create a fresh Supabase project, or reset the affected tables. Run the drill steps against
   its connection string instead of the local one.
3. Point the Cloudflare build at the new project (`VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY`), redeploy the Edge Functions, set their secrets again, and
   re-create the Vault secrets for push and maintenance.
4. Turn the purge back on.

## Copying uploaded files

```bash
npx supabase storage cp -r ss:///workspace-files ./files-backup --experimental
```

## Drill log

- _No drill yet._
