import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './assets/webfont/font-css/LineIcons.css'
import './assets/css/bootstrap.min.css'
import './assets/css/default.css'
import './assets/css/style.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
