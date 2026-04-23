import React, { useState } from 'react';
import { styles } from '../styles';
import { tileGlyph, tileStyle } from '../tileHelpers';

// ============================================================
// CommittedSequence — displays the tiles the player has picked
// so far this turn, along with a live damage/block preview and
// a breakdown of each combo segment.
// ============================================================
export default function CommittedSequence({
  committed,
  slotCount,
  preview,
  selectedCommittedIndex,
  onSelectCommittedTile,
  onMoveCommittedTile,
}) {
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const hasEmptyCell = Array.from({ length: slotCount }).some((_, i) => {
    const tile = committed[i];
    return tile === undefined || tile === 'E';
  });

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

      {/* Tile slots — supports empty-cell movement via drag and drop */}
      <div style={styles.committedRow}>
        {Array.from({ length: slotCount }).map((_, i) => {
          const tile = committed[i];
          const isCard = tile !== undefined;
          const isActionTile = tile === 'A' || tile === 'D';
          const isEmptyCard = tile === 'E';
          const isUnfilled = tile === undefined;
          const isEmptyCell = isEmptyCard || isUnfilled;
          const isSelected = isCard && selectedCommittedIndex === i;
          const canDropHere = dragOverIndex === i && isEmptyCell;
          const isDragging = draggingIndex === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => isCard && onSelectCommittedTile(i)}
              disabled={!isCard}
              draggable={isActionTile && hasEmptyCell}
              onDragStart={(e) => {
                if (!isActionTile || !hasEmptyCell) return;
                e.dataTransfer.effectAllowed = 'move';
                setDraggingIndex(i);
              }}
              onDragEnd={() => {
                setDraggingIndex(null);
                setDragOverIndex(null);
              }}
              onDragOver={(e) => {
                if (draggingIndex === null || !isEmptyCell) return;
                e.preventDefault();
                setDragOverIndex(i);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (draggingIndex === null || !isEmptyCell) return;
                onMoveCommittedTile(draggingIndex, i);
                setDraggingIndex(null);
                setDragOverIndex(null);
              }}
              style={{
                ...styles.committedSlot,
                ...(isUnfilled
                  ? styles.committedEmpty
                  : tileStyle(tile)),
                ...(isSelected ? styles.committedSelected : {}),
                ...(canDropHere ? styles.committedDropTarget : {}),
                ...(isDragging ? styles.committedDragging : {}),
              }}
              className={`committed-slot-btn${isDragging ? ' committed-slot-dragging' : ''}`}
            >
              {!isEmptyCell ? (
                tileGlyph(tile)
              ) : isEmptyCard ? (
                tileGlyph('E')
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
