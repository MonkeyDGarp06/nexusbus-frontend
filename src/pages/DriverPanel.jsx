import { useState, useEffect, useCallback, useRef } from 'react'
import { tripApi, routesApi, busApi } from '../api'
import { useAuth } from '../context/AuthContext'
import { Card, PageHeader, Spinner, Toast, Badge } from '../components/ui'
import { useToast } from '../components/useToast'
import { useTheme } from '../context/ThemeContext'

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function getNextStop(trip, currentLat, currentLng) {
  if (!trip?.route?.routeStops || !currentLat || !currentLng) return null
  const sorted = [...trip.route.routeStops].sort((a, b) => a.sequence - b.sequence)
  let closestIdx = 0, minDist = Infinity
  sorted.forEach((rs, i) => {
    if (!rs.busStop?.stopLatitude) return
    const d = getDistance(currentLat, currentLng, rs.busStop.stopLatitude, rs.busStop.stopLongitude)
    if (d < minDist) { minDist = d; closestIdx = i }
  })
  const nextIdx = closestIdx + 1 < sorted.length ? closestIdx + 1 : closestIdx
  const next = sorted[nextIdx]
  if (!next?.busStop?.stopLatitude) return null
  return {
    stop: next,
    distance: getDistance(currentLat, currentLng, next.busStop.stopLatitude, next.busStop.stopLongitude)
  }
}

const LOAD_LEVELS = [
  { value: 'empty', label: 'Empty', color: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' },
  { value: 'filling', label: 'Filling', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  { value: 'full', label: 'Full', color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
]

export default function DriverPanel({ onTripChange }) {
  const { auth } = useAuth()
  const { dark } = useTheme()
  const { toasts, toast, remove } = useToast()
  const [activeTrip, setActiveTrip] = useState(null)
  const [loadingTrip, setLoadingTrip] = useState(true)
  const [routes, setRoutes] = useState([])
  const [buses, setBuses] = useState([])
  const [selectedRoute, setSelectedRoute] = useState('')
  const [selectedBus, setSelectedBus] = useState('')
  const [loading, setLoading] = useState(false)
  const [gpsStatus, setGpsStatus] = useState('')
  const [gpsCoords, setGpsCoords] = useState(null)
  const [nextStop, setNextStop] = useState(null)
  const [passengerLoad, setPassengerLoad] = useState('empty')
  const [tripSummary, setTripSummary] = useState(null)
  const [tripStartTime, setTripStartTime] = useState(null)
  const [totalDistance, setTotalDistance] = useState(0)
  const [stopsVisited, setStopsVisited] = useState(new Set())
  const lastCoords = useRef(null)
  const intervalRef = useRef(null)

  const loadMyTrip = useCallback(async () => {
    try {
      const data = await tripApi.getMyTrip(auth)
      setActiveTrip(data)
      onTripChange(true)
    } catch {
      setActiveTrip(null)
      onTripChange(false)
    }
    setLoadingTrip(false)
  }, [auth, onTripChange])

  useEffect(() => {
    loadMyTrip()
    routesApi.getAll().then(setRoutes).catch(() => { })
    busApi.search('', auth).then(setBuses).catch(() => { })
  }, [loadMyTrip])

  useEffect(() => {
    if (activeTrip) {
      if (!tripStartTime) setTripStartTime(Date.now())
      sendGPS(false)
      intervalRef.current = setInterval(() => sendGPS(false), 10000)
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [activeTrip])

  function sendGPS(showMsg = true) {
    if (!navigator.geolocation) { if (showMsg) toast('GPS not available', 'error'); return }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        try {
          await tripApi.updateLocation({ latitude: lat.toString(), longitude: lng.toString() }, auth)
          // Track total distance
          if (lastCoords.current) {
            const d = getDistance(lastCoords.current.lat, lastCoords.current.lng, lat, lng)
            setTotalDistance(prev => prev + d)
          }
          lastCoords.current = { lat, lng }
          setGpsCoords({ lat, lng })
          setGpsStatus(new Date().toLocaleTimeString())
          if (activeTrip) {
            const ns = getNextStop(activeTrip, lat, lng)
            setNextStop(ns)
            // Track stops visited
            if (activeTrip.route?.routeStops) {
              activeTrip.route.routeStops.forEach(rs => {
                if (rs.busStop?.stopLatitude) {
                  const d = getDistance(lat, lng, rs.busStop.stopLatitude, rs.busStop.stopLongitude)
                  if (d < 200) setStopsVisited(prev => new Set([...prev, rs.busStop.stopName]))
                }
              })
            }
          }
          if (showMsg) toast('Location updated!')
        } catch (err) { if (showMsg) toast(err.message, 'error') }
      },
      () => { if (showMsg) toast('Could not get GPS.', 'error') },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    )
  }

  async function handleStartTrip(e) {
    e.preventDefault()
    if (!selectedRoute) { toast('Select a route', 'error'); return }
    if (!selectedBus) { toast('Select a bus', 'error'); return }
    setLoading(true)
    try {
      await tripApi.start({ routeName: selectedRoute, numberPlate: selectedBus }, auth)
      setTripStartTime(Date.now())
      setTotalDistance(0)
      setStopsVisited(new Set())
      toast('Trip started!')
      await loadMyTrip()
    } catch (err) { toast(err.message, 'error') }
    setLoading(false)
  }

  async function handleEndTrip() {
    setLoading(true)
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    try {
      // Build summary before ending
      const duration = tripStartTime ? Math.round((Date.now() - tripStartTime) / 60000) : 0
      const summary = {
        routeName: activeTrip?.route?.routeName,
        numberPlate: activeTrip?.bus?.numberPlate,
        duration,
        distanceKm: (totalDistance / 1000).toFixed(1),
        stopsVisited: stopsVisited.size,
        totalStops: activeTrip?.route?.routeStops?.length || 0,
      }
      await tripApi.end(auth)
      setActiveTrip(null)
      onTripChange(false)
      setTripSummary(summary)
      setTripStartTime(null)
      setTotalDistance(0)
      setStopsVisited(new Set())
      setNextStop(null)
    } catch (err) { toast(err.message, 'error') }
    setLoading(false)
  }

  const cardClass = `border rounded-xl p-5 ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`
  const selectClass = `w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${dark ? 'bg-slate-900 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`
  const labelClass = `text-sm font-medium ${dark ? 'text-slate-300' : 'text-gray-700'}`

  if (loadingTrip) return <div className="flex items-center justify-center py-20"><Spinner size="md" /></div>

  // Trip summary screen
  if (tripSummary) {
    return (
      <div>
        <PageHeader title="Trip Complete" />
        <div className={`${cardClass} text-center mb-4`}>
          <div className="text-5xl mb-3">??</div>
          <h2 className={`text-xl font-bold mb-1 ${dark ? 'text-white' : 'text-gray-900'}`}>
            Route {tripSummary.routeName} Done!
          </h2>
          <p className={`text-sm mb-5 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>{tripSummary.numberPlate}</p>

          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { label: 'Duration', value: `${tripSummary.duration} min`, icon: '??' },
              { label: 'Distance', value: `${tripSummary.distanceKm} km`, icon: '??' },
              { label: 'Stops Covered', value: `${tripSummary.stopsVisited}/${tripSummary.totalStops}`, icon: '??' },
              { label: 'Status', value: 'Completed', icon: '?' },
            ].map(s => (
              <div key={s.label} className={`rounded-xl p-3 ${dark ? 'bg-slate-900' : 'bg-gray-50'}`}>
                <p className="text-xl mb-1">{s.icon}</p>
                <p className={`text-lg font-black ${dark ? 'text-white' : 'text-gray-900'}`}>{s.value}</p>
                <p className={`text-xs font-medium uppercase tracking-wide ${dark ? 'text-slate-500' : 'text-gray-400'}`}>{s.label}</p>
              </div>
            ))}
          </div>

          <button onClick={() => setTripSummary(null)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3 text-sm transition-colors">
            Start New Trip
          </button>
        </div>
        <Toast toasts={toasts} remove={remove} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Driver Panel" subtitle="Manage your active bus trip" />

      {activeTrip ? (
        <div className="space-y-4">
          <div className={cardClass}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium text-green-600">Trip Active</span>
                </div>
                <h2 className={`text-xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
                  Route {activeTrip.route?.routeName}
                </h2>
                <p className={`text-sm ${dark ? 'text-slate-400' : 'text-gray-500'}`}>{activeTrip.bus?.numberPlate}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-lg ${dark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-400'}`}>
                #{activeTrip.busTripId}
              </span>
            </div>

            {/* Next stop */}
            {nextStop && (
              <div className="mb-4 p-3 bg-blue-600 rounded-xl">
                <p className="text-xs font-semibold text-blue-200 uppercase tracking-wide mb-1">Next Stop</p>
                <p className="text-white font-bold text-lg">{nextStop.stop?.busStop?.stopName}</p>
                <p className="text-blue-200 text-xs mt-0.5">
                  {nextStop.distance < 1000 ? `${Math.round(nextStop.distance)}m away` : `${(nextStop.distance / 1000).toFixed(1)}km away`}
                </p>
              </div>
            )}

            {/* Passenger load selector */}
            <div className="mb-4">
              <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
                Passenger Load
              </p>
              <div className="flex gap-2">
                {LOAD_LEVELS.map(level => (
                  <button key={level.value} onClick={() => setPassengerLoad(level.value)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 text-xs font-bold transition-all
                      ${passengerLoad === level.value
                        ? level.color + ' border-current scale-105'
                        : dark ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                    <span className={`w-2 h-2 rounded-full ${passengerLoad === level.value ? level.dot : 'bg-gray-300'}`} />
                    {level.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Route stops */}
            {activeTrip.route?.routeStops?.length > 0 && (
              <div className={`mb-4 p-3 rounded-xl ${dark ? 'bg-slate-900' : 'bg-gray-50'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>Route</p>
                <div className="flex flex-wrap items-center gap-1">
                  {activeTrip.route.routeStops
                    .slice().sort((a, b) => a.sequence - b.sequence)
                    .map((rs, i, arr) => {
                      const isNext = rs.busStop?.stopName === nextStop?.stop?.busStop?.stopName
                      const isVisited = stopsVisited.has(rs.busStop?.stopName)
                      return (
                        <span key={rs.routeStopId} className="flex items-center gap-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium
                            ${isNext ? 'bg-blue-600 text-white border-blue-600' :
                              isVisited ? 'bg-green-100 text-green-700 border-green-300' :
                                dark ? 'bg-slate-800 border-slate-600 text-slate-300' : 'bg-white border-gray-200 text-gray-700'}`}>
                            {isVisited && '? '}{rs.busStop?.stopName}
                          </span>
                          {i < arr.length - 1 && <span className="text-gray-300 text-xs">?</span>}
                        </span>
                      )
                    })}
                </div>
              </div>
            )}

            {/* GPS Status */}
            <div className={`p-3 rounded-xl mb-4 ${dark ? 'bg-slate-900 border border-slate-700' : 'bg-blue-50 border border-blue-100'}`}>
              <div className="flex items-center justify-between mb-1">
                <p className={`text-xs font-semibold ${dark ? 'text-blue-400' : 'text-blue-700'}`}>Auto GPS � every 10s</p>
                <button onClick={() => sendGPS(true)}
                  className={`text-xs font-medium border rounded-lg px-2.5 py-1 transition-colors
                    ${dark ? 'border-slate-600 text-slate-300 bg-slate-800 hover:bg-slate-700' : 'border-blue-300 text-blue-600 bg-white hover:bg-blue-50'}`}>
                  Update now
                </button>
              </div>
              {gpsStatus
                ? <div>
                  <p className={`text-xs ${dark ? 'text-slate-400' : 'text-blue-500'}`}>Last: {gpsStatus}</p>
                  {gpsCoords && <p className={`text-xs font-mono mt-0.5 ${dark ? 'text-slate-500' : 'text-blue-400'}`}>
                    {gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)}
                  </p>}
                </div>
                : <p className={`text-xs ${dark ? 'text-slate-500' : 'text-blue-400'}`}>Waiting for first update...</p>
              }
            </div>

            <button onClick={handleEndTrip} disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-colors">
              {loading ? 'Ending...' : 'End Trip'}
            </button>
          </div>
        </div>
      ) : (
        <div className={cardClass}>
          <h2 className={`font-semibold mb-1 ${dark ? 'text-white' : 'text-gray-900'}`}>Start a new trip</h2>
          <p className={`text-sm mb-5 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>Select your route and bus to begin.</p>
          <form onSubmit={handleStartTrip} className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Route</label>
              <select value={selectedRoute} onChange={e => setSelectedRoute(e.target.value)} required className={selectClass}>
                <option value="">Select a route...</option>
                {routes.map(r => (
                  <option key={r.routeId} value={r.routeName}>Route {r.routeName} ({r.routeStops?.length || 0} stops)</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Bus</label>
              <select value={selectedBus} onChange={e => setSelectedBus(e.target.value)} required className={selectClass}>
                <option value="">Select a bus...</option>
                {buses.map(b => <option key={b.busId} value={b.numberPlate}>{b.numberPlate}</option>)}
              </select>
              {buses.length === 0 && <p className="text-xs text-amber-600">No buses found. Ask admin to register buses.</p>}
            </div>
            <button type="submit" disabled={loading || !selectedRoute || !selectedBus}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-colors">
              {loading ? 'Starting...' : 'Start Trip'}
            </button>
          </form>
        </div>
      )}

      <Toast toasts={toasts} remove={remove} />
    </div>
  )
}
