import { Link2, PencilLine } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Alert, Card } from '@/components/ui/Card'
import { TextField } from '@/components/ui/Field'
import { EXTRACT_MESSAGES, findDuplicate, startExtraction } from '../extraction'

/** /opportunities/new — paste a link (FR-OPP-06) or enter details manually (FR-OPP-13). */
export function AddOpportunityPage() {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duplicate, setDuplicate] = useState<{ id: string; title: string } | null>(null)

  const manualLink = (reason?: string) => {
    const p = new URLSearchParams()
    if (url.trim()) p.set('url', url.trim())
    if (reason) p.set('reason', reason)
    return `/opportunities/new/manual${p.size ? `?${p}` : ''}`
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setDuplicate(null)
    const value = url.trim()
    if (!/^https?:\/\/\S+$/i.test(value)) {
      setError('Paste a full link starting with https://')
      return
    }
    setBusy(true)
    try {
      const dup = await findDuplicate(value).catch(() => null)
      if (dup) {
        setDuplicate(dup)
        return
      }
      const result = await startExtraction(value)
      if (result.ok && result.runId) {
        navigate(`/opportunities/review/${result.runId}`)
        return
      }
      const code = result.code ?? 'SERVER_ERROR'
      if (code === 'RATE_LIMITED' || code === 'INVALID_URL' || code === 'NOT_MEMBER') {
        setError(EXTRACT_MESSAGES[code] ?? null)
        return
      }
      // Any fetch problem: continue with the manual form, keeping the link (FR-OPP-13).
      navigate(manualLink(result.reason ?? EXTRACT_MESSAGES[code] ?? EXTRACT_MESSAGES.SERVER_ERROR))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="add-title" className="max-w-2xl space-y-4">
      <Link to="/opportunities" className="text-body-sm text-muted hover:underline">
        ← Opportunities
      </Link>
      <h1 id="add-title" className="text-h1 font-bold">
        Add an opportunity
      </h1>
      <Card className="space-y-3">
        <form onSubmit={submit} noValidate className="space-y-3">
          <TextField
            label="Link to the opportunity"
            type="url"
            inputMode="url"
            placeholder="https://"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            hint="We read the page and propose the details for you to check. Nothing is saved until you confirm."
            error={error ?? undefined}
            autoFocus
          />
          <Button type="submit" loading={busy} icon={<Link2 className="size-4" aria-hidden />}>
            {busy ? 'Reading the page…' : 'Fetch details'}
          </Button>
        </form>
        {duplicate ? (
          <Alert tone="warning">
            You already track this link as{' '}
            <Link to={`/opportunities/${duplicate.id}`} className="font-medium underline">
              {duplicate.title}
            </Link>
            .
          </Alert>
        ) : null}
      </Card>
      <p className="text-body-sm text-muted">
        No link, or the page needs a login?{' '}
        <Link
          to={manualLink()}
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
        >
          <PencilLine className="size-4" aria-hidden /> Enter details manually
        </Link>
      </p>
    </section>
  )
}
