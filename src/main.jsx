import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import SplashScreen from './components/SplashScreen.jsx'
import './index.css'

function Root() {
  const [showSplash, setShowSplash] = useState(() => {
    // Only show splash on first load per session
    const shown = sessionStorage.getItem('splash_shown')
    if (shown) return false
    sessionStorage.setItem('splash_shown', '1')
    return true
  })

  return (
    <>
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      <App />
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
