const BASE_URL = 'https://bustracker-n2lh.onrender.com'

function makeAuthHeader(email, password) {
  return 'Basic ' + btoa(`${email}:${password}`)
}

async function request(path, options = {}, auth = null) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) headers['Authorization'] = makeAuthHeader(auth.email, auth.password)
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  if (res.status === 204) return null
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = text }
  if (!res.ok) {
    const msg = typeof data === 'string' ? data : (data?.message || `Error ${res.status}`)
    throw new Error(msg)
  }
  return data
}

export const authApi = {
  register: (body) =>
    request('/register', { method: 'POST', body: JSON.stringify(body) }),
  me: (auth) =>
    request('/me', {}, auth),
}

export const stopsApi = {
  getAll: () =>
    request('/stop'),
  getById: (id) =>
    request(`/stop/${id}`),
  search: (stopName) =>
    request(`/search/stop?stopName=${encodeURIComponent(stopName)}`),
  getRoutesByStopName: (stopName) =>
    request(`/StopName/${encodeURIComponent(stopName)}`),
  create: (body, auth) =>
    request('/admin/stop', { method: 'POST', body: JSON.stringify(body) }, auth),
  delete: (id, auth) =>
    request(`/admin/stops/${id}`, { method: 'DELETE' }, auth),
}

export const routesApi = {
  getAll: () =>
    request('/routes'),
  getById: (id) =>
    request(`/route/${id}`),
  getStopsByRouteName: (routeName) =>
    request(`/routeName/${encodeURIComponent(routeName)}`),
  search: (routeName) =>
    request(`/search/route?routeName=${encodeURIComponent(routeName)}`),
  create: (body, auth) =>
    request('/admin/route', { method: 'POST', body: JSON.stringify(body) }, auth),
  update: (id, body, auth) =>
    request(`/admin/route/${id}`, { method: 'PUT', body: JSON.stringify(body) }, auth),
  delete: (id, auth) =>
    request(`/admin/route/${id}`, { method: 'DELETE' }, auth),
}

export const routeStopsApi = {
  getAll: () =>
    request('/route/stop'),
  addStopToRoute: (routeId, stopId, sequence, auth) =>
    request(`/admin/route/${routeId}/addStop/${stopId}/${sequence}`, { method: 'POST' }, auth),
  removeStopFromRoute: (routeStopId, auth) =>
    request(`/admin/routeStop/${routeStopId}`, { method: 'DELETE' }, auth),
  findBySourceAndDest: (source, destination) =>
    request(`/route/destination?source=${encodeURIComponent(source)}&destination=${encodeURIComponent(destination)}`),
}

export const busApi = {
  search: (query, auth) =>
    request(`/bus?bus=${encodeURIComponent(query || 'MH')}`, {}, auth),
  create: (body, auth) =>
    request('/admin/bus', { method: 'POST', body: JSON.stringify(body) }, auth),
}

export const tripApi = {
  getByRoute: (routeName) =>
    request(`/busTrip?routeName=${encodeURIComponent(routeName)}`),
  getAllActive: (auth) =>
    request('/admin/getAllBusTrips', {}, auth),
  start: (body, auth) =>
    request('/driver/busTrip', { method: 'POST', body: JSON.stringify(body) }, auth),
  getMyTrip: (auth) =>
    request('/driver/myBusTrip', {}, auth),
  end: (auth) =>
    request('/driver/endBusTrip', { method: 'PUT' }, auth),

  getAll: (auth) =>
    request('/admin/tripHistory', {}, auth),
}

export const usersApi = {
  getAll: (auth) =>
    request('/admin/users', {}, auth),
  changeRole: (userId, role, auth) =>
    request(`/admin/users/${userId}/role?role=${encodeURIComponent(role)}`, { method: 'PUT' }, auth),
  deleteUser: (userId, auth) =>
    request(`/admin/users/${userId}`, { method: 'DELETE' }, auth),
}
