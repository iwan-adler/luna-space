import { Download, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Alert, Card } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { useViewerTimeZone } from '@/features/profile'
import { useCurrentWorkspace } from '@/features/workspace'
import { todayIn } from '@/lib/dates'
import { buildExport, downloadJson } from './export'
import { exportFileName } from './model'

/** /settings/data — download everything, and the recycle bin (FR-PLAT-13, FR-PLAT-10). */
export function DataSettingsPage() {
  const ws = useCurrentWorkspace()
  const tz = useViewerTimeZone()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setBusy(true)
    setError(null)
    try {
      const data = await buildExport(ws.workspaceId)
      downloadJson(exportFileName(ws.workspaceName, todayIn(tz)), data)
      toast.show('Your data is downloading', 'success')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The export failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="data-title" className="max-w-2xl space-y-6">
      <h1 id="data-title" className="text-h1">
        Your data
      </h1>
      <Card className="space-y-3 p-5">
        <h2 className="text-h2">Download everything</h2>
        <p className="text-body-sm text-muted">
          One JSON file with your own items and everything shared in {ws.workspaceName}:
          opportunities, projects, tasks, calendar, notes, the Vault, chat and activity. Your
          partner&apos;s private items are never included. Uploaded files are listed by name; their
          contents are not part of the file.
        </p>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <Button icon={<Download className="size-4" aria-hidden />} loading={busy} onClick={run}>
          Download my data
        </Button>
      </Card>
      <Card className="space-y-3 p-5">
        <h2 className="text-h2">Recycle bin</h2>
        <p className="text-body-sm text-muted">
          Deleted items can be restored for 30 days, then they are removed for good.
        </p>
        <Link to="/trash" className="inline-flex">
          <Button variant="secondary" icon={<Trash2 className="size-4" aria-hidden />}>
            Open the recycle bin
          </Button>
        </Link>
      </Card>
    </section>
  )
}
