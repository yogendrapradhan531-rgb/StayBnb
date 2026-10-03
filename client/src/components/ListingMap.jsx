import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { formatMoney } from '../utils/format.js';
import { optimizeImage } from '../utils/image.js';
import { KARNATAKA_CENTER } from '../utils/india.js';

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// GeoJSON stores [lng, lat]; Leaflet wants [lat, lng]
const toLatLng = (listing) => {
  const [lng, lat] = listing.location?.coordinates || [];
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
};

// Price "pill" markers instead of default pins (also avoids Leaflet's
// broken default-icon paths when bundling with Vite)
const priceIcon = (price, active) =>
  L.divIcon({
    className: 'price-marker-wrap',
    html: `<div class="price-marker${active ? ' active' : ''}">${formatMoney(price)}</div>`,
    iconSize: null,
  });

/** Fits the map to the markers, and reports user-driven moves. */
function MapController({ points, autoFit, onUserMove }) {
  const map = useMap();
  const programmatic = useRef(false);
  const key = points.map((p) => p.join(',')).join('|');

  useEffect(() => {
    if (!autoFit || points.length === 0) return;
    programmatic.current = true;
    if (points.length === 1) map.setView(points[0], 13);
    else map.fitBounds(points, { padding: [40, 40], maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, autoFit, map]);

  useMapEvents({
    moveend() {
      if (programmatic.current) {
        programmatic.current = false;
        return;
      }
      onUserMove?.(map.getBounds());
    },
  });
  return null;
}

/**
 * Map of listings.
 * - `activeId` highlights a marker (hovered card)
 * - `onSearchArea(boundsString)` enables the "Search this area" button
 */
export default function ListingMap({ listings, activeId, onSearchArea, autoFit = true, height = '100%', zoom = 6 }) {
  const [movedBounds, setMovedBounds] = useState(null);

  const markers = useMemo(
    () => listings.map((l) => ({ listing: l, pos: toLatLng(l) })).filter((m) => m.pos),
    [listings]
  );
  const points = markers.map((m) => m.pos);
  const center = points[0] || KARNATAKA_CENTER; // Karnataka as the default centre

  const searchArea = () => {
    if (!movedBounds) return;
    const sw = movedBounds.getSouthWest();
    const ne = movedBounds.getNorthEast();
    onSearchArea(
      [sw.lng, sw.lat, ne.lng, ne.lat].map((n) => n.toFixed(4)).join(',')
    );
    setMovedBounds(null);
  };

  return (
    <div className="map-wrap" style={{ height }}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom className="map">
        <TileLayer url={TILE_URL} attribution={ATTRIBUTION} />
        <MapController
          points={points}
          autoFit={autoFit}
          onUserMove={onSearchArea ? setMovedBounds : undefined}
        />
        {markers.map(({ listing, pos }) => (
          <Marker
            key={listing._id}
            position={pos}
            icon={priceIcon(listing.pricePerNight, listing._id === activeId)}
            zIndexOffset={listing._id === activeId ? 1000 : 0}
          >
            <Popup>
              <Link to={`/listings/${listing._id}`} className="map-popup">
                {listing.images?.[0] && (
                  <img src={optimizeImage(listing.images[0], 400)} alt="" loading="lazy" />
                )}
                <strong>{listing.title}</strong>
                <span>{formatMoney(listing.pricePerNight)} night</span>
              </Link>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {onSearchArea && movedBounds && (
        <button type="button" className="map-search-btn" onClick={searchArea}>
          Search this area
        </button>
      )}
    </div>
  );
}
