import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, BrowserRouter } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { isElectron, isCapacitor } from './lib/platform'
import './index.css'
import './i18n'
import App from './App.tsx'

const Router = (isElectron() || isCapacitor()) ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Router>
        <App />
      </Router>
    </ErrorBoundary>
  </StrictMode>,
)
