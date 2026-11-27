import '@fontsource-variable/gabarito';
import '@fontsource-variable/figtree';
import '@fontsource-variable/jetbrains-mono';
import './app.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

// Lets the app be installed on a phone and open quickly on a weak connection.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined));
}
