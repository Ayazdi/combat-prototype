import { styles } from '../styles';
import { tileGlyph } from '../tileHelpers';

export default function AbilityCombos({ combos = [], totalCount = 0, totalAvailable = 0 }) {
  return (
    <section style={styles.comboCodex}>
      <div style={styles.comboCodexHeader}>
        <span style={styles.comboCodexTitle}>UNLOCKED ABILITY COMBOS</span>
        <span style={styles.comboCodexHint}>{totalCount} / {totalAvailable} unlocked</span>
      </div>
      <div style={styles.comboCodexGrid}>
        {combos.map((combo) => (
          <div key={combo.id} style={styles.comboCodexItem}>
            <div style={styles.comboPattern} aria-label={combo.pattern}>
              {combo.pattern.split('').map((tile, i) => (
                <span key={`${combo.id}-${i}`} style={styles.comboPatternTile}>
                  {tileGlyph(tile)}
                </span>
              ))}
            </div>
            <div style={styles.comboText}>
              <div style={styles.comboName}>{combo.name}</div>
              <div style={styles.comboDetail}>
                {combo.detail}
                {combo.manaCost > 0 ? ` Cost: ${combo.manaCost} MP` : ''}
              </div>
            </div>
          </div>
        ))}
        {combos.length === 0 && (
          <div style={styles.comboDetail}>No ability combos unlocked.</div>
        )}
      </div>
    </section>
  );
}
