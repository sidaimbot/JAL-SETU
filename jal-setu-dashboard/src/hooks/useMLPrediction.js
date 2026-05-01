/**
 * useMLPrediction.js
 * ──────────────────────────────────────────────────────────────────────────
 * Custom React hook that bridges the live sensor state to the JalSetu-ML
 * Flask backend (http://localhost:5000).
 *
 * Behaviour:
 *   • On mount: pings GET /health to check if the engine is online.
 *   • On every sensorData change: debounces 4 s then POSTs to /predict/quick.
 *   • Gracefully degrades — dashboard works fine when Flask is offline.
 *
 * Returns:
 *   mlResult   – { prediction, risk, … } or null
 *   mlOnline   – boolean
 *   mlLoading  – boolean
 *   mlError    – string | null
 * ──────────────────────────────────────────────────────────────────────────
 */
import { useState, useEffect, useRef, useCallback } from 'react';

const ML_API_BASE   = 'http://localhost:5000';
const DEBOUNCE_MS   = 2000;   // wait 2 s after last sensor change before calling
const HEALTH_INT_MS = 30000;  // re-check health every 30 s

export default function useMLPrediction(sensorData) {
  const [mlResult,  setMlResult]  = useState(null);
  const [mlOnline,  setMlOnline]  = useState(false);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlError,   setMlError]   = useState(null);

  const debounceRef = useRef(null);
  const onlineRef   = useRef(false); // track without re-renders

  // ── Health probe ────────────────────────────────────────────────────────
  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`${ML_API_BASE}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      const json = await res.json();
      const alive = res.ok && json.engine_loaded;
      setMlOnline(alive);
      onlineRef.current = alive;
      if (alive) setMlError(null);
    } catch {
      setMlOnline(false);
      onlineRef.current = false;
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const id = setInterval(checkHealth, HEALTH_INT_MS);
    return () => clearInterval(id);
  }, [checkHealth]);

  // ── Prediction call ─────────────────────────────────────────────────────
  const runPrediction = useCallback(async (sensor) => {
    if (!onlineRef.current) return;
    try {
      setMlLoading(true);
      setMlError(null);

      const res = await fetch(`${ML_API_BASE}/predict/quick`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(sensor),
        signal:  AbortSignal.timeout(5000),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.status === 'error') throw new Error(data.message);
      setMlResult(data);
    } catch (err) {
      // Don't surface AbortError to the user
      if (err.name !== 'AbortError') setMlError(err.message);
    } finally {
      setMlLoading(false);
    }
  }, []);

  const lastLocationRef = useRef({ lat: null, lon: null });

  // ── Debounced sensor watcher ────────────────────────────────────────────
  useEffect(() => {
    if (!sensorData) return;

    const currentLat = sensorData.lat || null;
    const currentLon = sensorData.lon || null;

    // If the geographical location changed, instantly clear the old prediction 
    // to put the dashboard back into the 'Analysing/Loading' UI state.
    if (currentLat !== lastLocationRef.current.lat || currentLon !== lastLocationRef.current.lon) {
      setMlResult(null);
      lastLocationRef.current = { lat: currentLat, lon: currentLon };
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runPrediction(sensorData);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [sensorData, runPrediction]);

  return { mlResult, mlOnline, mlLoading, mlError };
}
