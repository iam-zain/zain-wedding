import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { ToastProvider } from './components/ToastProvider'
import { CONSOLE_EASTER_EGG_MESSAGE } from './config'

try {
  console.log('%c🤍 Zain & Uzma', 'font-size:18px;font-weight:bold;color:#ed4956')
  console.log(CONSOLE_EASTER_EGG_MESSAGE)
} catch {
  // console unavailable — harmless no-op
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <App />
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
