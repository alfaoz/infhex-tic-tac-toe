import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App'
import { queryClient } from './queryClient'
import { installSoundEffects } from './soundEffects'

installSoundEffects()

let root = document.getElementById('root');
if (!root) {
  console.error("Missing DOM root. Using body.");
  root = document.body;
}

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)
