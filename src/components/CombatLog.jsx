import React from 'react';
import { styles } from '../styles';

// ============================================================
// CombatLog — a scrollable log of battle events.
// The logEndRef keeps the log auto-scrolled to the bottom
// whenever new entries arrive (handled by the hook's useEffect).
// ============================================================
export default function CombatLog({ log, logEndRef }) {
  return (
    <section style={styles.logSection}>
      <div style={styles.logHeader}>BATTLE LOG</div>
      <div ref={logEndRef} style={styles.logBody}>
        {log.map((entry, i) => (
          <div key={i} style={styles.logEntry}>
            {entry}
          </div>
        ))}
      </div>
    </section>
  );
}
