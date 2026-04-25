// ============================================================
// GAME TUNING — edit these to rebalance without touching logic
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
  comboAbilities: [
    {
      id: 'execution',
      pattern: 'AAAAA',
      name: 'Execution',
      detail: 'Heavy strike. Bonus damage if the enemy is below 30% HP.',
    },
    {
      id: 'iron_wall',
      pattern: 'DDDDD',
      name: 'Iron Wall',
      detail: 'Huge guard. Reduces the incoming attack this turn.',
    },
    {
      id: 'mana_surge',
      pattern: 'MMMMM',
      name: 'Mana Surge',
      detail: 'Restore mana. Overflow becomes shield.',
    },
    {
      id: 'guarded_strike',
      pattern: 'AADDM',
      name: 'Guarded Strike',
      detail: 'Attack, shield, and reduce the next enemy hit.',
    },
    {
      id: 'mana_blade',
      pattern: 'MMADA',
      name: 'Mana Blade',
      detail: 'Spend mana to add current-mana scaling to a strike.',
    },
    {
      id: 'counter_stance',
      pattern: 'DDAMA',
      name: 'Counter Stance',
      detail: 'Gain shield and reflect part of blocked attack damage.',
    },
    {
      id: 'arcane_barrier',
      pattern: 'MMDMD',
      name: 'Arcane Barrier',
      detail: 'Gain mana and shield with a temporary shield-cap boost.',
    },
    {
      id: 'spell_flurry',
      pattern: 'AMAMA',
      name: 'Spell Flurry',
      detail: 'Three smaller hits. Strong into shield, weaker into armor.',
    },
    {
      id: 'renewing_ward',
      pattern: 'DMMDD',
      name: 'Renewing Ward',
      detail: 'Gain shield, then heal if shield remains after the enemy acts.',
    },
    {
      id: 'life_channel',
      pattern: 'MDDMA',
      name: 'Life Channel',
      detail: 'Spend mana to heal, then deal a small hit.',
    },
  ],
  draft: {
    rowSize: 6,
    // Base number of selections allowed each turn.
    maxSequence: 5,
    // Action limits.
    maxRerollsPerEnemy: 1,
    maxDiscardsPerEnemy: 3,
  },
  // Deck composition per battle — shuffled fresh when a new enemy fight begins.
  // Total cards = sum of all values. Tune these to adjust tile frequency.
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
