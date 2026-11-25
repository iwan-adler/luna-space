import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { PageSpinner } from '@/components/ui/Spinner'
import { AuthLayout, RequireAuth } from '@/features/auth'
import { HomePage } from '@/features/dashboard'
import { NotificationsPage } from '@/features/notifications'
import { RequireWorkspace } from '@/features/workspace'
import { publicEnv } from '@/lib/env'
import { AppShell, MorePage } from './AppShell'
import { ConfigMissingPage } from './ConfigMissingPage'
import { NotFoundPage } from './NotFoundPage'
import { SharePage } from './SharePage'

// Every page loads on demand, straight from its own module, so the first download holds only
// the shell and Home (TR-FE-01, ADR 0022). Feature index files no longer re-export pages.
const SignInPage = lazy(() =>
  import('@/features/auth/pages/SignInPage').then((x) => ({ default: x.SignInPage })),
)
const SignUpPage = lazy(() =>
  import('@/features/auth/pages/SignUpPage').then((x) => ({ default: x.SignUpPage })),
)
const ResetPasswordPage = lazy(() =>
  import('@/features/auth/pages/ResetPasswordPage').then((x) => ({ default: x.ResetPasswordPage })),
)
const UpdatePasswordPage = lazy(() =>
  import('@/features/auth/pages/UpdatePasswordPage').then((x) => ({
    default: x.UpdatePasswordPage,
  })),
)
const AuthCallbackPage = lazy(() =>
  import('@/features/auth/pages/AuthCallbackPage').then((x) => ({ default: x.AuthCallbackPage })),
)
const CalendarPage = lazy(() =>
  import('@/features/calendar/CalendarPage').then((x) => ({ default: x.CalendarPage })),
)
const ChatPage = lazy(() =>
  import('@/features/chat/ChatPage').then((x) => ({ default: x.ChatPage })),
)
const RecycleBinPage = lazy(() =>
  import('@/features/data/RecycleBinPage').then((x) => ({ default: x.RecycleBinPage })),
)
const NotificationSettingsPage = lazy(() =>
  import('@/features/notifications/NotificationSettingsPage').then((x) => ({
    default: x.NotificationSettingsPage,
  })),
)
const DataSettingsPage = lazy(() =>
  import('@/features/data/DataSettingsPage').then((x) => ({ default: x.DataSettingsPage })),
)
const MissionPage = lazy(() =>
  import('@/features/mission/MissionPage').then((x) => ({ default: x.MissionPage })),
)
const NotesPage = lazy(() =>
  import('@/features/notes/NotesPage').then((x) => ({ default: x.NotesPage })),
)
const OpportunityListPage = lazy(() =>
  import('@/features/opportunities/pages/OpportunityListPage').then((x) => ({
    default: x.OpportunityListPage,
  })),
)
const OpportunityFormPage = lazy(() =>
  import('@/features/opportunities/pages/OpportunityFormPage').then((x) => ({
    default: x.OpportunityFormPage,
  })),
)
const OpportunityDetailPage = lazy(() =>
  import('@/features/opportunities/pages/OpportunityDetailPage').then((x) => ({
    default: x.OpportunityDetailPage,
  })),
)
const AddOpportunityPage = lazy(() =>
  import('@/features/opportunities/pages/AddOpportunityPage').then((x) => ({
    default: x.AddOpportunityPage,
  })),
)
const ReviewExtractionPage = lazy(() =>
  import('@/features/opportunities/pages/ReviewExtractionPage').then((x) => ({
    default: x.ReviewExtractionPage,
  })),
)
const TrophyWallPage = lazy(() =>
  import('@/features/opportunities/pages/TrophyWallPage').then((x) => ({
    default: x.TrophyWallPage,
  })),
)
const TeamFinderPage = lazy(() =>
  import('@/features/opportunities/teams/TeamFinder').then((x) => ({ default: x.TeamFinderPage })),
)
const ProfileSettingsPage = lazy(() =>
  import('@/features/profile/ProfileSettingsPage').then((x) => ({
    default: x.ProfileSettingsPage,
  })),
)
const ProjectListPage = lazy(() =>
  import('@/features/projects/pages/ProjectListPage').then((x) => ({ default: x.ProjectListPage })),
)
const ProjectRoomPage = lazy(() =>
  import('@/features/projects/pages/ProjectRoomPage').then((x) => ({ default: x.ProjectRoomPage })),
)
const MyTasksPage = lazy(() =>
  import('@/features/projects/pages/MyTasksPage').then((x) => ({ default: x.MyTasksPage })),
)
const JoinRoomPage = lazy(() =>
  import('@/features/projects/pages/JoinRoomPage').then((x) => ({ default: x.JoinRoomPage })),
)
const GuestShell = lazy(() =>
  import('@/features/projects/pages/GuestPages').then((x) => ({ default: x.GuestShell })),
)
const GuestHomePage = lazy(() =>
  import('@/features/projects/pages/GuestPages').then((x) => ({ default: x.GuestHomePage })),
)
const GuestRoomPage = lazy(() =>
  import('@/features/projects/pages/GuestPages').then((x) => ({ default: x.GuestRoomPage })),
)
const SearchPage = lazy(() =>
  import('@/features/search/SearchPage').then((x) => ({ default: x.SearchPage })),
)
const VaultPage = lazy(() =>
  import('@/features/vault/VaultPage').then((x) => ({ default: x.VaultPage })),
)
const OnboardingPage = lazy(() =>
  import('@/features/workspace/pages/OnboardingPage').then((x) => ({ default: x.OnboardingPage })),
)
const AcceptInvitePage = lazy(() =>
  import('@/features/workspace/pages/AcceptInvitePage').then((x) => ({
    default: x.AcceptInvitePage,
  })),
)
const WorkspaceSettingsPage = lazy(() =>
  import('@/features/workspace/pages/WorkspaceSettingsPage').then((x) => ({
    default: x.WorkspaceSettingsPage,
  })),
)
const NewWorkspacePage = lazy(() =>
  import('@/features/workspace/pages/NewWorkspacePage').then((x) => ({
    default: x.NewWorkspacePage,
  })),
)
const JoinWorkspacePage = lazy(() =>
  import('@/features/workspace/pages/NewWorkspacePage').then((x) => ({
    default: x.JoinWorkspacePage,
  })),
)

const page = (node: ReactNode) => <Suspense fallback={<PageSpinner />}>{node}</Suspense>

export function App() {
  if (!publicEnv.ok) return <ConfigMissingPage />
  return <AppRoutes />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="auth" element={<AuthLayout />}>
        <Route path="sign-in" element={page(<SignInPage />)} />
        <Route path="sign-up" element={page(<SignUpPage />)} />
        <Route path="reset" element={page(<ResetPasswordPage />)} />
        <Route path="update-password" element={page(<UpdatePasswordPage />)} />
        <Route path="callback" element={page(<AuthCallbackPage />)} />
      </Route>
      <Route path="invite/:token" element={page(<AcceptInvitePage />)} />
      <Route path="join" element={page(<JoinRoomPage />)} />

      <Route element={<RequireAuth />}>
        <Route path="onboarding" element={page(<OnboardingPage />)} />
        {/* Project guests: their rooms only, in a minimal shell (FR-GUEST-11). */}
        <Route path="guest" element={page(<GuestShell />)}>
          <Route index element={page(<GuestHomePage />)} />
          <Route path="rooms/:id" element={page(<GuestRoomPage />)} />
          <Route path="rooms/:id/:tab" element={page(<GuestRoomPage />)} />
          <Route path="notifications" element={<NotificationsPage />} />
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
            <Route path="meet" element={<Navigate to="/chat?view=meet" replace />} />
            <Route path="tasks" element={page(<MyTasksPage />)} />
            <Route path="calendar" element={page(<CalendarPage />)} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="notes" element={page(<NotesPage />)} />
            <Route path="notes/:id" element={page(<NotesPage />)} />
            <Route path="chat" element={page(<ChatPage />)} />
            <Route path="vault" element={page(<VaultPage />)} />
            <Route path="vault/:folderId" element={page(<VaultPage />)} />
            <Route path="search" element={page(<SearchPage />)} />
            <Route path="mission/:id" element={page(<MissionPage />)} />
            <Route path="trophies" element={page(<TrophyWallPage />)} />
            <Route path="teams" element={page(<TeamFinderPage />)} />
            <Route path="share" element={<SharePage />} />
            <Route path="trash" element={page(<RecycleBinPage />)} />
            <Route path="settings/data" element={page(<DataSettingsPage />)} />
            <Route path="more" element={<MorePage />} />
            <Route path="more/notifications" element={page(<NotificationSettingsPage />)} />
            <Route path="settings/profile" element={page(<ProfileSettingsPage />)} />
            <Route path="settings/workspace" element={page(<WorkspaceSettingsPage />)} />
            <Route path="workspaces/new" element={page(<NewWorkspacePage />)} />
            <Route path="workspaces/join" element={page(<JoinWorkspacePage />)} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}
