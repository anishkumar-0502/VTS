import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Vehicle {
  _id: string;
  vehicle_number: string;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  timestamp: string;
  device?: {
    status: boolean;
    battery_level?: number;
  };
}

interface LiveMapProps {
  vehicles: Vehicle[];
  selectedVehicleId?: string;
  onVehicleSelect?: (vehicleId: string) => void;
}

export default function LiveMap({ vehicles, selectedVehicleId, onVehicleSelect }: LiveMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    if (!mapContainer.current) return;

    if (!map.current) {
      map.current = L.map(mapContainer.current).setView([20.5937, 78.9629], 6);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map.current);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;

    const currentMarkers = new Set<string>();

    vehicles.forEach((vehicle) => {
      if (vehicle.latitude === 0 && vehicle.longitude === 0) return;

      currentMarkers.add(vehicle._id);
      const isSelected = selectedVehicleId === vehicle._id;

      const existingMarker = markersRef.current.get(vehicle._id);

      if (existingMarker) {
        existingMarker.setLatLng([vehicle.latitude, vehicle.longitude]);
      } else {
        const getMarkerIcon = () => {
          const speedColor = vehicle.speed === 0 
            ? '#6B7280' 
            : vehicle.speed < 30 
            ? '#10B981' 
            : vehicle.speed < 60 
            ? '#F59E0B' 
            : '#EF4444';

          const isConnected = vehicle.device?.status !== false;
          const html = `
            <div style="
              display: flex;
              align-items: center;
              justify-content: center;
              width: 40px;
              height: 40px;
              background: ${isSelected ? '#3B82F6' : speedColor};
              border: 3px solid ${isConnected ? '#10B981' : '#EF4444'};
              border-radius: 50%;
              font-weight: bold;
              color: white;
              font-size: 12px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'};
              transition: transform 0.2s;
            ">
              ${vehicle.speed.toFixed(0)}
            </div>
          `;

          return L.divIcon({
            html,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            popupAnchor: [0, -20],
          });
        };

        const marker = L.marker([vehicle.latitude, vehicle.longitude], {
          icon: getMarkerIcon(),
        })
          .bindPopup(`
            <div style="font-size: 12px; line-height: 1.6;">
              <strong>${vehicle.vehicle_number}</strong><br/>
              Speed: ${vehicle.speed.toFixed(1)} km/h<br/>
              Course: ${vehicle.course.toFixed(1)}°<br/>
              ${vehicle.device?.battery_level !== undefined ? `Battery: ${vehicle.device.battery_level.toFixed(0)}%<br/>` : ''}
              Status: ${vehicle.device?.status ? '🟢 Connected' : '🔴 Disconnected'}<br/>
              Time: ${new Date(vehicle.timestamp).toLocaleTimeString()}
            </div>
          `)
          .addTo(map.current!);

        marker.on('click', () => {
          onVehicleSelect?.(vehicle._id);
        });

        markersRef.current.set(vehicle._id, marker);
      }
    });

    markersRef.current.forEach((marker, vehicleId) => {
      if (!currentMarkers.has(vehicleId)) {
        map.current!.removeLayer(marker);
        markersRef.current.delete(vehicleId);
      }
    });

    if (selectedVehicleId && vehicles.length > 0) {
      const selectedVehicle = vehicles.find((v) => v._id === selectedVehicleId);
      if (selectedVehicle && selectedVehicle.latitude !== 0 && selectedVehicle.longitude !== 0) {
        map.current.setView([selectedVehicle.latitude, selectedVehicle.longitude], 14);
      }
    }
  }, [vehicles, selectedVehicleId, onVehicleSelect]);

  return (
    <div 
      ref={mapContainer} 
      style={{ 
        width: '100%', 
        height: '500px',
        borderRadius: '0.5rem',
        overflow: 'hidden',
        border: '1px solid #E5E7EB'
      }} 
    />
  );
}
