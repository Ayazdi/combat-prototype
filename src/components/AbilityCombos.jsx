import { TUNING } from '../constants';
import { styles } from '../styles';
import { tileGlyph } from '../tileHelpers';

export default function AbilityCombos() {
  return (
    <section style={styles.comboCodex}>
      <div style={styles.comboCodexHeader}>
        <span style={styles.comboCodexTitle}>ABILITY COMBOS</span>
        <span style={styles.comboCodexHint}>5-card exact patterns</span>
      </div>
      <div style={styles.comboCodexGrid}>
        {TUNING.comboAbilities.map((combo) => (
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
              <div style={styles.comboDetail}>{combo.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
