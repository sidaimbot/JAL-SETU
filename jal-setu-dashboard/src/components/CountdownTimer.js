/**
 * CountdownTimer.js
 * Displays time remaining until predicted flood arrival.
 *
 * Props:
 *   floodInMinutes – integer, initial minutes until flood
 *   severity       – 'safe'|'warning'|'danger'
 *   mlDriven       – boolean, true when ML engine is supplying the prediction
 */
import React, { useState, useEffect } from 'react';
import { Clock, TrendingUp } from 'lucide-react';

/** Format seconds → HH:MM:SS */
function fmt(totalSeconds) {
  if (totalSeconds <= 0) return '00:00:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

export default function CountdownTimer({ floodInMinutes, severity, mlDriven = false }) {
  const [secondsLeft, setSecondsLeft] = useState(floodInMinutes * 60);

  /* Count down every second */
  useEffect(() => {
    setSecondsLeft(floodInMinutes * 60); // reset if prop changes
  }, [floodInMinutes]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const pct = Math.max(0, Math.min(100, (secondsLeft / (floodInMinutes * 60)) * 100));

  /* Derived colour class based on time remaining */
  const urgency =
    secondsLeft <= 0        ? 'danger'  :
    secondsLeft < 30 * 60  ? 'danger'  :
    secondsLeft < 90 * 60  ? 'warning' : 'safe';

  const predictedAt = new Date(Date.now() + secondsLeft * 1000);
  const predictedStr = predictedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="card">
      <div className="card-title">
        <Clock size={13} /> Flood Prediction Timer
      </div>

      {/* Big countdown display */}
      <div className={`countdown-display ${urgency}`}>
        {secondsLeft <= 0 ? '⚠️ FLOOD NOW' : fmt(secondsLeft)}
      </div>
      <div className="countdown-label">
        {secondsLeft <= 0
          ? 'Flood conditions reached! Follow escape routes immediately.'
          : 'Estimated time until flood impact'}
      </div>

      {/* Thin time-remaining bar */}
      <div style={{ margin: '0.8rem 0' }}>
        <div className="progress-bar-bg">
          <div
            className="progress-bar-fill"
            style={{
              width: `${pct}%`,
              background: urgency === 'danger'
                ? 'linear-gradient(90deg,#b91c1c,#ef4444)'
                : urgency === 'warning'
                ? 'linear-gradient(90deg,#d97706,#f59e0b)'
                : 'linear-gradient(90deg,#16a34a,#22c55e)',
            }}
          />
        </div>
      </div>

      {/* Meta row */}
      <div className="mini-stats">
        <div className="mini-stat"><span>Predicted at {predictedStr}</span>Impact Time</div>
        <div className="mini-stat" style={{display:'flex',alignItems:'center',gap:4}}>
          <TrendingUp size={11} />
          <span>{severity === 'danger' ? 'RISING FAST' : severity === 'warning' ? 'RISING' : 'STABLE'}</span>
          <span style={{color:'var(--text-dim)',fontSize:'0.7rem'}}>Water Trend</span>
        </div>
      </div>
      <div className="countdown-prediction">
        {mlDriven ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            color: '#6366f1', fontWeight: 600,
          }}>
            <span style={{
              display: 'inline-block', width: 7, height: 7,
              borderRadius: '50%', background: '#6366f1',
              animation: 'pulse 1.6s ease-in-out infinite',
            }} />
            ML-Driven Prediction · JalSetu Neural Engine
          </span>
        ) : (
          'Prediction model: Water Rate × Catchment ÷ Discharge Capacity'
        )}
      </div>
    </div>
  );
}
