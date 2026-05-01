/**
 * useEscapeRoutes.js
 *
 * Resilient 3-server waterfall strategy:
 *   1. overpass.kumi.systems  (CORS-enabled mirror, fastest)
 *   2. overpass.openstreetmap.fr (CORS-enabled French mirror)
 *   3. overpass-api.de via Flask backend (final fallback)
 *
 * Then enriches all 5 results with real OSRM road paths in parallel.
 */
import { useState, useEffect, useCallback } from 'react';

const ML_API_BASE = 'http://localhost:5000';

// Public Overpass mirrors that allow browser CORS requests
const OVERPASS_MIRRORS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
];

function buildQuery(lat, lon) {
  return (
    `[out:json][timeout:20];` +
    `(nwr["amenity"~"hospital|clinic|school|community_centre"](around:5000,${lat},${lon}););` +
    `out center 5;`
  );
}

function computeBearing(lat, lon, nLat, nLon) {
  const angle = Math.atan2(nLon - lon, nLat - lat);
  const a = angle < 0 ? angle + 2 * Math.PI : angle;
  const idx = Math.floor(a / (Math.PI / 2)) % 4;
  return {
    direction: ['↗', '↘', '↙', '↖'][idx],
    bearing:   ['NorthEast', 'SouthEast', 'SouthWest', 'NorthWest'][idx],
  };
}

async function fetchFromMirror(mirrorUrl, lat, lon) {
  const query = buildQuery(lat, lon);
  const res = await fetch(mirrorUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({ data: query }),
    signal:  AbortSignal.timeout(20000), // 20s hard cut-off
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.elements || [];
}

async function fetchFromFlask(lat, lon, risk) {
  const res = await fetch(`${ML_API_BASE}/predict/escape-routes`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ lat, lon, risk: risk || 'Low' }),
    signal:  AbortSignal.timeout(25000),
  });
  const data = await res.json();
  if (data.status !== 'success') throw new Error(data.message || 'Flask error');
  return data.safe_zones || [];
}

function buildZones(elements, lat, lon, risk) {
  return elements
    .filter(e => (e.lat && e.lon) || (e.center && e.center.lat && e.center.lon))
    .map(e => {
      const tags   = e.tags || {};
      const name   = tags.name || (tags.amenity?.replace(/_/g, ' ') ?? 'Safe Zone');
      const eLat   = e.lat || e.center?.lat;
      const eLon   = e.lon || e.center?.lon;
      const distKm = Math.sqrt(
        ((eLat - lat) * 111) ** 2 +
        ((eLon - lon) * 111 * Math.cos((lat * Math.PI) / 180)) ** 2
      );
      let safe = true;
      if (risk === 'High'   && distKm < 3.5) safe = false;
      if (risk === 'Medium' && distKm < 1.5) safe = false;
      const { direction, bearing } = computeBearing(lat, lon, eLat, eLon);
      return {
        id: `osm-${e.id}`,
        name,
        lat: eLat,
        lon: eLon,
        dist: `${distKm.toFixed(1)} km`,
        safe,
        direction,
        bearing,
      };
    })
    .sort((a, b) => parseFloat(a.dist) - parseFloat(b.dist))
    .slice(0, 5);
}

async function enrichWithOSRM(zones, lat, lon) {
  return Promise.all(zones.map(async zone => {
    try {
      const url = `https://router.project-osrm.org/route/v1/foot/${lon},${lat};${zone.lon},${zone.lat}?geometries=geojson&overview=full`;
      const r   = await fetch(url, { signal: AbortSignal.timeout(10000) });
      const d   = await r.json();
      if (d.code === 'Ok' && d.routes?.[0]) {
        return {
          ...zone,
          pathCoords: d.routes[0].geometry.coordinates.map(c => [c[1], c[0]]),
          walkMin:    Math.round(d.routes[0].duration / 60),
        };
      }
    } catch { /* silently fall back to straight-line */ }
    return zone;
  }));
}

export default function useEscapeRoutes(lat, lon, risk) {
  const [safeZones, setSafeZones]   = useState([]);
  const [loading, setLoading]       = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => {
    setSafeZones([]);
    setFetchError(null);
    setRetryCount(c => c + 1);
  }, []);

  useEffect(() => {
    if (!lat || !lon) return;
    let isMounted = true;

    const fetchRoutes = async () => {
      setLoading(true);
      setFetchError(null);

      let elements = [];
      let lastErr  = null;

      // Try each CORS mirror first (faster, no Flask hop)
      for (const mirror of OVERPASS_MIRRORS) {
        try {
          console.log(`[Shelters] Trying mirror: ${mirror}`);
          elements = await fetchFromMirror(mirror, lat, lon);
          console.log(`[Shelters] Got ${elements.length} results from ${mirror}`);
          break; // success — stop trying mirrors
        } catch (err) {
          console.warn(`[Shelters] Mirror failed (${mirror}):`, err.message);
          lastErr = err;
        }
      }

      // Final fallback: Flask backend proxies overpass-api.de
      if (elements.length === 0) {
        try {
          console.log('[Shelters] Trying Flask backend fallback...');
          const flaskZones = await fetchFromFlask(lat, lon, risk);
          if (!isMounted) return;
          if (flaskZones.length > 0) {
            const enriched = await enrichWithOSRM(flaskZones.slice(0, 5), lat, lon);
            if (isMounted) { setSafeZones(enriched); setLoading(false); }
            return;
          }
        } catch (err) {
          console.error('[Shelters] Flask fallback also failed:', err.message);
          lastErr = err;
        }
      }

      if (!isMounted) return;

      if (elements.length === 0) {
        setFetchError(lastErr?.message || 'no_results');
        setLoading(false);
        return;
      }

      const zones    = buildZones(elements, lat, lon, risk);
      const enriched = await enrichWithOSRM(zones, lat, lon);
      if (isMounted) setSafeZones(enriched);
      if (isMounted) setLoading(false);
    };

    fetchRoutes();
    return () => { isMounted = false; };
  }, [lat, lon, risk, retryCount]);

  return { safeZones, loading, fetchError, retry };
}
