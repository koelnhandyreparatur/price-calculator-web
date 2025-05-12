import * as Sentry from '@sentry/react';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

Sentry.init({
  dsn: 'https://1916f81501f63eb8a93c473f66e7164f@o4509310586585088.ingest.de.sentry.io/4509311246598224', // Replace with your actual DSN from Sentry project settings
  tracesSampleRate: 1.0, // Adjust this value in production
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<p>An error has occurred</p>}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
