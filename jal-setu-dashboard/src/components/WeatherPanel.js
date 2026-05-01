/**
 * WeatherPanel.js
 * Displays live Open-Meteo weather data relevant to flood monitoring:
 *   • Current conditions card (temp, wind, pressure, humidity)
 *   • Real rain intensity gauge (mm/h → %)
 *   • 6-hour hourly precipitation probability mini bar chart
 *   • Auto-refresh badge + manual refresh button
 *
 * Props:
 *   weather      – object from useWeather hook (null while loading)
 *   loading      – boolean
 *   error        – string | null
 *   lastFetched  – Date | null
 *   onRefetch    – () => void
 *   onRainUpdate – (rainPct: number) => void  ← feeds into sensor severity
 */
import React from 'react';
import { Cloud, Wind, Droplets, Thermometer, RefreshCw, Gauge, ArrowUp } from 'lucide-react';

/* ── Wind direction degrees → compass label ─────────────────── */
function bearing(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

/* ── Mini bar for the 6 h precipitation chart ───────────────── */
function PrecipBar({ hour, prob, rain }) {
  const displayHour = hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`;
  const height = Math.max(4, (prob / 100) * 72); // px, min 4

  const barColor =
    prob >= 75 ? '#ef4444' :
    prob >= 50 ? '#f59e0b' :
    prob >= 25 ? '#3b82f6' :
                 '#334155';

  return (
    <div className="precip-bar-col">
      <div className="precip-bar-prob">{prob}%</div>
      <div className="precip-bar-track">
        <div
          className="precip-bar-fill"
          style={{ height, background: barColor }}
          title={`${prob}% chance · ${rain.toFixed(1)} mm`}
        />
      </div>
      <div className="precip-bar-label">{displayHour}</div>
    </div>
  );
}

/* ── Skeleton loader ────────────────────────────────────────── */
function Skeleton({ w = '100%', h = 18, r = 6 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'rgba(255,255,255,0.06)',
      animation: 'skeleton-pulse 1.4s ease-in-out infinite',
    }} />
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function WeatherPanel({ weather, loading, error, lastFetched, onRefetch }) {
  const fetchedStr = lastFetched
    ? lastFetched.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : '—';

  /* ── Error state ─────────────────────────────────────────── */
  if (error) {
    return (
      <div className="card weather-panel">
        <div className="card-title"><Cloud size={13} /> Live Weather · Open-Meteo</div>
        <div className="weather-error">
          <span>⚠️ Weather fetch failed: {error}</span>
          <button className="weather-refresh-btn" onClick={onRefetch}>
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card weather-panel">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="card-title" style={{ justifyContent:'space-between' }}>
        <span style={{ display:'flex', alignItems:'center', gap:6 }}>
          <Cloud size={13} /> Live Weather · Open-Meteo API
        </span>
        <span className="weather-meta">
          {loading ? 'Fetching…' : `Updated ${fetchedStr}`}
          <button
            className="weather-refresh-btn-icon"
            onClick={onRefetch}
            title="Refresh weather"
            aria-label="Refresh weather data"
          >
            <RefreshCw size={11} className={loading ? 'spin' : ''} />
          </button>
        </span>
      </div>

      {loading && !weather ? (
        /* ── Loading skeleton ─────────────────────────────── */
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <Skeleton h={60} />
          <Skeleton h={22} w="60%" />
          <Skeleton h={90} />
        </div>
      ) : weather ? (
        <>
          {/* ── Condition hero row ──────────────────────────── */}
          <div className="weather-hero" style={{
            background: weather.isDay
              ? 'linear-gradient(135deg, rgba(251,191,36,0.08), rgba(249,115,22,0.06))'
              : 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(30,27,75,0.15))',
            borderRadius: '10px',
            padding: '10px 12px',
            marginBottom: '0.75rem'
          }}>
            <div className="weather-condition-emoji" style={{ fontSize: '2.8rem', lineHeight: 1 }}>{weather.conditionEmoji}</div>
            <div>
              <div className="weather-temp">{weather.temperature}°C</div>
              <div className="weather-condition-label">{weather.conditionLabel}</div>
              <div className="weather-feels">Feels like {weather.feelsLike}°C · {weather.isDay ? '🌄 Day' : '🌃 Night'}</div>
            </div>
          </div>

          {/* ── Stats grid ──────────────────────────────────── */}
          <div className="weather-stats-grid">
            <div className="weather-stat">
              <Droplets size={14} color="#3b82f6" />
              <span className="ws-value">{weather.humidity}%</span>
              <span className="ws-label">Humidity</span>
            </div>
            <div className="weather-stat">
              <Wind size={14} color="#94a3b8" />
              <span className="ws-value">{weather.windSpeed} km/h</span>
              <span className="ws-label">Wind {bearing(weather.windDirection)}</span>
            </div>
            <div className="weather-stat">
              <Gauge size={14} color="#a855f7" />
              <span className="ws-value">{weather.pressure} hPa</span>
              <span className="ws-label">Pressure</span>
            </div>
            <div className="weather-stat">
              <Cloud size={14} color="#64748b" />
              <span className="ws-value">{weather.cloudCover}%</span>
              <span className="ws-label">Cloud Cover</span>
            </div>
          </div>

          {/* ── Rain intensity (live mm/h → gauge) ──────────── */}
          <div className="weather-rain-row">
            <div className="weather-rain-header">
              <Thermometer size={13} color="#ef4444" />
              <span>Rain Intensity (Open-Meteo Live)</span>
              <span className="weather-rain-val">
                {weather.rainMmPerHr.toFixed(2)} mm/h
                {weather.rainMmPerHr > 0 && (
                  <ArrowUp size={11} color="#ef4444" style={{ marginLeft:3 }} />
                )}
              </span>
            </div>
            <div className="progress-bar-bg" style={{ marginTop:6 }}>
              <div
                className="progress-bar-fill"
                style={{
                  width: `${weather.rainPct}%`,
                  background:
                    weather.rainPct >= 75 ? 'linear-gradient(90deg,#b91c1c,#ef4444)' :
                    weather.rainPct >= 40 ? 'linear-gradient(90deg,#d97706,#f59e0b)' :
                                           'linear-gradient(90deg,#1d4ed8,#3b82f6)',
                  transition: 'width 1s ease',
                }}
              />
            </div>
            <div className="progress-label">
              <span>0 mm</span>
              <span style={{ color:'var(--text-primary)', fontWeight:600 }}>{weather.rainPct}%</span>
              <span>10+ mm</span>
            </div>
          </div>

          {/* ── 6-Hour Precipitation Probability Chart ───────── */}
          <div className="weather-chart-section">
            <div className="weather-chart-title">
              📊 Next 6 h Precipitation Probability
            </div>
            <div className="precip-chart">
              {weather.next6Hours.map((h, i) => (
                <PrecipBar key={i} {...h} />
              ))}
            </div>
          </div>

          {/* ── Data source attribution (Open-Meteo requires) ── */}
          <div className="weather-attribution">
            ☁️ Weather data by{' '}
            <a
              href="https://open-meteo.com/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color:'#60a5fa' }}
            >
              Open-Meteo
            </a>
            {' '}· Free & Open Source · No API key required
          </div>
        </>
      ) : null}
    </div>
  );
}
