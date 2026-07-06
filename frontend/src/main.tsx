import { StrictMode } from 'react'
import "leaflet/dist/leaflet.css";
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Toaster } from "react-hot-toast";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
    <App />
  </StrictMode>,
)
