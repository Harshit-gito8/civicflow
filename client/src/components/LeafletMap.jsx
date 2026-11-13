import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin,
  Layers,
  Crosshair,
  ShieldAlert,
  Sparkles,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Zap
} from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

// 100% Free, NO-WATERMARK, NO-API-KEY Tile Providers
const TILE_PROVIDERS = {
  dark: {
    name: 'Municipal Dark Canvas',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom: 16,
  },
  osm: {
    name: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  streets: {
    name: 'ESRI World Streets',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Sources: Esri, DeLorme, NAVTEQ, USGS',
    maxZoom: 18,
  },
  satellite: {
    name: 'Satellite Aerial',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS',
    maxZoom: 18,
  },
  ...(MAPBOX_TOKEN ? {
    mapbox: {
      name: 'Mapbox HD',
      url: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`,
      attribution: '&copy; Mapbox',
      maxZoom: 22,
    }
  } : {})
};

// Create clean institutional category markers
const createCategoryIcon = (category, severity, status, isSelected = false) => {
  let color = '#3B82F6'; // Blue default
  let glyph = '•';

  if (status === 'RESOLVED') {
    color = '#10B981'; // Resolved Green
    glyph = '✓';
  } else if (severity === 'CRITICAL') {
    color = '#EF4444'; // Crimson
    glyph = '!';
  } else if (severity === 'HIGH') {
    color = '#F97316'; // Orange / Amber
    glyph = '▲';
  } else if (category === 'WATER_LEAK') {
    color = '#06B6D4'; // Cyan
    glyph = '💧';
  } else if (category === 'STREETLIGHT') {
    color = '#EAB308'; // Yellow
    glyph = '💡';
  } else if (category === 'POTHOLE') {
    color = '#EF4444'; // Red
    glyph = '▼';
  }

  const pulseEffect = isSelected ? 'ring-4 ring-blue-400 ring-offset-2 ring-offset-slate-900 animate-pulse' : '';

  const html = `
    <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
      <div class="${pulseEffect}" style="
        background-color: ${color};
        width: 26px;
        height: 26px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #ffffff;
        box-shadow: 0 4px 12px rgba(0,0,0,0.6);
      ">
        <div style="
          transform: rotate(45deg);
          font-size: 11px;
          line-height: 1;
          color: #ffffff;
          font-weight: 800;
          font-family: 'JetBrains Mono', monospace;
        ">${glyph}</div>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-marker',
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  });
};

function LocationPickerHandler({ onSelectLocation }) {
  useMapEvents({
    click(e) {
      if (onSelectLocation) {
        onSelectLocation([e.latlng.lng, e.latlng.lat]);
      }
    },
  });
  return null;
}

// Invalidate size immediately so the map fills 100% of the container
function MapResizeHandler() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map]);
  return null;
}

// MapCameraController smoothly pans and zooms the map when focusedCoords change
function MapCameraController({ focusedCoords }) {
  const map = useMap();
  useEffect(() => {
    if (focusedCoords && Array.isArray(focusedCoords) && focusedCoords.length >= 2) {
      const lat = focusedCoords[1];
      const lng = focusedCoords[0];
      if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
        map.flyTo([lat, lng], 16, { duration: 1.2 });
      }
    }
  }, [focusedCoords, map]);
  return null;
}

export default function LeafletMap({
  incidents = [],
  selectedLocation = null,
  onSelectLocation = null,
  focusedCoords = null,
  onInspectIncident = null,
  center = [30.7046, 76.7179], // Mohali / Chandigarh
  zoom = 13,
  height = '100%',
  onUpvote = null,
  selectedIncidentId = null,
  onSelectIncident = null,
  defaultTileMode = 'dark',
}) {
  const [tileMode, setTileMode] = useState(defaultTileMode);

  const activeProvider = TILE_PROVIDERS[tileMode] || TILE_PROVIDERS.dark;

  return (
    <div style={{ height }} className="w-full h-full relative rounded-xl overflow-hidden border border-[#243247] shadow-2xl bg-[#080D17]">
      
      {/* Top Map Controls Overlay (Palantir Geospatial Command Bar) */}
      <div className="absolute top-3 left-3 z-[400] flex items-center gap-2 flex-wrap pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0C1321]/90 backdrop-blur-md border border-[#243247] text-xs shadow-lg">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
          </span>
          <span className="text-[11px] font-bold text-white font-mono">
            {incidents.length} DOCKETS
          </span>
          <span className="text-[10px] text-[#22D3EE] font-mono">(50m Clustered)</span>
        </div>

        {/* Tile Layer Switcher */}
        <div className="flex items-center rounded-lg bg-[#0C1321]/90 backdrop-blur-md border border-[#243247] p-0.5 shadow-lg">
          <button
            type="button"
            onClick={() => setTileMode('dark')}
            className={`px-2 py-1 text-[10px] font-mono font-bold rounded transition-colors ${
              tileMode === 'dark'
                ? 'bg-[#3B82F6] text-white shadow-sm'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Dark Canvas
          </button>
          <button
            type="button"
            onClick={() => setTileMode('streets')}
            className={`px-2 py-1 text-[10px] font-mono font-bold rounded transition-colors ${
              tileMode === 'streets'
                ? 'bg-[#3B82F6] text-white shadow-sm'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Streets
          </button>
          <button
            type="button"
            onClick={() => setTileMode('osm')}
            className={`px-2 py-1 text-[10px] font-mono font-bold rounded transition-colors ${
              tileMode === 'osm'
                ? 'bg-[#3B82F6] text-white shadow-sm'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            OSM
          </button>
          <button
            type="button"
            onClick={() => setTileMode('satellite')}
            className={`px-2 py-1 text-[10px] font-mono font-bold rounded transition-colors ${
              tileMode === 'satellite'
                ? 'bg-[#3B82F6] text-white shadow-sm'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Satellite
          </button>
        </div>
      </div>

      {onSelectLocation && (
        <div className="absolute top-3 right-3 z-[400] px-3 py-1.5 rounded-lg bg-[#F59E0B]/10 backdrop-blur-md border border-[#F59E0B]/30 text-[11px] font-bold text-[#F59E0B] shadow-lg flex items-center gap-1.5 font-mono">
          <Crosshair className="w-3.5 h-3.5 text-[#F59E0B]" />
          <span>CLICK MAP TO PIN GPS COORDS</span>
        </div>
      )}

      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', background: '#080D17' }}
      >
        <MapResizeHandler />
        <MapCameraController focusedCoords={focusedCoords} />

        <TileLayer
          key={tileMode}
          attribution={activeProvider.attribution}
          url={activeProvider.url}
          maxZoom={activeProvider.maxZoom || 19}
        />

        {onSelectLocation && <LocationPickerHandler onSelectLocation={onSelectLocation} />}

        {/* Selected target pin for reporting */}
        {selectedLocation && (
          <>
            <Marker
              position={[selectedLocation[1], selectedLocation[0]]}
              icon={createCategoryIcon('PICKER', 'CRITICAL', 'NEW')}
            >
              <Popup>
                <div className="p-2 text-xs space-y-1">
                  <p className="text-[#3B82F6] font-bold font-mono uppercase tracking-wider">Target Defect Coordinates</p>
                  <p className="text-[11px] text-[#94A3B8] font-mono">
                    [{selectedLocation[0].toFixed(5)}, {selectedLocation[1].toFixed(5)}]
                  </p>
                  <p className="text-[10px] text-[#F59E0B] font-mono">
                    50m Spatial Deduplication Window Active
                  </p>
                </div>
              </Popup>
            </Marker>
            <Circle
              center={[selectedLocation[1], selectedLocation[0]]}
              radius={50}
              pathOptions={{
                color: '#3B82F6',
                fillColor: '#3B82F6',
                fillOpacity: 0.2,
                dashArray: '4',
                weight: 1.5,
              }}
            />
          </>
        )}

        {/* Render Incidents */}
        {incidents.map((incident) => {
          if (!incident.location || !incident.location.coordinates) return null;
          const [lng, lat] = incident.location.coordinates;
          const isSelected = selectedIncidentId === incident._id;

          return (
            <React.Fragment key={incident._id}>
              <Marker
                position={[lat, lng]}
                icon={createCategoryIcon(incident.category, incident.severityLevel, incident.status, isSelected)}
                eventHandlers={{
                  click: () => {
                    if (onSelectIncident) onSelectIncident(incident);
                  }
                }}
              >
                <Popup>
                  <div className="w-72 p-1 text-[#F1F5F9]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#162235] text-[#22D3EE] border border-[#243247]">
                        {(incident.category || '').replace('_', ' ')}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                          incident.severityLevel === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : incident.severityLevel === 'HIGH'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}
                      >
                        {incident.severityLevel || 'NORMAL'}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold leading-tight mb-1 text-white">
                      {incident.title}
                    </h4>

                    <p className="text-[11px] text-[#94A3B8] line-clamp-2 mb-2 leading-relaxed">
                      {incident.description}
                    </p>

                    <div className="text-[10px] font-mono space-y-1 mb-2.5 bg-[#0C1321] p-2 rounded-lg border border-[#243247]">
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">LOCATION:</span>
                        <span className="text-[#F1F5F9] font-medium truncate max-w-[150px]">{incident.address || `Ward ${incident.wardNumber}`}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">PRIORITY SCORE:</span>
                        <span className="text-[#3B82F6] font-bold">{incident.calculatedPriorityScore || 0} / 100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">REPORTS / UPVOTES:</span>
                        <span className="text-[#F59E0B] font-bold">+{incident.reportCount || 1} Citizen Endorsements</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">STATUS:</span>
                        <span className="text-[#10B981] font-bold">{(incident.status || '').replace('_', ' ')}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {onInspectIncident && (
                        <button
                          type="button"
                          onClick={() => onInspectIncident(incident)}
                          className="w-full py-1.5 px-3 rounded-lg bg-[#162235] hover:bg-[#1f2d47] text-white font-semibold text-xs border border-[#243247] flex items-center justify-center gap-1.5 transition-colors font-mono"
                        >
                          <span>DISPATCH / INSPECT DOCKET</span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-[#3B82F6]" />
                        </button>
                      )}

                      {onUpvote && incident.status !== 'RESOLVED' && (
                        <button
                          type="button"
                          onClick={() => onUpvote(incident._id)}
                          className="w-full py-1.5 px-3 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors font-mono"
                        >
                          <span>UPVOTE COMMUNITY PRIORITY</span>
                          <span className="text-[10px] bg-blue-800 px-1.5 rounded text-white font-extrabold">
                            +{incident.reportCount}
                          </span>
                        </button>
                      )}
                    </div>

                  </div>
                </Popup>
              </Marker>

              {/* Show 50m cluster radius around master tickets */}
              {incident.isMasterTicket && (
                <Circle
                  center={[lat, lng]}
                  radius={50}
                  pathOptions={{
                    color: incident.severityLevel === 'CRITICAL' ? '#EF4444' : '#3B82F6',
                    fillColor: incident.severityLevel === 'CRITICAL' ? '#EF4444' : '#3B82F6',
                    fillOpacity: 0.12,
                    weight: 1.5,
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
