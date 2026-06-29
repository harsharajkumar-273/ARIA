import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icons using CDN resources
const DefaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom icons based on roles / nodes
const helperIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const resourceIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const crewIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

interface MapProps {
  requests: any[];
  resources: any[];
  crews: any[];
  circuits: any[];
  predictions: any[];
  showCrewIQ: boolean;
  showMLHeatmap: boolean;
}

export function LiveMap({
  requests = [],
  resources = [],
  crews = [],
  circuits = [],
  predictions = [],
  showCrewIQ = false,
  showMLHeatmap = false
}: MapProps) {
  // Center coordinates for Nashville
  const center: [number, number] = [36.1627, -86.7816];

  // Helper function to color code urgency markers
  const getUrgencyColor = (urgency: number) => {
    if (urgency >= 5) return '#EF4444'; // Red
    if (urgency >= 4) return '#F59E0B'; // Orange
    if (urgency >= 3) return '#10B981'; // Green
    return '#3B82F6'; // Blue
  };

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-white/5 shadow-2xl relative">
      {/* Legend overlay */}
      <div className="absolute top-4 right-4 z-[1000] glass-panel p-4 rounded-xl flex flex-col gap-2 text-xs select-none">
        <div className="font-bold text-white mb-1">MAP LEGEND</div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
          <span>Emergency Request (Urgency 5)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
          <span>Urgent Request (Urgency 4)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 inline-block bg-[url('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png')] bg-contain bg-no-repeat"></span>
          <span>Resource Node (Shelter/Clinic)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 inline-block bg-[url('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png')] bg-contain bg-no-repeat"></span>
          <span>Aid Helper / Organization</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 inline-block bg-[url('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png')] bg-contain bg-no-repeat"></span>
          <span>Responder Crew Unit</span>
        </div>
        {showMLHeatmap && (
          <div className="flex items-center gap-2 border-t border-white/10 pt-2 mt-1">
            <span className="w-3 h-3 rounded-full bg-purple-500/30 border border-purple-500 inline-block"></span>
            <span className="text-purple-300 font-semibold">ML Outage Hazard Zone</span>
          </div>
        )}
      </div>

      <MapContainer center={center} zoom={13} zoomControl={true} scrollWheelZoom={true}>
        {/* CartoDB Dark Matter tile layer for slick modern aesthetics */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Requests Markers */}
        {requests.map((req) => (
          <CircleMarker
            key={req.id}
            center={[req.latitude, req.longitude]}
            radius={req.urgency >= 5 ? 12 : 8}
            pathOptions={{
              fillColor: getUrgencyColor(req.urgency),
              color: '#FFFFFF',
              weight: 1.5,
              fillOpacity: 0.85
            }}
          >
            <Popup>
              <div className="text-gray-900 font-sans">
                <div className="font-bold border-b border-gray-200 pb-1 mb-1">
                  🚨 Need: {req.primary_need?.toUpperCase()} (Urgency {req.urgency}/5)
                </div>
                <div className="text-xs font-semibold text-red-600 mb-1">
                  {req.medical_priority ? '⚠️ MEDICAL PRIORITY' : ''}
                </div>
                <div className="text-xs text-gray-700 font-medium mb-1">"{req.raw_message}"</div>
                <div className="text-[10px] text-gray-400">Channel: {req.source_channel}</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Resource Nodes Markers */}
        {resources.map((res) => (
          <Marker key={res.id} position={[res.latitude, res.longitude]} icon={res.type === 'shelter' ? resourceIcon : helperIcon}>
            <Popup>
              <div className="text-gray-900 font-sans">
                <div className="font-bold border-b border-gray-200 pb-1 mb-1">🏥 {res.name}</div>
                <div className="text-xs text-gray-600 mb-1">Type: {res.type} | Address: {res.address}</div>
                <div className="text-[10px] grid grid-cols-2 gap-1 text-gray-500">
                  <div>Power: {res.has_power ? '✅ Yes' : '❌ No'}</div>
                  <div>Food: {res.has_food ? '✅ Yes' : '❌ No'}</div>
                  <div>Heat: {res.has_heat ? '✅ Yes' : '❌ No'}</div>
                  <div>Water: {res.has_water ? '✅ Yes' : '❌ No'}</div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Crew Units Markers */}
        {crews.map((crew) => (
          <Marker key={crew.id} position={[crew.latitude, crew.longitude]} icon={crewIcon}>
            <Popup>
              <div className="text-gray-900 font-sans">
                <div className="font-bold border-b border-gray-200 pb-1 mb-1">👷 {crew.name}</div>
                <div className="text-xs text-gray-600">Type: {crew.type} | Status: <span className="font-semibold text-blue-600">{crew.status}</span></div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* CrewIQ Circuit Overlays */}
        {showCrewIQ && circuits.map((c) => (
          <Polyline
            key={c.id}
            positions={c.path}
            pathOptions={{
              color: c.is_outage ? '#EF4444' : '#10B981',
              weight: 4,
              opacity: 0.8,
              dashArray: c.is_outage ? '5, 10' : undefined
            }}
          >
            <Popup>
              <div className="text-gray-900 font-sans">
                <div className="font-bold border-b border-gray-200 pb-1 mb-1">🔌 Circuit: {c.circuit_name}</div>
                <div className="text-xs">Outage: {c.is_outage ? '🔴 Active Outage' : '🟢 Fully Powered'}</div>
                <div className="text-xs">Priority Score: {(c.priority_score * 100).toFixed(1)}%</div>
              </div>
            </Popup>
          </Polyline>
        ))}

        {/* ML Heatmap Prediction Circles */}
        {showMLHeatmap && predictions.map((p, idx) => (
          <CircleMarker
            key={idx}
            center={[p.latitude, p.longitude]}
            radius={25}
            pathOptions={{
              fillColor: '#8B5CF6', // Purple
              color: '#8B5CF6',
              weight: 1,
              fillOpacity: p.probability * 0.4
            }}
          >
            <Popup>
              <div className="text-gray-900 font-sans">
                <div className="font-bold border-b border-gray-200 pb-1 mb-1">🔮 ML Outage Forecast</div>
                <div className="text-xs">Circuit: {p.circuit_name}</div>
                <div className="text-xs font-semibold text-purple-600">Failure Prob: {(p.probability * 100).toFixed(1)}%</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
