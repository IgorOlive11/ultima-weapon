import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { installErrorBuffer } from './utils/errorBuffer'
import './index.css'

installErrorBuffer()

// autoUpdate: aplica a nova versão do SW assim que disponível, sem precisar de prompt
registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
