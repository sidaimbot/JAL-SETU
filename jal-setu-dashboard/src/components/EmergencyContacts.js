/**
 * EmergencyContacts.js
 * Click-to-call emergency buttons for ambulance, disaster helpline,
 * NDRF, and local rescue. Uses tel: links for mobile dialling.
 */
import React from 'react';
import { Phone } from 'lucide-react';

/** Contact definitions */
const CONTACTS = [
  { label: 'Ambulance',         number: '108',  emoji:'🚑', cls:'red'   },
  { label: 'Disaster Helpline', number: '1078', emoji:'📞', cls:'amber' },
  { label: 'NDRF Control',      number: '011-24363260', emoji:'🛡️', cls:'blue'  },
  { label: 'Police Emergency',  number: '112',  emoji:'🚓', cls:'blue'  },
  { label: 'Fire & Rescue',     number: '101',  emoji:'🚒', cls:'red'   },
  { label: 'State EOC',         number: '1070', emoji:'🏛️', cls:'green' },
];

export default function EmergencyContacts() {
  return (
    <div className="card">
      <div className="card-title">
        <Phone size={13} /> Emergency Contacts
      </div>

      <div className="contact-grid">
        {CONTACTS.map(c => (
          <a
            key={c.number}
            href={`tel:${c.number}`}
            className={`contact-btn ${c.cls}`}
            aria-label={`Call ${c.label} at ${c.number}`}
          >
            <span className="contact-icon">{c.emoji}</span>
            <div>
              {c.label}
              <span className="contact-number">{c.number}</span>
            </div>
          </a>
        ))}
      </div>

      <div style={{ marginTop:'0.9rem', fontSize:'0.72rem', color:'var(--text-secondary)', lineHeight:1.5 }}>
        📱 Tap any button to dial directly. Save these numbers offline.
        Network may be limited during floods — use LoRa mesh for backup comms.
      </div>
    </div>
  );
}
