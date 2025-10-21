import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryProvider } from './contexts/QueryProvider'
import { AuthProvider } from './contexts/AuthContext'
import { AppRoutes } from './routes'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </QueryProvider>
    </BrowserRouter>
  </React.StrictMode>,
)