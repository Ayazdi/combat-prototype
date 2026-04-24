import { TUNING } from '../constants';
import { styles } from '../styles';

// ============================================================
// Header — shows the game title, current stage/turn indicator,
// and a row of dots representing enemy progression.
// ============================================================
export default function Header({ enemyIdx, turn }) {
  return (
    <header style={styles.header}>
      {/* Left side: rune icon + title text */}
      <div style={styles.headerLeft}>
        <div style={styles.runeMark}>◈</div>
        <div>
          <div style={styles.titleSmall}>DRAFT OF BLADES</div>
          <div style={styles.subtitle}>stage {enemyIdx + 1} · turn {turn}</div>
        </div>
      </div>

      {/* Right side: stage progression dots */}
      <div style={styles.stageIndicator}>
        {TUNING.enemies.map((e, i) => (
          <div
            key={e.id}
            style={{
              ...styles.stageDot,
              background: i === enemyIdx ? '#d4a24c' : i < enemyIdx ? '#5a4a2a' : '#2a2620',
            }}
          />
        ))}
      </div>
    </header>
  );
}
