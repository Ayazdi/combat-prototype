// ============================================================
// GAME TUNING — Element Refactor Phase 1
// ============================================================
export const ELEMENTS = {
  steel: {
    id: 'steel',
    short: 'S',
    label: 'Steel',
    glyph: '◆',
  },
  fire: {
    id: 'fire',
    short: 'F',
    label: 'Fire',
    glyph: '✦',
  },
  ice: {
    id: 'ice',
    short: 'I',
    label: 'Ice',
    glyph: '◇',
  },
  empty: {
    id: 'empty',
    short: '·',
    label: 'Empty',
    glyph: '·',
  },
};

export const ACTION_BUCKETS = {
  attack: { id: 'attack', label: 'Attack', short: 'A' },
  shield: { id: 'shield', label: 'Shield', short: 'S' },
  boost: { id: 'boost', label: 'Boost', short: 'B', disabled: true },
};

export const TUNING = {
  player: {
    maxHp: 300,
    maxMana: 100,
    maxShield: 60,
    manaRegenPerTurn: 15,
    startingMana: 100,
  },
  hand: {
    handSize: 5,
    rowSize: 6,
    rounds: 5,
    rerollCost: 20,
    discardCost: 30,
  },
  combos: {
    1: 1.0,
    2: 1.3,
    3: 1.6,
    4: 2.0,
    5: 2.8,
  },
  elements: {
    steel: { atkBase: 11, shieldBase: 10 },
    fire: { atkBase: 7, shieldBase: 5 },
    ice: { atkBase: 5, shieldBase: 8 },
  },
  status: {
    burnPerStack: 4,
    burnDuration: 2,
    burnMaxStacks: 10,
    freezeMultPerStack: 0.15,
    freezeMaxStacks: 5,
  },
  weights: {
    steel: 30,
    fire: 25,
    ice: 25,
    empty: 20,
  },
  deckComposition: {
    steel: 12,
    fire: 10,
    ice: 10,
    empty: 8,
  },
  enemies: [
    {
      id: 1,
      name: 'Slime',
      hp: 130,
      traits: [],
      pattern: [
        { dmg: 14, element: 'steel' },
        { dmg: 10, element: 'steel', shieldTiles: 1, shieldElement: 'steel' },
      ],
    },
    {
      id: 2,
      name: 'Ember Imp',
      hp: 175,
      traits: ['singe'],
      pattern: [
        { dmg: 13, element: 'fire' },
        { dmg: 11, element: 'fire', shieldTiles: 2, shieldElement: 'fire' },
      ],
    },
    {
      id: 3,
      name: 'Frost Wolf',
      hp: 205,
      traits: ['numbing_bite'],
      pattern: [
        { dmg: 15, element: 'ice' },
        { dmg: 12, element: 'ice', shieldTiles: 2, shieldElement: 'ice' },
      ],
    },
    {
      id: 4,
      name: 'Iron Golem',
      hp: 270,
      traits: ['plated'],
      pattern: [
        { dmg: 18, element: 'steel', shieldTiles: 2, shieldElement: 'steel' },
        { dmg: 24, element: 'steel' },
        { dmg: 15, element: 'steel', shieldTiles: 3, shieldElement: 'steel' },
      ],
    },
    {
      id: 5,
      name: 'Pyromancer',
      hp: 265,
      traits: ['kindle_guard'],
      pattern: [
        { dmg: 17, element: 'fire' },
        { dmg: 14, element: 'fire', shieldTiles: 3, shieldElement: 'fire' },
        { dmg: 21, element: 'fire' },
      ],
    },
    {
      id: 6,
      name: 'Stormcaller',
      hp: 330,
      traits: ['ward_mastery'],
      pattern: [
        { dmg: 20, element: 'steel', shieldTiles: 2, shieldElement: 'ice' },
        { dmg: 16, element: 'ice', shieldTiles: 2, shieldElement: 'steel' },
        { dmg: 24, element: 'steel', shieldTiles: 2, shieldElement: 'ice' },
      ],
    },
  ],
};

export const ENEMY_TRAITS = {
  singe: {
    id: 'singe',
    icon: 'F',
    label: 'Singe',
    detail: 'If this foe deals Fire HP damage after your shield, you gain Burn 1: 4 damage per tick for 2 ticks.',
    tone: 'negative',
  },
  numbing_bite: {
    id: 'numbing_bite',
    icon: 'I',
    label: 'Numbing Bite',
    detail: 'If this foe deals Ice HP damage after your shield, you gain Freeze 1: +15% Steel damage taken until it decays.',
    tone: 'negative',
  },
  plated: {
    id: 'plated',
    icon: 'P',
    label: 'Plated',
    detail: 'While this foe starts your attack with any shield, HP damage that gets past shield is reduced by 8.',
    tone: 'negative',
  },
  kindle_guard: {
    id: 'kindle_guard',
    icon: 'K',
    label: 'Kindle Guard',
    detail: 'Once per fight below 50% HP, this foe gains 13 Fire shield from 2 Fire shield tiles. Hitting it applies Burn 1 unless you include 1 active Ice attack tile.',
    tone: 'negative',
  },
  ward_mastery: {
    id: 'ward_mastery',
    icon: 'W',
    label: 'Ward Mastery',
    detail: 'All shields this foe gains are 25% stronger: 2 Ice tiles become 26 shield with Freeze 1 contact, and 2 Steel tiles become 33 shield.',
    tone: 'negative',
  },
};
