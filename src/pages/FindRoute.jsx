import { useState } from 'react'
import { routeStopsApi } from '../api'
import { Button, Input, Card, Badge, PageHeader, EmptyState, Spinner } from '../components/ui'

export default function FindRoute() {
  const [form, setForm] = useState({ source: '', destination: '' })
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSearch(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    setSearched(false)
    try {
      const data = await routeStopsApi.findBySourceAndDest(form.source, form.destination)
      setResults(Array.isArray(data) ? data : [data])
      setSearched(true)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div>
      <PageHeader
        title="Find Route"
        subtitle="Search for bus routes between two stops"
      />

      <Card className="mb-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="From — e.g. Takshila"
            value={form.source}
            onChange={set('source')}
            required
            className="flex-1"
          />
          <div className="flex items-center justify-center text-gray-400 text-sm font-medium">→</div>
          <Input
            placeholder="To — e.g. Majas Depot"
            value={form.destination}
            onChange={set('destination')}
            required
            className="flex-1"
          />
          <Button type="submit" disabled={loading} className="sm:self-end">
            {loading ? <Spinner /> : 'Search'}
          </Button>
        </form>
      </Card>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          {error}
        </p>
      )}

      {searched && (
        results.length === 0
          ? <EmptyState message="No direct routes found between these stops." />
          : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">{results.length} route{results.length !== 1 ? 's' : ''} found</p>
              {results.map((route) => (
                <RouteCard
                  key={route.routeId}
                  route={route}
                  source={form.source}
                  destination={form.destination}
                />
              ))}
            </div>
          )
      )}
    </div>
  )
}

function RouteCard({ route, source, destination }) {
  const stops = route.routeStops?.slice().sort((a, b) => a.sequence - b.sequence) || []

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78A3 3 0 0020 16V8c0-3.5-3.58-4-8-4s-8 .5-8 4v8zm3.5 1a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm9 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM6 9h12v4H6V9z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Route {route.routeName}</p>
            <p className="text-xs text-gray-400">{stops.length} stops</p>
          </div>
        </div>
        <Badge color="green">Direct</Badge>
      </div>

      {/* Stop sequence */}
      <div className="flex items-center gap-0 flex-wrap">
        {stops.map((rs, i) => {
          const name = rs.busStop?.stopName || rs.stopName
          const isSource = name?.toLowerCase() === source.toLowerCase()
          const isDest = name?.toLowerCase() === destination.toLowerCase()
          return (
            <div key={rs.routeStopId} className="flex items-center gap-0">
              <span
                className={`text-xs px-2.5 py-1 rounded-full border font-medium
                  ${isSource ? 'bg-blue-600 text-white border-blue-600' :
                    isDest ? 'bg-green-600 text-white border-green-600' :
                      'bg-gray-50 text-gray-600 border-gray-200'}`}
              >
                {name}
              </span>
              {i < stops.length - 1 && (
                <span className="text-gray-300 mx-1 text-xs">—</span>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
