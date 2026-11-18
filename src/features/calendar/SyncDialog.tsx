import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Spinner } from '@/components/ui/Spinner'
import { controlClass } from '@/components/ui/styles'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/features/auth'
import { useViewerTimeZone } from '@/features/profile'
import { publicEnv } from '@/lib/env'
import { messageForCode, toAppError } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'
import { requireSupabase } from '@/lib/supabase'

const linkKey = (uid: string | undefined) => ['calendar', 'sync-link', uid] as const

/** Private subscription link for Google Calendar and phone calendars (ADR 0013). */
export function SyncDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const tz = useViewerTimeZone()
  const [token, setToken] = useState<string | null>(null)
  const existing = useQuery({
    queryKey: linkKey(user?.id),
    enabled: open && Boolean(user),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('calendar_feed_tokens')
        .select('created_at, last_used_at')
        .maybeSingle()
      if (error) throw toAppError(error)
      return data
    },
  })
  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await requireSupabase().rpc('create_calendar_feed_token')
      if (error) throw toAppError(error)
      const r = data as { ok: boolean; token?: string; code?: string }
      if (!r.ok || !r.token) throw toAppError({ code: r.code })
      return r.token
    },
    onSuccess: (t) => {
      setToken(t)
      void qc.invalidateQueries({ queryKey: linkKey(user?.id) })
    },
    onError: (e) =>
      toast.show(messageForCode(toAppError(e).code, "Couldn't create the link."), 'error'),
  })
  const revoke = useMutation({
    mutationFn: async () => {
      const { error } = await requireSupabase().rpc('revoke_calendar_feed_token')
      if (error) throw toAppError(error)
    },
    onSuccess: () => {
      setToken(null)
      void qc.invalidateQueries({ queryKey: linkKey(user?.id) })
      toast.show('Sync turned off. The old link no longer works.', 'success')
    },
  })

  const base = publicEnv.ok ? publicEnv.env.supabaseUrl.replace(/\/$/, '') : ''
  const url = token ? `${base}/functions/v1/calendar-ics?token=${token}` : null
  const webcal = url?.replace(/^https?:/, 'webcal:')

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setToken(null)
      }}
      title="Sync to your phone or Google Calendar"
      description="A private link that shows your Luna Space events, deadlines and task due dates in another calendar app. It only reads; changes are made here."
    >
      <div className="space-y-4 text-body-sm">
        {existing.isPending ? (
          <Spinner className="size-4" />
        ) : url ? (
          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="font-medium text-muted">Your private link</span>
              <input
                readOnly
                value={url}
                data-testid="sync-link"
                onFocus={(e) => e.target.select()}
                className={`${controlClass} w-full font-mono text-caption`}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<Copy className="size-4" aria-hidden />}
                onClick={() =>
                  void navigator.clipboard
                    ?.writeText(url)
                    .then(() => toast.show('Link copied', 'success'))
                    .catch(() => undefined)
                }
              >
                Copy link
              </Button>
              <a
                href={webcal}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-hairline px-3.5 text-body-sm hover:border-border"
              >
                <ExternalLink className="size-4" aria-hidden /> Open in calendar app
              </a>
            </div>
            <p className="text-caption text-muted">
              Shown only now. Keep it private: anyone with the link can see your calendar.
            </p>
          </div>
        ) : existing.data ? (
          <p className="text-muted">
            Sync is on (link created {formatDateTime(existing.data.created_at, tz)}
            {existing.data.last_used_at
              ? `, last read by a calendar app ${formatDateTime(existing.data.last_used_at, tz)}`
              : ', not used yet'}
            ). For security the link is shown only once; create a new one to see it again. The old
            link then stops working.
          </p>
        ) : (
          <p className="text-muted">Create a link, then add it to your calendar app.</p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button loading={create.isPending} onClick={() => create.mutate()}>
            {existing.data ? 'Create a new link' : 'Create sync link'}
          </Button>
          {existing.data ? (
            <Button variant="ghost" loading={revoke.isPending} onClick={() => revoke.mutate()}>
              Turn off sync
            </Button>
          ) : null}
        </div>

        <details className="rounded-[12px] border border-hairline p-3">
          <summary className="cursor-pointer font-medium">How to add it</summary>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted">
            <li>
              <span className="text-text">Google Calendar (and Android):</span> on a computer open
              Google Calendar → Other calendars → + → From URL, paste the link and add it. It then
              appears on your Android phone too.
            </li>
            <li>
              <span className="text-text">iPhone:</span> tap “Open in calendar app”, or go to
              Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar.
            </li>
            <li>
              Calendar apps check for changes every few hours (Google can take up to a day), so new
              items appear there with a delay.
            </li>
          </ul>
        </details>
      </div>
    </Dialog>
  )
}
