import { tileGlyph, tileStyle } from '../tileHelpers';
import { styles } from '../styles';

// ============================================================
// AbilitySelectOverlay — full-screen overlay shown at the start
// of every run. Player picks 1 of 4 random ability combos.
// ============================================================
export default function AbilitySelectOverlay({ options = [], onSelect }) {
  if (!options || options.length === 0) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.overlayContent}>
        <div style={styles.overlayMark}>⚔</div>
        <div style={styles.overlayTitle}>CHOOSE YOUR PATH</div>
        <div style={styles.overlaySubtitle}>Select one ability combo to start your run</div>

        <div style={{ ...styles.perkGrid, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginBottom: 0 }}>
          {options.map((combo) => (
            <button
              key={combo.id}
              type="button"
              onClick={() => onSelect(combo.id)}
              style={styles.abilitySelectBtn}
              className="overlay-btn"
            >
              {/* Tile pattern row */}
              <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 8 }}>
                {combo.pattern.split('').map((t, i) => (
                  <span
                    key={i}
                    style={{
                      ...tileStyle(t),
                      width: 28,
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      border: '1px solid',
                      borderRadius: 2,
                    }}
                  >
                    {tileGlyph(t)}
                  </span>
                ))}
              </div>

              <span style={{ ...styles.perkLabel, fontSize: 14, marginBottom: 2 }}>{combo.name}</span>
              <span style={{ fontSize: '0.6rem', opacity: 0.55, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                {combo.pattern}
              </span>
              <span style={styles.perkDetail}>{combo.detail}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
