import { styles } from '../styles';
import { tileGlyph, tileStyle } from '../tileHelpers';

// ============================================================
// HandAndAllocation — shows the 5-tile hand and 3 allocation
// buckets (Attack, Shield, Boost). Boost is greyed out in Phase 1.
//
// Interaction: click a hand tile to cycle its bucket:
//   unassigned → attack → shield → unassigned
// ============================================================
export default function HandAndAllocation({
  hand,
  allocationSlots,
  allocPreview,
  phase,
  allTilesAllocated,
  onAssignTile,
  onDiscardHandTile,
  discardsUsedEnemy,
  maxDiscards,
  playerMana,
  discardCost,
}) {
  const handSize = 5;
  const canDiscard = discardsUsedEnemy < maxDiscards && playerMana >= discardCost;

  const cycleBucket = (i) => {
    if (phase !== 'drafting') return;
    const current = allocationSlots[i];
    const next = current === null ? 'attack' : current === 'attack' ? 'shield' : null;
    onAssignTile(i, next);
  };

  const bucketLabel = (slot) => {
    if (slot === 'attack') return 'ATK';
    if (slot === 'shield') return 'SHD';
    return null;
  };

  const bucketColor = (slot) => {
    if (slot === 'attack') return '#c04040';
    if (slot === 'shield') return '#4080c0';
    return null;
  };

  const allocatedCount = allocationSlots.slice(0, hand.length).filter((s) => s !== null).length;

  return (
    <section style={styles.handArea}>
      {/* Hand row */}
      <div style={styles.handHeader}>
        <span style={styles.committedLabel}>HAND</span>
        <span style={{ fontSize: 10, color: '#6a6258', letterSpacing: '0.12em' }}>
          {hand.length} / {handSize} · Click tile to assign
        </span>
      </div>

      <div style={styles.handRow}>
        {Array.from({ length: handSize }).map((_, i) => {
          const tile = hand[i];
          const slot = allocationSlots[i] ?? null;
          const isFilled = tile !== undefined && tile !== null;
          const label = bucketLabel(slot);
          const labelColor = bucketColor(slot);

          return (
            <div key={i} style={styles.handTileWrapper}>
              <button
                type="button"
                disabled={!isFilled || phase !== 'drafting'}
                onClick={() => isFilled && cycleBucket(i)}
                style={{
                  ...styles.handTileCard,
                  ...(isFilled ? tileStyle(tile) : styles.handTileEmpty),
                  ...(slot ? { outline: `2px solid ${labelColor}`, outlineOffset: 2 } : {}),
                }}
                className="committed-slot-btn"
              >
                {isFilled ? (
                  <>
                    <span style={{ fontSize: 22 }}>{tileGlyph(tile)}</span>
                    {label && (
                      <span style={{ ...styles.handTileTag, color: labelColor }}>
                        {label}
                      </span>
                    )}
                  </>
                ) : (
                  <span style={styles.slotNum}>{i + 1}</span>
                )}
              </button>

              {/* Discard button — only shown when tile is in hand and hand is not yet full */}
              {isFilled && hand.length < handSize && (
                <button
                  type="button"
                  disabled={!canDiscard}
                  onClick={() => onDiscardHandTile(i)}
                  style={styles.handDiscardBtn}
                  className="tile-discard-btn"
                  title={`Discard (−${discardCost} MP)`}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Allocation buckets */}
      <div style={styles.allocationRow}>
        {/* Attack */}
        <div style={styles.allocationBucket}>
          <div style={{ ...styles.allocationBucketHeader, color: '#e8a0a0' }}>⚔ ATTACK</div>
          <div style={styles.allocationBucketBody}>
            {allocPreview?.bucketBreakdowns.attack.length > 0 ? (
              allocPreview.bucketBreakdowns.attack.map((line, i) => (
                <div key={i} style={styles.allocPreviewLine}>{line}</div>
              ))
            ) : (
              <div style={styles.allocBucketEmpty}>no tiles</div>
            )}
            {allocPreview && (
              <div style={{ ...styles.allocPreviewTotal, color: '#e8a0a0' }}>
                → {allocPreview.totalDamage} dmg
                {allocPreview.attackBurnStacks > 0 && ` + ${allocPreview.attackBurnStacks}🔥`}
                {allocPreview.attackFreezeStacks > 0 && ` + ${allocPreview.attackFreezeStacks}❄`}
              </div>
            )}
          </div>
        </div>

        {/* Shield */}
        <div style={styles.allocationBucket}>
          <div style={{ ...styles.allocationBucketHeader, color: '#a0c0e8' }}>⛨ SHIELD</div>
          <div style={styles.allocationBucketBody}>
            {allocPreview?.bucketBreakdowns.shield.length > 0 ? (
              allocPreview.bucketBreakdowns.shield.map((line, i) => (
                <div key={i} style={styles.allocPreviewLine}>{line}</div>
              ))
            ) : (
              <div style={styles.allocBucketEmpty}>no tiles</div>
            )}
            {allocPreview?.shieldResult && (
              <div style={{ ...styles.allocPreviewTotal, color: '#a0c0e8' }}>
                {allocPreview.shieldResult.steelBlock > 0 && `◆ ${allocPreview.shieldResult.steelBlock} BLK`}
                {allocPreview.shieldResult.iceBurnCancel > 0 && `  ❄ ×${allocPreview.shieldResult.iceBurnCancel} burn cancel`}
                {allocPreview.shieldResult.fireFreezeCancel > 0 && `  ✦ ×${allocPreview.shieldResult.fireFreezeCancel} freeze cancel`}
                {allocPreview.shieldResult.steelBlock === 0 && allocPreview.shieldResult.iceBurnCancel === 0 && allocPreview.shieldResult.fireFreezeCancel === 0 && '→ no shield'}
              </div>
            )}
          </div>
        </div>

        {/* Boost — Phase 2 */}
        <div style={{ ...styles.allocationBucket, opacity: 0.35 }}>
          <div style={{ ...styles.allocationBucketHeader, color: '#8a7860' }}>⚡ BOOST</div>
          <div style={{ ...styles.allocationBucketBody, color: '#5a5248' }}>
            <div style={styles.allocBucketEmpty}>Phase 2</div>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div style={styles.allocationStatus}>
        {allTilesAllocated ? (
          <span style={{ color: '#8ad88a', letterSpacing: '0.1em' }}>✓ ALL ALLOCATED — READY TO RESOLVE</span>
        ) : hand.length < handSize ? (
          <span style={{ color: '#7a7265' }}>Draft your hand ({hand.length} / {handSize})</span>
        ) : (
          <span style={{ color: '#d4a24c' }}>
            Allocate tiles — {allocatedCount} / {hand.length} assigned
          </span>
        )}
      </div>
    </section>
  );
}
