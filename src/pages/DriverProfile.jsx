import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Badge, Spinner, EmptyState, Card } from '../components/ui'
import { tripApi } from '../api'

export default function DriverProfile() {
  const { email } = useParams()
  const navigate = useNavigate()
  const { auth } = useAuth()
  const { dark } = useTheme()
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [driver, setDriver] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        // Get all active + check history once backend has tripHistory
        // For now use getAllBusTrips to get active trips for this driver
        const active = await tripApi.getAllActive(auth)
        const allTrips = Array.isArray(active) ? active : []
        const driverTrips = allTrips.filter(t =>
          t.users?.emailId === decodeURIComponent(email)
        )
        if (driverTrips.length > 0) {
          setDriver({
            fname: driverTrips[0].users?.fname,
            lname: driverTrips[0].users?.lname,
            emailId: driverTrips[0].users?.emailId,
            role: driverTrips[0].users?.role,
          })
        } else {
          // Set driver info from URL param
          setDriver({ emailId: decodeURIComponent(email) })
        }
        setTrips(driverTrips)
      } catch { }
      setLoading(false)
    }
    load()
  }, [email, auth])

  const cardClass = `${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border rounded-xl p-4`

  if (loading) return <div className="flex justify-center py-12"><Spinner size="md" /></div>

  return (
    <div>
      <button onClick={() => navigate(-1)}
        className={`flex items-center gap-1.5 text-sm mb-4 transition-colors ${dark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Driver info card */}
      <div className={`${cardClass} mb-4`}>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black
            ${dark ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
            {driver?.fname?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <h1 className={`text-xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
              {driver?.fname && driver?.lname ? `${driver.fname} ${driver.lname}` : 'Driver'}
            </h1>
            <p className={`text-sm ${dark ? 'text-slate-400' : 'text-gray-500'}`}>{driver?.emailId}</p>
            <div className="mt-1">
              <Badge color="blue">{driver?.role || 'driver'}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Active Trips', value: trips.filter(t => t.active).length, color: 'text-green-600' },
          { label: 'Routes Driven', value: [...new Set(trips.map(t => t.route?.routeName))].length, color: 'text-blue-600' },
          { label: 'Buses Used', value: [...new Set(trips.map(t => t.bus?.numberPlate))].length, color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className={`${cardClass} text-center`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className={`text-xs font-semibold uppercase tracking-wide mt-0.5 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Active trips */}
      <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
        Current Active Trips
      </p>
      {trips.length === 0
        ? <EmptyState message="No active trips for this driver." />
        : <div className="space-y-3">
          {trips.map(t => (
            <div key={t.busTripId} className={cardClass}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <p className={`font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>Route {t.route?.routeName}</p>
                </div>
                <Badge color="green">Live</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className={`rounded-lg p-2 ${dark ? 'bg-slate-900' : 'bg-gray-50'}`}>
                  <p className={`uppercase tracking-wide font-semibold mb-0.5 ${dark ? 'text-slate-500' : 'text-gray-400'}`}>Bus</p>
                  <p className={`font-semibold ${dark ? 'text-white' : 'text-gray-800'}`}>{t.bus?.numberPlate || ''}</p>
                </div>
                <div className={`rounded-lg p-2 ${dark ? 'bg-slate-900' : 'bg-gray-50'}`}>
                  <p className={`uppercase tracking-wide font-semibold mb-0.5 ${dark ? 'text-slate-500' : 'text-gray-400'}`}>Trip #</p>
                  <p className={`font-semibold ${dark ? 'text-white' : 'text-gray-800'}`}>#{t.busTripId}</p>
                </div>
              </div>
              {t.busLocation?.busLatitude
                ? <p className="text-xs text-green-500 font-medium mt-2">
                  {parseFloat(t.busLocation.busLatitude).toFixed(5)}, {parseFloat(t.busLocation.busLongitude).toFixed(5)}
                </p>
                : <p className={`text-xs mt-2 ${dark ? 'text-slate-500' : 'text-gray-400'}`}>No GPS yet</p>
              }
              {/* Route stops */}
              {t.route?.routeStops?.length > 0 && (
                <div className="mt-3">
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-1.5 ${dark ? 'text-slate-500' : 'text-gray-400'}`}>
                    Route stops
                  </p>
                  <div className="flex flex-wrap items-center gap-1">
                    {t.route.routeStops.slice().sort((a, b) => a.sequence - b.sequence).map((rs, i, arr) => (
                      <span key={rs.routeStopId} className="flex items-center gap-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full border
                            ${dark ? 'bg-slate-800 border-slate-600 text-slate-300' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                          {rs.busStop?.stopName}
                        </span>
                        {i < arr.length - 1 && <span className="text-gray-400 text-xs">?</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      }
    </div>
  )
}
