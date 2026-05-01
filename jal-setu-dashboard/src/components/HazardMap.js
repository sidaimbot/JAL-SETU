/**
 * HazardMap.js
 * ─────────────────────────────────────────────────────────────
 * Interactive Leaflet map with:
 *   1. The Sensor Node (Gateway) + Live Data Popup
 *   2. ReliefWeb / GDACS disaster events (Floods, Landslides)
 *   3. Search location (Nominatim) & Live Geolocation
 *   4. Dynamic ML Escape Routes
 */
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Search, Crosshair, ShieldCheck } from 'lucide-react';
import useDisasterAlerts from '../hooks/useDisasterAlerts';
import 'leaflet/dist/leaflet.css';

// Premium Custom CSS animated Icons
const sensorIcon = L.divIcon({
  className: 'custom-div-icon',
  html: '<div class="pulse-marker-core"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10]
});

const safeZoneIcon = L.divIcon({
  className: 'custom-div-icon',
  html: '<div class="pulse-marker-safe"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -8]
});

const floodIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const landslideIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

// Map Controller for smooth panning
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, map.getZoom(), { animate: true, duration: 1.5 });
  }, [center, map]);
  return null;
}

export default function HazardMap({ coords, onLocationChange, dynamicZones = [], mlResult, sensorData }) {
  const { lat, lon, location } = coords;
  const { events, loading } = useDisasterAlerts(lat, lon);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  // Search using OpenStreetMap Nominatim
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        onLocationChange({
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
          location: data[0].display_name.split(',')[0],
        });
      }
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setSearching(false);
    }
  };

  // Live Geolocation
  const handleLocateMe = () => {
    if (navigator.geolocation) {
      setSearching(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          onLocationChange({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            location: 'My Location',
          });
          setSearching(false);
        },
        () => {
          alert('Geolocation failed or denied.');
          setSearching(false);
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  return (
    <div className="card hazard-map-card">
      <div className="card-title">
        <MapPin size={13} /> Live Geospatial Hazard Map
      </div>

      {/* Map Controls */}
      <div className="map-controls">
        <form onSubmit={handleSearch} className="map-search-form">
          <input 
            type="text" 
            placeholder="Search location..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="map-search-input"
          />
          <button type="submit" className="map-btn" disabled={searching}>
            <Search size={14} />
          </button>
        </form>
        <button onClick={handleLocateMe} className="map-btn map-btn-locate" title="Find My Location">
          <Crosshair size={14} /> Locate
        </button>
      </div>

      <div className="gps-coords" style={{ marginBottom: '0.75rem', marginTop: '0.5rem' }}>
        <span><strong>📍 {location}</strong></span>
        <span><strong>Lat:</strong> {lat.toFixed(4)}°N</span>
        <span><strong>Lon:</strong> {lon.toFixed(4)}°E</span>
        {loading && <span style={{ color: 'var(--accent)' }}>Fetching regional alerts...</span>}
      </div>

      <div className="map-container" style={{ flexGrow: 1, minHeight: '340px' }}>
        <MapContainer center={[lat, lon]} zoom={14} style={{ height: '100%', width: '100%' }}>
          <MapUpdater center={[lat, lon]} />
          
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          {/* Core Location Marker */}
          <Marker position={[lat, lon]} icon={sensorIcon}>
            <Popup className="custom-popup">
              <strong>{location === 'My Location' ? 'User Location' : 'Hydra-Mesh Gateway'}</strong><br/>
              Monitoring flood levels.<br/><br/>
              {sensorData && (
                <div style={{ fontSize: '0.8rem', color: '#555' }}>
                  💧 Water Level: {sensorData.waterLevel}%<br/>
                  🌧️ Rain: {sensorData.rainIntensity}%<br/>
                  ⚠️ ML Risk: {mlResult?.risk || 'Calculating...'}
                </div>
              )}
            </Popup>
          </Marker>

          {/* Dynamic Escape Routes from ML */}
          {dynamicZones.map((zone) => {
            if (!zone.lat || !zone.lon) return null;
            return (
              <React.Fragment key={zone.id}>
                <Marker position={[zone.lat, zone.lon]} icon={safeZoneIcon}>
                  <Popup>
                    <strong>{zone.name}</strong><br/>
                    Status: {zone.safe ? '✅ SAFE' : '⚠️ UNSAFE (avoid)'}<br/>
                    Distance: {zone.dist}
                  </Popup>
                </Marker>
                {zone.safe && (
                  <Polyline 
                    positions={zone.pathCoords || [[lat, lon], [zone.lat, zone.lon]]} 
                    pathOptions={{ 
                      color: '#22c55e', 
                      weight: zone.pathCoords ? 3 : 2,
                      dashArray: zone.pathCoords ? 'none' : '4, 8'
                    }} 
                    className="route-polyline"
                  />
                )}
              </React.Fragment>
            );
          })}

          <Circle center={[lat, lon]} radius={2000} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.15 }} />

          {/* Disaster Event Markers */}
          {events.map((event) => {
             if (!event.lat || !event.lon) return null;
             const icon = event.type === 'flood' ? floodIcon : landslideIcon;
             return (
               <Marker key={event.id} position={[event.lat, event.lon]} icon={icon}>
                 <Popup>
                   <strong>{event.name}</strong><br/>
                   Type: {event.type.toUpperCase()}<br/>
                   Date: {event.date}<br/>
                   Distance: {event.dist} km
                 </Popup>
               </Marker>
             );
          })}
        </MapContainer>

        <div className="map-overlay-badge" style={{ zIndex: 1000, pointerEvents: 'none' }}>
          <strong>⚠️ Active Core Hub</strong>
          {lat.toFixed(4)}°N, {lon.toFixed(4)}°E
        </div>
      </div>

      <div className="mini-stats" style={{ marginTop: '0.75rem' }}>
         <div className="mini-stat">
            <span style={{ color:'#3b82f6' }}>🔵 Core Location</span>Target Hub
         </div>
         <div className="mini-stat">
            <span style={{ color:'#22c55e' }}>🟢 Safe Zones</span>ML Dynamic Routes
         </div>
         <div className="mini-stat">
            <span style={{ color:'#ef4444' }}>🔴 Floods</span>ReliefWeb/GDACS
         </div>
      </div>
    </div>
  );
}
