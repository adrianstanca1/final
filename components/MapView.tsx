import React from 'react';

interface Marker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description?: string;
}

interface MapViewProps {
  markers: Marker[];
  height?: string;
  className?: string;
}

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
