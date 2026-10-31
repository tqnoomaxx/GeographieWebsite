import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout } from './Layout'
import { DataProvider } from './DataProvider'
import { ErrorBoundary } from './ErrorBoundary'
import { AuthProvider } from './AuthProvider'
import { DeveloperAccessProvider } from '@/features/developer/useDeveloperAccess'
import { RouteErrorPage } from './RouteErrorPage'
import { pagesRedirect, pagesHistoryState, PAGES_HISTORY_KEY } from './pagesRedirect'

const Home = lazy(() => import('@/features/home/HomePage'))
const Story = lazy(() => import('@/features/story/StoryPage'))
const PlayStart = lazy(() => import('@/features/play/PlayStartPage'))
const Round = lazy(() => import('@/features/play/RoundPage'))
const Notes = lazy(() => import('@/features/notes/NotesPage'))
const Daily = lazy(() => import('@/features/daily/DailyHubPage'))
const Puzzle = lazy(() => import('@/features/daily/PuzzlePage'))
const Learn = lazy(() => import('@/features/learn/LearnPage'))
const Cards = lazy(() => import('@/features/learn/CardsPage'))
const Maps = lazy(() => import('@/features/maps/MapsPage'))
const Explore = lazy(() => import('@/features/explore/ExplorePage'))
const CountryPage = lazy(() => import('@/features/explore/CountryPage'))
const RegionPage = lazy(() => import('@/features/explore/RegionPage'))
const CityPage = lazy(() => import('@/features/explore/CityPage'))
const LandmarkPage = lazy(() => import('@/features/explore/LandmarkPage'))
const PlatePage = lazy(() => import('@/features/explore/PlatePage'))
const ListPage = lazy(() => import('@/features/explore/ListPage'))
const Progress = lazy(() => import('@/features/progress/ProgressPage'))
const Profile = lazy(() => import('@/features/profile/ProfilePage'))
const Settings = lazy(() => import('@/features/settings/SettingsPage'))
const Search = lazy(() => import('@/features/search/SearchPage'))
const Legal = lazy(() => import('@/features/legal/LegalPage'))
const Forms = lazy(() => import('@/features/legal/FormsPage'))
const Sources = lazy(() => import('@/features/legal/SourcesPage'))
const Admin = lazy(() => import('@/features/admin/AdminPage'))
const Developer = lazy(() => import('@/features/developer/DeveloperPage'))
const NaturePage = lazy(() => import('@/features/explore/NaturePage'))
const Login = lazy(() => import('@/features/account/LoginPage'))
const Account = lazy(() => import('@/features/account/AccountPage'))
const ResetPw = lazy(() => import('@/features/account/ResetPasswordPage'))
const MfaChallenge = lazy(() => import('@/features/account/MfaChallengePage'))
const PublicProfile = lazy(() => import('@/features/account/PublicProfilePage'))

// GitHub-Pages-Fallback: auch Suchzustand und die Konfiguration einer Runde erhalten.
const redirected = pagesRedirect(location.search, import.meta.env.BASE_URL, location.hash)
let historyWasRestored = false
if (redirected) {
  let state = history.state
  try {
    const saved = sessionStorage.getItem(PAGES_HISTORY_KEY)
    sessionStorage.removeItem(PAGES_HISTORY_KEY)
    const restored = pagesHistoryState(saved, redirected, state, history.length)
    historyWasRestored = restored !== state
    state = restored
  } catch {
    /* Navigation also works without session storage. */
  }
  history.replaceState(state, '', redirected)
}
// A fresh URL visit starts its own view; reload/back and the Pages handoff keep their entry.
const documentNavigation = performance.getEntriesByType('navigation')[0] as
  PerformanceNavigationTiming | undefined
const freshVisit = documentNavigation?.type === 'navigate' && !historyWasRestored
if (freshVisit || !history.state?.key) {
  const state = history.state
  let userState = state?.usr
  if (freshVisit && userState && typeof userState === 'object' && !Array.isArray(userState)) {
    userState = { ...userState }
    delete userState.atlasPageView
  }
  history.replaceState({ ...state, usr: userState, key: Math.random().toString(36).slice(2) }, '')
}

export const router = createBrowserRouter(
  [
    {
      errorElement: <RouteErrorPage />,
      element: (
        <ErrorBoundary>
          <AuthProvider>
            <DeveloperAccessProvider>
              <DataProvider>
                <Layout />
              </DataProvider>
            </DeveloperAccessProvider>
          </AuthProvider>
        </ErrorBoundary>
      ),
      children: [
        { path: '/', element: <Home /> },
        { path: '/story', element: <Story /> },
        { path: '/notes', element: <Notes /> },
        { path: '/play', element: <PlayStart /> },
        { path: '/play/:category', element: <PlayStart /> },
        { path: '/play/:category/round', element: <Round /> },
        { path: '/play/session/:sessionId', element: <Round /> },
        { path: '/daily', element: <Daily /> },
        { path: '/daily/:puzzle', element: <Puzzle /> },
        { path: '/learn', element: <Learn /> },
        { path: '/learn/cards', element: <Cards /> },
        { path: '/maps', element: <Maps /> },
        { path: '/explore', element: <Explore /> },
        { path: '/explore/:list', element: <ListPage /> },
        { path: '/country/:id', element: <CountryPage /> },
        { path: '/region/:id', element: <RegionPage /> },
        { path: '/city/:id', element: <CityPage /> },
        { path: '/landmark/:id', element: <LandmarkPage /> },
        { path: '/plate/:id', element: <PlatePage /> },
        { path: '/water/:id', element: <NaturePage /> },
        { path: '/nature/:id', element: <NaturePage /> },
        { path: '/progress', element: <Progress /> },
        { path: '/profile', element: <Profile /> },
        { path: '/settings', element: <Settings /> },
        { path: '/search', element: <Search /> },
        { path: '/impressum', element: <Legal page="imprint" /> },
        { path: '/datenschutz', element: <Legal page="privacy" /> },
        { path: '/nutzungsbedingungen', element: <Legal page="terms" /> },
        { path: '/kontakt', element: <Forms kind="contact" /> },
        { path: '/vorschlagen', element: <Forms kind="suggest" /> },
        { path: '/quellen', element: <Sources /> },
        { path: '/admin', element: <Admin /> },
        { path: '/developer', element: <Developer /> },
        { path: '/login', element: <Login /> },
        { path: '/account', element: <Account /> },
        { path: '/passwort', element: <ResetPw /> },
        { path: '/mfa', element: <MfaChallenge /> },
        { path: '/u/:username', element: <PublicProfile /> },
        { path: '*', element: <Navigate to="/" replace /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' },
)
