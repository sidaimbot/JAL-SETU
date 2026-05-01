/**
 * useHistoricalRain.js
 * ─────────────────────────────────────────────────────────────
 * Fetches 30-day historical precipitation from Open-Meteo Archive API.
 * 100% FREE — no API key required.
 * 🔗 https://archive-api.open-meteo.com/
 *
 * Returns:
 *   dailyRain       – array of { date, mm, isFloodDay } for last 30 days
 *   stats           – { maxMm, avgMm, floodDayCount, totalMm }
 *   riskScore       – 0–100 flood proneness index based on rain history
 *   loading, error
 */
import { useState, useEffect, useCallback } from 'react';

/** Threshold for a day to count as a "flood-risk day" */
const FLOOD_MM_THRESHOLD = 30; // mm/day

/** Format a Date to YYYY-MM-DD */
function fmtDate(d) {
  return d.toISOString().split('T')[0];
}

/** Build last-N-days date range */
function getDateRange(days = 30) {
  const end   = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  // Archive API lags 5 days behind real-time; adjust end
  end.setDate(end.getDate() - 5);
  return { startDate: fmtDate(start), endDate: fmtDate(end) };
}

export default function useHistoricalRain(lat, lon) {
  const [dailyRain, setDailyRain] = useState([]);
  const [stats,     setStats]     = useState(null);
  const [riskScore, setRiskScore] = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  const fetch30Days = useCallback(async () => {
    if (!lat || !lon) return;
    const { startDate, endDate } = getDateRange(35);

    const params = new URLSearchParams({
      latitude:  lat,
      longitude: lon,
      start_date: startDate,
      end_date:   endDate,
      // Daily aggregates
      daily: [
        'precipitation_sum',   // total rain mm
        'rain_sum',            // liquid rain mm (excludes snow)
        'precipitation_hours', // hours of rain
        'et0_fao_evapotranspiration', // evaporation — helps assess ponding
      ].join(','),
      timezone: 'auto',
    });

    const url = `https://archive-api.open-meteo.com/v1/archive?${params}`;

    try {
      setLoading(true);
      setError(null);

      const res  = await fetch(url);
      if (!res.ok) throw new Error(`Archive API ${res.status}`);
      const data = await res.json();

      const dates  = data.daily?.time                ?? [];
      const precip = data.daily?.precipitation_sum   ?? [];
      const rain   = data.daily?.rain_sum            ?? [];
      const hours  = data.daily?.precipitation_hours ?? [];

      // Build per-day array
      const daily = dates.map((date, i) => {
        const mm        = +(precip[i] ?? rain[i] ?? 0).toFixed(1);
        const rainMm    = +(rain[i] ?? 0).toFixed(1);
        const rainHours = hours[i] ?? 0;
        return {
          date,
          mm,
          rainMm,
          rainHours,
          isFloodDay:   mm >= FLOOD_MM_THRESHOLD,
          isHeavyDay:   mm >= 75,
          isModeDay:    mm >= 15 && mm < FLOOD_MM_THRESHOLD,
        };
      });

      // Statistics
      const validMm     = daily.filter(d => d.mm > 0).map(d => d.mm);
      const totalMm     = daily.reduce((s, d) => s + d.mm, 0);
      const maxMm       = Math.max(...daily.map(d => d.mm), 0);
      const avgMm       = validMm.length > 0
        ? (totalMm / daily.length).toFixed(1) * 1
        : 0;
      const floodDayCount = daily.filter(d => d.isFloodDay).length;
      const heavyDayCount = daily.filter(d => d.isHeavyDay).length;

      /**
       * Flood Risk Score (0–100)
       * Weighted combination of:
       *   - Flood days frequency (0–35 days)  weight 50%
       *   - Max single-day rainfall            weight 30%
       *   - Average daily rainfall             weight 20%
       */
      const rs = Math.min(100, Math.round(
        (floodDayCount / 35) * 100 * 0.50 +
        Math.min(maxMm / 150, 1)   * 100 * 0.30 +
        Math.min(avgMm / 20, 1)    * 100 * 0.20
      ));

      setDailyRain(daily);
      setStats({ maxMm, avgMm, totalMm: +totalMm.toFixed(1), floodDayCount, heavyDayCount });
      setRiskScore(rs);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [lat, lon]);

  useEffect(() => {
    fetch30Days();
  }, [fetch30Days]);

  return { dailyRain, stats, riskScore, loading, error, refetch: fetch30Days };
}
