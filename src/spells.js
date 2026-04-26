export const PLAYER_SPELLS = [
  { id: 'burn',   name: 'Burn',   manaCost: 20, damage: 20, kind: 'attack', description: 'Deal 20 damage. Costs 20 MP.' },
  { id: 'freeze', name: 'Freeze', manaCost: 15, damage: 15, kind: 'attack', description: 'Deal 15 damage. Costs 15 MP.' },
];

export const ENEMY_SPELLS = [];

export const getSpell = (id) => PLAYER_SPELLS.find((s) => s.id === id) || null;
