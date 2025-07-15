import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './instagram-icons.css'
import './instagram-components.css'
import './instagram-animations.css'
import App from './App.tsx'


createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <App />
  </StrictMode>,
)
