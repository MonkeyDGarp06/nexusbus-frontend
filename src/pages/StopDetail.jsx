import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { stopsApi, tripApi, routesApi } from '../api'
import { Spinner, EmptyState, Badge } from '../components/ui'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTheme } from '../context/ThemeContext'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Estimate ETA: distance / avg bus speed (20 km/h in city)
function estimateETA(distanceMeters) {
  const speedMps = 20000 / 3600 // 20 km/h in m/s
  const seconds = distanceMeters / speedMps
  if (seconds < 60) return 'Arriving soon'
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `~${mins} min`
  return `~${Math.round(mins / 60)}h ${mins % 60}m`
}

export default function StopDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { dark } = useTheme()
  const [stop, setStop] = useState(null)
  const [loading, setLoading] = useState(true)
  const [arrivals, setArrivals] = useState([])
  const [loadingArrivals, setLoadingArrivals] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    stopsApi.getById(id).then(setStop).catch(() => { }).finally(() => setLoading(false))
  }, [id])

  // Load arrivals for this stop
  useEffect(() => {
    if (!stop) return
    loadArrivals()
    intervalRef.current = setInterval(loadArrivals, 15000)
    return () => clearInterval(intervalRef.current)
  }, [stop])

  async function loadArrivals() {
    if (!stop?.routeStops?.length) return
    setLoadingArrivals(true)
    const results = []
    for (const rs of stop.routeStops) {
      try {
        const trips = await tripApi.getByRoute(rs.route?.routeName)
        const active = Array.isArray(trips) ? trips.filter(t => t.active) : []
        for (const trip of active) {
          if (trip.busLocation?.busLatitude) {
            const dist = getDistance(
              parseFloat(trip.busLocation.busLatitude),
              parseFloat(trip.busLocation.busLongitude),
              stop.stopLatitude,
              stop.stopLongitude
            )
            // Only show buses that haven't passed this stop yet
            // Check if bus sequence is before this stop's sequence
            const routeStops = trip.route?.routeStops || []
            const sorted = routeStops.slice().sort((a, b) => a.sequence - b.sequence)
            const thisStopSeq = rs.sequence
            // Find closest stop to bus
            let closestSeq = 0
            let minDist = Infinity
            sorted.forEach(s => {
              if (s.busStop?.stopLatitude) {
                const d = getDistance(
                  parseFloat(trip.busLocation.busLatitude),
                  parseFloat(trip.busLocation.busLongitude),
                  s.busStop.stopLatitude,
                  s.busStop.stopLongitude
                )
                if (d < minDist) { minDist = d; closestSeq = s.sequence }
              }
            })
            if (closestSeq <= thisStopSeq) {
              results.push({
                key: `${trip.busTripId}-${rs.routeStopId}`,
                routeName: rs.route?.routeName,
                routeId: trip.route?.routeId,
                numberPlate: trip.bus?.numberPlate,
                distance: dist,
                eta: estimateETA(dist),
                busTripId: trip.busTripId,
              })
            }
          } else {
            results.push({
              key: `${trip.busTripId}-${rs.routeStopId}`,
              routeName: rs.route?.routeName,
              routeId: trip.route?.routeId,
              numberPlate: trip.bus?.numberPlate,
              distance: null,
              eta: 'No GPS',
              busTripId: trip.busTripId,
            })
          }
        }
      } catch { }
    }
    results.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
    setArrivals(results)
    setLoadingArrivals(false)
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner size="md" /></div>
  if (!stop) return <EmptyState message="Stop not found." />

  const routes = stop.routeStops || []

  return (
    <div>
      <button onClick={() => navigate(-1)}
        className={`flex items-center gap-1.5 text-sm mb-4 transition-colors ${dark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        All stops
      </button>

      <div className="mb-4">
        <h1 className={`text-xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{stop.stopName}</h1>
        <p className={`text-sm font-mono ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
          {stop.stopLatitude}, {stop.stopLongitude}
        </p>
      </div>

      {/* Map */}
      <div className="mb-5 rounded-xl overflow-hidden border border-gray-200" style={{ height: '200px' }}>
        <MapContainer center={[stop.stopLatitude, stop.stopLongitude]} zoom={15} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[stop.stopLatitude, stop.stopLongitude]}>
            <Popup>
              <p className="font-semibold text-sm">{stop.stopName}</p>
              <p className="text-xs text-gray-500">{routes.length} route{routes.length !== 1 ? 's' : ''}</p>
            </Popup>
          </Marker>
        </MapContainer>
      </div>

      {/* Live Arrivals board */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className={`text-xs font-semibold uppercase tracking-wide ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
            Live Arrivals
          </p>
          {loadingArrivals && <Spinner size="sm" />}
        </div>

        {arrivals.length === 0 && !loadingArrivals ? (
          <div className={`border rounded-xl px-4 py-4 text-center ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
            <p className="text-2xl mb-1"></p>
            <p className={`text-sm font-medium ${dark ? 'text-slate-300' : 'text-gray-600'}`}>No buses en route right now</p>
            <p className={`text-xs mt-0.5 ${dark ? 'text-slate-500' : 'text-gray-400'}`}>Updates every 15 seconds</p>
          </div>
        ) : (
          <div className="space-y-2">
            {arrivals.map(a => (
              <button key={a.key} onClick={() => navigate(`/routes/${a.routeId}`)}
                className={`w-full border rounded-xl px-4 py-3 flex items-center justify-between transition-all text-left
                  ${dark ? 'bg-slate-800 border-slate-700 hover:border-blue-500' : 'bg-white border-gray-200 hover:border-blue-300'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                    ${a.eta === 'Arriving soon' ? 'bg-green-500' : a.eta === 'No GPS' ? 'bg-gray-400' : 'bg-blue-600'}`}>
                    <span className="text-white text-lg"></span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={`font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>Route {a.routeName}</p>
                      <Badge color={a.eta === 'Arriving soon' ? 'green' : a.eta === 'No GPS' ? 'gray' : 'blue'}>
                        {a.eta}
                      </Badge>
                    </div>
                    <p className={`text-xs mt-0.5 ${dark ? 'text-slate-400' : 'text-gray-400'}`}>
                      {a.numberPlate}
                      {a.distance && <span>  {a.distance < 1000 ? `${Math.round(a.distance)}m away` : `${(a.distance / 1000).toFixed(1)}km away`}</span>}
                    </p>
                  </div>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Routes through this stop */}
      <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
        Routes through this stop
      </p>
      {routes.length === 0
        ? <EmptyState message="No routes pass through this stop yet." />
        : <div className="space-y-2">
          {routes.map(rs => (
            <button key={rs.routeStopId} onClick={() => navigate(`/routes/${rs.route?.routeId}`)}
              className={`w-full border rounded-xl px-4 py-3 flex items-center justify-between hover:border-blue-300 hover:shadow-sm transition-all text-left
                  ${dark ? 'bg-slate-800 border-slate-700 hover:border-blue-500' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${dark ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78A3 3 0 0020 16V8c0-3.5-3.58-4-8-4s-8 .5-8 4v8zm3.5 1a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm9 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM6 9h12v4H6V9z" />
                  </svg>
                </div>
                <div>
                  <p className={`font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>Route {rs.route?.routeName}</p>
                  <p className={`text-xs ${dark ? 'text-slate-400' : 'text-gray-400'}`}>Stop sequence #{rs.sequence}</p>
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
  )
}
