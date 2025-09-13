import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

// Fix leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIuNSAyNS41YzYuOSAwIDEyLjUtNS42IDEyLjUtMTIuNVM2LjQgMS41IDEyLjUgMS41UzAgNy4xIDAgMTMuNSAxMi41IDI1LjV6IiBmaWxsPSIjM0Y4M0ZGIi8+PGNpcmNsZSBjeD0iMTIuNSIgY3k9IjEzLjUiIHI9IjQiIGZpbGw9IiNmZmYiLz48L3N2Zz4=',
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIuNSAyNS41YzYuOSAwIDEyLjUtNS42IDEyLjUtMTIuNVM2LjQgMS41IDEyLjUgMS41UzAgNy4xIDAgMTMuNSAxMi41IDI1LjV6IiBmaWxsPSIjM0Y4M0ZGIi8+PGNpcmNsZSBjeD0iMTIuNSIgY3k9IjEzLjUiIHI9IjQiIGZpbGw9IiNmZmYiLz48L3N2Zz4=',
  shadowUrl: '',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

export const MapView: React.FC<MapViewProps> = ({ markers, height }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map if it doesn't exist
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        center: [51.505, -0.09], // Default to London
        zoom: 10,
        zoomControl: true,
      });

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Circle) {
        map.removeLayer(layer);
      }
    });

    // Add new markers
    const bounds: L.LatLng[] = [];
    
    markers.forEach((marker) => {
      const position = L.latLng(marker.lat, marker.lng);
      bounds.push(position);

      // Create marker with custom color based on status
      let markerColor = '#3F83FF'; // Default blue
      if (marker.status === 'Active') markerColor = '#10B981'; // Green
      else if (marker.status === 'Completed') markerColor = '#6B7280'; // Gray
      else if (marker.status === 'On Hold') markerColor = '#F59E0B'; // Yellow
      else if (marker.isUserLocation) markerColor = '#EF4444'; // Red for user location

      const customIcon = L.divIcon({
        html: `<div style="background-color: ${markerColor}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        className: 'custom-marker',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const leafletMarker = L.marker(position, { 
        icon: marker.isUserLocation ? undefined : customIcon 
      }).addTo(map);

      // Add popup if content provided
      if (marker.popupContent) {
        // Create a temporary div to render React content to HTML string
        const div = document.createElement('div');
        const reactContent = marker.popupContent as any;
        
        if (typeof reactContent === 'object' && reactContent.props) {
          // Simple rendering for React elements - in a real app you'd use ReactDOM.render
          const { props } = reactContent;
          if (props.children) {
            if (Array.isArray(props.children)) {
              props.children.forEach((child: any) => {
                const element = document.createElement(child.type || 'div');
                element.textContent = child.props?.children || '';
                if (child.props?.className) element.className = child.props.className;
                div.appendChild(element);
              });
            } else {
              div.innerHTML = `<div>${JSON.stringify(props.children)}</div>`;
            }
          }
        } else {
          div.innerHTML = String(reactContent);
        }
        
        leafletMarker.bindPopup(div.innerHTML);
      }

      // Add geofence circle if radius is provided
      if (marker.radius && marker.radius > 0) {
        L.circle(position, {
          radius: marker.radius,
          fillColor: markerColor,
          fillOpacity: 0.1,
          color: markerColor,
          weight: 2,
          opacity: 0.5,
        }).addTo(map);
      }
    });

    // Fit map to markers if any exist
    if (bounds.length > 0) {
      if (bounds.length === 1) {
        map.setView(bounds[0], 15);
      } else {
        map.fitBounds(L.latLngBounds(bounds), { padding: [20, 20] });
      }
    } else {
      // Default to London if no markers
      map.setView([51.505, -0.09], 10);
    }

    return () => {
      // Cleanup function will be handled when component unmounts
    };
  }, [markers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div 
      ref={mapRef} 
      style={{ height, width: '100%' }} 
      className="rounded-lg overflow-hidden"
    />
  );
};
