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
const projects = () => import('@/features/projects')
const ProjectListPage = lazy(() => projects().then((m) => ({ default: m.ProjectListPage })))
const ProjectRoomPage = lazy(() => projects().then((m) => ({ default: m.ProjectRoomPage })))
const MyTasksPage = lazy(() => projects().then((m) => ({ default: m.MyTasksPage })))
const JoinRoomPage = lazy(() => projects().then((m) => ({ default: m.JoinRoomPage })))
const GuestShell = lazy(() => projects().then((m) => ({ default: m.GuestShell })))
const GuestHomePage = lazy(() => projects().then((m) => ({ default: m.GuestHomePage })))
const GuestRoomPage = lazy(() => projects().then((m) => ({ default: m.GuestRoomPage })))

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
      <Route path="join" element={page(<JoinRoomPage />)} />

      <Route element={<RequireAuth />}>
        <Route path="onboarding" element={<OnboardingPage />} />
        {/* Project guests: their rooms only, in a minimal shell (FR-GUEST-11). */}
        <Route path="guest" element={page(<GuestShell />)}>
          <Route index element={page(<GuestHomePage />)} />
          <Route path="rooms/:id" element={page(<GuestRoomPage />)} />
          <Route path="rooms/:id/:tab" element={page(<GuestRoomPage />)} />
        </Route>
        <Route element={<RequireWorkspace />}>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="opportunities" element={page(<OpportunityListPage />)} />
            <Route path="opportunities/new" element={page(<AddOpportunityPage />)} />
            <Route path="opportunities/new/manual" element={page(<OpportunityFormPage />)} />
            <Route path="opportunities/review/:runId" element={page(<ReviewExtractionPage />)} />
            <Route path="opportunities/:id" element={page(<OpportunityDetailPage />)} />
            <Route path="opportunities/:id/edit" element={page(<OpportunityFormPage />)} />
            <Route path="projects" element={page(<ProjectListPage />)} />
            <Route path="projects/:id" element={page(<ProjectRoomPage />)} />
            <Route path="projects/:id/:tab" element={page(<ProjectRoomPage />)} />
            <Route path="tasks" element={page(<MyTasksPage />)} />
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
