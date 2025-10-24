import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Buscamos el nodo con id="root" que vive en public/index.html
const root = ReactDOM.createRoot(document.getElementById('root'));

// React.StrictMode activa comprobaciones adicionales en desarrollo
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Utilidad opcional para medir rendimiento (lo dejamos en blanco por defecto)
reportWebVitals();
