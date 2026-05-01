/**
 * EscapeRoute.js
 * Lists nearest safe zones with cardinal direction arrows,
 * distance, and a safe/caution badge.
 *
 * Props:
 *   zones – array from mockSensors.SAFE_ZONES
 */
import React from 'react';
import { Compass, Activity, Brain } from 'lucide-react';

export default function EscapeRoute({ zones, isDynamic, loading, onRetry, fetchError }) {
  return (
    <div className="card" style={{ position: 'relative' }}>
      <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Compass size={13} /> Escape Routes & Safe Zones
        </span>
      </div>

      {loading && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(19, 25, 41, 0.7)', backdropFilter: 'blur(2px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10, borderRadius: 'var(--radius-lg)'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#818cf8', fontSize: '0.8rem', fontWeight: 600 }}>
            <Activity size={14} className="spin" /> Calculating Zones...
          </span>
        </div>
      )}

      <div className="escape-route-list">
        {zones.length === 0 && !loading && (
          <div style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
              {fetchError
                ? `⚠️ Unable to reach shelter database: timeout or network issue.`
                : 'No verified shelters found within 8km.'}
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                style={{
                  padding: '0.45rem 1.1rem',
                  background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                🔄 Retry Shelter Search
              </button>
            )}
          </div>
        )}
        
        {zones.map((zone, i) => (
          <div className="escape-route-item" key={i}>
            {/* Directional arrow circle */}
            <div className="route-arrow" title={zone.bearing}>
              {zone.direction}
            </div>

            {/* Name + distance */}
            <div>
              <div className="route-name">{zone.name}</div>
              <div className="route-dist">
                📍 {zone.dist}{zone.walkMin ? ` · ~${zone.walkMin} min walk` : ''} · {zone.bearing}
                {zone.elev_label && (
                  <span style={{ marginLeft: 6, color: zone.safe ? '#34d399' : '#f87171', fontWeight: 600 }}>
                    {zone.elev_label}
                  </span>
                )}
              </div>
            </div>

            {/* Safe / Caution badge */}
            {zone.safe
              ? <span className="route-badge-safe">✅ Safe</span>
              : <span className="route-badge-warn">⚠️ Caution</span>}
          </div>
        ))}
      </div>

      <div style={{ marginTop:'0.9rem', fontSize:'0.72rem', color:'var(--text-secondary)', lineHeight:1.5 }}>
        🧭 Follow designated escape routes. Avoid low-lying roads near riverbanks.
        Listen to official announcements from district authorities.
      </div>
    </div>
  );
}
