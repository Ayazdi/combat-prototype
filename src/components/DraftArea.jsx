import { styles } from '../styles';
import { tileGlyph, tileLabel, tileStyle } from '../tileHelpers';
import { TUNING } from '../constants';

// ============================================================
// DraftArea — the drafting board.
//
// Shows:
//   • 6-tile board row (player picks one per turn)
//   • Hand progress counter
//   • Reroll and RESOLVE controls
// ============================================================
export default function DraftArea({
  phase,
  currentRow,
  boardCardAnimationKeys,
  rerollsLeftEnemy,
  discardsLeftEnemy,
  playerMana,
  deckSize,
  deckShuffleCount,
  handLength,
  handFull,
  allTilesAllocated,
  onPickTile,
  onReroll,
  onDiscardBoardTile,
  onResolve,
}) {
  const rerollDisabled =
    phase !== 'drafting' || rerollsLeftEnemy <= 0 || playerMana < TUNING.draft.rerollManaCost;

  const boardDiscardDisabled =
    phase !== 'drafting' ||
    discardsLeftEnemy <= 0 ||
    playerMana < TUNING.draft.discardManaCost;

  const pickDisabled = phase !== 'drafting' || handFull;

  const resolveDisabled = phase !== 'drafting' || !allTilesAllocated;

  const hint =
    phase !== 'drafting'
      ? phase === 'resolving'
        ? 'resolving…'
        : ''
      : handFull
        ? allTilesAllocated
          ? '✓ all tiles allocated — hit RESOLVE'
          : 'allocate all tiles to resolve'
        : `draft your hand · rerolls left: ${rerollsLeftEnemy}`;

  return (
    <section style={styles.draftArea}>
      {/* Pick counter + status hint */}
      <div style={styles.roundHeader}>
        <span style={styles.roundLabel}>
          TILES {handLength} / {TUNING.hand.handSize}
        </span>
        <span style={styles.hint}>{hint}</span>
      </div>

      {/* 6-tile board row */}
      <div style={styles.row}>
        {currentRow.map((tile, i) => (
          <div key={i} style={styles.tileWrap}>
            <button
              key={`${i}-${boardCardAnimationKeys?.[i] ?? 0}`}
              onClick={() => onPickTile(i)}
              disabled={pickDisabled}
              style={{ ...styles.tile, ...tileStyle(tile) }}
              className="tile-btn tile-card-enter"
            >
              <div style={styles.tileGlyph}>{tileGlyph(tile)}</div>
              <div style={styles.tileLabel}>{tileLabel(tile)}</div>
            </button>
            <button
              type="button"
              onClick={() => onDiscardBoardTile(i)}
              disabled={boardDiscardDisabled}
              style={{
                ...styles.boardDiscardBtn,
                ...(boardDiscardDisabled ? styles.boardDiscardBtnDisabled : {}),
              }}
              className="tile-discard-btn"
              title={`Discard (${discardsLeftEnemy} left · ${TUNING.draft.discardManaCost} MP)`}
            >
              x
            </button>
          </div>
        ))}
      </div>

      {/* Deck info */}
      <div style={styles.deckInfo}>
        <span style={styles.deckChip}>DECK: {deckSize}</span>
        <span style={styles.deckChip}>SHUFFLES: {deckShuffleCount}</span>
      </div>

      {/* Controls */}
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
          <span>REROLL ({rerollsLeftEnemy}/1)</span>
          <span style={styles.ctrlCost}>{TUNING.draft.rerollManaCost} MP</span>
        </button>

        {/* Resolve — highlighted when all tiles allocated */}
        <button
          onClick={onResolve}
          disabled={resolveDisabled}
          style={{
            ...styles.controlBtn,
            ...(resolveDisabled
              ? styles.controlBtnDisabled
              : styles.submitBtnValid),
          }}
          className="ctrl-btn"
        >
          <span style={styles.ctrlIcon}>⏎</span>
          <span>RESOLVE</span>
          <span style={styles.ctrlCost}>
            {allTilesAllocated ? '✓ READY' : 'ALLOCATE ALL'}
          </span>
        </button>
      </div>
    </section>
  );
}
