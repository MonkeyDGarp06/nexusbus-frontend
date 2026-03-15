import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { stopsApi, routesApi } from '../api'
import { Spinner, EmptyState } from '../components/ui'
import { useTheme } from '../context/ThemeContext'
import { addRecentRoute } from './Routes'

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const navigate = useNavigate()
  const { dark } = useTheme()
  const [stops, setStops] = useState([])
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(false)
  const [input, setInput] = useState(query)

  // If user clicks back or navigates away without typing, go back
useEffect(() => {
  if (!query) {
    const handleClick = (e) => {
      const searchBar = document.getElementById('search-input')
      if (searchBar && !searchBar.contains(e.target)) {
        navigate(-1)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }
}, [query, navigate])
  
  useEffect(() => {
    async function load() {
      if (!query) return
      setLoading(true)
      try {
        const [s, r] = await Promise.all([stopsApi.getAll(), routesApi.getAll()])
        const q = query.toLowerCase()
        setStops(s.filter(x => x.stopName.toLowerCase().includes(q)))
        setRoutes(r.filter(x => x.routeName.toLowerCase().includes(q)))
      } catch {}
      setLoading(false)
    }
    load()
  }, [query])

  function handleSearch(e) {
    e.preventDefault()
    if (input.trim()) setSearchParams({ q: input.trim() })
  }

  const rowClass = (extra = '') => `w-full border rounded-xl px-4 py-3.5 flex items-center justify-between hover:border-blue-300 hover:shadow-sm transition-all text-left
    ${dark ? 'bg-slate-800 border-slate-700 hover:border-blue-500' : 'bg-white border-gray-200'} ${extra}`

  return (
    <div onClick={(e) => {
    if (!query && e.target === e.currentTarget) navigate(-1)
  }}>
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className={`flex-1 flex items-center gap-2 border rounded-xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-blue-500 transition
          ${dark ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-300'}`}>
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Search routes and stops..."
            autoFocus
            className={`flex-1 text-sm outline-none bg-transparent ${dark ? 'text-white placeholder-slate-500' : 'text-gray-900 placeholder-gray-400'}`}
          />
          {input && (
            <button type="button" onClick={() => { setInput(''); setSearchParams({}) }}
              className="text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl px-4 text-sm transition-colors">
          Search
        </button>
      </form>

      {loading && <div className="flex justify-center py-12"><Spinner size="md" /></div>}

      {!loading && query && (
        <div className="space-y-6">
          {/* Routes */}
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
              Routes ({routes.length})
            </p>
            {routes.length === 0
              ? <p className={`text-sm ${dark ? 'text-slate-500' : 'text-gray-400'}`}>No routes match "{query}"</p>
              : <div className="space-y-2">
                  {routes.map(route => (
                    <button key={route.routeId} onClick={() => { addRecentRoute(route); navigate(`/routes/${route.routeId}`) }}
                      className={rowClass()}>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${dark ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78A3 3 0 0020 16V8c0-3.5-3.58-4-8-4s-8 .5-8 4v8zm3.5 1a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm9 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM6 9h12v4H6V9z"/>
                          </svg>
                        </div>
                        <div>
                          <p className={`font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>Route {route.routeName}</p>
                          <p className={`text-xs ${dark ? 'text-slate-400' : 'text-gray-400'}`}>{route.routeStops?.length || 0} stops</p>
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
            }
          </div>

          {/* Stops */}
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
              Stops ({stops.length})
            </p>
            {stops.length === 0
              ? <p className={`text-sm ${dark ? 'text-slate-500' : 'text-gray-400'}`}>No stops match "{query}"</p>
              : <div className="space-y-2">
                  {stops.map(stop => (
                    <button key={stop.stopId} onClick={() => navigate(`/stops/${stop.stopId}`)}
                      className={rowClass()}>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${dark ? 'bg-amber-900/30' : 'bg-amber-50'}`}>
                          <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                              d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className={`font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{stop.stopName}</p>
                          <p className={`text-xs ${dark ? 'text-slate-400' : 'text-gray-400'}`}>
                            {stop.routeStops?.length || 0} route{stop.routeStops?.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
            }
          </div>
        </div>
      )}

      {!loading && !query && (
  <div className="space-y-4">
    <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
      Quick Links
    </p>
    <button onClick={() => navigate('/explore')}
      className={`w-full border rounded-xl px-4 py-3.5 flex items-center gap-3 text-left transition-all
        ${dark ? 'bg-slate-800 border-slate-700 hover:border-blue-500' : 'bg-white border-gray-200 hover:border-blue-300'}`}>
      <span className="text-xl">🏠</span>
      <div>
        <p className={`font-semibold text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>Go to Explore</p>
        <p className={`text-xs ${dark ? 'text-slate-400' : 'text-gray-400'}`}>Find buses, live tracking, all routes</p>
      </div>
    </button>
    <button onClick={() => navigate('/stops')}
      className={`w-full border rounded-xl px-4 py-3.5 flex items-center gap-3 text-left transition-all
        ${dark ? 'bg-slate-800 border-slate-700 hover:border-blue-500' : 'bg-white border-gray-200 hover:border-blue-300'}`}>
      <span className="text-xl">🚏</span>
      <div>
        <p className={`font-semibold text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>Browse Stops</p>
        <p className={`text-xs ${dark ? 'text-slate-400' : 'text-gray-400'}`}>Find stops near you</p>
      </div>
    </button>
    <button onClick={() => navigate('/routes')}
      className={`w-full border rounded-xl px-4 py-3.5 flex items-center gap-3 text-left transition-all
        ${dark ? 'bg-slate-800 border-slate-700 hover:border-blue-500' : 'bg-white border-gray-200 hover:border-blue-300'}`}>
      <span className="text-xl">🗺️</span>
      <div>
        <p className={`font-semibold text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>Browse Routes</p>
        <p className={`text-xs ${dark ? 'text-slate-400' : 'text-gray-400'}`}>See all available routes</p>
      </div>
    </button>
  </div>
)}
    </div>
  )
}
