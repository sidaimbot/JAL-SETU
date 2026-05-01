/**
 * useESP32.js
 * ─────────────────────────────────────────────────────────────
 * HTTP polling hook — pulls sensor data from the ESP32's built-in
 * WiFi web server. No flashing required; the ESP32 serves JSON
 * over its existing HTTP endpoint.
 *
 * HOW IT WORKS:
 *   1. ESP32 connects to local WiFi and starts an HTTP server
 *   2. It exposes an endpoint (e.g. /data or /sensor) that returns JSON
 *   3. This hook sends a GET request every `pollMs` milliseconds
 *   4. Parsed values are returned to App.js via onData callback
 *
 * EXPECTED JSON FORMAT FROM ESP32:
 *   { "wl": 67, "ri": 45, "temp": 31.4, "hum": 78,
 *     "bat": 87, "rssi": -72, "lat": 26.1445, "lon": 91.7362 }
 *
 * CORS NOTE:
 *   The ESP32 firmware must send: Access-Control-Allow-Origin: *
 *   Most ESPAsyncWebServer sketches only need one line:
 *     request->send(200, "application/json", json);
 *   + in setup():  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Origin", "*");
 *
 * @param {object}   config  – { ip, port, endpoint, pollMs }
 * @param {function} onData  – callback(parsedObj) on each successful poll
 */
import { useState, useEffect, useRef, useCallback } from 'react';

export const DEFAULT_CONFIG = {
  ip:       '192.168.4.1',   // typical ESP32/ESP8266 Access Point IP
  port:     '80',
  endpoint: '/api/data',     // Updated to match the ESP sketch
  pollMs:   1000,            // updated to 1s to match ESP read interval
};

export default function useESP32(config = DEFAULT_CONFIG, onData) {
  const [connected,    setConnected]    = useState(false);
  const [lastData,     setLastData]     = useState(null);
  const [error,        setError]        = useState(null);
  const [latency,      setLatency]      = useState(null);  // ms
  const [pollCount,    setPollCount]    = useState(0);
  const [active,       setActive]       = useState(false); // user must enable

  const intervalRef = useRef(null);
  const abortRef    = useRef(null);

  /** Build full URL from config */
  const buildUrl = useCallback((cfg) => {
    // If using the proxy target (192.168.4.1), use a relative URL so Webpack's 
    // dev server intercepts it and bypasses the browser's CORS restrictions
    if (cfg.ip === '192.168.4.1') {
      return cfg.endpoint;
    }
    const port = cfg.port && cfg.port !== '80' ? `:${cfg.port}` : '';
    return `http://${cfg.ip}${port}${cfg.endpoint}`;
  }, []);

  /** Single poll attempt */
  const poll = useCallback(async (cfg) => {
    const url = buildUrl(cfg);
    const start = performance.now();

    // Cancel any in-flight request
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch(url, {
        signal:  ctrl.signal,
        cache:   'no-store',
        headers: { 'Accept': 'application/json' },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      const ms   = Math.round(performance.now() - start);

      setLastData(json);
      setLatency(ms);
      setConnected(true);
      setError(null);
      setPollCount(p => p + 1);

      if (typeof onData === 'function') onData(json);

    } catch (err) {
      if (err.name === 'AbortError') return; // intentional cancel
      setConnected(false);
      setError(err.message.includes('Failed to fetch')
        ? `Cannot reach ${url} — check IP & CORS headers`
        : err.message);
    }
  }, [buildUrl, onData]);

  /** Start / stop polling when `active` changes */
  useEffect(() => {
    clearInterval(intervalRef.current);
    if (!active) return;

    poll(config);                                            // immediate first call
    intervalRef.current = setInterval(() => poll(config), config.pollMs ?? 2000);

    return () => {
      clearInterval(intervalRef.current);
      abortRef.current?.abort();
    };
  }, [active, config, poll]);

  return {
    connected,
    lastData,
    error,
    latency,
    pollCount,
    active,
    startPolling: () => setActive(true),
    stopPolling:  () => { setActive(false); setConnected(false); },
  };
}
