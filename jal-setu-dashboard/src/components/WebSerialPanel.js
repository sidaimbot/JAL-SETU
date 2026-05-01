/**
 * WebSerialPanel.js
 * Placeholder / structural integration for the Web Serial API.
 *
 * In production:
 *   1. Click "Connect ESP32" – browser shows port picker
 *   2. Data frames from ESP32 arrive as JSON lines, e.g.:
 *      {"wl":67,"ri":45,"lat":26.1445,"lon":91.7362}
 *   3. The onData callback passes parsed values to App.js state
 *
 * Props:
 *   onData(parsedObj) – called each time a valid frame arrives
 */
import React, { useState, useRef } from 'react';
import { Usb, Wifi, WifiOff } from 'lucide-react';

export default function WebSerialPanel({ onData }) {
  const [connected,  setConnected]  = useState(false);
  const [baudRate,   setBaudRate]   = useState(115200);
  const [logs,       setLogs]       = useState([
    '> Waiting for ESP32 connection…',
    '> Using simulated data (setInterval)',
  ]);
  const portRef   = useRef(null);
  const readerRef = useRef(null);

  /** Append a line to the in-panel log */
  function addLog(msg) {
    setLogs(prev => [...prev.slice(-40), `> ${msg}`]);
  }

  /**
   * Connect to or disconnect from the ESP32 via Web Serial API.
   * Falls back gracefully if the browser doesn't support it.
   */
  async function toggleConnection() {
    /* ── Disconnect ──────────────────────────────────────── */
    if (connected) {
      try {
        await readerRef.current?.cancel();
        await portRef.current?.close();
      } catch (_) {}
      portRef.current   = null;
      readerRef.current = null;
      setConnected(false);
      addLog('Disconnected from serial port.');
      return;
    }

    /* ── Check Web Serial API support ────────────────────── */
    if (!('serial' in navigator)) {
      addLog('ERROR: Web Serial API not supported in this browser.');
      addLog('Use Chrome / Edge 89+ over HTTPS.');
      return;
    }

    try {
      /* Request user to select the ESP32 COM port */
      addLog('Requesting serial port…');
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: baudRate });
      portRef.current = port;
      setConnected(true);
      addLog(`Connected at ${baudRate} baud.`);
      addLog('Listening for JSON frames from ESP32…');

        /* Stream reader loop */
      const decoder = new TextDecoder();
      const reader  = port.readable.getReader();
      readerRef.current = reader;
      let buffer = '';

      // Continuous Stream Processing (No Newline Required)
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // 1. Try to extract JSON blocks
        const jsonMatch = buffer.match(/\{[^{}]+\}/);
        if (jsonMatch) {
          try {
            const fixedStr = jsonMatch[0].replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":');
            const parsed = JSON.parse(fixedStr);
            const wVal = parsed.wl ?? parsed.wtr ?? parsed.waterLevel ?? parsed.water_level;
            const rVal = parsed.ri ?? parsed.rn ?? parsed.rainIntensity ?? parsed.rain_intensity;
            
            if (wVal !== undefined || rVal !== undefined) {
              addLog(`JSON RX: wtr=${wVal ?? '--'} rn=${rVal ?? '--'}`);
              onData && onData(parsed); 
            }
          } catch (e) {
            addLog(`JSON ERR: ${jsonMatch[0]}`);
          }
           // Remove processed JSON block
          buffer = buffer.replace(jsonMatch[0], '');
          continue; // Re-evaluate buffer
        }

        // 2. Try to extract Plain Text formats continuously accumulating in buffer
        // Look for: "Water Level: <num>%" followed anywhere by "Rain Intensity: <num>%"
        const textMatch = buffer.match(/Water Level:\s*([\d.]+)%?\s*Rain Intensity:\s*([\d.]+)%?/i);
        if (textMatch) {
           const water_level = parseFloat(textMatch[1]);
           const rain_intensity = parseFloat(textMatch[2]);
           
           addLog(`TEXT RX: wtr=${water_level} rn=${rain_intensity}`);
           onData && onData({ water_level, rain_intensity });
           
           // Clear buffer string up to the end of this match to avoid duplicate triggers
           buffer = buffer.substring(buffer.indexOf(textMatch[0]) + textMatch[0].length);
           continue;
        }

        // 3. Fallback print for debugging (only print when buffer stalls without a match for a while)
        if (buffer.length > 150) {
           addLog(`RAW: ${buffer.substring(0, 100)}...`);
           buffer = buffer.substring(100); // chunk it out
        }
      }
    } catch (err) {
      addLog(`ERR: ${err.message}`);
      setConnected(false);
    }
  }

  return (
    <div className="card">
      <div className="card-title">
        <Usb size={13} /> Web Serial API — ESP32 Gateway
      </div>

      {/* Inline terminal log */}
      <div className="serial-panel">
        <div className="serial-log" id="serial-log-output">
          {logs.map((l, i) => (
            <div key={i} className={l.startsWith('> ERR') ? '' : 'log-dim'}>{l}</div>
          ))}
        </div>
      </div>

      {/* Connect / Disconnect button */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
        <select 
          value={baudRate} 
          onChange={(e) => setBaudRate(Number(e.target.value))}
          disabled={connected}
          style={{
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            borderRadius: '8px',
            padding: '0 0.5rem',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.8rem'
          }}
        >
          <option value={9600}>9600</option>
          <option value={19200}>19200</option>
          <option value={38400}>38400</option>
          <option value={57600}>57600</option>
          <option value={115200}>115200</option>
        </select>

        <button
          id="serial-connect-btn"
          style={{ flex: 1, marginTop: 0 }}
          className={`serial-connect-btn ${connected ? 'connected' : ''}`}
          onClick={toggleConnection}
          aria-label={connected ? 'Disconnect from ESP32' : 'Connect ESP32 via USB'}
        >
          {connected
            ? <><Wifi size={15} /> Connected — Disconnect</>
            : <><WifiOff size={15} /> Connect ESP32 (USB)</>}
        </button>
      </div>

      {/* Info note */}
      <div style={{ marginTop:'0.75rem', fontSize:'0.7rem', color:'var(--text-dim)', lineHeight:1.55 }}>
        Requires Chrome/Edge 89+ · HTTPS or localhost · ESP32 must send 115200 baud JSON lines.
        Demo mode uses simulated data automatically.
      </div>
    </div>
  );
}
