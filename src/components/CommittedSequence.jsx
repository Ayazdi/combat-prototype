import React from 'react';
import { TUNING } from '../constants';
import { styles } from '../styles';
import { tileGlyph, tileStyle } from '../tileHelpers';

// ============================================================
// CommittedSequence — displays the tiles the player has picked
// so far this turn, along with a live damage/block preview and
// a breakdown of each combo segment.
// ============================================================
export default function CommittedSequence({
  committed,
  preview,
  selectedCommittedIndex,
  onSelectCommittedTile,
}) {
  return (
    <section style={styles.committedArea}>
      {/* Header row: label + live dmg / block totals */}
      <div style={styles.committedHeader}>
        <span style={styles.committedLabel}>COMMITTED SEQUENCE</span>
        <span style={styles.previewStats}>
          <span style={styles.previewDmg}>⚔ {preview.damage}</span>
          <span style={styles.previewSep}>·</span>
          <span style={styles.previewBlk}>⛨ {preview.block}</span>
        </span>
      </div>

      {/* Tile slots — 5 slots (maxSequence), filled or dashed-empty */}
      <div style={styles.committedRow}>
        {Array.from({ length: TUNING.draft.maxSequence }).map((_, i) => {
          const tile = committed[i];
          const isSelected = tile && selectedCommittedIndex === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => tile && onSelectCommittedTile(i)}
              disabled={!tile}
              style={{
                ...styles.committedSlot,
                ...(tile ? tileStyle(tile) : styles.committedEmpty),
                ...(isSelected ? styles.committedSelected : {}),
              }}
              className="committed-slot-btn"
            >
              {tile ? (
                tileGlyph(tile)
              ) : (
                <span style={styles.slotNum}>{i + 1}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Segment breakdown — shows combo multipliers */}
      <div style={styles.segmentBreakdown}>
        {preview.segments.length === 0 ? (
          <span style={styles.breakdownEmpty}>no tiles committed yet</span>
        ) : (
          preview.segments.map((s, i) => (
            <span key={i} style={styles.segChip}>
              {s.type === 'A' && `${'A'.repeat(s.count)} ×${s.mult} = ${s.damage}`}
              {s.type === 'D' && `${'D'.repeat(s.count)} ×${s.mult} = ${s.block}`}
              {s.type === 'E' && 'EMPTY'}
            </span>
          ))
        )}
      </div>
    </section>
  );
}
