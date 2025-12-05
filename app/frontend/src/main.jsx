import { log, error, warn } from "../lib/logger.js";
﻿import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// ✅ Test d’environnement
log("✅ API URL:", import.meta.env.VITE_API_URL);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
