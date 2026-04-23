// ============================================================
// GAME TUNING — edit these to rebalance without touching logic
// ============================================================
export const TUNING = {
  player: {
    maxHp: 250,
    maxMana: 100,
    maxShield: 50,
    manaRegenPerFoe: 20,
    startingMana: 100,
  },
  tiles: {
    attackBase: 25,
    defenceBase: 20,
    attackCombos: { 2: 1.25, 3: 1.5, 4: 1.75, 5: 3.0 },
    defenceCombos: { 2: 1.25, 3: 2, 4: 3, 5: 4 },
  },
  draft: {
    rowSize: 8,
    // Base number of selections allowed each turn.
    maxSequence: 5,
    // Total rerolls available across the whole run (enemy 1 -> final enemy).
    maxRerollsPerRun: 2,
    rerollCost: 25,
    discardCost: 25,
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
    { id: 1, name: 'Slime', hp: 140, attack: 25, ability: null },
    { id: 2, name: 'Goblin', hp: 260, attack: 30, ability: 'charged_strike' },
    { id: 3, name: 'Mage', hp: 220, attack: 28, ability: 'empty_plus' },
    { id: 4, name: 'Knight', hp: 340, attack: 38, ability: 'no_first_defence' },
    { id: 5, name: 'Warden', hp: 300, attack: 42, ability: 'reroll_lock' },
    { id: 6, name: 'Witch', hp: 260, attack: 35, ability: 'double_discard' },
  ],
};
