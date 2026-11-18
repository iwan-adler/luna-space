import { lazy, Suspense, type ReactNode } from 'react'
import { Route, Routes } from 'react-router'
import { PageSpinner } from '@/components/ui/Spinner'
import {
  AuthCallbackPage,
  AuthLayout,
  RequireAuth,
  ResetPasswordPage,
  SignInPage,
  SignUpPage,
  UpdatePasswordPage,
} from '@/features/auth'
import { HomePage } from '@/features/dashboard'
import { ProfileSettingsPage } from '@/features/profile'
import {
  AcceptInvitePage,
  OnboardingPage,
  RequireWorkspace,
  WorkspaceSettingsPage,
} from '@/features/workspace'
import { publicEnv } from '@/lib/env'
import { AppShell, MorePage } from './AppShell'
import { ComingSoonPage } from './ComingSoonPage'
import { ConfigMissingPage } from './ConfigMissingPage'
import { NotFoundPage } from './NotFoundPage'

// Feature modules load on demand (TR-FE-01: route chunks, small initial bundle).
const opportunities = () => import('@/features/opportunities')
const OpportunityListPage = lazy(() =>
  opportunities().then((m) => ({ default: m.OpportunityListPage })),
)
const OpportunityFormPage = lazy(() =>
  opportunities().then((m) => ({ default: m.OpportunityFormPage })),
)
const OpportunityDetailPage = lazy(() =>
  opportunities().then((m) => ({ default: m.OpportunityDetailPage })),
)

const AddOpportunityPage = lazy(() =>
  opportunities().then((m) => ({ default: m.AddOpportunityPage })),
)
const ReviewExtractionPage = lazy(() =>
  opportunities().then((m) => ({ default: m.ReviewExtractionPage })),
)

const page = (node: ReactNode) => <Suspense fallback={<PageSpinner />}>{node}</Suspense>

export function App() {
  if (!publicEnv.ok) return <ConfigMissingPage />
  return (
    <Routes>
      <Route path="auth" element={<AuthLayout />}>
        <Route path="sign-in" element={<SignInPage />} />
        <Route path="sign-up" element={<SignUpPage />} />
        <Route path="reset" element={<ResetPasswordPage />} />
        <Route path="update-password" element={<UpdatePasswordPage />} />
        <Route path="callback" element={<AuthCallbackPage />} />
      </Route>
      <Route path="invite/:token" element={<AcceptInvitePage />} />

      <Route element={<RequireAuth />}>
        <Route path="onboarding" element={<OnboardingPage />} />
        <Route element={<RequireWorkspace />}>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="opportunities" element={page(<OpportunityListPage />)} />
            <Route path="opportunities/new" element={page(<AddOpportunityPage />)} />
            <Route path="opportunities/new/manual" element={page(<OpportunityFormPage />)} />
            <Route path="opportunities/review/:runId" element={page(<ReviewExtractionPage />)} />
            <Route path="opportunities/:id" element={page(<OpportunityDetailPage />)} />
            <Route path="opportunities/:id/edit" element={page(<OpportunityFormPage />)} />
            <Route path="projects/*" element={<ComingSoonPage />} />
            <Route path="tasks" element={<ComingSoonPage />} />
            <Route path="calendar" element={<ComingSoonPage />} />
            <Route path="chat" element={<ComingSoonPage />} />
            <Route path="vault/*" element={<ComingSoonPage />} />
            <Route path="more" element={<MorePage />} />
            <Route path="settings/profile" element={<ProfileSettingsPage />} />
            <Route path="settings/workspace" element={<WorkspaceSettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}
