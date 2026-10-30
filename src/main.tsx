import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import './styles/simple.css'
import './i18n'
import { router } from './app/router'
import { applyStoredTheme } from './services/settings/theme'
import { applyStoredMotion } from './services/settings/motion'
import { installRouteRecovery } from './app/routeRecovery'

installRouteRecovery()
applyStoredTheme()
applyStoredMotion()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
