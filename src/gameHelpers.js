import { TUNING } from './constants';

export const weightedRoll = (weights) => {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [key, w] of Object.entries(weights)) {
    if ((r -= w) < 0) return key;
  }
  return Object.keys(weights)[0];
};

export const rollRow = (weights, size = TUNING.draft.rowSize) => {
  const row = Array.from({ length: size }, () => weightedRoll(weights));
  // Anti-degenerate: if all same or all empty, reroll one slot
  if (row.every((t) => t === row[0])) {
    const idx = Math.floor(Math.random() * size);
    const others = Object.keys(weights).filter((k) => k !== row[0]);
    row[idx] = others[Math.floor(Math.random() * others.length)];
  }
  return row;
};

export const computeResolution = (committed) => {
  let damage = 0;
  let block = 0;
  const segments = [];

  // With the new rules committed must be a single pure run (AA, DDD, etc.)
  // but we still parse generically so the preview works for partial picks too.
  let i = 0;
  while (i < committed.length) {
    const t = committed[i];
    if (t === 'E') { segments.push({ type: 'E', count: 1 }); i++; continue; }
    let j = i;
    while (j < committed.length && committed[j] === t) j++;
    const count = j - i;
    const cap = Math.min(count, 5);
    if (t === 'A') {
      const mult = TUNING.tiles.attackCombos[cap] || 1;
      const dmg = Math.round(TUNING.tiles.attackBase * mult);
      damage += dmg;
      segments.push({ type: 'A', count, damage: dmg, mult });
    } else if (t === 'D') {
      const mult = TUNING.tiles.defenceCombos[cap] || 1;
      const blk = Math.round(TUNING.tiles.defenceBase * mult);
      block += blk;
      segments.push({ type: 'D', count, block: blk, mult });
    }
    i = j;
  }
  return { damage, block, segments };
};

/**
 * Find the strongest accepted combo that exists in the submitted hand.
 * "Strongest" is based on current tuning using score = damage + block.
 */
export const findBestAcceptedSequence = (committed) => {
  const submitted = committed.join('');
  if (!submitted) return null;

  let best = null;
  for (const combo of TUNING.acceptedSequences) {
    if (!submitted.includes(combo)) continue;

    const tiles = combo.split('');
    const resolution = computeResolution(tiles);
    const score = resolution.damage + resolution.block;

    if (
      !best ||
      score > best.score ||
      (score === best.score && resolution.damage > best.damage) ||
      (score === best.score && resolution.damage === best.damage && combo.length > best.length)
    ) {
      best = {
        sequence: combo,
        tiles,
        damage: resolution.damage,
        block: resolution.block,
        score,
        length: combo.length,
      };
    }
  }

  return best;
};

/** Check whether the submitted hand contains any accepted combo */
export const isValidSequence = (committed) => {
  return Boolean(findBestAcceptedSequence(committed));
};

export const abilityDescription = (key) => {
  switch (key) {
    case 'charged_strike': return 'Every 3rd turn → Charged Strike (60 dmg)';
    case 'empty_plus': return 'Empty tiles appear more often';
    case 'no_first_defence': return 'First draft row has no Defence tiles';
    case 'reroll_lock': return 'Reroll locked on turns 3 & 6';
    case 'double_discard': return 'Discard cost doubled';
    default: return '';
  }
};
