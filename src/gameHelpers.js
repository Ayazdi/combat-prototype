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

export const computeResolution = (committed, modifiers = {}) => {
  let damage = 0;
  let block = 0;
  const segments = [];
  const damageMultiplier = modifiers.damageMultiplier ?? 1;
  const defenceMultiplier = modifiers.defenceMultiplier ?? 1;

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
      const dmg = Math.round(TUNING.tiles.attackBase * mult * damageMultiplier);
      damage += dmg;
      segments.push({ type: 'A', count, damage: dmg, mult });
    } else if (t === 'D') {
      const mult = TUNING.tiles.defenceCombos[cap] || 1;
      const blk = Math.round(TUNING.tiles.defenceBase * mult * defenceMultiplier);
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
export const findBestAcceptedSequence = (committed, modifiers = {}) => {
  const submitted = committed.join('');
  if (!submitted) return null;

  let best = null;
  for (const combo of TUNING.acceptedSequences) {
    if (!submitted.includes(combo)) continue;

    const tiles = combo.split('');
    const resolution = computeResolution(tiles, modifiers);
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
    case 'charged_strike': return 'Every 3rd attack is Charged Strike (50 dmg)';
    case 'empty_plus': return 'Battle deck shifts +4 No Action tiles';
    case 'armored': return 'Reduces incoming hit damage by 10';
    case 'adaptive': return 'Gains +25 shield whenever you reroll or discard';
    case 'double_discard': return 'Discard costs 50 MP';
    default: return '';
  }
};

/**
 * Build and return a shuffled deck array from a composition object.
 * e.g. { A: 10, D: 8, E: 22 } → 40-element shuffled array.
 */
export const buildShuffledDeck = (composition) => {
  const deck = [];
  for (const [type, count] of Object.entries(composition)) {
    for (let i = 0; i < count; i++) deck.push(type);
  }
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

/**
 * Draw one card from the end of the deck array.
 * If the deck is empty, auto-reshuffles from fallbackComposition before drawing.
 * Returns { card, deck, reshuffled } — the drawn card, remaining deck,
 * and whether this draw had to reshuffle first.
 */
export const drawFromDeck = (deck, fallbackComposition) => {
  const reshuffled = deck.length === 0;
  const d = reshuffled ? buildShuffledDeck(fallbackComposition) : deck;
  const card = d[d.length - 1];
  return { card, deck: d.slice(0, -1), reshuffled };
};
