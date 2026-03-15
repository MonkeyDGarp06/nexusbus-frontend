import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { stopsApi, routesApi, routeStopsApi, busApi, tripApi, usersApi, tripHistoryApi } from '../api'
import { useAuth } from '../context/AuthContext'
import { Button, Input, Card, Badge, EmptyState, Spinner, Toast } from '../components/ui'
import { useToast } from '../components/useToast'

export default function AdminPanel() {
  const { auth } = useAuth()
  const { toasts, toast, remove } = useToast()
  const [tab, setTab] = useState('dashboard')
  const [stats, setStats] = useState(null)

  useEffect(() => {
    async function loadStats() {
      try {
        const [stops, routes, trips, users] = await Promise.all([
          stopsApi.getAll(),
          routesApi.getAll(),
          tripApi.getAllActive(auth),
          usersApi.getAll(auth),
        ])
        const buses = await busApi.search('MH', auth).catch(() => [])
        setStats({
          stops: stops.length,
          routes: routes.length,
          buses: buses.length,
          activeTrips: Array.isArray(trips) ? trips.length : 0,
          drivers: users.filter(u => u.role?.toLowerCase() === 'driver').length,
          users: users.length,
        })
      } catch { }
    }
    loadStats()
  }, [auth])

  const TABS = [
    { id: 'dashboard',  label: 'Home' },
    { id: 'analytics',  label: 'Stats' },
    { id: 'trips', label: 'Live' },
    { id: 'drivers', label: 'Drivers' },
    { id: 'stops', label: 'Stops' },
    { id: 'routes', label: 'Routes' },
    { id: 'fleet', label: 'Fleet' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
      </div>
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`shrink-0 flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors
              ${tab === t.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'dashboard' && <Dashboard stats={stats} setTab={setTab} />}
      {tab === 'trips' && <LiveTrips auth={auth} toast={toast} />}
      {tab === 'drivers' && <DriversAdmin auth={auth} toast={toast} />}
      {tab === 'stops' && <StopsAdmin auth={auth} toast={toast} />}
      {tab === 'routes' && <RoutesAdmin auth={auth} toast={toast} />}
      {tab === 'fleet' && <FleetAdmin auth={auth} toast={toast} />}
      <Toast toasts={toasts} remove={remove} />
    </div>
  )
}

function Dashboard({ stats, setTab }) {
  const tiles = [
    { label: 'Routes', value: stats?.routes, color: 'bg-blue-50 text-blue-600', tab: 'routes' },
    { label: 'Stops', value: stats?.stops, color: 'bg-amber-50 text-amber-600', tab: 'stops' },
    { label: 'Buses', value: stats?.buses, color: 'bg-purple-50 text-purple-600', tab: 'fleet' },
    { label: 'Active Trips', value: stats?.activeTrips, color: 'bg-green-50 text-green-600', tab: 'trips' },
    { label: 'Drivers', value: stats?.drivers, color: 'bg-rose-50 text-rose-600', tab: 'drivers' },
    { label: 'Total Users', value: stats?.users, color: 'bg-gray-50 text-gray-600', tab: 'drivers' },
  ]
  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {tiles.map(t => (
          <button key={t.label} onClick={() => setTab(t.tab)}
            className={`${t.color} rounded-xl p-3 text-left hover:opacity-80 transition-opacity`}>
            <p className="text-2xl font-black mb-1">{stats ? (t.value ?? 0) : '...'}</p>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-70 leading-tight">{t.label}</p>
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {[
          { label: 'Live Trips', sub: 'See all active buses', tab: 'trips', color: 'text-green-600' },
          { label: 'Driver Accounts', sub: 'Manage drivers and roles', tab: 'drivers', color: 'text-rose-600' },
          { label: 'Manage Stops', sub: 'Add, edit or delete stops', tab: 'stops', color: 'text-amber-600' },
          { label: 'Manage Routes', sub: 'Create routes, assign stops', tab: 'routes', color: 'text-blue-600' },
          { label: 'Manage Fleet', sub: 'Register and search buses', tab: 'fleet', color: 'text-purple-600' },
        ].map(item => (
          <button key={item.tab + item.label} onClick={() => setTab(item.tab)}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 flex items-center justify-between hover:border-blue-300 hover:shadow-sm transition-all text-left">
            <div>
              <p className={`font-semibold text-sm ${item.color}`}>{item.label}</p>
              <p className="text-xs text-gray-400">{item.sub}</p>
            </div>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  )
}

function LiveTrips({ auth, toast }) {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    tripApi.getAllActive(auth)
      .then(d => setTrips(Array.isArray(d) ? d : []))
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-12"><Spinner size="md" /></div>
  if (trips.length === 0) return <EmptyState message="No active trips right now." />

  return (
    <div className="space-y-3">
      {trips.map(t => (
        <Card key={t.busTripId}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <p className="font-bold text-gray-900">Route {t.route?.routeName}</p>
            </div>
            <Badge color="green">Live</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Bus</p>
              <p className="text-gray-800 font-semibold">{t.bus?.numberPlate || 'ï¿½'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Driver</p>
              <p className="text-gray-800 font-semibold">{t.users?.fname || t.users?.emailId || 'ï¿½'}</p>
            </div>
          </div>
          {t.busLocation?.busLatitude
            ? <p className="text-xs text-green-600 font-medium">
              ?? {parseFloat(t.busLocation.busLatitude).toFixed(5)}, {parseFloat(t.busLocation.busLongitude).toFixed(5)}
            </p>
            : <p className="text-xs text-gray-400">No GPS yet</p>
          }
        </Card>
      ))}
    </div>
  )
}

function DriversAdmin({ auth, toast }) {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [changingRole, setChangingRole] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setUsers(await usersApi.getAll(auth)) } catch { }
    setLoading(false)
  }, [auth])

  useEffect(() => { load() }, [load])

  const filtered = users.filter(u => {
    const matchSearch =
      u.fname?.toLowerCase().includes(search.toLowerCase()) ||
      u.lname?.toLowerCase().includes(search.toLowerCase()) ||
      u.emailId?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || u.role?.toLowerCase() === filter
    return matchSearch && matchFilter
  })

  async function handleChangeRole(userId, newRole) {
    if (!userId) { toast('User ID not available. Ask your friend to add userId to UsersDto.', 'error'); return }
    try {
      await usersApi.changeRole(userId, newRole, auth)
      toast(`Role changed to ${newRole}!`)
      setChangingRole(null)
      load()
    } catch (err) { toast(err.message, 'error') }
  }

  async function handleDelete(userId, name) {
    if (!userId) { toast('User ID not available. Ask your friend to add userId to UsersDto.', 'error'); return }
    if (!confirm(`Delete account for ${name}?\n\nThis cannot be undone.`)) return
    try {
      await usersApi.deleteUser(userId, auth)
      toast('User deleted.')
      load()
    } catch (err) { toast(err.message, 'error') }
  }

  const roleColor = { admin: 'amber', driver: 'blue', user: 'gray', User: 'gray' }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{users.length} total accounts</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-3">
        {['all', 'driver', 'admin', 'user'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 py-1 text-xs font-medium rounded-md capitalize transition-colors
              ${filter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>
            {f}
          </button>
        ))}
      </div>

      <Input placeholder="Search by name or email..."
        value={search} onChange={e => setSearch(e.target.value)} className="mb-3" />

      {!users[0]?.userId && users.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-3 text-xs text-amber-700 font-medium">
          ?? userId missing from API response. Ask your friend to add userId to UsersDto to enable delete and role change.
        </div>
      )}

      {loading
        ? <div className="flex justify-center py-8"><Spinner size="md" /></div>
        : filtered.length === 0 ? <EmptyState message="No users found." />
          : <div className="space-y-2">
            {filtered.map(u => {
              const isExpanded = changingRole === u.emailId
              const hasId = !!u.userId
              return (
                <Card key={u.emailId} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-gray-600">
                          {u.fname?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{u.fname} {u.lname}</p>
                        <p className="text-xs text-gray-400">{u.emailId}</p>
                      </div>
                    </div>
                    <Badge color={roleColor[u.role] || 'gray'}>{u.role}</Badge>
                  </div>
                  <div className="flex gap-2 pt-1 border-t border-gray-100">
                    <button
                      onClick={() => navigate('/driver-profile/' + encodeURIComponent(u.emailId))}
                      className="flex-1 text-xs font-medium text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-lg py-1.5 transition-colors">
                      View Profile
                    </button>
                    <button
                      onClick={() => setChangingRole(isExpanded ? null : u.emailId)}
                      disabled={!hasId}
                      className="flex-1 text-xs font-medium text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg py-1.5 transition-colors"
                    >
                      Change Role
                    </button>
                    <button
                      onClick={() => handleDelete(u.userId, `${u.fname} ${u.lname}`)}
                      disabled={!hasId}
                      className="flex-1 text-xs font-medium text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg py-1.5 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                  {isExpanded && hasId && (
                    <div className="flex gap-2">
                      {['User', 'driver', 'admin'].map(role => (
                        <button key={role}
                          onClick={() => handleChangeRole(u.userId, role)}
                          className={`flex-1 text-xs font-semibold py-1.5 rounded-lg border transition-colors
                            ${u.role?.toLowerCase() === role.toLowerCase()
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'}`}>
                          {role}
                        </button>
                      ))}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
      }
    </div>
  )
}

function StopsAdmin({ auth, toast }) {
  const [stops, setStops] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ stopName: '', stopLatitude: '', stopLongitude: '' })
  const [editingStop, setEditingStop] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setStops(await stopsApi.getAll()) } catch { }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = stops.filter(s =>
    s.stopName.toLowerCase().includes(search.toLowerCase())
  )

  function setField(field) { return (e) => setForm(p => ({ ...p, [field]: e.target.value })) }

  async function handleAdd(e) {
    e.preventDefault(); setSaving(true)
    try {
      await stopsApi.create(form, auth)
      toast('Stop added!')
      setForm({ stopName: '', stopLatitude: '', stopLongitude: '' })
      setShowForm(false); load()
    } catch (err) { toast(err.message, 'error') }
    setSaving(false)
  }

  async function handleEdit(e) {
    e.preventDefault(); setSaving(true)
    try {
      await stopsApi.delete(editingStop.stopId, auth)
      await stopsApi.create({
        stopName: editingStop.stopName,
        stopLatitude: editingStop.stopLatitude,
        stopLongitude: editingStop.stopLongitude,
      }, auth)
      toast('Stop updated!')
      setEditingStop(null); load()
    } catch (err) { toast(err.message, 'error') }
    setSaving(false)
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete stop "${name}"?\n\nThis will fail if the stop is still assigned to a route. Remove it from all routes first.`)) return
    try { await stopsApi.delete(id, auth); toast('Stop deleted.'); load() }
    catch (err) { toast('Remove this stop from all routes first, then delete.', 'error') }
  }

  function useGPS(target) {
    if (!navigator.geolocation) return toast('GPS not available', 'error')
    navigator.geolocation.getCurrentPosition(pos => {
      if (target === 'edit') {
        setEditingStop(p => ({ ...p, stopLatitude: pos.coords.latitude, stopLongitude: pos.coords.longitude }))
      } else {
        setForm(p => ({ ...p, stopLatitude: pos.coords.latitude.toString(), stopLongitude: pos.coords.longitude.toString() }))
      }
    }, () => toast('Could not get GPS', 'error'), { enableHighAccuracy: true })
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{stops.length} stops total</p>
        <Button size="sm" onClick={() => { setShowForm(v => !v); setEditingStop(null) }}>
          {showForm ? 'Cancel' : '+ Add Stop'}
        </Button>
      </div>
      {showForm && (
        <Card className="mb-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">New Stop</p>
          <form onSubmit={handleAdd} className="space-y-3">
            <Input label="Stop Name" placeholder="e.g. Majas Depot"
              value={form.stopName} onChange={setField('stopName')} required />
            <div className="flex gap-3">
              <Input label="Latitude" placeholder="19.0760"
                value={form.stopLatitude} onChange={setField('stopLatitude')} required className="flex-1" />
              <Input label="Longitude" placeholder="72.8777"
                value={form.stopLongitude} onChange={setField('stopLongitude')} required className="flex-1" />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => useGPS('add')}>?? GPS</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Adding...' : 'Add Stop'}</Button>
            </div>
          </form>
        </Card>
      )}
      {editingStop && (
        <Card className="mb-4 border-blue-200">
          <p className="text-sm font-semibold text-blue-700 mb-3">Edit: {editingStop.stopName}</p>
          <form onSubmit={handleEdit} className="space-y-3">
            <div className="flex gap-3">
              <Input label="Latitude" value={editingStop.stopLatitude}
                onChange={e => setEditingStop(p => ({ ...p, stopLatitude: e.target.value }))}
                required className="flex-1" />
              <Input label="Longitude" value={editingStop.stopLongitude}
                onChange={e => setEditingStop(p => ({ ...p, stopLongitude: e.target.value }))}
                required className="flex-1" />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => useGPS('edit')}>?? GPS</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditingStop(null)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}
      <Input placeholder="Search stops..." value={search}
        onChange={e => setSearch(e.target.value)} className="mb-3" />
      {loading
        ? <div className="flex justify-center py-8"><Spinner size="md" /></div>
        : filtered.length === 0 ? <EmptyState message="No stops found." />
          : <div className="space-y-2">
            {filtered.map(stop => (
              <div key={stop.stopId} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{stop.stopName}</p>
                      <Badge color="gray">#{stop.stopId}</Badge>
                      {stop.routeStops?.length > 0 &&
                        <Badge color="blue">{stop.routeStops.length} routes</Badge>}
                    </div>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">
                      {stop.stopLatitude?.toFixed(5)}, {stop.stopLongitude?.toFixed(5)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm"
                      onClick={() => { setEditingStop({ ...stop }); setShowForm(false) }}
                      className="text-blue-500 hover:bg-blue-50">Edit</Button>
                    <Button variant="ghost" size="sm"
                      onClick={() => handleDelete(stop.stopId, stop.stopName)}
                      className="text-red-500 hover:bg-red-50">Del</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
      }
    </div>
  )
}

function RoutesAdmin({ auth, toast }) {
  const [routes, setRoutes] = useState([])
  const [stops, setStops] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddRoute, setShowAddRoute] = useState(false)
  const [newRouteName, setNewRouteName] = useState('')
  const [saving, setSaving] = useState(false)
  const [managingRoute, setManagingRoute] = useState(null)
  const [addStopId, setAddStopId] = useState('')
  const [addSeq, setAddSeq] = useState('')
  const [deleting, setDeleting] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r, s] = await Promise.all([routesApi.getAll(), stopsApi.getAll()])
      setRoutes(r); setStops(s)
    } catch { }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate(e) {
    e.preventDefault(); setSaving(true)
    try {
      await routesApi.create({ routeName: newRouteName }, auth)
      toast('Route created!'); setNewRouteName(''); setShowAddRoute(false); load()
    } catch (err) { toast(err.message, 'error') }
    setSaving(false)
  }

  // Auto-remove all stops then delete route
  async function handleDelete(route) {
    if (!confirm(`Delete Route ${route.routeName} and all its ${route.routeStops?.length || 0} stops?`)) return
    setDeleting(route.routeId)
    try {
      // Step 1: remove all routeStops
      const routeStops = route.routeStops || []
      for (const rs of routeStops) {
        await routeStopsApi.removeStopFromRoute(rs.routeStopId, auth)
      }
      // Step 2: delete the route
      await routesApi.delete(route.routeId, auth)
      toast('Route deleted!')
      load()
    } catch (err) {
      toast(err.message || 'Failed to delete route.', 'error')
    }
    setDeleting(null)
  }

  async function handleAddStop(e) {
    e.preventDefault(); setSaving(true)
    try {
      await routeStopsApi.addStopToRoute(managingRoute.routeId, addStopId, addSeq, auth)
      toast('Stop added!')
      setAddStopId(''); setAddSeq('')
      const updated = await routesApi.getById(managingRoute.routeId)
      setManagingRoute(updated); load()
    } catch (err) { toast(err.message, 'error') }
    setSaving(false)
  }

  async function handleRemoveStop(routeStopId) {
    if (!confirm('Remove this stop from route?')) return
    try {
      await routeStopsApi.removeStopFromRoute(routeStopId, auth)
      toast('Stop removed!')
      const updated = await routesApi.getById(managingRoute.routeId)
      setManagingRoute(updated); load()
    } catch (err) { toast(err.message, 'error') }
  }

  if (managingRoute) {
    const sortedStops = (managingRoute.routeStops || [])
      .slice().sort((a, b) => a.sequence - b.sequence)
    const assignedIds = sortedStops.map(rs => rs.busStop?.stopId)
    const available = stops.filter(s => !assignedIds.includes(s.stopId))

    return (
      <div>
        <button onClick={() => setManagingRoute(null)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          All routes
        </button>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Route {managingRoute.routeName}</h2>
        <p className="text-sm text-gray-500 mb-4">{sortedStops.length} stops</p>
        <Card className="mb-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Add stop</p>
          <form onSubmit={handleAddStop} className="space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Stop</label>
              <select value={addStopId} onChange={e => setAddStopId(e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Select stop...</option>
                {available.map(s => <option key={s.stopId} value={s.stopId}>{s.stopName}</option>)}
              </select>
            </div>
            <Input label="Sequence #" type="number" min="1"
              placeholder={`Next: ${sortedStops.length + 1}`}
              value={addSeq} onChange={e => setAddSeq(e.target.value)} required />
            <Button type="submit" disabled={saving}>{saving ? 'Adding...' : 'Add to Route'}</Button>
          </form>
        </Card>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Current stops</p>
        {sortedStops.length === 0
          ? <EmptyState message="No stops assigned yet." />
          : <div className="space-y-0">
            {sortedStops.map((rs, i) => (
              <div key={rs.routeStopId} className="flex items-stretch gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full border-2 mt-3.5 shrink-0
                      ${i === 0 ? 'border-blue-600 bg-blue-600' :
                      i === sortedStops.length - 1 ? 'border-gray-400 bg-gray-400' :
                        'border-blue-300 bg-white'}`} />
                  {i < sortedStops.length - 1 && <div className="w-0.5 bg-gray-200 flex-1 my-0.5" />}
                </div>
                <div className="pb-3 flex-1 flex items-start justify-between pt-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{rs.busStop?.stopName}</p>
                    <p className="text-xs text-gray-400">Sequence {rs.sequence}</p>
                  </div>
                  <Button variant="ghost" size="sm"
                    onClick={() => handleRemoveStop(rs.routeStopId)}
                    className="text-red-500 hover:bg-red-50 mt-0.5">
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        }
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => setShowAddRoute(v => !v)}>
          {showAddRoute ? 'Cancel' : '+ New Route'}
        </Button>
      </div>
      {showAddRoute && (
        <Card className="mb-4">
          <form onSubmit={handleCreate} className="flex gap-3">
            <Input placeholder="Route name ï¿½ e.g. 333" value={newRouteName}
              onChange={e => setNewRouteName(e.target.value)} required className="flex-1" />
            <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create'}</Button>
          </form>
        </Card>
      )}
      {loading
        ? <div className="flex justify-center py-8"><Spinner size="md" /></div>
        : routes.length === 0 ? <EmptyState message="No routes found." />
          : <div className="space-y-2">
            {routes.map(route => (
              <div key={route.routeId} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">Route {route.routeName}</p>
                    <Badge color="blue">{route.routeStops?.length || 0} stops</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="secondary" onClick={() => setManagingRoute(route)}>
                      Manage
                    </Button>
                    <Button size="sm" variant="ghost"
                      disabled={deleting === route.routeId}
                      onClick={() => handleDelete(route)}
                      className="text-red-500 hover:bg-red-50">
                      {deleting === route.routeId ? '...' : 'Del'}
                    </Button>
                  </div>
                </div>
                {route.routeStops?.length > 0 && (
                  <div className="px-4 py-2.5 flex flex-wrap items-center gap-1">
                    {route.routeStops.slice().sort((a, b) => a.sequence - b.sequence).map((rs, i, arr) => (
                      <span key={rs.routeStopId} className="flex items-center gap-1">
                        <span className="text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                          {rs.sequence}. {rs.busStop?.stopName}
                        </span>
                        {i < arr.length - 1 && <span className="text-gray-300 text-xs">?</span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
      }
    </div>
  )
}

function FleetAdmin({ auth, toast }) {
  const [buses, setBuses] = useState([])
  const [search, setSearch] = useState('MH')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [plate, setPlate] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadBuses(q) {
    setLoading(true)
    try { setBuses(await busApi.search(q || search, auth)) } catch { }
    setLoading(false)
  }

  useEffect(() => { loadBuses('MH') }, [])

  async function handleAdd(e) {
    e.preventDefault(); setSaving(true)
    try {
      await busApi.create({ numberPlate: plate }, auth)
      toast('Bus registered!'); setPlate(''); setShowForm(false); loadBuses(search)
    } catch (err) { toast(err.message, 'error') }
    setSaving(false)
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancel' : '+ Register Bus'}
        </Button>
      </div>
      {showForm && (
        <Card className="mb-4">
          <form onSubmit={handleAdd} className="flex gap-3">
            <Input placeholder="Number plate ï¿½ e.g. MH04LT0310" value={plate}
              onChange={e => setPlate(e.target.value)} required className="flex-1" />
            <Button type="submit" disabled={saving}>{saving ? 'Registering...' : 'Register'}</Button>
          </form>
        </Card>
      )}
      <form onSubmit={e => { e.preventDefault(); loadBuses(search) }} className="flex gap-3 mb-4">
        <Input placeholder="Search by plate prefix ï¿½ e.g. MH" value={search}
          onChange={e => setSearch(e.target.value)} className="flex-1" />
        <Button type="submit">Search</Button>
      </form>
      {loading
        ? <div className="flex justify-center py-8"><Spinner size="md" /></div>
        : buses.length === 0 ? <EmptyState message="No buses found." />
          : <div className="space-y-2">
            {buses.map(bus => (
              <div key={bus.busId} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78A3 3 0 0020 16V8c0-3.5-3.58-4-8-4s-8 .5-8 4v8zm3.5 1a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm9 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM6 9h12v4H6V9z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{bus.numberPlate}</p>
                    <p className="text-xs text-gray-400">Bus #{bus.busId}</p>
                  </div>
                </div>
                <Badge color={bus.busTrips?.some(t => t.active) ? 'green' : 'gray'}>
                  {bus.busTrips?.some(t => t.active) ? 'On duty' : 'Standby'}
                </Badge>
              </div>
            ))}
          </div>
      }
    </div>
  )
}




function TripHistory({ auth, toast, dark }) {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const json = await tripApi.getTripHistory(auth)
        setTrips(Array.isArray(json) ? json : [])
      } catch { toast('Could not load trip history', 'error') }
      setLoading(false)
    }
    load()
  }, [auth])

  const filtered = trips.filter(t => {
    const matchFilter = filter === 'all' ||
      t.users?.fname?.toLowerCase().includes(filter) ||
      t.users?.emailId?.toLowerCase().includes(filter)
    const matchSearch = !search ||
      t.route?.routeName?.toLowerCase().includes(search.toLowerCase()) ||
      t.bus?.numberPlate?.toLowerCase().includes(search.toLowerCase()) ||
      t.users?.fname?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const cardClass = `border rounded-xl p-4 ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`

  if (loading) return <div className="flex justify-center py-12"><Spinner size="md" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className={`text-sm ${dark ? 'text-slate-400' : 'text-gray-500'}`}>{trips.length} completed trips</p>
      </div>

      <input
        placeholder="Search by route, bus or driver..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className={`w-full px-3 py-2 border rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500
          ${dark ? 'bg-slate-900 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-gray-300 text-gray-900'}`}
      />

      {filtered.length === 0
        ? <EmptyState message="No completed trips found." type="trips" />
        : <div className="space-y-3">
            {filtered.map(t => (
              <div key={t.busTripId} className={cardClass}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <p className={`font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>Route {t.route?.routeName}</p>
                    <Badge color="gray">#{t.busTripId}</Badge>
                  </div>
                  <Badge color="gray">Completed</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className={`rounded-lg p-2 ${dark ? 'bg-slate-900' : 'bg-gray-50'}`}>
                    <p className={`uppercase tracking-wide font-semibold mb-0.5 ${dark ? 'text-slate-500' : 'text-gray-400'}`}>Bus</p>
                    <p className={`font-semibold ${dark ? 'text-white' : 'text-gray-800'}`}>{t.bus?.numberPlate || ''}</p>
                  </div>
                  <div className={`rounded-lg p-2 ${dark ? 'bg-slate-900' : 'bg-gray-50'}`}>
                    <p className={`uppercase tracking-wide font-semibold mb-0.5 ${dark ? 'text-slate-500' : 'text-gray-400'}`}>Driver</p>
                    <p className={`font-semibold ${dark ? 'text-white' : 'text-gray-800'}`}>{t.users?.fname || t.users?.emailId || ''}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
      }
    </div>
  )
}

function Analytics({ auth, dark }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [stops, routes, trips, users] = await Promise.all([
          stopsApi.getAll(),
          routesApi.getAll(),
          tripApi.getAllActive(auth),
          usersApi.getAll(auth),
        ])
        const buses = await busApi.search('MH', auth).catch(() => [])

        // Route popularity  stops per route
        const routesByStops = [...routes].sort((a, b) => (b.routeStops?.length || 0) - (a.routeStops?.length || 0))

        // Stop coverage  how many routes per stop
        const stopCoverage = stops.map(s => ({
          name: s.stopName,
          routes: s.routeStops?.length || 0
        })).sort((a, b) => b.routes - a.routes).slice(0, 5)

        // Driver stats
        const drivers = users.filter(u => u.role?.toLowerCase() === 'driver')
        const activeTripsArr = Array.isArray(trips) ? trips : []

        setData({
          totalRoutes: routes.length,
          totalStops: stops.length,
          totalBuses: buses.length,
          totalDrivers: drivers.length,
          activeTrips: activeTripsArr.length,
          routesByStops: routesByStops.slice(0, 5),
          stopCoverage,
          busUtilization: buses.length > 0 ? Math.round((activeTripsArr.length / buses.length) * 100) : 0,
        })
      } catch {}
      setLoading(false)
    }
    load()
  }, [auth])

  const cardClass = `border rounded-xl p-4 ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`
  const labelClass = `text-xs font-semibold uppercase tracking-wide mb-3 ${dark ? 'text-slate-400' : 'text-gray-500'}`

  if (loading) return <div className="flex justify-center py-12"><Spinner size="md" /></div>
  if (!data) return <EmptyState message="Could not load analytics." />

  return (
    <div className="space-y-5">
      {/* Overview stats */}
      <div>
        <p className={labelClass}>Overview</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Routes',   value: data.totalRoutes,  color: 'text-blue-600',   bg: dark ? 'bg-blue-900/20' : 'bg-blue-50' },
            { label: 'Stops',    value: data.totalStops,   color: 'text-amber-600',  bg: dark ? 'bg-amber-900/20' : 'bg-amber-50' },
            { label: 'Buses',    value: data.totalBuses,   color: 'text-purple-600', bg: dark ? 'bg-purple-900/20' : 'bg-purple-50' },
            { label: 'Drivers',  value: data.totalDrivers, color: 'text-rose-600',   bg: dark ? 'bg-rose-900/20' : 'bg-rose-50' },
            { label: 'Active',   value: data.activeTrips,  color: 'text-green-600',  bg: dark ? 'bg-green-900/20' : 'bg-green-50' },
            { label: 'Bus Use%', value: `${data.busUtilization}%`, color: 'text-indigo-600', bg: dark ? 'bg-indigo-900/20' : 'bg-indigo-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className={`text-xs font-semibold uppercase tracking-wide mt-0.5 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bus utilization bar */}
      <div className={cardClass}>
        <p className={labelClass}>Fleet Utilization</p>
        <div className="flex items-center gap-3">
          <div className={`flex-1 h-3 rounded-full overflow-hidden ${dark ? 'bg-slate-700' : 'bg-gray-100'}`}>
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-700"
              style={{ width: `${data.busUtilization}%` }}
            />
          </div>
          <span className={`text-sm font-bold w-10 text-right ${dark ? 'text-white' : 'text-gray-900'}`}>
            {data.busUtilization}%
          </span>
        </div>
        <p className={`text-xs mt-2 ${dark ? 'text-slate-400' : 'text-gray-400'}`}>
          {data.activeTrips} of {data.totalBuses} buses currently on duty
        </p>
      </div>

      {/* Top routes by stops */}
      <div className={cardClass}>
        <p className={labelClass}>Routes by Stop Count</p>
        <div className="space-y-2.5">
          {data.routesByStops.map((route, i) => {
            const maxStops = data.routesByStops[0]?.routeStops?.length || 1
            const stops = route.routeStops?.length || 0
            const pct = Math.round((stops / maxStops) * 100)
            return (
              <div key={route.routeId}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${dark ? 'text-white' : 'text-gray-800'}`}>
                    Route {route.routeName}
                  </span>
                  <span className={`text-xs font-semibold ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {stops} stops
                  </span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${dark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      background: `hsl(${220 - i * 20}, 80%, ${dark ? '55%' : '50%'})`
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Most connected stops */}
      <div className={cardClass}>
        <p className={labelClass}>Most Connected Stops</p>
        <div className="space-y-2">
          {data.stopCoverage.map((stop, i) => (
            <div key={stop.name} className="flex items-center gap-3">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black shrink-0
                ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-400 text-white' : i === 2 ? 'bg-orange-400 text-white' : dark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
                {i + 1}
              </span>
              <span className={`flex-1 text-sm font-medium truncate ${dark ? 'text-white' : 'text-gray-800'}`}>
                {stop.name}
              </span>
              <span className={`text-xs font-semibold ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
                {stop.routes} route{stop.routes !== 1 ? 's' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* System health */}
      <div className={cardClass}>
        <p className={labelClass}>System Health</p>
        <div className="space-y-2">
          {[
            { label: 'Backend API',    status: 'online',  color: 'bg-green-500' },
            { label: 'GPS Tracking',   status: data.activeTrips > 0 ? 'active' : 'idle', color: data.activeTrips > 0 ? 'bg-green-500' : 'bg-amber-400' },
            { label: 'Live Updates',   status: 'running', color: 'bg-green-500' },
            { label: 'Map Service',    status: 'online',  color: 'bg-green-500' },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <span className={`text-sm ${dark ? 'text-slate-300' : 'text-gray-700'}`}>{item.label}</span>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${item.color} ${item.color === 'bg-green-500' ? 'animate-pulse' : ''}`} />
                <span className={`text-xs font-medium capitalize ${dark ? 'text-slate-400' : 'text-gray-500'}`}>{item.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

