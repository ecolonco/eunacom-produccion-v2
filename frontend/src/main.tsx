import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import VerifyEmail from './components/VerifyEmail'
import PaymentReturn from './components/PaymentReturn'
import SimpleApp from './SimpleApp'
import TestApp from './TestApp'
import TestApp2 from './TestApp2'
import TestApp3 from './TestApp3'
import TestApp4 from './TestApp4'
import TestBasicApp from './TestBasicApp'
import TestSimpleLogin from './TestSimpleLogin'
import WorkingApp from './WorkingApp'
import FunctionalApp from './FunctionalApp'
import './index.css'

function RouterRoot() {
  const path = window.location.pathname;
  if (path === '/verify') {
    return <VerifyEmail />;
  }
  if (path === '/payment/return') {
    return <PaymentReturn />;
  }
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterRoot />
  </React.StrictMode>,
)