/**
 * MapView.js
 * Embeds a Google Maps iframe centred on the sensor GPS coordinates.
 * Also displays a coordinate badge and affected-zone indicator.
 *
 * Props:
 *   coords – { lat, lon, location }
 */
import React from 'react';
import { MapPin, Navigation } from 'lucide-react';

export default function MapView({ coords }) {
  const { lat, lon, location } = coords;

  /* Google Maps embed URL – always uses the sensor GPS fix */
  const mapSrc = `https://maps.google.com/maps?q=${lat},${lon}&z=13&output=embed`;

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div className="card-title">
        <MapPin size={13} /> Live GPS Location &amp; Flood Zone
      </div>

      {/* GPS coordinate row */}
      <div className="gps-coords" style={{ marginBottom: '0.75rem' }}>
        <span><strong>📍 {location}</strong></span>
        <span><strong>Lat:</strong> {lat.toFixed(4)}°N</span>
        <span><strong>Lon:</strong> {lon.toFixed(4)}°E</span>
      </div>

      {/* Map iframe */}
      <div className="map-container">
        <iframe
          title="Flood Detection Location Map"
          src={mapSrc}
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          loading="lazy"
        />

        {/* Overlay badge */}
        <div className="map-overlay-badge">
          <strong>⚠️ Flood Detection Point</strong>
          {lat.toFixed(4)}°N, {lon.toFixed(4)}°E
        </div>
      </div>

      {/* Legend row */}
      <div className="mini-stats" style={{ marginTop: '0.75rem' }}>
        <div className="mini-stat">
          <span style={{ color:'#ef4444' }}>🔴 Sensor Node</span>Location
        </div>
        <div className="mini-stat" style={{display:'flex',alignItems:'center',gap:4}}>
          <Navigation size={11} color="#3b82f6" />
          <span>Hydra-Mesh Gateway</span>
          <span style={{color:'var(--text-dim)',fontSize:'0.7rem'}}>Active</span>
        </div>
        <div className="mini-stat">
          <span>Zone Radius: ~2 km</span>At-risk perimeter
        </div>
      </div>
    </div>
  );
}
