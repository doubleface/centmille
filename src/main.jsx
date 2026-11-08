import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.jsx'
import './styles/sheet.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

if ('serviceWorker' in navigator) {
  if ('caches' in window) {
    const initialHtml = `<!doctype html>\n${document.documentElement.outerHTML}`
    caches
      .open('centmille-v8')
      .then((cache) =>
        cache.put(
          './',
          new Response(initialHtml, {
            headers: { 'Content-Type': 'text/html;charset=utf-8' },
          })
        )
      )
      .catch(() => {})
  }
  navigator.serviceWorker.register('./sw.js').catch(() => {})
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
