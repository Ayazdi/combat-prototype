const TILE_TYPES = ['A', 'D', 'M'];

const handcraftedCombos = {
  AAAAA: {
    name: 'Execution',
    detail: 'Heavy strike. Bonus damage if the enemy is below 30% HP.',
    effect: 'execution',
    manaCost: 20,
    rarity: 'rare',
  },
  DDDDD: {
    name: 'Iron Wall',
    detail: 'Huge guard. Reduces the incoming attack this turn.',
    effect: 'iron_wall',
    manaCost: 15,
    rarity: 'rare',
  },
  MMMMM: {
    name: 'Mana Surge',
    detail: 'Restore mana. Overflow becomes shield.',
    effect: 'mana_surge',
    manaCost: 0,
    rarity: 'rare',
  },
  AADDM: {
    name: 'Guarded Strike',
    detail: 'Attack, shield, and reduce the next enemy hit.',
    effect: 'guarded_strike',
    manaCost: 10,
  },
  MMADA: {
    name: 'Mana Blade',
    detail: 'Spend mana to add current-mana scaling to a strike.',
    effect: 'mana_blade',
    manaCost: 15,
  },
  DDAMA: {
    name: 'Counter Stance',
    detail: 'Gain shield and reflect part of blocked attack damage.',
    effect: 'counter_stance',
    manaCost: 10,
  },
  MMDMD: {
    name: 'Arcane Barrier',
    detail: 'Gain mana and shield with a temporary shield-cap boost.',
    effect: 'arcane_barrier',
    manaCost: 10,
  },
  AMAMA: {
    name: 'Spell Flurry',
    detail: 'Three smaller hits. Strong into shield, weaker into armor.',
    effect: 'spell_flurry',
    manaCost: 20,
  },
  DMMDD: {
    name: 'Renewing Ward',
    detail: 'Gain shield, then heal if shield remains after the enemy acts.',
    effect: 'renewing_ward',
    manaCost: 10,
  },
  MDDMA: {
    name: 'Life Channel',
    detail: 'Spend mana to heal, then deal a small hit.',
    effect: 'life_channel',
    manaCost: 15,
  },
};

const countTiles = (pattern) => TILE_TYPES.reduce((acc, tile) => {
  acc[tile] = pattern.split(tile).length - 1;
  return acc;
}, {});

const hasAlternatingCore = (pattern) => pattern
  .slice(0, 4)
  .split('')
  .every((tile, i, arr) => i === 0 || tile !== arr[i - 1]);

const inferComboTemplate = (pattern) => {
  const counts = countTiles(pattern);
  const dominant = TILE_TYPES.reduce((best, tile) => (counts[tile] > counts[best] ? tile : best), 'A');
  const starts = pattern[0];
  const ends = pattern[pattern.length - 1];

  if (counts.A >= 4) return {
    effect: ends === 'M' ? 'mana_blade' : 'execution',
    name: ends === 'D' ? 'Finishing Guard' : 'Killing Line',
    detail: ends === 'M' ? 'Attack-heavy finisher with a mana-charged edge.' : 'Attack-heavy finisher with bonus pressure.',
    manaCost: 20,
    rarity: 'rare',
  };
  if (counts.D >= 4) return {
    effect: ends === 'A' ? 'counter_stance' : 'iron_wall',
    name: ends === 'A' ? 'Reversal Guard' : 'Fortress Line',
    detail: ends === 'A' ? 'Defensive stance that can reflect blocked damage.' : 'Defence-heavy guard that softens the enemy hit.',
    manaCost: 15,
    rarity: 'rare',
  };
  if (counts.M >= 4) return {
    effect: ends === 'A' ? 'mana_blade' : 'mana_surge',
    name: ends === 'D' ? 'Warding Surge' : 'Deep Channel',
    detail: ends === 'A' ? 'Mana-heavy strike that converts focus into damage.' : 'Mana-heavy channel that restores resources.',
    manaCost: 0,
    rarity: 'rare',
  };
  if (hasAlternatingCore(pattern) && counts.A >= 2 && counts.M >= 2) return {
    effect: 'spell_flurry',
    name: 'Spell Flurry',
    detail: 'Alternating attack and mana releases several smaller hits.',
    manaCost: 20,
  };
  if (counts.D >= 2 && counts.M >= 2) return {
    effect: starts === 'M' ? 'life_channel' : 'renewing_ward',
    name: starts === 'M' ? 'Life Channel' : 'Renewing Ward',
    detail: starts === 'M' ? 'Spend mana to heal, then deal a small hit.' : 'Gain shield, then heal if shield remains after the enemy acts.',
    manaCost: 15,
  };
  if (counts.A >= 2 && counts.D >= 2) return {
    effect: starts === 'D' ? 'counter_stance' : 'guarded_strike',
    name: starts === 'D' ? 'Counter Stance' : 'Guarded Strike',
    detail: starts === 'D' ? 'Gain shield and reflect part of blocked attack damage.' : 'Attack, shield, and reduce the next enemy hit.',
    manaCost: 10,
  };
  if (counts.A >= 2 && counts.M >= 2) return {
    effect: dominant === 'A' ? 'mana_blade' : 'arcane_bolt',
    name: dominant === 'A' ? 'Mana Blade' : 'Arcane Bolt',
    detail: dominant === 'A' ? 'Spend mana to add current-mana scaling to a strike.' : 'Convert mana-heavy focus into a precise attack.',
    manaCost: 15,
  };
  return {
    effect: dominant === 'D' ? 'arcane_barrier' : dominant === 'M' ? 'mana_surge' : 'guarded_strike',
    name: dominant === 'D' ? 'Arcane Barrier' : dominant === 'M' ? 'Mana Surge' : 'Guarded Strike',
    detail: 'Balanced pattern with a flexible combat effect.',
    manaCost: 10,
  };
};

const buildComboAbilityCatalog = () => {
  const combos = [];
  const build = (prefix) => {
    if (prefix.length === 5) {
      const template = handcraftedCombos[prefix] || inferComboTemplate(prefix);
      combos.push({
        id: `combo_${prefix.toLowerCase()}`,
        pattern: prefix,
        rarity: 'common',
        ...template,
      });
      return;
    }
    TILE_TYPES.forEach((tile) => build(`${prefix}${tile}`));
  };
  build('');
  return combos;
};

// ============================================================
// GAME TUNING - edit these to rebalance without touching logic
// ============================================================
export const TUNING = {
  player: {
    maxHp: 220,
    maxMana: 100,
    maxShield: 80,
    manaRegenPerFoe: 10,
    hpRegenPerFoe: 5,
    startingMana: 100,
  },
  spells: { maxCastsPerTurn: 1 },
  rewardPerks: {
    // Scales perk values by kill number. 0.2 makes the second kill's 10% perk become 12%.
    perEnemyGrowthRate: 0.2,
    damageIncreaseBase: 0.10,
    defenceIncreaseBase: 0.10,
    manaBonusBase: 15,
    hpBonusBase: 20,
  },
  tiles: {
    attackBase: 30,
    defenceBase: 10,
    attackCombos: { 2: 1.4, 3: 1.8, 4: 2.3, 5: 3.0 },
    defenceCombos: { 2: 1.4, 3: 1.8, 4: 2.3, 5: 3.0 },
    manaBase: 5,
    manaCombos: { 2: 1.4, 3: 1.8, 4: 2.3, 5: 3.0 },
    minComboLength: 3,
  },
  comboAbilities: buildComboAbilityCatalog(),
  startingAbilityComboId: 'combo_aaaaa',
  rewardChoicesPerKill: 2,
  draft: {
    rowSize: 6,
    // Base number of selections allowed each turn.
    maxSequence: 5,
    // Action limits and costs.
    maxRerollsPerEnemy: 1,
    maxDiscardsPerTurn: 2,
    discardManaCost: 5,
    rerollManaCost: 25,
  },
  // Deck composition per battle - shuffled fresh when a new enemy fight begins.
  deckComposition: { A: 12, D: 10, M: 8, E: 12 },
  enemyAI: {
    // Weighted random enemy intent: 2 attacks for each 1 defend on average.
    intentWeights: { attack: 2, defend: 1 },
  },
  weights: {
    A: 25,
    D: 25,
    M: 20,
    E: 50,
  },
  enemies: [
    { id: 1, name: 'Slime', hp: 140, attack: 22, defend: 10, ability: null },
    { id: 2, name: 'Goblin', hp: 220, attack: 28, defend: 15, ability: 'charged_strike' },
    { id: 3, name: 'Mage', hp: 230, attack: 30, defend: 20, ability: 'empty_plus' },
    { id: 4, name: 'Knight', hp: 320, attack: 35, defend: 25, ability: 'armored' },
    { id: 5, name: 'Warden', hp: 280, attack: 38, defend: 30, ability: 'adaptive' },
    { id: 6, name: 'Witch', hp: 300, attack: 42, defend: 35, ability: 'double_discard' },
  ],
};
