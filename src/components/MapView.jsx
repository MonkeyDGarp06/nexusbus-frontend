import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icons broken by webpack/vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const busIcon = L.divIcon({
  className: '',
  html: `<div style="
    background:#2563eb;
    color:white;
    border-radius:50%;
    width:32px;
    height:32px;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:16px;
    border:2px solid white;
    box-shadow:0 2px 6px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

const stopIcon = L.divIcon({
  className: '',
  html: `<div style="
    background:#f59e0b;
    border-radius:50%;
    width:14px;
    height:14px;
    border:2px solid white;
    box-shadow:0 1px 4px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

function FitBounds({ positions }) {
  const map = useMap()
  useEffect(() => {
    if (positions && positions.length > 0) {
      map.fitBounds(positions, { padding: [40, 40] })
    }
  }, [positions, map])
  return null
}

export default function MapView({ stops = [], buses = [], height = '300px' }) {
  const validStops = stops.filter(s => s.lat != null && s.lng != null)
  const validBuses = buses.filter(b => b.lat != null && b.lng != null)

  const allPositions = [
    ...validStops.map(s => [s.lat, s.lng]),
    ...validBuses.map(b => [b.lat, b.lng]),
  ]

  const polylinePositions = validStops.map(s => [s.lat, s.lng])

  const defaultCenter = allPositions.length > 0
    ? allPositions[0]
    : [19.076, 72.8777] // Mumbai default

  return (
    <div style={{ height }} className="rounded-xl overflow-hidden border border-gray-200">
      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {allPositions.length > 1 && <FitBounds positions={allPositions} />}

        {/* Route polyline */}
        {polylinePositions.length > 1 && (
          <Polyline positions={polylinePositions} color="#2563eb" weight={3} opacity={0.7} />
        )}

        {/* Stop markers */}
        {validStops.map((stop, i) => (
          <Marker key={i} position={[stop.lat, stop.lng]} icon={stopIcon}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{stop.name}</p>
                {stop.sequence && <p className="text-gray-500">Stop #{stop.sequence}</p>}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Bus markers */}
        {validBuses.map((bus, i) => (
          <Marker key={i} position={[bus.lat, bus.lng]} icon={busIcon}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{bus.numberPlate}</p>
                <p className="text-gray-500">Route {bus.routeName}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
