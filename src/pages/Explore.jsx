import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { routeStopsApi, tripApi, stopsApi, routesApi } from '../api'
import { Card, Badge, Spinner, EmptyState } from '../components/ui'
import { useTheme } from '../context/ThemeContext'

function fuzzyMatch(text, query) {
  if (!query) return true
  const t = text.toLowerCase()
  const q = query.toLowerCase()
  if (t.includes(q)) return true
  let qi = 0
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++
  }
  return qi === q.length
}

const FAV_KEY = 'nexusbus_favorites'

function getFavorites() {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]') } catch { return [] }
}
function saveFavorites(favs) {
  localStorage.setItem(FAV_KEY, JSON.stringify(favs))
}

export default function Explore() {
  const navigate = useNavigate()
  const { dark } = useTheme()
  const [stops, setStops] = useState([])
  const [routes, setRoutes] = useState([])
  const [liveTrips, setLiveTrips] = useState([])
  const [loadingLive, setLoadingLive] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [offline, setOffline] = useState(false)
  const [favorites, setFavorites] = useState(getFavorites)
  const intervalRef = useRef(null)

  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [fromSuggestions, setFromSuggestions] = useState([])
  const [toSuggestions, setToSuggestions] = useState([])
  const [showFromSug, setShowFromSug] = useState(false)
  const [showToSug, setShowToSug] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [searchError, setSearchError] = useState('')

  useEffect(() => {
    stopsApi.getAll().then(setStops).catch(() => { })
    routesApi.getAll().then(setRoutes).catch(() => { })
  }, [])

  async function fetchLive() {
    try {
      const allRoutes = await routesApi.getAll()
      const results = await Promise.all(
        allRoutes.map(r => tripApi.getByRoute(r.routeName).catch(() => []))
      )
      setLiveTrips(results.flat().filter(t => t.active))
      setLastUpdated(new Date())
      setOffline(false)
    } catch { setOffline(true) }
    setLoadingLive(false)
  }

  useEffect(() => {
    fetchLive()
    intervalRef.current = setInterval(fetchLive, 15000)
    return () => clearInterval(intervalRef.current)
  }, [])

  function filterStops(query) {
    if (!query) return []
    return stops.filter(s => fuzzyMatch(s.stopName, query)).slice(0, 6)
  }

  function handleFromChange(e) {
    setFrom(e.target.value)
    setFromSuggestions(filterStops(e.target.value))
    setShowFromSug(true)
    setSearched(false)
  }

  function handleToChange(e) {
    setTo(e.target.value)
    setToSuggestions(filterStops(e.target.value))
    setShowToSug(true)
    setSearched(false)
  }

  async function handleSearch() {
    if (!from || !to) return
    setSearching(true); setSearched(false); setSearchError('')
    try {
      const data = await routeStopsApi.findBySourceAndDest(from, to)
      const results = Array.isArray(data) ? data : [data]
      const withTrips = await Promise.all(results.map(async route => {
        try {
          const trips = await tripApi.getByRoute(route.routeName)
          return { ...route, activeTrips: Array.isArray(trips) ? trips.filter(t => t.active) : [] }
        } catch { return { ...route, activeTrips: [] } }
      }))
      setSearchResults(withTrips)
      setSearched(true)
    } catch (err) {
      setSearchError(err.message || 'No routes found.')
      setSearched(true)
    }
    setSearching(false)
  }

  function swapStops() {
    const temp = from; setFrom(to); setTo(temp); setSearched(false)
  }

  function toggleFavorite(route) {
    const id = route.routeId
    const exists = favorites.find(f => f.routeId === id)
    let updated
    if (exists) {
      updated = favorites.filter(f => f.routeId !== id)
    } else {
      updated = [...favorites, { routeId: id, routeName: route.routeName, stops: route.routeStops?.length || 0 }]
    }
    setFavorites(updated)
    saveFavorites(updated)
  }

  function isFav(routeId) { return !!favorites.find(f => f.routeId === routeId) }

  const inputClass = `flex-1 text-sm outline-none placeholder-gray-400 bg-transparent ${dark ? 'text-white' : 'text-gray-900'}`
  const wrapClass = `flex items-center gap-2 border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition ${dark ? 'border-slate-600 bg-slate-800' : 'border-gray-300 bg-white'}`
  const sugClass = `absolute z-20 top-full left-0 right-0 border rounded-lg shadow-lg mt-1 overflow-hidden ${dark ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'}`

  return (
    <div className="space-y-6">
      {/* Favorites */}
      {favorites.length > 0 && (
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
            ? Saved Routes
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {favorites.map(fav => (
              <button key={fav.routeId}
                onClick={() => navigate(`/routes/${fav.routeId}`)}
                className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all
                  ${dark ? 'bg-slate-800 border-slate-600 text-white hover:border-blue-500' : 'bg-white border-gray-200 text-gray-800 hover:border-blue-300'}`}>
                <span>??</span>
                Route {fav.routeName}
                <span className={`text-xs ${dark ? 'text-slate-400' : 'text-gray-400'}`}>{fav.stops} stops</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* From/To search */}
      <Card className={dark ? 'bg-slate-800 border-slate-700' : ''}>
        <p className={`text-sm font-semibold mb-3 ${dark ? 'text-white' : 'text-gray-700'}`}>Find your bus</p>
        <div className="space-y-2">
          <div className="relative">
            <div className={wrapClass}>
              <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              <input className={inputClass} placeholder="From : stop name"
                value={from} onChange={handleFromChange}
                onFocus={() => setShowFromSug(true)}
                onBlur={() => setTimeout(() => setShowFromSug(false), 150)} />
            </div>
            {showFromSug && fromSuggestions.length > 0 && (
              <div className={sugClass}>
                {fromSuggestions.map(s => (
                  <button key={s.stopId} onMouseDown={() => { setFrom(s.stopName); setShowFromSug(false) }}
                    className={`w-full text-left px-4 py-2.5 text-sm border-b last:border-0 transition-colors
                      ${dark ? 'text-white border-slate-700 hover:bg-slate-700' : 'text-gray-800 border-gray-100 hover:bg-blue-50'}`}>
                    {s.stopName}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <button onClick={swapStops}
              className={`w-7 h-7 rounded-full border flex items-center justify-center transition-colors
                ${dark ? 'border-slate-600 bg-slate-800 text-slate-400 hover:bg-slate-700' : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'}`}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>

          <div className="relative">
            <div className={wrapClass}>
              <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              <input className={inputClass} placeholder="To : stop name"
                value={to} onChange={handleToChange}
                onFocus={() => setShowToSug(true)}
                onBlur={() => setTimeout(() => setShowToSug(false), 150)} />
            </div>
            {showToSug && toSuggestions.length > 0 && (
              <div className={sugClass}>
                {toSuggestions.map(s => (
                  <button key={s.stopId} onMouseDown={() => { setTo(s.stopName); setShowToSug(false) }}
                    className={`w-full text-left px-4 py-2.5 text-sm border-b last:border-0 transition-colors
                      ${dark ? 'text-white border-slate-700 hover:bg-slate-700' : 'text-gray-800 border-gray-100 hover:bg-blue-50'}`}>
                    {s.stopName}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button onClick={handleSearch} disabled={!from || !to || searching}
          className="w-full mt-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors flex items-center justify-center gap-2">
          {searching ? <Spinner /> : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
          )}
          {searching ? 'Searching...' : 'Find Buses'}
        </button>
      </Card>

      {/* Search results */}
      {searched && (
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
            {from} ? {to}
          </p>
          {searchError
            ? <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{searchError}</div>
            : searchResults.length === 0
              ? <EmptyState message="No direct routes found." />
              : <div className="space-y-3">
                {searchResults.map(route => (
                  <div key={route.routeId}
                    className={`rounded-xl border overflow-hidden ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                    <button onClick={() => navigate(`/routes/${route.routeId}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)}
                      className="w-full px-4 py-3.5 text-left">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78A3 3 0 0020 16V8c0-3.5-3.58-4-8-4s-8 .5-8 4v8zm3.5 1a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm9 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM6 9h12v4H6V9z" />
                            </svg>
                          </div>
                          <p className={`font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>Route {route.routeName}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {route.activeTrips?.length > 0
                            ? <Badge color="green">{route.activeTrips.length} live</Badge>
                            : <Badge color="gray">No buses</Badge>}
                        </div>
                      </div>
                      {route.routeStops?.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {route.routeStops.slice().sort((a, b) => a.sequence - b.sequence).map((rs, i, arr) => {
                            const name = rs.busStop?.stopName
                            const isFrom = name?.toLowerCase() === from.toLowerCase()
                            const isTo = name?.toLowerCase() === to.toLowerCase()
                            return (
                              <span key={rs.routeStopId} className="flex items-center gap-1">
                                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium
                                    ${isFrom ? 'bg-blue-100 text-blue-700 border-blue-300' :
                                    isTo ? 'bg-green-100 text-green-700 border-green-300' :
                                      dark ? 'bg-slate-700 text-slate-300 border-slate-600' :
                                        'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                  {name}
                                </span>
                                {i < arr.length - 1 && <span className="text-gray-300 text-xs">-</span>}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </button>
                    {/* Favorite button */}
                    <div className={`px-4 py-2 border-t flex justify-end ${dark ? 'border-slate-700' : 'border-gray-100'}`}>
                      <button onClick={() => toggleFavorite(route)}
                        className={`text-xs font-medium flex items-center gap-1 transition-colors
                            ${isFav(route.routeId) ? 'text-amber-500' : dark ? 'text-slate-400 hover:text-amber-400' : 'text-gray-400 hover:text-amber-500'}`}>
                        {isFav(route.routeId) ? '? Saved' : '? Save route'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {/* Offline warning */}
      {offline && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          <p className="text-sm text-amber-700">Server is waking up, please wait...</p>
        </div>
      )}

      {/* Live Buses */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className={`text-xs font-semibold uppercase tracking-wide ${dark ? 'text-slate-400' : 'text-gray-500'}`}>Live Buses</p>
          {lastUpdated && <p className={`text-xs ${dark ? 'text-slate-500' : 'text-gray-400'}`}>Updated {lastUpdated.toLocaleTimeString()}</p>}
        </div>
        {loadingLive
          ? <div className="flex justify-center py-6"><Spinner size="md" /></div>
          : liveTrips.length === 0
            ? <div className={`border rounded-xl px-4 py-3 text-sm ${dark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-gray-200 text-gray-400'}`}>
              No buses running right now
            </div>
            : <div className="space-y-2">
              {liveTrips.map(t => (
                <button key={t.busTripId} onClick={() => navigate(`/routes/${t.route?.routeId}`)}
                  className={`w-full border rounded-xl px-4 py-3 flex items-center gap-3 transition-all text-left
                      ${dark ? 'bg-slate-800 border-slate-700 hover:border-blue-500' : 'bg-white border-gray-200 hover:border-blue-300'}`}>
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>{t.bus?.numberPlate}</p>
                      <Badge color="blue">Route {t.route?.routeName}</Badge>
                    </div>
                    {t.busLocation?.busLatitude != null
                      ? <p className={`text-xs mt-0.5 truncate ${dark ? 'text-slate-400' : 'text-gray-400'}`}>
                        ?? {t.busLocation.busLatitude}, {t.busLocation.busLongitude}
                      </p>
                      : <p className={`text-xs mt-0.5 ${dark ? 'text-slate-500' : 'text-gray-400'}`}>Location not updated yet</p>
                    }
                  </div>
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
        }
      </div>

      {/* All Routes with favorite toggle */}
      <div>
        <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>All Routes</p>
        <div className="space-y-2">
          {routes.map(route => (
            <div key={route.routeId}
              className={`rounded-xl border overflow-hidden ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
              <button onClick={() => navigate(`/routes/${route.routeId}`)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:opacity-80 transition-opacity">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78A3 3 0 0020 16V8c0-3.5-3.58-4-8-4s-8 .5-8 4v8zm3.5 1a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm9 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM6 9h12v4H6V9z" />
                    </svg>
                  </div>
                  <div>
                    <p className={`font-medium text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>Route {route.routeName}</p>
                    <p className={`text-xs ${dark ? 'text-slate-400' : 'text-gray-400'}`}>{route.routeStops?.length || 0} stops</p>
                  </div>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <div className={`px-4 py-1.5 border-t flex justify-end ${dark ? 'border-slate-700' : 'border-gray-100'}`}>
                <button onClick={() => toggleFavorite(route)}
                  className={`text-xs font-medium flex items-center gap-1 transition-colors
                    ${isFav(route.routeId) ? 'text-amber-500' : dark ? 'text-slate-500 hover:text-amber-400' : 'text-gray-400 hover:text-amber-500'}`}>
                  {isFav(route.routeId) ? '? Saved' : '? Save'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
