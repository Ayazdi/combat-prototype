import { TUNING } from '../constants';
import { styles } from '../styles';
import { tileGlyph, tileLabel, tileShort, tileStyle } from '../tileHelpers';

export default function DraftArea({
  phase,
  currentRow,
  boardCardAnimationKeys,
  rerollsLeftRound,
  discardsAvailable,
  playerMana,
  handLength,
  handFull,
  canResolve,
  deckCounts,
  deckSize,
  deckShuffleCount,
  onPickTile,
  onReroll,
  onDiscardSelected,
  onResolve,
}) {
  const rerollDisabled = phase !== 'drafting' ||
    handFull ||
    rerollsLeftRound <= 0 ||
    playerMana < TUNING.hand.rerollCost;
  const discardDisabled = phase !== 'drafting' ||
    discardsAvailable <= 0 ||
    playerMana < TUNING.hand.discardCost;
  const pickDisabled = phase !== 'drafting' || handFull;
  const resolveDisabled = phase !== 'drafting' || !canResolve;

  return (
    <section style={styles.draftArea}>
      <div style={styles.roundHeader}>
        <span style={styles.roundLabel}>
          HAND {handLength} / {TUNING.hand.handSize}
        </span>
        <span style={styles.hint}>
          {phase === 'drafting'
            ? handFull
              ? 'assign every tile to resolve'
              : `choose one tile • reroll left this round: ${rerollsLeftRound}`
            : phase === 'resolving'
              ? 'resolving...'
              : ''}
        </span>
      </div>

      <div style={styles.row}>
        {currentRow.map((tile, index) => (
          <div key={index} style={styles.tileWrap}>
            <button
              key={`${index}-${boardCardAnimationKeys?.[index] ?? 0}`}
              type="button"
              onClick={() => onPickTile(index)}
              disabled={pickDisabled}
              style={{ ...styles.tile, ...tileStyle(tile) }}
              className="tile-btn tile-card-enter"
              title={tileLabel(tile)}
            >
              <div style={styles.tileGlyph}>{tileGlyph(tile)}</div>
              <div style={styles.tileLabel}>{tileShort(tile)}</div>
            </button>
          </div>
        ))}
      </div>

      <div style={styles.deckInfo}>
        <span style={styles.deckChip}>Deck {deckSize}</span>
        <span style={styles.deckChip}>S {deckCounts?.steel ?? 0}</span>
        <span style={styles.deckChip}>F {deckCounts?.fire ?? 0}</span>
        <span style={styles.deckChip}>I {deckCounts?.ice ?? 0}</span>
        <span style={styles.deckChip}>· {deckCounts?.empty ?? 0}</span>
        <span style={styles.deckChip}>Shuffles {deckShuffleCount}</span>
      </div>

      <div style={styles.controls3}>
        <button
          type="button"
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
          <span style={styles.ctrlCost}>{TUNING.hand.rerollCost} MP</span>
        </button>

        <button
          type="button"
          onClick={onDiscardSelected}
          disabled={discardDisabled}
          style={{
            ...styles.controlBtn,
            ...(discardDisabled ? styles.controlBtnDisabled : {}),
          }}
          className="ctrl-btn"
        >
          <span style={styles.ctrlIcon}>×</span>
          <span>DISCARD LAST</span>
          <span style={styles.ctrlCost}>{TUNING.hand.discardCost} MP</span>
        </button>

        <button
          type="button"
          onClick={onResolve}
          disabled={resolveDisabled}
          style={{
            ...styles.controlBtn,
            ...(resolveDisabled ? styles.controlBtnDisabled : styles.submitBtnValid),
          }}
          className="ctrl-btn"
        >
          <span style={styles.ctrlIcon}>⏎</span>
          <span>RESOLVE</span>
          <span style={styles.ctrlCost}>{canResolve ? 'READY' : 'ALLOCATE'}</span>
        </button>
      </div>
    </section>
  );
}
