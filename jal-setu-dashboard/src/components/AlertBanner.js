/**
 * AlertBanner.js
 * Full-width emergency alert bar at the top of the dashboard.
 * Colour and animation change based on current severity level.
 */
import React from 'react';
import { AlertTriangle, CheckCircle, AlertOctagon } from 'lucide-react';

/** Map severity → display config */
const CONFIG = {
  safe: {
    icon:    <CheckCircle size={28} color="#22c55e" />,
    title:   '✅ All Systems Normal — No Flood Risk',
    badge:   'SAFE',
    emoji:   '🟢',
  },
  warning: {
    icon:    <AlertTriangle size={28} color="#f59e0b" />,
    title:   '⚠️ Flood Alert — Elevated Risk Detected',
    badge:   'WARNING',
    emoji:   '🟡',
  },
  danger: {
    icon:    <AlertOctagon size={28} color="#ef4444" />,
    title:   '🚨 CRITICAL — Flood Imminent! Evacuate Now',
    badge:   'DANGER',
    emoji:   '🔴',
  },
};

/**
 * @param {{ severity: 'safe'|'warning'|'danger', timestamp: string }} props
 */
export default function AlertBanner({ severity, timestamp }) {
  const cfg = CONFIG[severity] || CONFIG.safe;

  return (
    <div className={`alert-banner ${severity}`} role="alert" aria-live="assertive">
      {/* Left: icon + text */}
      <div className="alert-left">
        <div className="alert-icon">{cfg.emoji}</div>
        <div>
          <div className="alert-title">{cfg.title}</div>
          <div className="alert-sub">
            Hydra-Mesh Node Active · LoRa 866 MHz · Gateway Connected
          </div>
        </div>
      </div>

      {/* Right: badge + timestamp */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
        <span className={`alert-badge ${severity}`}>{cfg.badge}</span>
        <span className="alert-timestamp">Last updated: {timestamp}</span>
      </div>
    </div>
  );
}
