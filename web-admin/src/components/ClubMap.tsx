import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';

type ClubMapItem = {
  id: string;
  name: string;
  subdomain: string;
  latitude: string | null;
  longitude: string | null;
  location: string | null;
  logoUrl: string | null;
  avgRating: string | null;
  services: string[];
};

// Fix Leaflet default marker icon issue with bundlers
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

function FitBounds({ clubs }: { clubs: ClubMapItem[] }) {
  const map = useMap();
  useEffect(() => {
    const validClubs = clubs.filter(
      (c) => c.latitude && c.longitude && !isNaN(Number(c.latitude)) && !isNaN(Number(c.longitude)),
    );
    if (validClubs.length === 0) return;
    const bounds = L.latLngBounds(
      validClubs.map((c) => [Number(c.latitude), Number(c.longitude)] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
  }, [clubs, map]);
  return null;
}

export function ClubMap({ clubs }: { clubs: ClubMapItem[] }) {
  const validClubs = clubs.filter(
    (c) => c.latitude && c.longitude && !isNaN(Number(c.latitude)) && !isNaN(Number(c.longitude)),
  );

  if (validClubs.length === 0) {
    return (
      <div className="vitrin-map-empty">
        <span>🗺️</span>
        <p>Haritada gösterilecek kulüp bulunamadı</p>
      </div>
    );
  }

  // Default center: Istanbul
  const defaultCenter: [number, number] = [41.0082, 28.9784];

  return (
    <div className="vitrin-map-container">
      <MapContainer
        center={defaultCenter}
        zoom={11}
        style={{ width: '100%', height: '100%', borderRadius: '14px' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds clubs={validClubs} />
        {validClubs.map((club) => (
          <Marker
            key={club.id}
            position={[Number(club.latitude), Number(club.longitude)]}
            icon={defaultIcon}
          >
            <Popup>
              <div className="vitrin-map-popup">
                <h4>{club.name}</h4>
                {club.location && <p className="popup-location">📍 {club.location}</p>}
                {club.avgRating && Number(club.avgRating) > 0 && (
                  <p className="popup-rating">★ {Number(club.avgRating).toFixed(1)}</p>
                )}
                {club.services.length > 0 && (
                  <p className="popup-services">{club.services.slice(0, 3).join(', ')}</p>
                )}
                <Link to={`/club/${club.subdomain}`} className="popup-link">
                  Profili Gör →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
