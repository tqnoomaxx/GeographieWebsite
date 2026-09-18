import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout } from './Layout'
import { DataProvider } from './DataProvider'
import { ErrorBoundary } from './ErrorBoundary'
import { AuthProvider } from './AuthProvider'

const Home = lazy(() => import('@/features/home/HomePage'))
const PlayStart = lazy(() => import('@/features/play/PlayStartPage'))
const Round = lazy(() => import('@/features/play/RoundPage'))
const Daily = lazy(() => import('@/features/daily/DailyHubPage'))
const Puzzle = lazy(() => import('@/features/daily/PuzzlePage'))
const Learn = lazy(() => import('@/features/learn/LearnPage'))
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
const NaturePage = lazy(() => import('@/features/explore/NaturePage'))
const Login = lazy(() => import('@/features/account/LoginPage'))
const Account = lazy(() => import('@/features/account/AccountPage'))
const ResetPw = lazy(() => import('@/features/account/ResetPasswordPage'))
const PublicProfile = lazy(() => import('@/features/account/PublicProfilePage'))

// GitHub-Pages-Fallback: 404.html kodiert den Pfad als ?p=
const params = new URLSearchParams(location.search)
const redirected = params.get('p')
if (redirected) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  history.replaceState(null, '', base + redirected.replace(/~and~/g, '&') + location.hash)
}

export const router = createBrowserRouter(
  [
    {
      element: (
        <ErrorBoundary>
          <AuthProvider>
            <DataProvider>
              <Layout />
            </DataProvider>
          </AuthProvider>
        </ErrorBoundary>
      ),
      children: [
        { path: '/', element: <Home /> },
        { path: '/play', element: <PlayStart /> },
        { path: '/play/:category', element: <PlayStart /> },
        { path: '/play/:category/round', element: <Round /> },
        { path: '/play/session/:sessionId', element: <Round /> },
        { path: '/daily', element: <Daily /> },
        { path: '/daily/:puzzle', element: <Puzzle /> },
        { path: '/learn', element: <Learn /> },
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
        { path: '/login', element: <Login /> },
        { path: '/account', element: <Account /> },
        { path: '/passwort', element: <ResetPw /> },
        { path: '/u/:username', element: <PublicProfile /> },
        { path: '*', element: <Navigate to="/" replace /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' },
)
