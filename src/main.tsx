import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TextureStyle } from 'pixi.js'
import './index.css'
import App from './App.tsx'

// Global configuration for pixel art
TextureStyle.defaultOptions.scaleMode = 'nearest';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
