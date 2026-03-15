import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { stopsApi } from '../api'
import { Input, EmptyState, Spinner, PageHeader } from '../components/ui'
import { useTheme } from '../context/ThemeContext'

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDistance(m) {
  return m < 1000 ? `${Math.round(m)}m away` : `${(m / 1000).toFixed(1)}km away`
}

export default function Stops() {
  const [stops, setStops] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [nearMe, setNearMe] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState('')
  const navigate = useNavigate()
  const { dark } = useTheme()

  useEffect(() => {
    stopsApi.getAll().then(setStops).catch(() => { }).finally(() => setLoading(false))
  }, [])

  function handleNearMe() {
    if (nearMe) { setNearMe(false); return }
    if (!navigator.geolocation) { setGpsError('GPS not available.'); return }
    setGpsLoading(true); setGpsError('')
    navigator.geolocation.getCurrentPosition(
      pos => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setNearMe(true); setGpsLoading(false); setSearch('') },
      () => { setGpsError('Could not get location.'); setGpsLoading(false) },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  const stopsWithDist = stops.map(s => ({
    ...s,
    distance: userLocation ? getDistance(userLocation.lat, userLocation.lng, s.stopLatitude, s.stopLongitude) : null
  }))

  let displayed = stopsWithDist
  if (nearMe && userLocation) {
    displayed = stopsWithDist.filter(s => s.distance != null && s.distance < 5000).sort((a, b) => a.distance - b.distance)
  } else if (search) {
    displayed = stopsWithDist.filter(s => s.stopName.toLowerCase().includes(search.toLowerCase()))
  }

  const rowClass = `w-full border rounded-xl px-4 py-3.5 flex items-center justify-between hover:border-blue-300 hover:shadow-sm transition-all text-left
    ${dark ? 'bg-slate-800 border-slate-700 hover:border-blue-500' : 'bg-white border-gray-200'}`

  return (
    <div>
      <PageHeader title="Stops" subtitle="Tap a stop to see routes and map" />
      <div className="flex gap-2 mb-4">
        <Input placeholder="Search stops..." value={search}
          onChange={e => { setSearch(e.target.value); setNearMe(false) }} className="flex-1" />
        <button onClick={handleNearMe} disabled={gpsLoading}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors
            ${nearMe ? 'bg-blue-600 text-white border-blue-600' :
              dark ? 'bg-slate-800 border-slate-600 text-slate-300 hover:border-blue-500' :
                'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'}`}>
          {gpsLoading ? <Spinner /> : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
          Near me
        </button>
      </div>

      {gpsError && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{gpsError}</p>}
      {nearMe && userLocation && <p className="text-xs text-blue-600 mb-3 font-medium">Showing stops within 5km</p>}

      {loading
        ? <div className="flex justify-center py-12"><Spinner size="md" /></div>
        : displayed.length === 0
          ? <EmptyState message={nearMe ? 'No stops within 5km.' : 'No stops found.'} />
          : <div className="space-y-2">
            {displayed.map(stop => (
              <button key={stop.stopId} onClick={() => navigate(`/stops/${stop.stopId}`)} className={rowClass}>
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
                      {stop.distance != null && <span className="text-blue-500 ml-1"> {formatDistance(stop.distance)}</span>}
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
  )
}
