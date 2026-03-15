import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useState, useEffect, useRef } from 'react'
import LoginModal from './LoginModal'

export default function Layout({ children, hasActiveTrip }) {
  const { user, logout, isAdmin, isDriver } = useAuth()
  const { dark, toggle } = useTheme()
  const [showLogin, setShowLogin] = useState(false)
  const [loginTarget, setLoginTarget] = useState(null)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showInstall, setShowInstall] = useState(false)
  const [pulling, setPulling] = useState(false)
  const [pullY, setPullY] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const touchStartY = useRef(0)
  const mainRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handler(e) { e.preventDefault(); setInstallPrompt(e); setShowInstall(true) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setShowInstall(false)
    setInstallPrompt(null)
  }

  // Pull to refresh
  function handleTouchStart(e) {
    if (mainRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY
    }
  }

  function handleTouchMove(e) {
    if (touchStartY.current === 0) return
    const diff = e.touches[0].clientY - touchStartY.current
    if (diff > 0 && diff < 100 && mainRef.current?.scrollTop === 0) {
      setPulling(true)
      setPullY(Math.min(diff * 0.5, 50))
    }
  }

  function handleTouchEnd() {
    if (pullY > 35) {
      setRefreshing(true)
      setTimeout(() => {
        window.location.reload()
      }, 800)
    }
    setPulling(false)
    setPullY(0)
    touchStartY.current = 0
  }

  function handleLogout() { logout(); navigate('/explore') }

  const tabs = [
    {
      to: '/explore', label: 'Explore', protected: false,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      to: '/stops', label: 'Stops', protected: false,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      to: '/driver', label: 'Driver', protected: 'driver', dot: hasActiveTrip && isDriver,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0zM3 7h14l2 6H1L3 7z" />
        </svg>
      ),
    },
    {
      to: '/admin', label: 'Admin', protected: 'admin',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ]

  return (
    <div className={`flex flex-col h-screen ${dark ? 'dark bg-slate-900' : 'bg-gray-50'}`}>
      {/* PWA Install Banner */}
      {showInstall && (
        <div className={`${dark ? 'bg-blue-900 border-blue-700' : 'bg-blue-600'} px-4 py-2.5 flex items-center justify-between shrink-0`}>
          <div className="flex items-center gap-2">
            <span className="text-lg"></span>
            <p className="text-white text-xs font-medium">Install NexusBus for faster access</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleInstall} className="bg-white text-blue-600 text-xs font-bold px-3 py-1 rounded-lg">Install</button>
            <button onClick={() => setShowInstall(false)} className="text-white/70 hover:text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border-b shrink-0`}>
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/explore')}>
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78A3 3 0 0020 16V8c0-3.5-3.58-4-8-4s-8 .5-8 4v8zm3.5 1a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm9 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM6 9h12v4H6V9z" />
              </svg>
            </div>
            <span className={`font-bold text-base tracking-tight ${dark ? 'text-white' : 'text-gray-900'}`}>NexusBus</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <button onClick={() => navigate('/search')}
              className={`p-1.5 rounded-lg transition-colors ${dark ? 'text-slate-400 hover:bg-slate-700' : 'text-gray-500 hover:bg-gray-100'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
            </button>
            {/* Dark mode */}
            <button onClick={toggle}
              className={`p-1.5 rounded-lg transition-colors ${dark ? 'text-yellow-400 hover:bg-slate-700' : 'text-gray-500 hover:bg-gray-100'}`}>
              {dark ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            {user && (
              <div className="flex items-center gap-2">
                <span className={`text-sm hidden sm:block ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
                  <span className="capitalize">{user.role}</span>: {user.fname}
                </span>
                <button onClick={handleLogout}
                  className={`text-sm border rounded-lg px-3 py-1.5 transition-colors
                    ${dark ? 'text-slate-400 border-slate-600 hover:text-white' : 'text-gray-500 border-gray-200 hover:text-gray-800'}`}>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Pull to refresh indicator */}
      {(pulling || refreshing) && (
        <div className={`flex items-center justify-center py-2 text-xs font-medium transition-all
          ${dark ? 'bg-slate-800 text-blue-400' : 'bg-blue-50 text-blue-600'}`}
          style={{ height: refreshing ? '36px' : `${pullY}px`, overflow: 'hidden' }}>
          {refreshing ? (
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Refreshing...
            </div>
          ) : pullY > 35 ? '? Release to refresh' : '? Pull to refresh'}
        </div>
      )}

      {/* Page content */}
      <main ref={mainRef} className="flex-1 overflow-y-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}>
        <div className="max-w-2xl mx-auto px-4 py-5">
          {children}
        </div>
      </main>

      {/* Bottom tab bar */}
      <nav className={`${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border-t shrink-0`}>
        <div className="max-w-2xl mx-auto flex">
          {tabs.map((tab) => {
            const isLoggedInForTab =
              !tab.protected ||
              (tab.protected === 'driver' && isDriver) ||
              (tab.protected === 'admin' && isAdmin)

            if (tab.protected) {
              return (
                <button key={tab.to}
                  onClick={() => {
                    if (isLoggedInForTab) navigate(tab.to)
                    else { setLoginTarget(tab.to); setShowLogin(true) }
                  }}
                  className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-xs transition-colors relative
                    ${window.location.pathname.startsWith(tab.to)
                      ? 'text-blue-600'
                      : isLoggedInForTab
                        ? dark ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'
                        : dark ? 'text-slate-700' : 'text-gray-300'}`}>
                  {tab.icon}
                  <span className="font-medium">{tab.label}</span>
                  {!isLoggedInForTab && (
                    <span className="absolute top-1.5 right-1/2 translate-x-3">
                      <svg className={`w-2.5 h-2.5 ${dark ? 'text-slate-600' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 1a5 5 0 015 5v3h1a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2v-9a2 2 0 012-2h1V6a5 5 0 015-5zm0 12a2 2 0 100 4 2 2 0 000-4zm0-10a3 3 0 00-3 3v3h6V6a3 3 0 00-3-3z" />
                      </svg>
                    </span>
                  )}
                  {tab.dot && isLoggedInForTab && (
                    <span className="absolute top-2 right-1/2 translate-x-3 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </button>
              )
            }
            return (
              <NavLink key={tab.to} to={tab.to}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-xs transition-colors relative
                  ${isActive ? 'text-blue-600' : dark ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}>
                {({ isActive }) => (
                  <>
                    <span className={isActive ? 'text-blue-600' : ''}>{tab.icon}</span>
                    <span className="font-medium">{tab.label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>

      {showLogin && (
        <LoginModal
          requiredRole={loginTarget === '/driver' ? 'driver' : loginTarget === '/admin' ? 'admin' : null}
          onClose={() => { setShowLogin(false); setLoginTarget(null) }}
          onSuccess={() => { setShowLogin(false); if (loginTarget) navigate(loginTarget); setLoginTarget(null) }}
        />
      )}
    </div>
  )
}
