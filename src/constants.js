// ============================================================
// GAME TUNING — Phase 1: Element System
// ============================================================
export const TUNING = {
  player: {
    maxHp: 300,
    maxMana: 100,
    maxShield: 60,
    manaRegenPerTurn: 15,
    startingMana: 100,
    hpRegenPerFoe: 10,
    manaRegenPerFoe: 0,
  },
  hand: {
    handSize: 5,
    rowSize: 6,
    rounds: 5,
    rerollCost: 20,
    discardCost: 30,
  },
  rewardChoicesPerKill: 1,

  // Kept for DraftArea compatibility
  draft: {
    rowSize: 6,
    maxSequence: 5,
    maxRerollsPerEnemy: 1,
    maxDiscardsPerTurn: 2,
    discardManaCost: 30,
    rerollManaCost: 20,
  },
  combos: { 1: 1.0, 2: 1.3, 3: 1.6, 4: 2.0, 5: 2.8 },
  elements: {
    steel: { atkBase: 12, shieldBase: 10 },
    fire:  { atkBase: 6,  shieldBase: 4  },
    ice:   { atkBase: 5,  shieldBase: 8  },
  },
  status: {
    burnPerStack: 4,
    burnDuration: 2,
    burnMaxStacks: 10,
    freezeMultPerStack: 0.15,
    freezeMaxStacks: 5,
  },
  // Phase 3 — values present, unused in Phase 1
  boost: {
    chargeCap: 5,
    chargeExpireTurns: 3,
    diminishStart: 4,
    diminishMult: 0.5,
  },
  weights: { S: 30, F: 25, I: 25, E: 20 },
  enemies: [
    {
      id: 1,
      name: 'Slime',
      hp: 100,
      pattern: [
        { attack: { dmg: 14, element: 'steel', stacks: 0 }, shield: { stacks: 1, element: 'steel' } },
      ],
    },
    {
      id: 2,
      name: 'Ember Imp',
      hp: 150,
      pattern: [
        { attack: { dmg: 10, element: 'fire', stacks: 2 }, shield: { stacks: 3, element: 'ice' } },
      ],
    },
    {
      id: 3,
      name: 'Frost Wolf',
      hp: 200,
      pattern: [
        { attack: { dmg: 12, element: 'ice', stacks: 2 }, shield: { stacks: 3, element: 'fire' } },
      ],
    },
    {
      id: 4,
      name: 'Iron Golem',
      hp: 300,
      pattern: [
        { attack: { dmg: 24, element: 'steel', stacks: 0 }, shield: { stacks: 4, element: 'steel' } },
        { attack: { dmg: 30, element: 'steel', stacks: 0 }, shield: { stacks: 4, element: 'steel' } },
      ],
    },
    {
      id: 5,
      name: 'Pyromancer',
      hp: 260,
      pattern: [
        { attack: { dmg: 14, element: 'fire', stacks: 3 }, shield: { stacks: 4, element: 'ice' } },
        { attack: { dmg:  8, element: 'fire', stacks: 5 }, shield: { stacks: 2, element: 'ice' } },
      ],
    },
    {
      id: 6,
      name: 'Stormcaller',
      hp: 360,
      pattern: [
        { attack: { dmg: 20, element: 'steel', stacks: 0 }, shield: { stacks: 3, element: 'steel' } },
        { attack: { dmg: 14, element: 'ice',   stacks: 3 }, shield: { stacks: 3, element: 'fire' } },
      ],
    },
  ],
};
