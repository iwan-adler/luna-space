import { FolderKanban } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { messageForCode, toAppError } from '@/lib/errors'
import { useConvertOpportunity, useProjectForOpportunity } from '../hooks'

/** Opportunity sidebar card: open the linked project room or create one (FR-OPP-15, AC-16). */
export function ConvertToProjectCard({ opportunityId }: { opportunityId: string }) {
  const project = useProjectForOpportunity(opportunityId)
  const convert = useConvertOpportunity()
  const navigate = useNavigate()
  const toast = useToast()

  return (
    <Card>
      <h2 className="mb-2 text-h3 font-semibold">Project</h2>
      {project.isPending ? (
        <Spinner className="size-4" />
      ) : project.data ? (
        <Link
          to={`/projects/${project.data.id}`}
          className="inline-flex items-center gap-1.5 text-body-sm text-primary hover:underline"
        >
          <FolderKanban className="size-4" aria-hidden /> Open {project.data.name}
        </Link>
      ) : (
        <>
          <p className="mb-3 text-body-sm text-muted">
            Taking part? Turn this into a project room with a board, checklist and files. Dates and
            links are copied over.
          </p>
          <Button
            variant="secondary"
            size="sm"
            loading={convert.isPending}
            icon={<FolderKanban className="size-4" aria-hidden />}
            onClick={() =>
              convert.mutate(opportunityId, {
                onSuccess: (id) => {
                  toast.show('Project room created', 'success')
                  void navigate(`/projects/${id}/overview`)
                },
                onError: (e) =>
                  toast.show(
                    messageForCode(toAppError(e).code, "Couldn't create the project."),
                    'error',
                  ),
              })
            }
          >
            Convert to project
          </Button>
        </>
      )}
    </Card>
  )
}
