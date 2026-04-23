import React from 'react';
import { TUNING } from '../constants';
import { styles } from '../styles';

// ============================================================
// ResultOverlay — full-screen overlay shown on victory or
// defeat. Offers "replay" (restart same enemy) and, on
// victory, "next foe" to advance through the gauntlet.
// ============================================================
export default function ResultOverlay({ phase, enemy, enemyIdx, onRestart, onNextEnemy }) {
  if (phase !== 'victory' && phase !== 'defeat') return null;

  const isVictory = phase === 'victory';

  return (
    <div style={styles.overlay}>
      <div style={styles.overlayContent}>
        {/* Large status icon */}
        <div style={styles.overlayMark}>{isVictory ? '✦' : '✖'}</div>

        {/* Title: VICTORY or DEFEAT */}
        <div style={styles.overlayTitle}>{isVictory ? 'VICTORY' : 'DEFEAT'}</div>

        {/* Subtitle with enemy name */}
        <div style={styles.overlaySubtitle}>
          {isVictory ? `${enemy.name} has fallen` : `${enemy.name} has bested you`}
        </div>

        {isVictory && (
          <div style={styles.overlayReward}>
            Gain from victory: +{TUNING.player.manaRegenPerFoe} Mana
          </div>
        )}

        {/* Action buttons */}
        <div style={styles.overlayButtons}>
          <button onClick={onRestart} style={styles.overlayBtn} className="overlay-btn">
            {isVictory ? 'REPLAY' : 'TRY AGAIN'}
          </button>
          {isVictory && enemyIdx < TUNING.enemies.length - 1 && (
            <button
              onClick={onNextEnemy}
              style={{ ...styles.overlayBtn, ...styles.overlayBtnPrimary }}
              className="overlay-btn"
            >
              NEXT FOE →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
