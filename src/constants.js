// ============================================================
// ABILITY COMBOS — exactly 6 unlockable 5-card combos
// ============================================================
export const ABILITY_COMBOS = [
  {
    id: 'combo_aaaaa',
    pattern: 'AAAAA',
    name: 'Barrage',
    detail: 'Apply Burn — enemy takes 15 dmg at the start of your next 2 turns.',
    effect: 'barrage',
    rarity: 'rare',
  },
  {
    id: 'combo_ddddd',
    pattern: 'DDDDD',
    name: 'Endure',
    detail: 'Absorb the next enemy attack completely (1 hit, any damage).',
    effect: 'endure',
    rarity: 'rare',
  },
  {
    id: 'combo_aaadd',
    pattern: 'AAADD',
    name: 'Press',
    detail: 'Apply Vulnerable — enemy takes +30% damage next turn.',
    effect: 'press',
    rarity: 'rare',
  },
  {
    id: 'combo_dddaa',
    pattern: 'DDDAA',
    name: 'Counter',
    detail: 'Deal bonus damage equal to half your current shield.',
    effect: 'counter',
    rarity: 'rare',
  },
  {
    id: 'combo_ddaaa',
    pattern: 'DDAAA',
    name: 'Riposte',
    detail: 'Deal bonus damage equal to half the damage you took last turn.',
    effect: 'riposte',
    rarity: 'rare',
  },
  {
    id: 'combo_aaddd',
    pattern: 'AADDD',
    name: 'Drain',
    detail: 'Steal up to 20 of the enemy\'s current shield and add it to yours.',
    effect: 'drain',
    rarity: 'rare',
  },
];

// ============================================================
// PASSIVE ABILITIES — 25 passives with prerequisite system
// requires: string (single ability id) - passive unlocks if that ability is owned
// requiresAny: string[] - passive unlocks if ANY of these abilities are owned
// requiresAll: string[] - passive unlocks if ALL of these are owned
// null requires = universal (always available in pool)
// ============================================================
export const PASSIVE_ABILITIES = [
  // --- Burn (Barrage) specific ---
  {
    id: 'kindling',
    name: 'Kindling',
    detail: 'Burn deals 25 damage per tick instead of 15.',
    requires: 'combo_aaaaa',
    category: 'specific',
  },
  {
    id: 'afterburn',
    name: 'Afterburn',
    detail: 'Burn lasts 3 turns instead of 2.',
    requires: 'combo_aaaaa',
    category: 'specific',
  },
  // --- Endure (DDDDD) specific ---
  {
    id: 'retaliate',
    name: 'Retaliate',
    detail: 'When Endure absorbs a hit, deal 25 damage back to the enemy.',
    requires: 'combo_ddddd',
    category: 'specific',
  },
  {
    id: 'bulwark',
    name: 'Bulwark',
    detail: 'After Endure triggers, gain 20 HP.',
    requires: 'combo_ddddd',
    category: 'specific',
  },
  // --- Press (AAADD) specific ---
  {
    id: 'cruelty',
    name: 'Cruelty',
    detail: 'Vulnerable increases the damage bonus to +50% instead of +30%.',
    requires: 'combo_aaadd',
    category: 'specific',
  },
  {
    id: 'setup',
    name: 'Setup',
    detail: 'Press also grants +1 pick next turn.',
    requires: 'combo_aaadd',
    category: 'specific',
  },
  // --- Counter / Riposte specific ---
  {
    id: 'momentum',
    name: 'Momentum',
    detail: 'Counter and Riposte bonus multiplier increases from ×0.5 to ×0.8.',
    requiresAny: ['combo_dddaa', 'combo_ddaaa'],
    category: 'specific',
  },
  // --- Drain (AADDD) specific ---
  {
    id: 'leech',
    name: 'Leech',
    detail: 'Drain also heals 15 HP.',
    requires: 'combo_aaddd',
    category: 'specific',
  },
  {
    id: 'predator',
    name: 'Predator',
    detail: 'Drain steals up to 40 shield instead of 20.',
    requires: 'combo_aaddd',
    category: 'specific',
  },
  // --- Cross-combo ---
  {
    id: 'opportunist',
    name: 'Opportunist',
    detail: 'If the enemy is Vulnerable when you play Barrage, Burn also triggers immediately.',
    requiresAll: ['combo_aaaaa', 'combo_aaadd'],
    category: 'specific',
  },
  // --- Universal standalone ---
  {
    id: 'tenacity',
    name: 'Tenacity',
    detail: 'First time HP drops below 40% each battle, instantly gain 30 shield.',
    requires: null,
    category: 'universal',
  },
  {
    id: 'second_wind',
    name: 'Second Wind',
    detail: 'Recover 10 HP at the start of every 3rd turn.',
    requires: null,
    category: 'universal',
  },
  {
    id: 'scavenger',
    name: 'Scavenger',
    detail: 'Each No Action tile you pick grants 5 MP back.',
    requires: null,
    category: 'universal',
  },
  {
    id: 'sharpness',
    name: 'Sharpness',
    detail: 'Reroll costs 15 MP instead of 25.',
    requires: null,
    category: 'universal',
  },
  {
    id: 'focused',
    name: 'Focused',
    detail: 'Permanently gain +1 pick per turn (6 instead of 5).',
    requires: null,
    category: 'universal',
  },
  {
    id: 'last_stand',
    name: 'Last Stand',
    detail: 'While below 40% HP, all damage dealt is increased by +20%.',
    requires: null,
    category: 'universal',
  },
  {
    id: 'thick_skin',
    name: 'Thick Skin',
    detail: 'All incoming damage reduced by 5 flat.',
    requires: null,
    category: 'universal',
  },
  {
    id: 'overflow',
    name: 'Overflow',
    detail: 'Shield gained beyond the cap converts to HP at 50% rate.',
    requires: null,
    category: 'universal',
  },
  // --- Universal multi-ability enhancers ---
  {
    id: 'amplifier',
    name: 'Amplifier',
    detail: 'All status effects (Burn, Vulnerable) last 1 extra turn.',
    requires: null,
    category: 'enhancer',
  },
  {
    id: 'precision',
    name: 'Precision',
    detail: 'All ability bonuses increased by 25% (Burn tick, Drain steal, Counter/Riposte bonus).',
    requires: null,
    category: 'enhancer',
  },
  {
    id: 'catalyst',
    name: 'Catalyst',
    detail: 'Any 5-card ability combo refunds 10 MP.',
    requires: null,
    category: 'enhancer',
  },
  {
    id: 'echo',
    name: 'Echo',
    detail: 'After any ability triggers, deal 10 bonus damage immediately.',
    requires: null,
    category: 'enhancer',
  },
  {
    id: 'resonance',
    name: 'Resonance',
    detail: 'Status effects deal 10 damage the moment they are applied.',
    requires: null,
    category: 'enhancer',
  },
  {
    id: 'stockpile',
    name: 'Stockpile',
    detail: 'Each turn you don\'t play a 5-card ability combo, stack +8 dmg for the next one (max 40).',
    requires: null,
    category: 'enhancer',
  },
  {
    id: 'flow_state',
    name: 'Flow State',
    detail: 'Two 5-card ability combos in a row grant +2 free picks next turn.',
    requires: null,
    category: 'enhancer',
  },
];

// ============================================================
// GAME TUNING
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
  rewardPerks: {
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
  comboAbilities: ABILITY_COMBOS,
  rewardChoicesPerKill: 1,
  draft: {
    rowSize: 6,
    maxSequence: 5,
    maxRerollsPerEnemy: 1,
    maxDiscardsPerTurn: 2,
    discardManaCost: 5,
    rerollManaCost: 25,
  },
  // M is kept at 0 — tile type still exists in display/logic but never appears in deck
  deckComposition: { A: 12, D: 10, M: 0, E: 18 },
  weights: { A: 25, D: 25, M: 0, E: 50 },
  enemyAI: {
    intentWeights: { attack: 2, defend: 1 },
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
