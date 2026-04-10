import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { getStorageBackend } from './infra/store-provider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (getStorageBackend() === 'automerge') {
  import('./infra/automerge/blob-sync').then(({ startBlobSyncListener }) => {
    startBlobSyncListener();
  });
}
