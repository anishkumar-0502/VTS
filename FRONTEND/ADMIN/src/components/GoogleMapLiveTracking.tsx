import { useCallback, useState, useEffect, useRef } from 'react';
import {
  GoogleMap,
  InfoWindow,
  useJsApiLoader,
} from '@react-google-maps/api';

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

interface GoogleMapLiveTrackingProps {
  vehicles: Vehicle[];
  selectedVehicleId?: string;
  onVehicleSelect?: (vehicleId: string) => void;
  height?: string;
}

const LIBRARIES = ['geometry', 'places', 'marker'];

const containerStyle = {
  width: '100%',
  height: '500px',
};

const defaultCenter = {
  lat: 20.5937,
  lng: 78.9629,
};

const defaultZoom = 5;

export default function GoogleMapLiveTracking({
  vehicles,
  selectedVehicleId,
  onVehicleSelect,
  height = '500px',
}: GoogleMapLiveTrackingProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [activeMarker, setActiveMarker] = useState<string | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES as unknown as ('geometry' | 'places' | 'marker')[],
  });

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    mapRef.current = mapInstance;
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const createMarkerElement = useCallback((vehicle: Vehicle): HTMLDivElement => {
    const div = document.createElement('div');
    const speedColor =
      vehicle.speed === 0
        ? '#6B7280'
        : vehicle.speed < 30
        ? '#10B981'
        : vehicle.speed < 60
        ? '#F59E0B'
        : '#EF4444';

    const isConnected = vehicle.device?.status !== false;
    const isSelected = selectedVehicleId === vehicle._id;
    const size = isSelected ? 24 : 20;
    const borderColor = isConnected ? '#10B981' : '#EF4444';
    const fillColor = isSelected ? '#3B82F6' : speedColor;

    div.style.width = `${size}px`;
    div.style.height = `${size}px`;
    div.style.backgroundColor = fillColor;
    div.style.border = `2px solid ${borderColor}`;
    div.style.borderRadius = '50%';
    div.style.cursor = 'pointer';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'center';

    return div;
  }, [selectedVehicleId]);

  useEffect(() => {
    if (!map || !isLoaded) return;

    const activeVehicles = new Set<string>();

    vehicles.forEach((vehicle) => {
      if (vehicle.latitude === 0 && vehicle.longitude === 0) return;

      activeVehicles.add(vehicle._id);
      const position = {
        lat: vehicle.latitude,
        lng: vehicle.longitude,
      };

      const existingMarker = markersRef.current.get(vehicle._id);

      if (existingMarker && existingMarker.map) {
        try {
          existingMarker.position = position;
          const newContent = createMarkerElement(vehicle);
          existingMarker.content = newContent;
        } catch (error) {
          console.warn('Error updating marker:', error);
          markersRef.current.delete(vehicle._id);
        }
      } else {
        try {
          const marker = new google.maps.marker.AdvancedMarkerElement({
            position,
            map,
            title: vehicle.vehicle_number,
            content: createMarkerElement(vehicle),
          });

          marker.addListener('click', () => {
            setActiveMarker(vehicle._id);
            onVehicleSelect?.(vehicle._id);
          });

          markersRef.current.set(vehicle._id, marker);
        } catch (error) {
          console.warn('Error creating marker:', error);
        }
      }
    });

    markersRef.current.forEach((marker, vehicleId) => {
      if (!activeVehicles.has(vehicleId)) {
        try {
          marker.map = null;
        } catch (error) {
          console.warn('Error removing marker:', error);
        }
        markersRef.current.delete(vehicleId);
      }
    });

    if (selectedVehicleId && vehicles.length > 0) {
      const selectedVehicle = vehicles.find((v) => v._id === selectedVehicleId);
      if (
        selectedVehicle &&
        selectedVehicle.latitude !== 0 &&
        selectedVehicle.longitude !== 0
      ) {
        map.setCenter({
          lat: selectedVehicle.latitude,
          lng: selectedVehicle.longitude,
        });
        map.setZoom(15);
      }
    }
  }, [vehicles, selectedVehicleId, map, isLoaded, onVehicleSelect, createMarkerElement]);

  if (!isLoaded) {
    return (
      <div
        style={{
          ...containerStyle,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f0f0f0',
        }}
      >
        <p>Loading map...</p>
      </div>
    );
  }

  const activeVehicle = vehicles.find((v) => v._id === activeMarker && v.latitude !== 0 && v.longitude !== 0);

  return (
    <GoogleMap
      mapContainerStyle={{ ...containerStyle, height }}
      center={defaultCenter}
      zoom={defaultZoom}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{
        disableDefaultUI: false,
        zoomControl: true,
        fullscreenControl: true,
        streetViewControl: false,
        mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || undefined,
      }}
    >
      {activeVehicle && (
        <InfoWindow
          position={{ lat: activeVehicle.latitude, lng: activeVehicle.longitude }}
          onCloseClick={() => setActiveMarker(null)}
        >
          <div style={{ color: '#000', maxWidth: '250px', fontSize: '12px' }}>
            <strong>{activeVehicle.vehicle_number}</strong>
            <div>Speed: {activeVehicle.speed.toFixed(1)} km/h</div>
            <div>Course: {activeVehicle.course.toFixed(1)}°</div>
            {activeVehicle.device?.battery_level !== undefined && (
              <div>Battery: {activeVehicle.device.battery_level.toFixed(0)}%</div>
            )}
            <div>
              Status:{' '}
              {activeVehicle.device?.status ? (
                <span style={{ color: 'green' }}>● Connected</span>
              ) : (
                <span style={{ color: 'red' }}>● Disconnected</span>
              )}
            </div>
            <div>Time: {new Date(activeVehicle.timestamp).toLocaleTimeString()}</div>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}
