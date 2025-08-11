import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Map as MapIcon, Navigation } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapClickHandler = ({ onLocationSelect }) => {
  const map = useMapEvents({
    click(e) {
      if (onLocationSelect) {
        onLocationSelect(e.latlng);
      }
    },
  });
  return null;
};

const PropertyMap = ({ 
  coordinates, 
  onLocationSelect, 
  className = "",
  height = "300px",
  editable = true 
}) => {
  const [position, setPosition] = useState([
    coordinates?.latitude || 33.6844, // Default to Lahore
    coordinates?.longitude || 73.0479
  ]);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (coordinates?.latitude && coordinates?.longitude) {
      const newPosition = [coordinates.latitude, coordinates.longitude];
      setPosition(newPosition);
      setKey(prev => prev + 1); // Force re-render of map
    }
  }, [coordinates]);

  const handleLocationSelect = (latlng) => {
    if (!editable) return;
    
    const newPosition = [latlng.lat, latlng.lng];
    setPosition(newPosition);
    
    if (onLocationSelect) {
      onLocationSelect({
        latitude: latlng.lat,
        longitude: latlng.lng
      });
    }
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        setPosition([coords.latitude, coords.longitude]);
        setKey(prev => prev + 1); // Force re-render
        if (onLocationSelect) {
          onLocationSelect(coords);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to get your current location.');
      }
    );
  };

  return (
    <div className={`relative ${className}`}>
      <div className="mb-2 flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          <MapIcon className="inline h-4 w-4 mr-1" />
          Property Location
        </label>
        {editable && (
          <button
            type="button"
            onClick={handleCurrentLocation}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            <Navigation className="h-3 w-3" />
            Use Current Location
          </button>
        )}
      </div>
      
      <div style={{ height }} className="rounded-lg overflow-hidden border border-gray-300">
        <MapContainer
          key={key} // Force re-render when position changes
          center={position}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={position} />
          {editable && <MapClickHandler onLocationSelect={handleLocationSelect} />}
        </MapContainer>
      </div>
      
      {editable && (
        <p className="text-xs text-gray-500 mt-1">
          Click on the map to set the exact property location
        </p>
      )}
    </div>
  );
};

export default PropertyMap;