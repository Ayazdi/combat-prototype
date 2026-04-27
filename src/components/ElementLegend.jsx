import { styles } from '../styles';
import { tileGlyph, tileLabel, tileShort, tileStyle } from '../tileHelpers';

const tiles = ['steel', 'fire', 'ice', 'empty'];

export default function ElementLegend() {
  return (
    <section style={styles.elementLegend}>
      <div style={styles.elementLegendTiles}>
        {tiles.map((tile) => (
          <div key={tile} style={styles.elementLegendItem}>
            <span style={{ ...styles.elementLegendIcon, ...tileStyle(tile) }}>{tileGlyph(tile)}</span>
            <span style={styles.elementLegendText}>{tileShort(tile)} {tileLabel(tile)}</span>
          </div>
        ))}
      </div>
      <div style={styles.elementLegendRule}>
        Fire and Ice cancel 1:1 inside a bucket. Against shields, Ice cancels Fire shield Burn and Fire cancels Ice shield Freeze. Steel never cancels contact effects.
      </div>
    </section>
  );
}
