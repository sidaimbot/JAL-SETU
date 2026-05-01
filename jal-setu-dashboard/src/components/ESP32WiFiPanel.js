/**
 * ESP32WiFiPanel.js
 * ─────────────────────────────────────────────────────────────
 * Connects to ESP32 via its built-in WiFi web server using the 
 * useESP32 HTTP polling hook. Replaces the Web Serial panel.
 */
import React, { useState } from 'react';
import { Wifi, WifiOff, Server, Activity } from 'lucide-react';
import useESP32, { DEFAULT_CONFIG } from '../hooks/useESP32';

export default function ESP32WiFiPanel({ onData }) {
  const [ip, setIp] = useState(DEFAULT_CONFIG.ip);
  const [endpoint, setEndpoint] = useState(DEFAULT_CONFIG.endpoint);

  const {
    connected,
    lastData,
    error,
    latency,
    active,
    startPolling,
    stopPolling
  } = useESP32({ ip, port: '80', endpoint, pollMs: 2000 }, onData);

  const handleToggle = () => {
    if (active) {
      stopPolling();
    } else {
      startPolling();
    }
  };

  return (
    <div className="card">
      <div className="card-title" style={{ justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Server size={13} /> ESP32 WiFi Connection
        </span>
        <span className={`status-dot ${connected ? 'connected' : (error || !active ? 'disconnected' : 'connecting')}`} />
      </div>

      <div className="esp-config-row">
        <div className="input-group">
          <label>ESP32 IP Address</label>
          <input 
            type="text" 
            value={ip} 
            onChange={e => setIp(e.target.value)}
            disabled={active}
            className="esp-input"
            placeholder="e.g. 192.168.4.1"
          />
        </div>
        <div className="input-group">
          <label>Endpoint</label>
          <input 
            type="text" 
            value={endpoint} 
            onChange={e => setEndpoint(e.target.value)}
            disabled={active}
            className="esp-input"
            placeholder="/api/data"
          />
        </div>
      </div>

      <button
        className={`esp-connect-btn ${active ? (connected ? 'connected' : 'connecting') : ''}`}
        onClick={handleToggle}
      >
        {active ? (
          connected ? <><Wifi size={16} /> Connected (Disconnect)</> : <><Activity size={16} className="spin" /> Connecting... (Cancel)</>
        ) : (
          <><WifiOff size={16} /> Start HTTP Polling</>
        )}
      </button>

      {/* Network Stats */}
      {active && (
        <div className="esp-stats">
          {error ? (
            <div className="esp-error">⚠️ {error}</div>
          ) : connected ? (
            <>
              <div className="mini-stat">
                <span>{latency} ms</span>Ping
              </div>
              <div className="mini-stat">
                <span>{lastData?.rssi ?? '--'} dBm</span>WiFi RSSI
              </div>
              <div className="mini-stat">
                <span className="success-text">Active</span>Status
              </div>
            </>
          ) : (
            <div className="esp-waiting">Polling {ip}...</div>
          )}
        </div>
      )}

      <div className="esp-info-note">
        ESP32 must be connected to the same WiFi network and serve JSON. Ensure CORS headers are sent.
      </div>
    </div>
  );
}
