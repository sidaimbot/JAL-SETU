/**
 * useWeather.js
 * Custom React hook — fetches real weather data from Open-Meteo API.
 *
 * ✅ Completely FREE — no API key required.
 * 🔗 https://open-meteo.com/
 *
 * Data refreshed every 10 minutes (Open-Meteo updates hourly).
 *
 * @param {number} lat  – latitude
 * @param {number} lon  – longitude
 * @returns {{ weather, loading, error, lastFetched }}
 */
import { useState, useEffect, useCallback } from 'react';

const REFRESH_MS = 10 * 60 * 1000; // 10 minutes

/**
 * WMO weather code → human label + emoji
 * https://open-meteo.com/en/docs#weathervariables
 */
/**
 * WMO weather code → label + emoji (day AND night variants)
 * is_day = 1 means daytime, 0 = night
 */
const WMO_CODES = {
  0:  { label: 'Clear Sky',           day: '☀️',  night: '🌙' },
  1:  { label: 'Mainly Clear',        day: '🌤️', night: '🌙' },
  2:  { label: 'Partly Cloudy',       day: '⛅',  night: '☁️' },
  3:  { label: 'Overcast',            day: '☁️',  night: '☁️' },
  45: { label: 'Foggy',               day: '🌫️', night: '🌫️' },
  48: { label: 'Icy Fog',             day: '🌫️', night: '🌫️' },
  51: { label: 'Light Drizzle',       day: '🌦️', night: '🌧️' },
  53: { label: 'Drizzle',             day: '🌦️', night: '🌧️' },
  55: { label: 'Heavy Drizzle',       day: '🌧️', night: '🌧️' },
  61: { label: 'Slight Rain',         day: '🌧️', night: '🌧️' },
  63: { label: 'Moderate Rain',       day: '🌧️', night: '🌧️' },
  65: { label: 'Heavy Rain',          day: '🌧️', night: '🌧️' },
  71: { label: 'Slight Snowfall',     day: '🌨️', night: '🌨️' },
  73: { label: 'Snowfall',            day: '❄️',  night: '❄️' },
  75: { label: 'Heavy Snowfall',      day: '❄️',  night: '❄️' },
  80: { label: 'Slight Showers',      day: '🌦️', night: '🌧️' },
  81: { label: 'Moderate Showers',    day: '🌧️', night: '🌧️' },
  82: { label: 'Violent Showers',     day: '⛈️',  night: '⛈️' },
  95: { label: 'Thunderstorm',        day: '⛈️',  night: '⛈️' },
  96: { label: 'Thunderstorm + Hail', day: '⛈️',  night: '⛈️' },
  99: { label: 'Severe Thunderstorm', day: '🌪️', night: '🌪️' },
};

function getWmo(code, isDay) {
  const entry = WMO_CODES[code] ?? { label: 'Unknown', day: '❓', night: '❓' };
  return { label: entry.label, emoji: isDay ? entry.day : entry.night };
}

/**
 * Convert mm/h rain rate to 0–100% intensity for the dashboard gauge.
 * 0 mm = 0%, 10 mm+ = 100% (matches typical flood-risk thresholds)
 */
export function rainMmToPct(mm) {
  return Math.min(100, Math.round((mm / 10) * 100));
}

export default function useWeather(lat, lon) {
  const [weather,     setWeather]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  const fetchWeather = useCallback(async () => {
    if (!lat || !lon) return;

    // Build Open-Meteo URL — all fields needed by the dashboard
    const params = new URLSearchParams({
      latitude:  lat,
      longitude: lon,
      // Current conditions
      current: [
        'temperature_2m',
        'apparent_temperature',
        'relative_humidity_2m',
        'precipitation',
        'rain',
        'weather_code',
        'wind_speed_10m',
        'wind_direction_10m',
        'surface_pressure',
        'cloud_cover',
        'is_day',
      ].join(','),
      // Hourly — next 12 hours precipitation probability + rain
      hourly: 'precipitation_probability,rain',
      // Units
      wind_speed_unit:    'kmh',
      temperature_unit:   'celsius',
      precipitation_unit: 'mm',
      // Only fetch 1 day so response is small
      forecast_days: '1',
      timezone: 'auto',
    });

    const url = `https://api.open-meteo.com/v1/forecast?${params}`;

    try {
      setLoading(true);
      setError(null);

      const res  = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const cur = data.current;
      const hr  = data.hourly;

      // Build the next 6-hour precipitation probability forecast
      // Open-Meteo hourly array is indexed per hour from midnight
      const nowHour = new Date().getHours();
      const next6   = Array.from({ length: 6 }, (_, i) => ({
        hour:  (nowHour + i) % 24,
        prob:  hr.precipitation_probability[nowHour + i] ?? 0,
        rain:  hr.rain[nowHour + i]                       ?? 0,
      }));

      // WMO code interpretation — with day/night awareness
      const wmo = getWmo(cur.weather_code, cur.is_day);

      setWeather({
        temperature:      cur.temperature_2m,
        feelsLike:        cur.apparent_temperature,
        humidity:         cur.relative_humidity_2m,
        rainMmPerHr:      cur.rain,
        rainPct:          rainMmToPct(cur.rain),
        precipitation:    cur.precipitation,
        windSpeed:        cur.wind_speed_10m,
        windDirection:    cur.wind_direction_10m,
        pressure:         cur.surface_pressure,
        cloudCover:       cur.cloud_cover,
        isDay:            cur.is_day === 1,
        conditionLabel:   wmo.label,
        conditionEmoji:   wmo.emoji,
        wmoCode:          cur.weather_code,
        next6Hours:       next6,
        timezone:         data.timezone,
      });

      setLastFetched(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [lat, lon]);

  /* Initial fetch + auto-refresh every 10 min */
  useEffect(() => {
    fetchWeather();
    const id = setInterval(fetchWeather, REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchWeather]);

  return { weather, loading, error, lastFetched, refetch: fetchWeather };
}
