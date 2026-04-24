// ============================================================
// GAME TUNING — edit these to rebalance without touching logic
// ============================================================
export const TUNING = {
  player: {
    maxHp: 220,
    maxMana: 100,
    maxShield: 80,
    manaRegenPerFoe: 25,
    hpRegenPerFoe: 20,
    startingMana: 100,
  },
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
    defenceBase: 20,
    attackCombos: { 2: 1.4, 3: 1.8, 4: 2.3, 5: 3.0 },
    defenceCombos: { 2: 1.4, 3: 1.8, 4: 2.3, 5: 3.0 },
  },
  draft: {
    rowSize: 8,
    // Base number of selections allowed each turn.
    maxSequence: 5,
    // Action limits.
    maxRerollsPerEnemy: 1,
    rerollCost: 25,
    discardCost: 25,
  },
  // Deck composition per battle — shuffled fresh when a new enemy fight begins.
  // Total cards = sum of all values. Tune these to adjust tile frequency.
  deckComposition: { A: 12, D: 10, E: 18 }, // 40 cards per battle
  enemyAI: {
    // Weighted random enemy intent: 2 attacks for each 1 defend on average.
    intentWeights: { attack: 2, defend: 1 },
  },
  // Accepted combos. Submit can contain extra tiles/empties; the best
  // available combo from this list is what gets resolved.
  acceptedSequences: [
    'AA', 'AAA', 'AAAA', 'AAAAA',
    'DD', 'DDD', 'DDDD', 'DDDDD',
    'AADD', 'AAADD', 'DDDAA', 'DDAA',
  ],
  weights: {
    A: 25,
    D: 25,
    E: 50,
  },
  enemies: [
    { id: 1, name: 'Slime', hp: 140, attack: 22, defend: 10, ability: null },
    { id: 2, name: 'Goblin', hp: 220, attack: 28, defend: 15, ability: 'charged_strike' },
    { id: 3, name: 'Mage', hp: 230, attack: 30, defend: 20, ability: 'empty_plus' },
    { id: 4, name: 'Knight', hp: 320, attack: 35, defend: 25, ability: 'armored' },
    { id: 5, name: 'Warden', hp: 280, attack: 38, defend: 30, ability: 'adaptive' },
    { id: 6, name: 'Witch', hp: 260, attack: 42, defend: 35, ability: 'double_discard' },
  ],
};
