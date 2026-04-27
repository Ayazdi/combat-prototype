import { TUNING } from '../constants';
import { styles } from '../styles';

export default function ResultOverlay({
  phase,
  enemy,
  enemyIdx,
  onRestart,
  onNextEnemy,
}) {
  if (phase !== 'victory' && phase !== 'defeat') return null;

  const isVictory = phase === 'victory';
  const runCleared = isVictory && enemyIdx >= TUNING.enemies.length - 1;

  return (
    <div style={styles.overlay}>
      <div style={styles.overlayContent}>
        <div style={styles.overlayMark}>{isVictory ? '✦' : '✖'}</div>
        <div style={styles.overlayTitle}>{isVictory ? 'VICTORY' : 'DEFEAT'}</div>
        <div style={styles.overlaySubtitle}>
          {isVictory
            ? runCleared
              ? 'The gauntlet is cleared'
              : `${enemy.name} has fallen`
            : `${enemy.name} has bested you`}
        </div>

        {isVictory && !runCleared && (
          <div style={styles.overlayReward}>
            HP and MP carry forward. Shield resets before the next foe.
          </div>
        )}

        <div style={styles.overlayButtons}>
          <button type="button" onClick={onRestart} style={styles.overlayBtn} className="overlay-btn">
            {isVictory ? 'RESTART RUN' : 'TRY AGAIN'}
          </button>
          {isVictory && !runCleared && (
            <button
              type="button"
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
