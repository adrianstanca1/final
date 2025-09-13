import React from 'react';

export interface MapMarker {
  lat: number;
  lng: number;
  radius?: number;
  isUserLocation?: boolean;
  popupContent?: React.ReactNode;
  status?: string;
}

interface MapViewProps {
  markers: MapMarker[];
  height: string;
}

export const MapView: React.FC<MapViewProps> = ({ markers, height }) => {
  return (
    <div style={{ height, width: '100%', background: '#e0e0e0' }} className="flex items-center justify-center rounded-lg">
      <div className="text-center p-4 bg-white/50 rounded-md backdrop-blur-sm">
        <h3 className="font-bold text-lg text-slate-700">Map Placeholder</h3>
        <p className="text-sm text-slate-600">A map would be rendered here.</p>
        <p className="text-xs text-slate-500 mt-2">{markers.length} marker(s) provided.</p>
      </div>
    </div>
  );
};
