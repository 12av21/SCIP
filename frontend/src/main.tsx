import { StrictMode } from 'react'
import "leaflet/dist/leaflet.css";
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Toaster } from "react-hot-toast";

<Toaster />
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
