import './polyfills';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

import { AuthProvider } from './AuthContext';
import AppWithRouter from './App.jsx';
import AppWrapper from './App.jsx';

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <AppWrapper />
  </AuthProvider>,
)
