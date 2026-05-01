/**
 * MLPredictionPanel.js
 * ──────────────────────────────────────────────────────────────────────────
 * Premium dashboard card that displays the JalSetu-ML model's live output:
 *   • Animated flood probability arc gauge
 *   • Risk level badge (Low / Medium / High) with pulsing indicator
 *   • Confidence percentage
 *   • ML engine online/offline chip
 *   • Graceful offline / loading states
 * ──────────────────────────────────────────────────────────────────────────
 */
import React, { useMemo } from 'react';
import { Brain, Wifi, WifiOff, Activity, ShieldAlert, TrendingUp } from 'lucide-react';

/* ── Arc gauge helpers ───────────────────────────────────────────────────── */
const RADIUS = 56;
const CIRC   = 2 * Math.PI * RADIUS;

function polarArc(pct) {
  // Only draw the top-half arc (180°)
  const half = CIRC / 2;
  const fill = (pct / 100) * half;
  return { strokeDasharray: `${fill} ${CIRC - fill}`, strokeDashoffset: CIRC * 0.75 };
}

/* ── Risk colour palette ─────────────────────────────────────────────────── */
function riskStyle(risk) {
  switch (risk) {
    case 'High':   return { color: 'var(--danger,#ef4444)',  bg: 'rgba(239,68,68,0.12)',   arc: '#ef4444' };
    case 'Medium': return { color: 'var(--warning,#f59e0b)', bg: 'rgba(245,158,11,0.12)',  arc: '#f59e0b' };
    default:       return { color: 'var(--safe,#22c55e)',    bg: 'rgba(34,197,94,0.12)',   arc: '#22c55e' };
  }
}

/* ── Sub-components ──────────────────────────────────────────────────────── */
function StatusChip({ online, loading }) {
  if (loading) return (
    <span className="ml-chip ml-chip--loading">
      <Activity size={11} style={{ animation: 'spin 1s linear infinite' }} />
      Analysing…
    </span>
  );
  return online
    ? <span className="ml-chip ml-chip--online"><Wifi size={11} />ML Engine Online</span>
    : <span className="ml-chip ml-chip--offline"><WifiOff size={11} />ML Engine Offline</span>;
}

function OfflineState() {
  return (
    <div className="ml-offline">
      <WifiOff size={32} className="ml-offline-icon" />
      <p className="ml-offline-title">ML Backend Unavailable</p>
      <p className="ml-offline-sub">
        Start the Flask API to enable live predictions:
      </p>
      <code className="ml-offline-cmd">python api_server.py</code>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="ml-offline">
      <div className="ml-spinner" />
      <p className="ml-offline-title">Running Prediction…</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function MLPredictionPanel({ mlResult, mlOnline, mlLoading, mlError }) {
  const pred      = mlResult?.prediction  || null;
  const risk      = mlResult?.risk        || 'Low';
  const floodProb = pred ? Math.round(pred.flood_prob * 100) : 0;
  const confidence= pred ? Math.round(pred.confidence  * 100) : 0;
  const isFlood   = pred?.flood === 'Yes';

  const styles  = useMemo(() => riskStyle(risk), [risk]);
  const arcData = useMemo(() => polarArc(floodProb), [floodProb]);

  const showContent = mlOnline && mlResult;
  const showOffline = !mlOnline;
  const showLoading = mlOnline && !mlResult && !mlError; // Show loading if online but no data yet

  return (
    <div className="card ml-panel">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="card-title" style={{ justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Brain size={13} />
          Flood Prediction
        </span>
        <StatusChip online={mlOnline} loading={showLoading} />
      </div>

      {/* ── Body ──────────────────────────────────────────────────────── */}
      {showOffline && <OfflineState />}
      {showLoading && <LoadingState />}

      {showContent && (
        <div className="ml-body" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '2rem', marginTop: '0.5rem' }}>
          {/* ─ Arc Gauge ─────────────────────────────────────────────── */}
          <div className="ml-gauge-wrap" style={{ flex: '0 0 180px', display: 'flex', justifyContent: 'center' }}>
            <svg viewBox="0 0 140 140" className="ml-gauge-svg" style={{ width: '100%', height: 'auto' }}>
              {/* Track */}
              <circle
                cx="70" cy="70" r={RADIUS}
                fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10"
                strokeDasharray={`${CIRC/2} ${CIRC/2}`}
                strokeDashoffset={CIRC * 0.75}
                strokeLinecap="round"
              />
              {/* Fill — animated via CSS transition on stroke-dasharray */}
              <circle
                cx="70" cy="70" r={RADIUS}
                fill="none"
                stroke={styles.arc}
                strokeWidth="10"
                strokeLinecap="round"
                style={{
                  strokeDasharray:  arcData.strokeDasharray,
                  strokeDashoffset: arcData.strokeDashoffset,
                  transition:       'stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1)',
                  filter:           `drop-shadow(0 0 6px ${styles.arc}88)`,
                }}
              />
              {/* Center text */}
              <text x="70" y="62" textAnchor="middle" className="ml-gauge-pct"
                    fill={styles.arc} fontSize="22" fontWeight="700"
                    fontFamily="'JetBrains Mono',monospace">
                {floodProb}%
              </text>
              <text x="70" y="76" textAnchor="middle" fill="var(--text-dim,#9ca3af)"
                    fontSize="7" letterSpacing="1.5">
                FLOOD PROBABILITY
              </text>
            </svg>
          </div>

          {/* ─ Stats row ─────────────────────────────────────────────── */}
          <div className="ml-stats" style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            {/* Risk Badge */}
            <div className="ml-badge" style={{ background: styles.bg, borderColor: styles.color }}>
              <ShieldAlert size={14} style={{ color: styles.color }} />
              <div>
                <div className="ml-badge-label">Risk Level</div>
                <div className="ml-badge-value" style={{ color: styles.color }}>
                  {risk}
                  {risk === 'High' && (
                    <span className="ml-pulse" style={{ background: styles.color }} />
                  )}
                </div>
              </div>
            </div>

            {/* Flood verdict */}
            <div className="ml-badge" style={{
              background: isFlood ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
              borderColor: isFlood ? '#ef4444' : '#22c55e',
            }}>
              <TrendingUp size={14} style={{ color: isFlood ? '#ef4444' : '#22c55e' }} />
              <div>
                <div className="ml-badge-label">Flood Expected</div>
                <div className="ml-badge-value" style={{ color: isFlood ? '#ef4444' : '#22c55e' }}>
                  {pred?.flood || '—'}
                </div>
              </div>
            </div>

            {/* Confidence */}
            <div className="ml-badge" style={{
              background: 'rgba(99,102,241,0.12)', borderColor: '#6366f1',
            }}>
              <Brain size={14} style={{ color: '#6366f1' }} />
              <div>
                <div className="ml-badge-label">Confidence</div>
                <div className="ml-badge-value" style={{ color: '#6366f1' }}>
                  {confidence}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─ Footer note ───────────────────────────────────────────── */}
      {showContent && (
        <div className="ml-footer" style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', opacity: 0.8 }}>
          <span>Model: Random Forest Fusion</span>
          <span style={{ color: 'var(--safe)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Activity size={10} /> Verified via Live Weather & 30-Day Rain History
          </span>
        </div>
      )}

      {mlError && (
        <p style={{ color:'var(--danger,#ef4444)', fontSize:'0.72rem', marginTop:'0.5rem' }}>
          ⚠ {mlError}
        </p>
      )}
    </div>
  );
}
