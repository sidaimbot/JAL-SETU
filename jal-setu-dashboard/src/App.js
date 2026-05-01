/**
 * App.js
 * ──────────────────────────────────────────────────────────────
 * JAL SETU — IoT Flood Detection & Early Warning Dashboard
 * Hydra-Mesh Architecture · LoRa 866 MHz · ESP32 Edge Nodes
 *
 * State management:
 *   - sensorData   – live (or simulated) sensor readings
 *   - severity     – derived alert level: 'safe' | 'warning' | 'danger'
 *   - timestamp    – human-readable last-update string
 *
 * Data flow:
 *   setInterval (simulateTick) → sensorData state → all child components
 *   Web Serial API → onSerialData callback → sensorData state (same path)
 * ──────────────────────────────────────────────────────────────
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './index.css';

/* ── Components ─────────────────────────────────────────────── */
import AlertBanner        from './components/AlertBanner';
import SensorCards        from './components/SensorCards';
import CountdownTimer     from './components/CountdownTimer';
import HazardMap          from './components/HazardMap';
import EscapeRoute        from './components/EscapeRoute';
import EmergencyContacts  from './components/EmergencyContacts';
import SirenButton        from './components/SirenButton';
import SafetyInstructions from './components/SafetyInstructions';
import WebSerialPanel     from './components/WebSerialPanel';
import ESP32WiFiPanel     from './components/ESP32WiFiPanel';
import WeatherPanel       from './components/WeatherPanel';
import HistoricalRainChart  from './components/HistoricalRainChart';
import MLPredictionPanel   from './components/MLPredictionPanel';

/* ── Custom Hooks ───────────────────────────────────────────── */
import useWeather          from './hooks/useWeather';
import useMLPrediction     from './hooks/useMLPrediction';
import useEscapeRoutes     from './hooks/useEscapeRoutes';
import useHistoricalRain   from './hooks/useHistoricalRain';

/* ── Data & Utilities ───────────────────────────────────────── */
import {
  INITIAL_SENSOR_DATA,
  GPS_COORDS,
  SAFE_ZONES,
  FLOOD_PREDICTED_IN_MINUTES,
  getSeverity,
  simulateTick,
} from './data/mockSensors';

/* ── Sensor update interval (ms) ───────────────────────────── */
const TICK_INTERVAL_MS = 3000; // every 3 seconds

/* ── Format current time ────────────────────────────────────── */
function nowString() {
  return new Date().toLocaleTimeString('en-IN', {
    hour:   '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/* ═══════════════════════════════════════════════════════════════
   ROOT COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function App() {
  /* ── State ──────────────────────────────────────────────── */
  const [sensorData, setSensorData] = useState(INITIAL_SENSOR_DATA);
  const [timestamp,  setTimestamp]  = useState(nowString());
  const [serialMode, setSerialMode] = useState(false); // true when ESP32 is connected
  const [userLocation, setUserLocation] = useState(GPS_COORDS);

  /* ── ML Prediction Engine ───────────────────────────────── */
  const { mlResult, mlOnline, mlLoading, mlError } = useMLPrediction(sensorData);

  /* ── Open-Meteo Live Weather ────────────────────────────── */
  const {
    weather,
    loading:     weatherLoading,
    error:       weatherError,
    lastFetched: weatherFetched,
    refetch:     weatherRefetch,
  } = useWeather(userLocation.lat, userLocation.lon);

  /* ── 30-Day Historical Data (for ML Verification) ───────── */
  const { 
    stats: rainHistoryStats, 
    riskScore: rainHistoryRisk 
  } = useHistoricalRain(userLocation.lat, userLocation.lon);

  /**
   * When Open-Meteo delivers a rain value or location changes, feed it into 
   * the sensor data so the ML engine uses the EXACT location's weather 
   * and 30-day rain history for its flood predictions.
   */
  useEffect(() => {
    if (serialMode || !weather) return;
    setSensorData(prev => ({
      ...prev,
      rainIntensity:   weather.rainPct,     // real mm/h → %
      temperature:     weather.temperature, // real ambient temp
      humidity:        weather.humidity,    // real humidity
      // Pass the 30-day rain context so the backend can verify
      recentRainTotal: rainHistoryStats?.totalMm || 0,
      recentRainRisk:  rainHistoryRisk || 0,
      lat:             userLocation.lat,
      lon:             userLocation.lon
    }));
  }, [weather, serialMode, rainHistoryStats, rainHistoryRisk, userLocation]);

  /* ── Derived severity ───────────────────────────────────── */
  const severity = getSeverity(sensorData.waterLevel, sensorData.rainIntensity);

  /* ── Dynamic Escape Routes from ML ──────────────────────── */
  const { safeZones, loading: fetchingRoutes, fetchError: routeError, retry: retryRoutes } = useEscapeRoutes(userLocation.lat, userLocation.lon, mlResult?.risk);

  /**
   * Compute flood countdown from ML output.
   * flood_prob → minutes: 0% = 240 min, 100% = 5 min (exponential decay)
   * Falls back to the static constant when ML is offline.
   */
  const mlFloodMinutes = useMemo(() => {
    if (!mlResult?.prediction?.flood_prob) return FLOOD_PREDICTED_IN_MINUTES;
    const prob = mlResult.prediction.flood_prob; // 0–1
    // Exponential: high probability → short countdown
    return Math.max(5, Math.round(240 * Math.pow(1 - prob, 1.8)));
  }, [mlResult]);

  /* ── Auto-Locate User on Load ───────────────────────────── */
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            location: 'Geolocated Live Position'
          });
        },
        (err) => {
          console.log("Geolocation error/denied:", err.message);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    }
  }, []);

  const mlDriven = mlOnline && mlResult !== null;

  /* ── Simulated data ticker removed as requested ──────────────────────────────── */
  // The system now exclusively relies on live data via serial mode.

  /* ── Web Serial API callback ────────────────────────────── */
  /**
   * Called by WebSerialPanel when a valid JSON frame arrives from ESP32.
   * Expected frame: { wl, ri, lat, lon, temp, hum, bat, rssi }
   */
  const onSerialData = useCallback((parsed) => {
    setSerialMode(true);
    setSensorData(prev => ({
      ...prev,
      waterLevel:    parsed.wl ?? parsed.wtr ?? parsed.water_level ?? parsed.waterLevel ?? prev.waterLevel,
      rainIntensity: parsed.ri ?? parsed.rn  ?? parsed.rain_intensity ?? parsed.rainIntensity ?? prev.rainIntensity,
      temperature:   parsed.temp  ?? prev.temperature,
      humidity:      parsed.hum   ?? prev.humidity,
      battery:       parsed.bat   ?? prev.battery,
      rssi:          parsed.rssi  ?? prev.rssi,
    }));
    
    // Check if new location data is received
    if (parsed.latitude !== undefined && parsed.longitude !== undefined && parsed.latitude !== 0) {
      setUserLocation({
        lat: parsed.latitude,
        lon: parsed.longitude,
        location: parsed.place || 'Local Node'
      });
    }

    setTimestamp(nowString());
  }, []);

  /* ── Browser tab title updates with alert level ─────────── */
  useEffect(() => {
    const prefixMap = { safe:'✅', warning:'⚠️', danger:'🚨' };
    document.title = `${prefixMap[severity]} Jal Setu — Flood Monitor`;
  }, [severity]);

  /* ═══════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════ */
  return (
    <div className="app-shell">

      {/* ── Fixed Top Navigation Bar ──────────────────────── */}
      <nav className="navbar" role="navigation" aria-label="Main navigation">
        <div className="navbar-brand">
          <span className="logo-icon">🌊</span>
          <div>
            JAL SETU
            <span className="brand-sub">Flood Detection &amp; Early Warning System</span>
          </div>
        </div>
        <div className="navbar-right">
          <span><span className="live-dot" />LIVE</span>
          <span>Hydra-Mesh v2.1</span>
          <span>LoRa 866 MHz</span>
          <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.75rem' }}>
            {timestamp}
          </span>
        </div>
      </nav>

      {/* ── Main dashboard content ────────────────────────── */}
      <main className="main-content" role="main">

        {/* 1 ── Emergency Alert Banner (full width) */}
        <AlertBanner 
          severity={mlResult ? (mlResult.risk === 'High' ? 'danger' : mlResult.risk === 'Medium' ? 'warning' : 'safe') : severity} 
          timestamp={timestamp} 
        />

        {/* 2 ── Live Sensor Cards + Live Weather side by side */}
        <div className="grid-2">
          {/* Left: sensor cards stacked */}
          <SensorCards sensors={sensorData} />

          {/* Right: Open-Meteo weather panel */}
          <WeatherPanel
            weather={weather}
            loading={weatherLoading}
            error={weatherError}
            lastFetched={weatherFetched}
            onRefetch={weatherRefetch}
          />
        </div>

        {/* 3 ── ML Prediction Panel (full width) */}
        <MLPredictionPanel
          mlResult={mlResult}
          mlOnline={mlOnline}
          mlLoading={mlLoading}
          mlError={mlError}
        />

        {/* 4 ── Historical Rain (full width now) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.25rem' }}>
          <HistoricalRainChart lat={userLocation.lat} lon={userLocation.lon} />
        </div>

        {/* 5 ── Map + Hardware Connections side by side */}
        <div className="grid-map">
          <HazardMap 
             coords={userLocation} 
             onLocationChange={setUserLocation} 
             dynamicZones={safeZones}
             mlResult={mlResult}
             sensorData={sensorData} 
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <WebSerialPanel onData={onSerialData} />
            <EscapeRoute zones={safeZones} isDynamic={true} loading={fetchingRoutes} onRetry={retryRoutes} fetchError={routeError} />
          </div>
        </div>

        {/* Unused: Safety Instructions were removed per user request */}

      </main>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="footer" role="contentinfo">
        🌊 Jal Setu · IoT Flood Detection System · Built with{' '}
        <span>♥</span> for Disaster Resilience ·{' '}
        Hydra-Mesh Architecture · ESP32 + LoRa SX1278 · {new Date().getFullYear()}
      </footer>

    </div>
  );
}
