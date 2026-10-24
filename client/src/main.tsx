import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyTheme } from '@/lib/theme'

const stored = localStorage.getItem('theme')
applyTheme(stored === 'light' || stored === 'dark' ? stored : 'system')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
