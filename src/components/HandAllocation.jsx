import { TUNING } from '../constants';
import { styles } from '../styles';
import { tileGlyph, tileLabel, tileShort, tileStyle } from '../tileHelpers';

const assignedTiles = (hand, allocations, bucket) => hand.filter((_, index) => allocations[index] === bucket);

const previewText = (preview, bucket) => {
  if (bucket === 'attack') {
    const parts = [`${preview.damage} dmg`];
    const shield = preview.shieldPreview;
    if (shield?.shieldContacted || shield?.absorbed > 0) {
      if (shield.absorbed > 0) parts.push(`${shield.absorbed} shield`);
      if (shield.hpDamage > 0) parts.push(`${shield.hpDamage} HP`);
      if (shield.cancelledByIce > 0) parts.push(`Ice cancels Burn ${shield.cancelledByIce}`);
      if (shield.cancelledByFire > 0) parts.push(`Fire cancels Freeze ${shield.cancelledByFire}`);
      if (shield.contactBurnStacks > 0) parts.push(`take Burn ${shield.contactBurnStacks} (${shield.contactBurnStacks * TUNING.status.burnPerStack}/tick)`);
      if (shield.contactFreezeStacks > 0) parts.push(`take Freeze ${shield.contactFreezeStacks} (+${Math.round(shield.contactFreezeStacks * TUNING.status.freezeMultPerStack * 100)}% Steel dmg)`);
    }
    const burnStacks = shield ? shield.attackBurnStacks : preview.burnStacks;
    const freezeStacks = shield ? shield.attackFreezeStacks : preview.freezeStacks;
    if (burnStacks > 0) parts.push(`${burnStacks} Burn`);
    if (freezeStacks > 0) parts.push(`${freezeStacks} Freeze`);
    if (preview.cancelledPairs > 0) parts.push(`${preview.cancelledPairs} cancelled`);
    return parts.join(' / ');
  }

  if (bucket === 'shield') {
    const parts = [`${preview.block} block`];
    if (preview.contactBurnStacks > 0) parts.push(`${preview.contactBurnStacks} contact Burn (${preview.contactBurnStacks * TUNING.status.burnPerStack}/tick)`);
    if (preview.contactFreezeStacks > 0) parts.push(`${preview.contactFreezeStacks} contact Freeze (+${Math.round(preview.contactFreezeStacks * TUNING.status.freezeMultPerStack * 100)}% Steel dmg)`);
    if (preview.cancelledPairs > 0) parts.push(`${preview.cancelledPairs} cancelled`);
    return parts.join(' / ');
  }

  return 'disabled in Phase 1';
};

const segmentLabel = (segment) => {
  if (segment.type === 'cancelled') return `F/I x${segment.fire} raw ${segment.value}`;
  if (segment.type === 'steel') return `Steel x${segment.count} ×${segment.mult} = ${segment.damage ?? segment.block}`;
  if (segment.type === 'fire') return `Fire x${segment.count} ×${segment.mult} = ${segment.damage ?? segment.block}`;
  if (segment.type === 'ice') return `Ice x${segment.count} ×${segment.mult} = ${segment.damage ?? segment.block}`;
  return '';
};

export default function HandAllocation({
  phase,
  hand,
  allocationsByIndex,
  handCardAnimationKeys,
  slotCount,
  bucketPreview,
  onAssignTileToBucket,
}) {
  const attackTiles = assignedTiles(hand, allocationsByIndex, 'attack');
  const shieldTiles = assignedTiles(hand, allocationsByIndex, 'shield');
  const boostTiles = [];

  return (
    <section style={styles.allocationArea}>
      <div style={styles.committedHeader}>
        <span style={styles.committedLabel}>HAND ALLOCATION</span>
        <span style={styles.previewStats}>
          <span style={styles.previewDmg}>⚔ {bucketPreview.attack.damage}</span>
          <span style={styles.previewSep}>·</span>
          <span style={styles.previewBlk}>⛨ {bucketPreview.shield.block}</span>
        </span>
      </div>

      <div style={styles.handGrid}>
        {Array.from({ length: slotCount }).map((_, index) => {
          const tile = hand[index];
          const isFilled = Boolean(tile);
          const assigned = allocationsByIndex[index];

          return (
            <div
              key={`${index}-${handCardAnimationKeys?.[index] ?? 0}`}
              style={styles.handTileCell}
              className={isFilled ? 'committed-card-enter' : ''}
            >
              <div
                style={{
                  ...styles.handTile,
                  ...(isFilled ? tileStyle(tile) : styles.committedEmpty),
                }}
                title={isFilled ? tileLabel(tile) : `Slot ${index + 1}`}
              >
                {isFilled ? (
                  <>
                    <span style={styles.handTileGlyph}>{tileGlyph(tile)}</span>
                    <span style={styles.handTileShort}>{tileShort(tile)}</span>
                  </>
                ) : (
                  <span style={styles.slotNum}>{index + 1}</span>
                )}
              </div>

              <div style={styles.assignButtons}>
                <button
                  type="button"
                  disabled={!isFilled || phase !== 'drafting'}
                  onClick={() => onAssignTileToBucket(index, 'attack')}
                  style={{
                    ...styles.assignBtn,
                    ...(assigned === 'attack' ? styles.assignBtnActiveAttack : {}),
                  }}
                  className="assign-btn"
                >
                  A
                </button>
                <button
                  type="button"
                  disabled={!isFilled || phase !== 'drafting'}
                  onClick={() => onAssignTileToBucket(index, 'shield')}
                  style={{
                    ...styles.assignBtn,
                    ...(assigned === 'shield' ? styles.assignBtnActiveShield : {}),
                  }}
                  className="assign-btn"
                >
                  S
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={styles.bucketGrid}>
        <BucketPanel title="Attack" tiles={attackTiles} preview={bucketPreview.attack} tone="attack" />
        <BucketPanel title="Shield" tiles={shieldTiles} preview={bucketPreview.shield} tone="shield" />
        <BucketPanel title="Boost" tiles={boostTiles} preview={bucketPreview.boost} tone="disabled" />
      </div>
    </section>
  );
}

function BucketPanel({ title, tiles, preview, tone }) {
  const isDisabled = tone === 'disabled';
  return (
    <div style={{ ...styles.bucketPanel, ...(isDisabled ? styles.bucketPanelDisabled : {}) }}>
      <div style={styles.bucketHeader}>
        <span>{title}</span>
        <span style={styles.bucketCount}>{tiles.length}</span>
      </div>
      <div style={styles.bucketTiles}>
        {tiles.length === 0 ? (
          <span style={styles.bucketEmpty}>empty</span>
        ) : (
          tiles.map((tile, index) => (
            <span key={`${tile}-${index}`} style={{ ...styles.bucketTileChip, ...tileStyle(tile) }}>
              {tileShort(tile)}
            </span>
          ))
        )}
      </div>
      <div style={tone === 'attack' ? styles.bucketPreviewAttack : styles.bucketPreviewShield}>
        {previewText(preview, tone)}
      </div>
      {!isDisabled && preview.segments.length > 0 && (
        <div style={styles.bucketSegments}>
          {preview.segments.map((segment, index) => (
            <span key={index} style={styles.segChip}>{segmentLabel(segment)}</span>
          ))}
        </div>
      )}
    </div>
  );
}
