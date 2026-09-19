import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Imported first so its beforeinstallprompt listener is attached before anything renders.
import './lib/installPrompt'
import { initPWA } from './lib/pwa'
import { App } from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './index.css'

initPWA()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
