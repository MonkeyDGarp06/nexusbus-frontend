import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { routesApi, tripApi } from '../api'
import { Badge, Spinner, EmptyState } from '../components/ui'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTheme } from '../context/ThemeContext'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const stopIcon = L.divIcon({
  className: '',
  html: `<div style="background:#f59e0b;border-radius:50%;width:12px;height:12px;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [12, 12], iconAnchor: [6, 6],
})

const highlightStopIcon = L.divIcon({
  className: '',
  html: `<div style="background:#2563eb;border-radius:50%;width:16px;height:16px;border:3px solid white;box-shadow:0 2px 6px rgba(37,99,235,0.5);"></div>`,
  iconSize: [16, 16], iconAnchor: [8, 8],
})

function makeBusIcon(rotation = 0) {
  return L.divIcon({
    className: '',
    html: `<div style="width:36px;height:36px;background:#2563eb;border-radius:50%;border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:18px;transform:rotate(${rotation}deg);transition:transform 0.3s ease;"></div>`,
    iconSize: [36, 36], iconAnchor: [18, 18],
  })
}

function FitBounds({ positions }) {
  const map = useMap()
  useEffect(() => {
    if (positions?.length > 0) map.fitBounds(positions, { padding: [50, 50] })
  }, [map])
  return null
}

async function fetchRoadPolyline(stops) {
  if (stops.length < 2) return stops.map(s => [s.lat, s.lng])
  const coords = stops.map(s => `${s.lng},${s.lat}`).join(';')
  try {
    const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`)
    const data = await res.json()
    if (data.code === 'Ok' && data.routes?.[0]) {
      return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])
    }
  } catch { }
  return stops.map(s => [s.lat, s.lng])
}

function lerp(a, b, t) { return a + (b - a) * t }

function AnimatedBusMarker({ trip }) {
  const markerRef = useRef(null)
  const prevPos = useRef(null)
  const animFrame = useRef(null)
  const startTime = useRef(null)
  const DURATION = 10000

  const lat = trip.busLocation?.busLatitude
  const lng = trip.busLocation?.busLongitude

  useEffect(() => {
    if (!lat || !lng) return
    const newPos = [parseFloat(lat), parseFloat(lng)]
    if (!prevPos.current) {
      prevPos.current = newPos
      if (markerRef.current) markerRef.current.setLatLng(newPos)
      return
    }
    const from = prevPos.current
    const to = newPos
    const dLng = to[1] - from[1]
    const dLat = to[0] - from[0]
    const bearing = Math.atan2(dLng, dLat) * (180 / Math.PI)
    if (animFrame.current) cancelAnimationFrame(animFrame.current)
    startTime.current = performance.now()
    function animate(now) {
      const elapsed = now - startTime.current
      const t = Math.min(elapsed / DURATION, 1)
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
      const curLat = lerp(from[0], to[0], eased)
      const curLng = lerp(from[1], to[1], eased)
      if (markerRef.current) {
        markerRef.current.setLatLng([curLat, curLng])
        markerRef.current.setIcon(makeBusIcon(bearing))
      }
      if (t < 1) animFrame.current = requestAnimationFrame(animate)
      else prevPos.current = to
    }
    animFrame.current = requestAnimationFrame(animate)
    return () => { if (animFrame.current) cancelAnimationFrame(animFrame.current) }
  }, [lat, lng])

  if (!lat || !lng) return null
  return (
    <Marker ref={markerRef} position={[parseFloat(lat), parseFloat(lng)]} icon={makeBusIcon(0)}>
      <Popup>
        <p className="font-semibold text-sm">{trip.bus?.numberPlate}</p>
        <p className="text-xs text-gray-500">Route {trip.route?.routeName}</p>
      </Popup>
    </Marker>
  )
}

export default function RouteDetail() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { dark } = useTheme()
  const fromStop = searchParams.get('from') || ''
  const toStop = searchParams.get('to') || ''

  const [route, setRoute] = useState(null)
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [direction, setDirection] = useState('up')
  const [autoDirectionSet, setAutoDirectionSet] = useState(false)
  const [roadPath, setRoadPath] = useState([])

  useEffect(() => {
    async function load() {
      try {
        const r = await routesApi.getById(id)
        setRoute(r)
        // Auto detect direction from from/to params
        if (fromStop && toStop && !autoDirectionSet) {
          const stops = r.routeStops || []
          const fromSeq = stops.find(rs => rs.busStop?.stopName?.toLowerCase() === fromStop.toLowerCase())?.sequence || 0
          const toSeq = stops.find(rs => rs.busStop?.stopName?.toLowerCase() === toStop.toLowerCase())?.sequence || 0
          if (fromSeq > toSeq) setDirection('down')
          else setDirection('up')
          setAutoDirectionSet(true)
        }
        try {
          const t = await tripApi.getByRoute(r.routeName)
          setTrips(Array.isArray(t) ? t : [])
        } catch { setTrips([]) }
      } catch { }
      setLoading(false)
    }
    load()
  }, [id])

  useEffect(() => {
    if (!route) return
    const interval = setInterval(async () => {
      try {
        const t = await tripApi.getByRoute(route.routeName)
        setTrips(Array.isArray(t) ? t : [])
      } catch { }
    }, 10000)
    return () => clearInterval(interval)
  }, [route])

  useEffect(() => {
    if (!route?.routeStops?.length) return
    const sorted = [...route.routeStops]
      .sort((a, b) => direction === 'up' ? a.sequence - b.sequence : b.sequence - a.sequence)
      .filter(rs => rs.busStop?.stopLatitude && rs.busStop?.stopLongitude)

    let stopsToShow = sorted
    if (fromStop && toStop) {
      const fromIdx = sorted.findIndex(rs => rs.busStop?.stopName?.toLowerCase() === fromStop.toLowerCase())
      const toIdx = sorted.findIndex(rs => rs.busStop?.stopName?.toLowerCase() === toStop.toLowerCase())
      if (fromIdx !== -1 && toIdx !== -1) {
        stopsToShow = sorted.slice(Math.min(fromIdx, toIdx), Math.max(fromIdx, toIdx) + 1)
      }
    }

    const coords = stopsToShow.map(rs => ({ lat: rs.busStop.stopLatitude, lng: rs.busStop.stopLongitude }))
    if (coords.length < 2) { setRoadPath(coords.map(c => [c.lat, c.lng])); return }
    fetchRoadPolyline(coords).then(setRoadPath)
  }, [route, direction, fromStop, toStop])

  function handleShare() {
    if (navigator.share) {
      navigator.share({ title: `NexusBus Route ${route?.routeName}`, url: window.location.href })
    } else {
      navigator.clipboard.writeText(window.location.href)
        .then(() => alert('Link copied!'))
    }
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner size="md" /></div>
  if (!route) return <EmptyState message="Route not found." />

  let sortedStops = (route.routeStops || [])
    .slice()
    .sort((a, b) => direction === 'up' ? a.sequence - b.sequence : b.sequence - a.sequence)

  // If from/to provided, slice to only show stops between them
  if (fromStop && toStop) {
    const fromIdx = sortedStops.findIndex(rs => rs.busStop?.stopName?.toLowerCase() === fromStop.toLowerCase())
    const toIdx = sortedStops.findIndex(rs => rs.busStop?.stopName?.toLowerCase() === toStop.toLowerCase())
    if (fromIdx !== -1 && toIdx !== -1) {
      const start = Math.min(fromIdx, toIdx)
      const end = Math.max(fromIdx, toIdx)
      sortedStops = sortedStops.slice(start, end + 1)
    }
  }

  let mapStops = sortedStops.filter(rs => rs.busStop?.stopLatitude && rs.busStop?.stopLongitude)
  if (fromStop && toStop) {
    const fromIdx = mapStops.findIndex(rs => rs.busStop?.stopName?.toLowerCase() === fromStop.toLowerCase())
    const toIdx = mapStops.findIndex(rs => rs.busStop?.stopName?.toLowerCase() === toStop.toLowerCase())
    if (fromIdx !== -1 && toIdx !== -1) {
      mapStops = mapStops.slice(Math.min(fromIdx, toIdx), Math.max(fromIdx, toIdx) + 1)
    }
  }

  const boundsPositions = [
    ...mapStops.map(rs => [rs.busStop.stopLatitude, rs.busStop.stopLongitude]),
    ...trips.filter(t => t.busLocation?.busLatitude).map(t => [parseFloat(t.busLocation.busLatitude), parseFloat(t.busLocation.busLongitude)])
  ]

  return (
    <div>
      {/* Back + Share */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)}
          className={`flex items-center gap-1.5 text-sm transition-colors ${dark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <button onClick={handleShare}
          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Share
        </button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className={`text-xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>Route {route.routeName}</h1>
          <p className={`text-sm ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
            {sortedStops.length} stops  {trips.length} active bus{trips.length !== 1 ? 'es' : ''}
          </p>
        </div>
        <div className={`flex rounded-lg p-1 gap-1 ${dark ? 'bg-slate-700' : 'bg-gray-100'}`}>
          <button onClick={() => setDirection('up')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors
              ${direction === 'up' ? 'bg-white text-blue-600 shadow-sm' : dark ? 'text-slate-400' : 'text-gray-500'}`}>
            Up
          </button>
          <button onClick={() => setDirection('down')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors
              ${direction === 'down' ? 'bg-white text-blue-600 shadow-sm' : dark ? 'text-slate-400' : 'text-gray-500'}`}>
            Down
          </button>
        </div>
      </div>

      {fromStop && toStop && (
        <p className="text-xs text-blue-600 font-medium mb-3">Showing: {fromStop} → {toStop}</p>
      )}

      {/* Map */}
      {mapStops.length > 0 && (
        <div className="mb-5 rounded-xl overflow-hidden border border-gray-200" style={{ height: '300px' }}>
          <MapContainer
            center={[mapStops[0].busStop.stopLatitude, mapStops[0].busStop.stopLongitude]}
            zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {boundsPositions.length > 0 && <FitBounds positions={boundsPositions} />}
            {roadPath.length > 1 && <Polyline positions={roadPath} color="#2563eb" weight={4} opacity={0.8} />}
            {mapStops.map(rs => {
              const isFrom = rs.busStop?.stopName?.toLowerCase() === fromStop.toLowerCase()
              const isTo = rs.busStop?.stopName?.toLowerCase() === toStop.toLowerCase()
              return (
                <Marker key={rs.routeStopId}
                  position={[rs.busStop.stopLatitude, rs.busStop.stopLongitude]}
                  icon={isFrom || isTo ? highlightStopIcon : stopIcon}>
                  <Popup>
                    <p className="font-semibold text-sm">{rs.busStop.stopName}</p>
                    <p className="text-xs text-gray-500">Stop {rs.sequence}</p>
                    {isFrom && <p className="text-xs text-blue-600 font-medium">Your stop</p>}
                    {isTo && <p className="text-xs text-green-600 font-medium">Destination</p>}
                  </Popup>
                </Marker>
              )
            })}
            {trips.map(t => <AnimatedBusMarker key={t.busTripId} trip={t} />)}
          </MapContainer>
        </div>
      )}

      {/* Live buses */}
      {trips.length > 0 && (
        <div className="mb-5">
          <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
            Live Buses
          </p>
          <div className="space-y-2">
            {trips.map(t => (
              <div key={t.busTripId}
                className={`border rounded-xl px-4 py-3 flex items-center gap-3 ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                <div>
                  <p className={`text-sm font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>{t.bus?.numberPlate}</p>
                  {t.busLocation?.busLatitude
                    ? <p className={`text-xs ${dark ? 'text-slate-400' : 'text-gray-400'}`}>
                      Last seen: {t.busLocation.busLatitude}, {t.busLocation.busLongitude}
                    </p>
                    : <p className={`text-xs ${dark ? 'text-slate-500' : 'text-gray-400'}`}>Location not updated yet</p>
                  }
                </div>
                <Badge color="green" className="ml-auto">Active</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stop list */}
      <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
        Stops
      </p>
      {sortedStops.length === 0
        ? <EmptyState message="No stops on this route yet." />
        : <div className="space-y-0">
          {sortedStops.map((rs, i) => {
            const isFrom = rs.busStop?.stopName?.toLowerCase() === fromStop.toLowerCase()
            const isTo = rs.busStop?.stopName?.toLowerCase() === toStop.toLowerCase()
            return (
              <div key={rs.routeStopId} className="flex items-stretch gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full border-2 mt-3.5 shrink-0
                      ${isFrom ? 'border-blue-600 bg-blue-600' :
                      isTo ? 'border-green-600 bg-green-600' :
                        trips.some(t => {
                          if (!t.busLocation?.busLatitude) return false
                          const d = Math.sqrt(
                            Math.pow((parseFloat(t.busLocation.busLatitude) - rs.busStop?.stopLatitude), 2) +
                            Math.pow((parseFloat(t.busLocation.busLongitude) - rs.busStop?.stopLongitude), 2)
                          )
                          return d < 0.005
                        }) ? 'border-blue-600 bg-blue-600 animate-pulse' :
                          i === 0 ? 'border-blue-400 bg-blue-400' :
                            i === sortedStops.length - 1 ? 'border-gray-400 bg-gray-400' :
                              dark ? 'border-slate-600 bg-slate-900' : 'border-gray-300 bg-white'}`}
                  />
                  {i < sortedStops.length - 1 && (
                    <div className={`w-0.5 flex-1 my-0.5 ${dark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                  )}
                </div>
                <div className="pb-3 flex-1">
                  <p className={`text-sm font-medium pt-2
                      ${isFrom ? 'text-blue-600' : isTo ? 'text-green-600' : dark ? 'text-white' : 'text-gray-900'}`}>
                    {rs.busStop?.stopName}
                    {isFrom && <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">From</span>}
                    {isTo && <span className="ml-2 text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full">To</span>}
                  </p>
                  <p className={`text-xs ${dark ? 'text-slate-500' : 'text-gray-400'}`}>Stop {rs.sequence}</p>
                </div>
              </div>
            )
          })}
        </div>
      }
    </div>
  )
}
