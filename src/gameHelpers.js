import { TUNING } from './constants';

// ============================================================
// Weighted random helpers
// ============================================================

export const weightedRoll = (weights) => {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [key, w] of Object.entries(weights)) {
    if ((r -= w) < 0) return key;
  }
  return Object.keys(weights)[0];
};

// Build a 6-tile board row with anti-degenerate rule:
// if all 6 slots are the same element, reroll one to a different element.
export const buildBoardRow = (weights = TUNING.weights, size = TUNING.hand.rowSize) => {
  const row = Array.from({ length: size }, () => weightedRoll(weights));
  if (row.every((t) => t === row[0])) {
    const idx = Math.floor(Math.random() * size);
    const others = Object.keys(weights).filter((k) => k !== row[0] && weights[k] > 0);
    row[idx] = others[Math.floor(Math.random() * others.length)];
  }
  return row;
};

// ============================================================
// Deck management
// ============================================================

export const buildShuffledDeck = (composition) => {
  const deck = [];
  for (const [type, count] of Object.entries(composition)) {
    for (let i = 0; i < count; i++) deck.push(type);
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

export const drawFromDeck = (deck, fallbackComposition) => {
  const reshuffled = deck.length === 0;
  const d = reshuffled ? buildShuffledDeck(fallbackComposition) : deck;
  const card = d[d.length - 1];
  return { card, deck: d.slice(0, -1), reshuffled };
};

// ============================================================
// Element bucket resolution — Phase 1 core
// ============================================================

/**
 * Resolve a single bucket (attack or shield) given an array of tile keys.
 *
 * Fire + Ice cancellation within the same bucket:
 *   - Cancelled pairs (min(fire, ice)): each cancelled tile contributes raw base
 *     damage/block at 1.0×, no status effect.
 *   - Surviving tiles: normal combo math (per-element count) + full status.
 *
 * Empty tiles (E) are ignored and contribute nothing.
 *
 * Returns { damage, block, burnStacks, freezeStacks, breakdown }
 * where breakdown is an array of human-readable segment strings for the live preview.
 */
export const computeBucketResult = (tileElements, bucket) => {
  const el = TUNING.elements;
  const comboMult = (n) => TUNING.combos[Math.min(n, 5)] ?? 1.0;

  // Count raw elements (ignore Empty)
  let steelCount = 0;
  let fireCount = 0;
  let iceCount = 0;
  for (const t of tileElements) {
    if (t === 'S') steelCount++;
    else if (t === 'F') fireCount++;
    else if (t === 'I') iceCount++;
    // 'E' ignored
  }

  // Fire + Ice 1:1 cancellation
  const cancelledPairs = Math.min(fireCount, iceCount);
  const survivingFire = fireCount - cancelledPairs;
  const survivingIce = iceCount - cancelledPairs;

  let damage = 0;
  let block = 0;
  let burnStacks = 0;
  let freezeStacks = 0;
  const breakdown = [];

  if (bucket === 'attack') {
    // Cancelled pairs — raw base, no combo, no status
    if (cancelledPairs > 0) {
      const cancelDmg = Math.round(
        cancelledPairs * el.fire.atkBase * 1.0 +
        cancelledPairs * el.ice.atkBase * 1.0,
      );
      damage += cancelDmg;
      breakdown.push(`✦${cancelledPairs}F+❄${cancelledPairs}I cancel → ${cancelDmg} dmg`);
    }

    // Steel
    if (steelCount > 0) {
      const mult = comboMult(steelCount);
      const dmg = Math.round(el.steel.atkBase * steelCount * mult);
      damage += dmg;
      breakdown.push(`◆${steelCount}S ×${mult} → ${dmg} dmg`);
    }

    // Surviving Fire
    if (survivingFire > 0) {
      const mult = comboMult(survivingFire);
      const dmg = Math.round(el.fire.atkBase * survivingFire * mult);
      damage += dmg;
      burnStacks += survivingFire;
      breakdown.push(`✦${survivingFire}F ×${mult} → ${dmg} dmg + ${survivingFire}🔥`);
    }

    // Surviving Ice
    if (survivingIce > 0) {
      const mult = comboMult(survivingIce);
      const dmg = Math.round(el.ice.atkBase * survivingIce * mult);
      damage += dmg;
      freezeStacks += survivingIce;
      breakdown.push(`❄${survivingIce}I ×${mult} → ${dmg} dmg + ${survivingIce}❄`);
    }
  } else if (bucket === 'shield') {
    // Cancelled pairs — wasted (no block, no cancel); penalises mixing ice+fire in shield
    if (cancelledPairs > 0) {
      breakdown.push(`✦${cancelledPairs}F+❄${cancelledPairs}I cancel → wasted`);
    }

    // Steel — HP block with combo multiplier
    if (steelCount > 0) {
      const mult = comboMult(steelCount);
      const blk = Math.round(el.steel.shieldBase * steelCount * mult);
      block += blk;
      breakdown.push(`◆${steelCount}S ×${mult} → ${blk} HP blk`);
    }

    // Surviving Ice — cancels incoming fire burn stacks 1:1 (no combo, no HP block)
    if (survivingIce > 0) {
      burnStacks += survivingIce; // reused field: burnStacks = iceBurnCancel for shield bucket
      breakdown.push(`❄${survivingIce}I → ×${survivingIce} burn cancel`);
    }

    // Surviving Fire — cancels incoming ice freeze stacks 1:1 (no combo, no HP block)
    if (survivingFire > 0) {
      freezeStacks += survivingFire; // reused field: freezeStacks = fireFreezeCancel for shield bucket
      breakdown.push(`✦${survivingFire}F → ×${survivingFire} freeze cancel`);
    }
  }

  return {
    damage,
    block,
    // For shield bucket: burnStacks = iceBurnCancel, freezeStacks = fireFreezeCancel
    burnStacks,
    freezeStacks,
    breakdown,
  };
};

/**
 * Resolve all three allocation buckets.
 * allocation: { attack: string[], shield: string[], boost: string[] }
 * Each array already contains the element keys (not indices).
 */
export const computeAllBuckets = (allocation) => {
  const attackResult = computeBucketResult(allocation.attack ?? [], 'attack');
  const shieldRaw = computeBucketResult(allocation.shield ?? [], 'shield');

  return {
    totalDamage: attackResult.damage,
    attackBurnStacks: attackResult.burnStacks,
    attackFreezeStacks: attackResult.freezeStacks,
    // Elemental shield breakdown (Phase 2)
    shieldResult: {
      steelBlock: shieldRaw.block,
      iceBurnCancel: shieldRaw.burnStacks,   // ice in shield → cancel incoming burns
      fireFreezeCancel: shieldRaw.freezeStacks, // fire in shield → cancel incoming freezes
    },
    // Legacy field kept for any remaining references
    totalBlock: shieldRaw.block,
    bucketBreakdowns: {
      attack: attackResult.breakdown,
      shield: shieldRaw.breakdown,
    },
  };
};

/**
 * Apply freeze modifier to Steel damage only.
 * finalSteelDmg = baseSteelDmg × (1 + stacks × 0.15)
 */
export const applyFreezeModifier = (baseSteelDmg, freezeStacks) =>
  Math.round(baseSteelDmg * (1 + freezeStacks * TUNING.status.freezeMultPerStack));

/**
 * Apply an enemy's elemental shield to the player's attack result.
 * enemyShield: { stacks, element }
 * Returns a new attackResult with damage/stacks reduced.
 */
export const applyEnemyShield = (attackResult, enemyShield) => {
  if (!enemyShield || !enemyShield.stacks) return attackResult;
  let { totalDamage, attackBurnStacks, attackFreezeStacks } = attackResult;
  if (enemyShield.element === 'steel') {
    const blocked = Math.min(totalDamage, enemyShield.stacks * TUNING.elements.steel.shieldBase);
    totalDamage = Math.max(0, totalDamage - blocked);
  } else if (enemyShield.element === 'ice') {
    attackBurnStacks = Math.max(0, attackBurnStacks - enemyShield.stacks);
  } else if (enemyShield.element === 'fire') {
    attackFreezeStacks = Math.max(0, attackFreezeStacks - enemyShield.stacks);
  }
  return { ...attackResult, totalDamage, attackBurnStacks, attackFreezeStacks };
};

/**
 * Human-readable telegraph for an enemy pattern step.
 * pattern: { attack: { dmg, element, stacks }, shield: { stacks, element } }
 */
export const buildTelegraphText = ({ attack, shield }) => {
  const stackSuffix = {
    fire: attack.stacks > 0 ? ` + ${attack.stacks} BURN` : '',
    ice:  attack.stacks > 0 ? ` + ${attack.stacks} FREEZE` : '',
    steel: '',
  }[attack.element] ?? '';
  const atkText = `${attack.dmg} ${attack.element.toUpperCase()} DMG${stackSuffix}`;
  if (!shield || !shield.stacks) return atkText;
  const glyph = { steel: '◆', fire: '✦', ice: '❄' }[shield.element] ?? '?';
  return `${atkText}  |  ${glyph}×${shield.stacks} SHIELD`;
};
