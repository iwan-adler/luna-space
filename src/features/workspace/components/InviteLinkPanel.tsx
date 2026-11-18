import { Copy, Link2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { formatDateTime } from '@/lib/format'
import { useCreateInvitation } from '../hooks'

/** Creates a partner invitation and shows the link exactly once (FR-PLAT-03, NFR-SEC-05). */
export function InviteLinkPanel({ workspaceId }: { workspaceId: string }) {
  const toast = useToast()
  const create = useCreateInvitation(workspaceId)
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null)

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast.show('Invitation link copied', 'success')
    } catch {
      toast.show('Copy failed — select the link and copy it manually', 'warning')
    }
  }

  if (link) {
    return (
      <div className="space-y-3">
        <Alert tone="warning">
          Copy this link now — for security it won&apos;t be shown again.
        </Alert>
        <div className="flex gap-2">
          <input
            readOnly
            aria-label="Invitation link"
            data-testid="invite-link"
            value={link.url}
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 rounded-[12px] border border-hairline bg-surface-raised px-3.5 py-2.5 font-mono text-body-sm"
          />
          <Button onClick={() => copy(link.url)} icon={<Copy className="size-4" aria-hidden />}>
            Copy
          </Button>
        </div>
        <p className="text-caption text-muted">
          Single use · expires {formatDateTime(link.expiresAt)}. Send it to your partner through any
          app.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {create.error ? <Alert tone="danger">{create.error.message}</Alert> : null}
      <Button
        onClick={() => create.mutate(undefined, { onSuccess: setLink })}
        loading={create.isPending}
        icon={<Link2 className="size-4" aria-hidden />}
      >
        Create invitation link
      </Button>
    </div>
  )
}
