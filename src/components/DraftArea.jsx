import React from 'react';
import { TUNING } from '../constants';
import { styles } from '../styles';
import { tileGlyph, tileLabel, tileStyle } from '../tileHelpers';

// ============================================================
// DraftArea — the main drafting interface.
//
// Shows:
//   • The current draft row of tiles (player picks one per round)
//   • A pick counter ("PICK 2 / 5")
//   • Reroll, Discard, and SUBMIT buttons
//
// The player builds a sequence of up to maxSequence tiles then
// hits SUBMIT. Only accepted pure sequences (AA, DDD, …) pass.
// ============================================================
export default function DraftArea({
  round,
  phase,
  currentRow,
  rerollLocked,
  rerollsLeftRun,
  playerMana,
  discardCost,
  deckSize,
  deckCounts,
  deckShuffleCount,
  deckIsShuffled,
  picksUsed,
  pickLimit,
  committedLength,
  selectedCommittedIndex,
  sequenceValid,
  sequenceFull,
  onPickTile,
  onReroll,
  onDiscardSelected,
  onSubmit,
}) {
  const rerollDisabled =
    phase !== 'drafting' || rerollLocked || rerollsLeftRun <= 0 || playerMana < TUNING.draft.rerollCost;

  const discardDisabled =
    phase !== 'drafting' ||
    committedLength === 0 ||
    selectedCommittedIndex === null ||
    playerMana < discardCost;

  // Can't pick more tiles once we hit the max
  const pickDisabled = phase !== 'drafting' || sequenceFull;

  // Submit requires at least 1 tile committed
  const submitDisabled = phase !== 'drafting' || committedLength === 0;

  return (
    <section style={styles.draftArea}>
      {/* Pick counter + status hint */}
      <div style={styles.roundHeader}>
        <span style={styles.roundLabel}>
          PICKS {picksUsed} / {pickLimit}
        </span>
        <span style={styles.hint}>
          {phase === 'drafting'
            ? sequenceFull
              ? 'max reached — submit or discard'
              : `choose one tile • rerolls left: ${rerollsLeftRun}`
            : phase === 'resolving'
              ? 'resolving…'
              : ''}
        </span>
      </div>

      {/* Tile row — one button per tile */}
      <div style={styles.row}>
        {currentRow.map((tile, i) => (
          <button
            key={i}
            onClick={() => onPickTile(i)}
            disabled={pickDisabled}
            style={{ ...styles.tile, ...tileStyle(tile) }}
            className="tile-btn"
          >
            <div style={styles.tileGlyph}>{tileGlyph(tile)}</div>
            <div style={styles.tileLabel}>{tileLabel(tile)}</div>
          </button>
        ))}
      </div>

      {/* Deck tracking panel */}
      <div style={styles.deckInfo}>
        <span style={styles.deckChip}>LEFT: {deckSize}</span>
        <span style={styles.deckChip}>A: {deckCounts?.A ?? 0}</span>
        <span style={styles.deckChip}>D: {deckCounts?.D ?? 0}</span>
        <span style={styles.deckChip}>E: {deckCounts?.E ?? 0}</span>
        <span style={styles.deckChip}>SHUFFLED: {deckIsShuffled ? 'YES' : 'NO'}</span>
        <span style={styles.deckChip}>SHUFFLES: {deckShuffleCount}</span>
      </div>

      {/* Reroll / Discard / Submit controls */}
      <div style={styles.controls3}>
        <button
          onClick={onReroll}
          disabled={rerollDisabled}
          style={{
            ...styles.controlBtn,
            ...(rerollDisabled ? styles.controlBtnDisabled : {}),
          }}
          className="ctrl-btn"
        >
          <span style={styles.ctrlIcon}>↻</span>
          <span>REROLL</span>
          <span style={styles.ctrlCost}>{TUNING.draft.rerollCost} MP • {rerollsLeftRun} LEFT</span>
        </button>

        <button
          onClick={onDiscardSelected}
          disabled={discardDisabled}
          style={{
            ...styles.controlBtn,
            ...(discardDisabled ? styles.controlBtnDisabled : {}),
          }}
          className="ctrl-btn"
        >
          <span style={styles.ctrlIcon}>✕</span>
          <span>DISCARD SELECTED</span>
          <span style={styles.ctrlCost}>{discardCost} MP</span>
        </button>

        {/* SUBMIT — highlighted green when the sequence is valid */}
        <button
          onClick={onSubmit}
          disabled={submitDisabled}
          style={{
            ...styles.controlBtn,
            ...(submitDisabled
              ? styles.controlBtnDisabled
              : sequenceValid
                ? styles.submitBtnValid
                : styles.submitBtnInvalid),
          }}
          className="ctrl-btn"
        >
          <span style={styles.ctrlIcon}>⏎</span>
          <span>SUBMIT</span>
          <span style={styles.ctrlCost}>
            {sequenceValid ? '✓ VALID' : '✗ INVALID'}
          </span>
        </button>
      </div>
    </section>
  );
}
