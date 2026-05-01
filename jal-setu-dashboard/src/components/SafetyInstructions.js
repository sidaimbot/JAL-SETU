/**
 * SafetyInstructions.js
 * Four-panel safety card grid with colour-coded action categories.
 * EVACUATE · AVOID · POWER · SHELTER
 */
import React from 'react';
import { ShieldAlert } from 'lucide-react';

const INSTRUCTIONS = [
  {
    cls:    'evacuate',
    emoji:  '🏃',
    action: 'EVACUATE',
    color:  '#ef4444',
    desc:   'Move to higher ground immediately. Follow marked escape routes. Do not wait for the flood to arrive.',
  },
  {
    cls:    'avoid',
    emoji:  '🚫',
    action: 'AVOID',
    color:  '#f59e0b',
    desc:   'Do NOT enter floodwater. Even 15 cm of fast-moving water can knock you down. Stay away from drains and rivers.',
  },
  {
    cls:    'power',
    emoji:  '⚡',
    action: 'POWER OFF',
    color:  '#a855f7',
    desc:   'Switch off all electricity at the main breaker. Unplug all appliances. Do not touch wet electrical equipment.',
  },
  {
    cls:    'shelter',
    emoji:  '🏠',
    action: 'SHELTER UP',
    color:  '#3b82f6',
    desc:   'If evacuation is not possible, move to the highest floor. Signal rescuers from windows with bright cloth.',
  },
];

export default function SafetyInstructions() {
  return (
    <div className="card">
      <div className="card-title">
        <ShieldAlert size={13} /> Safety Instructions
      </div>

      <div className="safety-grid">
        {INSTRUCTIONS.map(inst => (
          <div className={`safety-card ${inst.cls}`} key={inst.cls}>
            <div className="safety-emoji">{inst.emoji}</div>
            <div className="safety-action" style={{ color: inst.color }}>{inst.action}</div>
            <div className="safety-desc">{inst.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
