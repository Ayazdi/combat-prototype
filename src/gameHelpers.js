import { TUNING, ABILITY_COMBOS, PASSIVE_ABILITIES } from './constants';

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
  let mana = 0;
  const segments = [];
  const damageMultiplier = modifiers.damageMultiplier ?? 1;
  const defenceMultiplier = modifiers.defenceMultiplier ?? 1;

  // Parse committed tiles into contiguous runs and compute each segment's output.
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
    } else if (t === 'M') {
      const mult = TUNING.tiles.manaCombos[cap] || 1;
      const gained = Math.round(TUNING.tiles.manaBase * mult);
      mana += gained;
      segments.push({ type: 'M', count, mana: gained, mult });
    }
    i = j;
  }
  return { damage, block, mana, segments };
};

export const getAbilityCombo = (committed, unlockedAbilityIds = null) => {
  const filtered = committed.filter((t) => t !== null && t !== undefined);
  if (filtered.length !== 5) return null;
  const sequence = filtered.join('');
  return ABILITY_COMBOS.find((combo) => (
    combo.pattern === sequence && (!unlockedAbilityIds || unlockedAbilityIds.includes(combo.id))
  )) || null;
};

export const computeAbilityResolution = (combo, context = {}) => {
  const damageMultiplier = context.damageMultiplier ?? 1;
  const defenceMultiplier = context.defenceMultiplier ?? 1;
  const playerShield = context.playerShield ?? 0;
  const lastDamageTaken = context.lastDamageTaken ?? 0;
  const passives = context.passives ?? [];
  const hasPrecision = passives.includes('precision');
  const precisionMult = hasPrecision ? 1.25 : 1;

  // Base tile damage/block/mana from the pattern (e.g. AAAAA → 5A damage, DDDAA → DDD block + AA dmg)
  const { damage: baseTileDmg, block: baseTileBlock, mana: baseTileMana } = computeResolution(
    combo.pattern.split(''),
    { damageMultiplier, defenceMultiplier },
  );

  const base = {
    kind: 'ability',
    ability: combo,
    tiles: combo.pattern.split(''),
    sequence: combo.pattern,
    length: combo.pattern.length,
    damage: baseTileDmg,
    block: baseTileBlock,
    mana: baseTileMana,
    heal: 0,
    manaCost: 0,
    hits: null,
    statusEffect: null,
    abilityBonus: 0,
    effects: [],
    segments: [{
      type: 'ABILITY',
      count: 5,
      pattern: combo.pattern,
      name: combo.name,
      detail: combo.detail,
    }],
  };

  const scaledDamage = (v) => Math.round(v * damageMultiplier);

  switch (combo.effect) {
    case 'barrage': {
      return {
        ...base,
        statusEffect: { type: 'burn' },
        effects: ['Apply Burn'],
      };
    }
    case 'endure':
      return {
        ...base,
        statusEffect: { type: 'endure' },
        effects: ['Absorb next enemy hit'],
      };
    case 'press':
      return {
        ...base,
        statusEffect: { type: 'vulnerable' },
        effects: ['Apply Vulnerable'],
      };
    case 'counter': {
      const hasMomentum = passives.includes('momentum');
      const mult = hasMomentum ? 0.8 : 0.5;
      const bonusDmg = Math.round(playerShield * mult * precisionMult);
      return {
        ...base,
        damage: baseTileDmg + scaledDamage(bonusDmg),
        abilityBonus: bonusDmg,
        effects: [`Counter bonus: +${bonusDmg} dmg (from ${playerShield} shield)`],
      };
    }
    case 'riposte': {
      const hasMomentum = passives.includes('momentum');
      const mult = hasMomentum ? 0.8 : 0.5;
      const bonusDmg = Math.round(lastDamageTaken * mult * precisionMult);
      return {
        ...base,
        damage: baseTileDmg + scaledDamage(bonusDmg),
        abilityBonus: bonusDmg,
        effects: [`Riposte bonus: +${bonusDmg} dmg (from ${lastDamageTaken} last hit)`],
      };
    }
    case 'drain': {
      const hasPredator = passives.includes('predator');
      const stealAmount = hasPredator ? 40 : 20;
      const stealAmountScaled = Math.round(stealAmount * precisionMult);
      return {
        ...base,
        abilityBonus: stealAmountScaled,
        effects: [`Drain: steal up to ${stealAmountScaled} enemy shield`],
      };
    }
    default:
      return base;
  }
};

/**
 * Validate the submitted sequence and return its resolution.
 * A submission is valid if it contains at least one contiguous run of
 * >= TUNING.tiles.minComboLength identical tiles of type A, D, or M,
 * or if a 5-card ability combo is matched.
 * Returns null when invalid.
 */
export const findBestAcceptedSequence = (committed, modifiers = {}) => {
  const filtered = committed.filter((t) => t !== null && t !== undefined);
  if (filtered.length === 0) return null;

  const abilityCombo = getAbilityCombo(filtered, modifiers.unlockedAbilityIds);
  if (abilityCombo) {
    return computeAbilityResolution(abilityCombo, modifiers);
  }

  const { damage, block, mana, segments } = computeResolution(filtered, modifiers);

  const hasValidRun = segments.some(
    (s) => (s.type === 'A' || s.type === 'D' || s.type === 'M') && s.count >= TUNING.tiles.minComboLength,
  );

  if (!hasValidRun) return null;

  return {
    kind: 'basic',
    tiles: filtered,
    damage,
    block,
    mana,
    heal: 0,
    manaCost: 0,
    segments,
    length: filtered.length,
    sequence: filtered.join(''),
  };
};

/** Check whether the submitted hand contains any accepted combo */
export const isValidSequence = (committed, modifiers = {}) => {
  return Boolean(findBestAcceptedSequence(committed, modifiers));
};

export const abilityDescription = (key) => {
  switch (key) {
    case 'charged_strike': return 'Every 3rd attack is Charged Strike (50 dmg)';
    case 'empty_plus': return 'Battle deck shifts +4 No Action tiles';
    case 'armored': return 'Reduces incoming hit damage by 10';
    case 'adaptive': return 'Gains +25 shield whenever you reroll or discard';
    case 'double_discard': return 'Discard limit halved (1 per enemy)';
    default: return '';
  }
};

/**
 * Build and return a shuffled deck array from a composition object.
 * e.g. { A: 10, D: 8, E: 22 } -> 40-element shuffled array.
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

/** Check if a passive's requirements are met given owned ability combo IDs */
export const isPassiveAvailable = (passive, ownedAbilityIds) => {
  if (passive.requiresAll) return passive.requiresAll.every((r) => ownedAbilityIds.includes(r));
  if (passive.requiresAny) return passive.requiresAny.some((r) => ownedAbilityIds.includes(r));
  if (passive.requires) return ownedAbilityIds.includes(passive.requires);
  return true; // universal passives always available
};
