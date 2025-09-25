
// FIX: Added missing import for L.divIcon
import React from 'react';
import L from 'leaflet';

export interface MapMarkerData {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description?: string;
  radius?: number;
  isUserLocation?: boolean;
  popupContent?: React.ReactNode;
  status?: 'Planning' | 'Active' | 'Completed' | 'On Hold';
}

interface Marker extends MapMarkerData { }

interface MapViewProps {
  markers: Marker[];
  height?: string;
  className?: string;
}

// Custom SVG Icon for project markers
const createProjectIcon = (status: MapMarkerData['status']) => {
  let className = '';
  switch (status) {
    case 'Active': className = 'marker-active'; break;
    case 'On Hold': className = 'marker-on-hold'; break;
    case 'Completed': className = 'marker-completed'; break;
    default: className = 'marker-planning'; break;
  }
  return L.divIcon({
    html: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="${className}"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`,
    className: 'custom-marker-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const userLocationIcon = L.divIcon({
  html: `<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-md"></div>`,
  className: '',
  iconSize: [16, 16],
});

export const MapView: React.FC<MapViewProps> = ({ markers, height = '100%', className = '' }) => {
  const mapRef = React.useRef<HTMLDivElement>(null);

  return (
    <div
      ref={mapRef}
      className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}
      style={{ height }}
    >
      <div className="text-center p-6">
        <div className="text-4xl mb-2">🗺️</div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Map View</h3>
        <p className="text-gray-500">
          {markers.length} location{markers.length !== 1 ? 's' : ''}
        </p>
        {markers.length > 0 && (
          <div className="mt-4 space-y-2">
            {markers.slice(0, 3).map((marker) => (
              <div key={marker.id} className="text-sm text-gray-600">
                📍 {marker.title}
              </div>
            ))}
            {markers.length > 3 && (
              <div className="text-sm text-gray-500">
                +{markers.length - 3} more locations
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
