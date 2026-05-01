/**
 * mockSensors.js
 * Central mock data store for all sensor nodes.
 * In production, replace this with live Web Serial API reads.
 */

/** Initial sensor snapshot */
export const INITIAL_SENSOR_DATA = {
  waterLevel: 72,        // percentage (0–100)
  rainIntensity: 82,     // percentage (0–100)
  ultrasonicDist: 45,    // cm to water surface
  temperature: 31.4,     // °C
  humidity: 89,          // %
  nodeId: 'NODE-01',
  rssi: -72,             // dBm (LoRa signal strength)
  battery: 87,           // %
};

/** GPS coordinates of the sensor node (Assam flood plain – demo) */
export const GPS_COORDS = {
  lat: 26.1445,
  lon: 91.7362,
  location: 'Kamrup District, Assam',
};

/** Flood prediction timestamp (minutes from now) – adjustable  */
export const FLOOD_PREDICTED_IN_MINUTES = 150; // 2 h 30 m

/** Nearest safe zones for escape routing */
export const SAFE_ZONES = [
  { name: 'Government High School',  direction: '↑', bearing: 'North',     dist: '1.2 km', safe: true  },
  { name: 'District Hospital',       direction: '↗', bearing: 'NorthEast', dist: '2.0 km', safe: true  },
  { name: 'PWD Guest House (Hill)',   direction: '→', bearing: 'East',      dist: '3.4 km', safe: true  },
  { name: 'Main Highway Bridge',      direction: '↘', bearing: 'SouthEast', dist: '4.1 km', safe: false },
];

/**
 * Determine alert level from sensor readings.
 * @param {number} wl  waterLevel %
 * @param {number} ri  rainIntensity %
 * @returns {'safe'|'warning'|'danger'}
 */
export function getSeverity(wl, ri) {
  if (wl >= 75 || ri >= 80) return 'danger';
  if (wl >= 45 || ri >= 50) return 'warning';
  return 'safe';
}

/**
 * Simulate a realistic one-step sensor tick.
 * Values drift slowly to mimic real sensor behaviour.
 * @param {object} prev – previous reading
 * @returns {object}    – next reading
 */
export function simulateTick(prev) {
  // Drift by a tiny amount, but violently return toward high values
  const rawWl = Math.min(100, Math.max(70, prev.waterLevel + (Math.random() * 2 - 1)));
  const rawRi = Math.min(100, Math.max(80, prev.rainIntensity + (Math.random() * 4 - 2)));
  const rawHum = Math.min(100, Math.max(80, prev.humidity + (Math.random() * 2 - 1)));
  
  return {
    ...prev,
    waterLevel: parseFloat(rawWl.toFixed(2)),
    rainIntensity: parseFloat(rawRi.toFixed(2)),
    ultrasonicDist: parseFloat((200 - rawWl * 1.5).toFixed(2)),
    humidity: parseFloat(rawHum.toFixed(2)),
  };
}
