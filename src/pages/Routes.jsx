import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { routesApi, tripApi } from '../api'
import { Input, EmptyState, Spinner, PageHeader, Badge } from '../components/ui'
import { useTheme } from '../context/ThemeContext'

const RECENT_KEY = 'nexusbus_recent_routes'

function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
}

export function addRecentRoute(route) {
  const recent = getRecent().filter(r => r.routeId !== route.routeId)
  const updated = [{ routeId: route.routeId, routeName: route.routeName, stops: route.routeStops?.length || 0 }, ...recent].slice(0, 5)
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
}

export default function Routes() {
  const [routes, setRoutes] = useState([])
  const [liveMap, setLiveMap] = useState({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { dark } = useTheme()

  useEffect(() => {
    routesApi.getAll().then(r => {
      setRoutes(r)
      setLoading(false)
      // fetch live trips for each route
      r.forEach(async route => {
        try {
          const trips = await tripApi.getByRoute(route.routeName)
          const active = Array.isArray(trips) ? trips.filter(t => t.active) : []
          if (active.length > 0) {
            setLiveMap(prev => ({ ...prev, [route.routeId]: active.length }))
          }
        } catch {}
      })
    }).catch(() => setLoading(false))
  }, [])

  const filtered = routes.filter(r => r.routeName.toLowerCase().includes(search.toLowerCase()))

  function handleClick(route) {
    addRecentRoute(route)
    navigate(`/routes/${route.routeId}`)
  }

  return (
    <div>
      <PageHeader title="Routes" subtitle="Tap a route to see stops and live buses" />
      <Input placeholder="Search routes..." value={search}
        onChange={e => setSearch(e.target.value)} className="mb-4" />
      {loading
        ? <div className="flex justify-center py-12"><Spinner size="md" /></div>
        : filtered.length === 0 ? <EmptyState message="No routes found." />
        : <div className="space-y-2">
            {filtered.map(route => (
              <button key={route.routeId} onClick={() => handleClick(route)}
                className={`w-full border rounded-xl px-4 py-3.5 flex items-center justify-between hover:border-blue-300 hover:shadow-sm transition-all text-left
                  ${dark ? 'bg-slate-800 border-slate-700 hover:border-blue-500' : 'bg-white border-gray-200'}`}>
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
                <div className="flex items-center gap-2">
                  {liveMap[route.routeId] && (
                    <Badge color="green">{liveMap[route.routeId]} live</Badge>
                  )}
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
      }
    </div>
  )
}
