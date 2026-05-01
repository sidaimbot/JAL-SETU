/**
 * SirenButton.js
 * One-tap siren / voice alert using the Web Audio API.
 * Generates a synthesised siren waveform (no audio file needed).
 * Also uses the SpeechSynthesis API to speak a voice instruction.
 */
import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export default function SirenButton({ severity }) {
  const [playing, setPlaying] = useState(false);
  const audioCtxRef  = useRef(null);
  const oscillatorRef = useRef(null);
  const gainRef       = useRef(null);
  const intervalRef   = useRef(null);

  /* Cleanup on unmount */
  useEffect(() => () => stopSiren(), []);

  /** Build a rising/falling oscillator siren */
  function startSiren() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = ctx;

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    osc.start();
    oscillatorRef.current = osc;
    gainRef.current       = gain;

    /* Sweep frequency up and down every 0.5 s */
    let up = true;
    intervalRef.current = setInterval(() => {
      if (!audioCtxRef.current) return;
      const freq = up ? 1100 : 600;
      osc.frequency.exponentialRampToValueAtTime(freq, ctx.currentTime + 0.5);
      up = !up;
    }, 500);

    /* Voice alert via SpeechSynthesis */
    speakAlert(severity);
    setPlaying(true);
  }

  function stopSiren() {
    clearInterval(intervalRef.current);
    if (oscillatorRef.current) {
      try { oscillatorRef.current.stop(); } catch (_) {}
      oscillatorRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setPlaying(false);
  }

  function toggleSiren() {
    playing ? stopSiren() : startSiren();
  }

  /** Voice alert message based on severity */
  function speakAlert(sev) {
    if (!window.speechSynthesis) return;
    const messages = {
      safe:    'System status normal. No immediate flood risk detected.',
      warning: 'Warning! Elevated flood risk detected. Please prepare for evacuation.',
      danger:  'Emergency! Flood is imminent. Evacuate immediately to higher ground. Do not enter flood water.',
    };
    const utterance = new SpeechSynthesisUtterance(messages[sev] || messages.warning);
    utterance.rate   = 0.9;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="card">
      <div className="card-title">
        <Volume2 size={13} /> Emergency Siren &amp; Voice Alert
      </div>

      {/* Audio visualiser – only shown while playing */}
      {playing && (
        <div className="audio-viz">
          {[18, 24, 14, 28, 10, 22, 16].map((h, i) => (
            <span key={i} style={{ height: h }} />
          ))}
        </div>
      )}

      <button
        id="siren-toggle-btn"
        className={`siren-btn ${playing ? 'playing' : ''}`}
        onClick={toggleSiren}
        aria-label={playing ? 'Stop siren' : 'Play emergency siren'}
      >
        {playing
          ? <><VolumeX size={20} /> Stop Alert</>
          : <><Volume2 size={20} /> 🚨 Play Emergency Alert</>}
      </button>

      {playing && (
        <button className="siren-stop-btn" onClick={stopSiren}>
          Stop all alerts &amp; voice
        </button>
      )}

      <div style={{ marginTop:'0.75rem', fontSize:'0.72rem', color:'var(--text-secondary)', lineHeight:1.5 }}>
        Plays a synthesised siren + spoken voice instructions. Works offline. 
        Volume depends on device settings.
      </div>
    </div>
  );
}
