import { ClipboardPaste, Link2, PencilLine } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Alert, Card } from '@/components/ui/Card'
import { TextField } from '@/components/ui/Field'
import { inputClass } from '@/components/ui/styles'
import { EXTRACT_MESSAGES, findDuplicate, startExtraction } from '../extraction'

const MAX_PASTE = 300_000

/**
 * /opportunities/new — paste a link (FR-OPP-06) or enter details manually (FR-OPP-13). Many
 * listing sites (Devpost, Unstop…) refuse requests from servers; then the page text can be pasted
 * and the same extraction runs on it.
 */
export function AddOpportunityPage() {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duplicate, setDuplicate] = useState<{ id: string; title: string } | null>(null)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [blockedReason, setBlockedReason] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [pasteError, setPasteError] = useState<string | null>(null)

  const manualLink = (reason?: string) => {
    const p = new URLSearchParams()
    if (url.trim()) p.set('url', url.trim())
    if (reason) p.set('reason', reason)
    return `/opportunities/new/manual${p.size ? `?${p}` : ''}`
  }
  const validUrl = (value: string) => /^https?:\/\/\S+$/i.test(value)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setDuplicate(null)
    setBlockedReason(null)
    const value = url.trim()
    if (!validUrl(value)) {
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
      if (result.canPaste) {
        // The site blocks servers: offer reading a paste of the page instead.
        setBlockedReason(EXTRACT_MESSAGES[code] ?? result.reason ?? EXTRACT_MESSAGES.SERVER_ERROR!)
        setPasteOpen(true)
        return
      }
      navigate(manualLink(result.reason ?? EXTRACT_MESSAGES[code] ?? EXTRACT_MESSAGES.SERVER_ERROR))
    } finally {
      setBusy(false)
    }
  }

  const readPaste = async () => {
    setPasteError(null)
    const value = url.trim()
    if (!validUrl(value)) {
      setError('Add the link too, so the opportunity keeps its source.')
      return
    }
    if (text.trim().length < 40) {
      setPasteError(
        'Paste the whole page: select everything (Ctrl+A), copy (Ctrl+C) and paste here.',
      )
      return
    }
    setBusy(true)
    try {
      const result = await startExtraction(value, text.slice(0, MAX_PASTE))
      if (result.ok && result.runId) {
        navigate(`/opportunities/review/${result.runId}`)
        return
      }
      setPasteError(
        EXTRACT_MESSAGES[result.code ?? 'SERVER_ERROR'] ?? EXTRACT_MESSAGES.SERVER_ERROR!,
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="add-title" className="max-w-2xl space-y-4">
      <Link to="/opportunities" className="text-body-sm text-muted hover:underline">
        ← Opportunities
      </Link>
      <h1 id="add-title" className="font-display text-h1">
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
          <Button
            type="submit"
            loading={busy && !pasteOpen}
            icon={<Link2 className="size-4" aria-hidden />}
          >
            {busy && !pasteOpen ? 'Reading the page…' : 'Fetch details'}
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

      {pasteOpen ? (
        <Card className="space-y-3" data-testid="paste-panel">
          {blockedReason ? (
            <Alert tone="warning">
              {blockedReason} You can still bring the details in: open the page in your browser,
              select everything and copy it, then paste it below.
            </Alert>
          ) : null}
          <div className="space-y-1.5">
            <label htmlFor="pasted-page" className="block text-body-sm font-medium text-muted">
              Page text
            </label>
            <textarea
              id="pasted-page"
              rows={8}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setPasteError(null)
              }}
              placeholder="On a computer: Ctrl+A, then Ctrl+C on the opportunity page, and Ctrl+V here. On a phone: select all, copy, then paste here."
              className={inputClass}
            />
            {pasteError ? <p className="text-caption text-danger">{pasteError}</p> : null}
            <p className="text-caption text-muted">
              Only what you paste is read. The text itself is not kept; the details found are shown
              for you to check.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              loading={busy}
              icon={<ClipboardPaste className="size-4" aria-hidden />}
              onClick={() => void readPaste()}
            >
              {busy ? 'Reading…' : 'Read pasted text'}
            </Button>
            <Link
              to={manualLink(blockedReason ?? undefined)}
              className="text-body-sm text-muted hover:text-text"
            >
              Enter details manually instead
            </Link>
          </div>
        </Card>
      ) : null}

      <p className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-muted">
        {pasteOpen ? null : (
          <button
            type="button"
            onClick={() => setPasteOpen(true)}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            <ClipboardPaste className="size-4" aria-hidden /> Paste the page text instead
          </button>
        )}
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
