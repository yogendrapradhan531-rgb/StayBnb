import { useEffect, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { KARNATAKA_CENTER } from '../utils/india.js';

const pinIcon = L.divIcon({
  className: 'price-marker-wrap',
  html: '<div class="pin-marker">📍</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 30],
});

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function Recenter({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, Math.max(map.getZoom(), 13));
  }, [position, map]);
  return null;
}

/**
 * Lets a host set the listing's coordinates by:
 *  - geocoding the typed address (OpenStreetMap Nominatim, free, no key), or
 *  - clicking the map / dragging the pin.
 * value: { lat, lng } | null
 */
export default function LocationPicker({ value, onChange, address }) {
  const [status, setStatus] = useState('');
  const [recenterTo, setRecenterTo] = useState(value ? [value.lat, value.lng] : null);

  const geocode = async () => {
    const q = [address.street, address.city, address.state, address.pincode, 'India'].filter(Boolean).join(', ');
    if (!address.city && !address.pincode) {
      setStatus('Enter the city or PIN code first.');
      return;
    }
    setStatus('Searching…');
    try {
      // countrycodes=in keeps results inside India
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const [hit] = await res.json();
      if (!hit) {
        setStatus('Address not found – click on the map to place the pin instead.');
        return;
      }
      const pos = { lat: Number(hit.lat), lng: Number(hit.lon) };
      onChange(pos);
      setRecenterTo([pos.lat, pos.lng]);
      setStatus('Found it! Drag the pin to fine-tune.');
    } catch {
      setStatus('Lookup failed – click on the map to place the pin instead.');
    }
  };

  const position = value ? [value.lat, value.lng] : null;

  return (
    <div className="location-picker">
      <div className="row gap wrap">
        <button type="button" className="btn btn-outline" onClick={geocode}>Find address on map</button>
        <span className="muted small">{status || 'Or click the map to drop a pin.'}</span>
      </div>
      <div className="map-wrap" style={{ height: 320 }}>
        <MapContainer center={position || KARNATAKA_CENTER} zoom={position ? 13 : 6} className="map">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <ClickHandler onPick={onChange} />
          <Recenter position={recenterTo} />
          {position && (
            <Marker
              position={position}
              icon={pinIcon}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const { lat, lng } = e.target.getLatLng();
                  onChange({ lat, lng });
                },
              }}
            />
          )}
        </MapContainer>
      </div>
      {position && (
        <p className="muted small">
          Lat {position[0].toFixed(5)}, Lng {position[1].toFixed(5)}
        </p>
      )}
    </div>
  );
}
