/**
 * SensorCards.js
 * Live sensor data cards with animated progress bars.
 * Covers: Water Level, Rain Intensity, and System Status.
 */
import React from 'react';
import { Droplets, CloudRain, Cpu, Thermometer, Battery, Radio } from 'lucide-react';
import { getSeverity } from '../data/mockSensors';

/* ── Helper: coloured progress bar ─────────────────────────── */
function ProgressBar({ value, severity }) {
  const colorMap = {
    safe:    'linear-gradient(90deg, #16a34a, #22c55e)',
    warning: 'linear-gradient(90deg, #d97706, #f59e0b)',
    danger:  'linear-gradient(90deg, #b91c1c, #ef4444)',
  };
  return (
    <div className="progress-wrapper">
      <div className="progress-bar-bg">
        <div
          className="progress-bar-fill"
          style={{
            width:      `${value}%`,
            background: colorMap[severity] || colorMap.safe,
          }}
        />
      </div>
      <div className="progress-label">
        <span>0%</span>
        <span>{value}%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

/* ── Water Level Card ───────────────────────────────────────── */
function WaterLevelCard({ value }) {
  const sev = value >= 75 ? 'danger' : value >= 45 ? 'warning' : 'safe';
  const colors = { safe:'#22c55e', warning:'#f59e0b', danger:'#ef4444' };
  return (
    <div className="card">
      <div className="card-title">
        <Droplets size={13} /> Water Level
      </div>
      <div className="sensor-label">Flood gauge reading</div>
      <div className="sensor-value" style={{ color: colors[sev] }}>
        {value}<span className="sensor-unit">%</span>
      </div>
      <ProgressBar value={value} severity={sev} />
      <div className="mini-stats">
        <div className="mini-stat"><span>{value >= 75 ? 'HIGH' : value >= 45 ? 'MEDIUM' : 'NORMAL'}</span>Threshold</div>
        <div className="mini-stat"><span>HC-SR04</span>Sensor</div>
        <div className="mini-stat"><span>866 MHz</span>LoRa Band</div>
      </div>
    </div>
  );
}

/* ── Rain Intensity Card ────────────────────────────────────── */
function RainIntensityCard({ value }) {
  const sev = value >= 80 ? 'danger' : value >= 50 ? 'warning' : 'safe';
  const colors = { safe:'#22c55e', warning:'#f59e0b', danger:'#ef4444' };
  const label = value >= 80 ? 'Heavy Rain' : value >= 50 ? 'Moderate Rain' : value >= 20 ? 'Light Rain' : 'No Rain';
  return (
    <div className="card">
      <div className="card-title">
        <CloudRain size={13} /> Rain Intensity
      </div>
      <div className="sensor-label">Precipitation intensity</div>
      <div className="sensor-value" style={{ color: colors[sev] }}>
        {value}<span className="sensor-unit">%</span>
      </div>
      <ProgressBar value={value} severity={sev} />
      <div className="mini-stats">
        <div className="mini-stat"><span>{label}</span>Condition</div>
        <div className="mini-stat"><span>Rain Sensor</span>Module</div>
      </div>
    </div>
  );
}

/* ── System Status Card ─────────────────────────────────────── */
function SystemStatusCard({ sensors }) {
  const { waterLevel, rainIntensity, temperature, humidity, battery, rssi, nodeId } = sensors;
  const sev = getSeverity(waterLevel, rainIntensity);
  const labels = { safe:'✅ SAFE', warning:'⚠️ WARNING', danger:'🚨 DANGER' };
  return (
    <div className="card">
      <div className="card-title">
        <Cpu size={13} /> System Status
      </div>
      <div className="sensor-label">Overall risk assessment</div>
      <div className={`status-badge ${sev}`}>{labels[sev]}</div>
      <div className="mini-stats" style={{ marginTop: '0.9rem' }}>
        <div className="mini-stat"><span style={{display:'flex',alignItems:'center',gap:3}}><Thermometer size={11}/>{temperature}°C</span>Temp</div>
        <div className="mini-stat"><span>💧{humidity}%</span>Humidity</div>
        <div className="mini-stat"><span><Battery size={11}/> {battery}%</span>Battery</div>
        <div className="mini-stat"><span><Radio size={11}/> {rssi} dBm</span>LoRa RSSI</div>
        <div className="mini-stat"><span>{nodeId}</span>Node ID</div>
      </div>
    </div>
  );
}

/* ── Exported Composite ─────────────────────────────────────── */
/**
 * @param {{ sensors: object }} props
 */
export default function SensorCards({ sensors }) {
  return (
    <div className="grid-3">
      <WaterLevelCard value={sensors.waterLevel} />
      <RainIntensityCard value={sensors.rainIntensity} />
      <SystemStatusCard sensors={sensors} />
    </div>
  );
}
