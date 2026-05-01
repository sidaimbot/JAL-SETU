/**
 * useDisasterAlerts.js
 * ─────────────────────────────────────────────────────────────
 * Fetches recent flood & landslide disaster events from two free APIs:
 *
 *  1. ReliefWeb API  – https://reliefweb.int/
 *     Disasters worldwide with type, country, date, status
 *     CORS-enabled, no API key required.
 *
 *  2. GDACS          – https://www.gdacs.org/
 *     Global Disaster Alert & Coordination System
 *     Returns GeoJSON with flood/landslide event severity scores
 *
 * Events within ~800 km are tagged as "nearby"; others as regional context.
 */
import { useState, useEffect, useCallback } from 'react';

const RELIEFWEB_URL = 'https://api.reliefweb.int/v1/disasters';
const GDACS_URL     = 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP';

/** Haversine distance between two lat/lon in km */
function haversine(lat1, lon1, lat2, lon2) {
  const R   = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** ReliefWeb disaster type IDs */
const RW_TYPES = {
  flood:     '4611',
  landslide: '4619',
  cyclone:   '4609',
};

export default function useDisasterAlerts(lat, lon) {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchAlerts = useCallback(async () => {
    if (!lat || !lon) return;
    setLoading(true);
    setError(null);

    const allEvents = [];

    /* ── 1. ReliefWeb – India & South-Asia Floods / Landslides ─ */
    try {
      const body = {
        filter: {
          operator: 'AND',
          conditions: [
            {
              field:    'type.id',
              value:    [RW_TYPES.flood, RW_TYPES.landslide, RW_TYPES.cyclone],
              operator: 'OR',
            },
            {
              field:    'date.created',
              value:    { from: twoYearsAgo() },
            },
          ],
        },
        fields: {
          include: ['name', 'date', 'type', 'country', 'status', 'glide'],
        },
        limit: 30,
        sort:  ['date:desc'],
      };

      const res  = await fetch(`${RELIEFWEB_URL}?appname=jalsetu`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        (data.data ?? []).forEach(item => {
          const f       = item.fields ?? {};
          const country = f.country?.[0]?.name ?? 'Unknown';
          const type    = f.type?.[0]?.name    ?? 'Disaster';
          const date    = f.date?.created?.split('T')[0] ?? '';
          const status  = f.status ?? 'past';

          // Approximate lat/lon from country centroid map
          const coords = COUNTRY_CENTROIDS[country] ?? null;
          const dist   = coords ? haversine(lat, lon, coords[0], coords[1]) : 9999;

          allEvents.push({
            id:       item.id,
            source:   'ReliefWeb',
            name:     f.name ?? type,
            type:     type.toLowerCase().includes('flood') ? 'flood'
                     : type.toLowerCase().includes('land')  ? 'landslide'
                     : 'other',
            date,
            country,
            status,
            dist:     Math.round(dist),
            lat:      coords?.[0] ?? null,
            lon:      coords?.[1] ?? null,
            glide:    f.glide,
            nearby:   dist < 800,
          });
        });
      }
    } catch (_) { /* ReliefWeb failed silently */ }

    /* ── 2. GDACS – recent geospatial flood events ─────────────── */
    try {
      const gdacsRes = await fetch(
        `${GDACS_URL}?eventtypes=FL,LS&fromdate=${oneYearAgo()}&todate=${today()}`,
        { headers: { 'Accept': 'application/json' } }
      );
      if (gdacsRes.ok) {
        const gdata = await gdacsRes.json();
        (gdata.features ?? []).forEach(f => {
          const props = f.properties ?? {};
          const glat  = f.geometry?.coordinates?.[1];
          const glon  = f.geometry?.coordinates?.[0];
          if (!glat || !glon) return;
          const dist = haversine(lat, lon, glat, glon);
          allEvents.push({
            id:      `gdacs-${props.eventid}`,
            source:  'GDACS',
            name:    props.name ?? props.eventtype,
            type:    (props.eventtype ?? '').toLowerCase() === 'fl' ? 'flood' : 'landslide',
            date:    (props.fromdate ?? '').split('T')[0],
            country: props.countryname ?? '',
            status:  props.iscurrent ? 'current' : 'past',
            alert:   (props.alertlevel ?? '').toLowerCase(), // green/orange/red
            dist:    Math.round(dist),
            lat:     glat,
            lon:     glon,
            nearby:  dist < 800,
          });
        });
      }
    } catch (_) { /* GDACS failed silently */ }

    // Sort by distance, then by date
    allEvents.sort((a, b) => {
      if (a.nearby !== b.nearby) return a.nearby ? -1 : 1;
      return new Date(b.date) - new Date(a.date);
    });

    setEvents(allEvents);
    setLoading(false);
  }, [lat, lon]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return { events, loading, error, refetch: fetchAlerts };
}

/* ── Date helpers ───────────────────────────────────────────── */
const fmt = d => d.toISOString().split('T')[0];
const today       = () => fmt(new Date());
const oneYearAgo  = () => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return fmt(d); };
const twoYearsAgo = () => { const d = new Date(); d.setFullYear(d.getFullYear() - 2); return fmt(d); };

/**
 * Country name → approximate [lat, lon] centroid.
 * Used to estimate event distance from the sensor node.
 */
const COUNTRY_CENTROIDS = {
  'India':               [20.5937,  78.9629],
  'Bangladesh':          [23.6850,  90.3563],
  'Nepal':               [28.3949,  84.1240],
  'Pakistan':            [30.3753,  69.3451],
  'Sri Lanka':           [7.8731,   80.7718],
  'Myanmar':             [21.9162,  95.9560],
  'China':               [35.8617, 104.1954],
  'Philippines':         [12.8797, 121.7740],
  'Indonesia':           [-0.7893, 113.9213],
  'Thailand':            [15.8700, 100.9925],
  'Vietnam':             [14.0583, 108.2772],
  'Afghanistan':         [33.9391,  67.7100],
  'Nigeria':             [9.0820,   8.6753],
  'Ethiopia':            [9.1450,   40.4897],
  'Kenya':               [-0.0236,  37.9062],
  'Brazil':              [-14.235, -51.9253],
  'Colombia':            [4.5709,  -74.2973],
};
