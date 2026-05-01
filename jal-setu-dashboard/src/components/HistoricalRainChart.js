/**
 * HistoricalRainChart.js
 * ─────────────────────────────────────────────────────────────
 * Displays a 30-day historical precipitation bar chart using HTML.
 * Highlights days that exceeded the flood threshold.
 */
import React from 'react';
import { History } from 'lucide-react';
import useHistoricalRain from '../hooks/useHistoricalRain';

export default function HistoricalRainChart({ lat, lon }) {
  const { dailyRain, stats, riskScore, loading, error } = useHistoricalRain(lat, lon);

  if (loading) {
    return (
      <div className="card">
        <div className="card-title"><History size={13} /> 30-Day Rain History</div>
        <div className="historical-loading">Loading historical data...</div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="card">
        <div className="card-title"><History size={13} /> 30-Day Rain History</div>
        <div className="historical-error">Failed to load history: {error}</div>
      </div>
    );
  }

  // Find max value across the 30 days for scaling
  const chartMaxMm = Math.max(stats.maxMm, 50); // Minimum scale of 50mm

  return (
    <div className="card">
      <div className="card-title" style={{ justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <History size={13} /> 30-Day Rain History
        </span>
        <span className="historical-risk-badge" style={{
          backgroundColor: riskScore >= 75 ? 'rgba(239, 68, 68, 0.2)' : riskScore >= 40 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(34, 197, 94, 0.2)',
          color: riskScore >= 75 ? 'var(--danger)' : riskScore >= 40 ? 'var(--warning)' : 'var(--safe)',
        }}>
          Risk Score: {riskScore}/100
        </span>
      </div>

      <div className="historical-stats">
        <div className="mini-stat">
          <span>{stats.totalMm} mm</span>Total Rain
        </div>
        <div className="mini-stat">
          <span>{stats.maxMm} mm</span>Max Day
        </div>
        <div className="mini-stat">
          <span style={{ color: stats.floodDayCount > 0 ? 'var(--danger)' : 'inherit' }}>
            {stats.floodDayCount} Days
          </span>
          Flood Risk Days
        </div>
      </div>

      <div className="historical-chart-container">
        {/* Y-Axis Label */}
        <div className="chart-y-axis">
          <span>{chartMaxMm}</span>
          <span>{Math.round(chartMaxMm / 2)}</span>
          <span>0 mm</span>
        </div>

        {/* Bars */}
        <div className="chart-bars">
          {/* 30mm Threshold Line */}
          <div className="threshold-line" style={{ bottom: `${(30 / chartMaxMm) * 100}%` }}>
             <span className="threshold-label">30mm (Risk)</span>
          </div>
          
          {dailyRain.map((day, i) => {
            const heightPct = Math.min((day.mm / chartMaxMm) * 100, 100);
            return (
              <div key={day.date} className="chart-bar-col" title={`${day.date}: ${day.mm} mm`}>
                <div 
                  className={`chart-bar-fill ${day.isFloodDay ? 'flood-bar' : day.isModeDay ? 'warn-bar' : 'safe-bar'}`} 
                  style={{ height: `${heightPct}%` }}
                />
                {/* Only show label for every 7th day, or the last day */}
                {((i % 7 === 0) || i === dailyRain.length - 1) && (
                  <div className="chart-x-label">{day.date.split('-')[2]}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="esp-info-note" style={{ marginTop: '0.75rem' }}>
        Data via Open-Meteo Archive API. Days &gt;30mm indicate elevated antecedent soil moisture.
      </div>
    </div>
  );
}
