// ============================================================
// GAME TUNING — edit these to rebalance without touching logic
// ============================================================
export const TUNING = {
  player: {
    maxHp: 250,
    maxMana: 100,
    maxShield: 40,
    manaRegenPerFoe: 20,
    startingMana: 100,
  },
  tiles: {
    attackBase: 15,
    defenceBase: 10,
    attackCombos: { 2: 1.25, 3: 1.5, 4: 1.75, 5: 3.0 },
    defenceCombos: { 2: 1.1, 3: 1.25, 4: 1.4, 5: 2.0 },
  },
  draft: {
    rowSize: 4,
    // Max tiles the player can commit before submitting
    maxSequence: 5,
    rerollCost: 15,
    discardCost: 25,
  },
  // Only these exact committed sequences are valid.
  // The player must submit one of these or the turn fails.
  acceptedSequences: ['AA', 'AAA', 'AAAA', 'AAAAA', 'DD', 'DDD', 'DDDD', 'DDDDD'],
  weights: {
    A: 20,
    D: 20,
    E: 60,
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
