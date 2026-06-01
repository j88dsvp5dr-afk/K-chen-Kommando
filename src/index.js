import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './MealPrepApp';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Service Worker registrieren
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('SW registriert:', reg.scope);
      })
      .catch((err) => {
        console.log('SW Fehler:', err);
      });
  });
}
