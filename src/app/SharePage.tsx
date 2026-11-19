import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { EmptyState } from '@/components/patterns/EmptyState'
import { Button } from '@/components/ui/Button'
import { sharedLink } from '@/lib/share'

/**
 * /share — where the phone's share sheet lands (manifest share_target, ADR 0022). A shared link
 * goes straight to "Add opportunity" with the link filled in.
 */
export function SharePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const link = sharedLink(params)
  useEffect(() => {
    if (link) void navigate(`/opportunities/new?url=${encodeURIComponent(link)}`, { replace: true })
  }, [link, navigate])
  if (link) return null
  return (
    <div className="panel">
      <EmptyState
        title="Nothing to add"
        action={
          <Link to="/opportunities/new">
            <Button>Add an opportunity</Button>
          </Link>
        }
      >
        Share a link to a hackathon, internship or scholarship to Luna Space and it opens here,
        ready to add.
      </EmptyState>
    </div>
  )
}
