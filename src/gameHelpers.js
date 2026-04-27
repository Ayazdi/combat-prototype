import { ELEMENTS, TUNING } from './constants.js';

export const createEmptyStatuses = () => ({
  burn: null,
  freeze: { stacks: 0 },
});

export const weightedRoll = (weights) => {
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  let roll = Math.random() * total;

  for (const [key, weight] of Object.entries(weights)) {
    roll -= weight;
    if (roll < 0) return key;
  }

  return Object.keys(weights)[0];
};

export const rollRow = (weights, size = TUNING.hand.rowSize) => {
  const row = Array.from({ length: size }, () => weightedRoll(weights));

  if (row.every((tile) => tile === row[0])) {
    const rerollIndex = Math.floor(Math.random() * size);
    const alternatives = Object.keys(weights).filter((tile) => tile !== row[0] && weights[tile] > 0);
    row[rerollIndex] = alternatives[Math.floor(Math.random() * alternatives.length)];
  }

  return row;
};

export const buildShuffledDeck = (composition = TUNING.deckComposition) => {
  const deck = [];
  for (const [tile, count] of Object.entries(composition)) {
    for (let i = 0; i < count; i += 1) deck.push(tile);
  }

  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
};

export const drawFromDeck = (deck, fallbackComposition = TUNING.deckComposition) => {
  const reshuffled = deck.length === 0;
  const workingDeck = reshuffled ? buildShuffledDeck(fallbackComposition) : deck;
  const card = workingDeck[workingDeck.length - 1];
  return {
    card,
    deck: workingDeck.slice(0, -1),
    reshuffled,
  };
};

export const drawManyFromDeck = (deck, count, fallbackComposition = TUNING.deckComposition) => {
  let workingDeck = deck;
  const cards = [];
  let reshuffleCount = 0;

  for (let i = 0; i < count; i += 1) {
    const result = drawFromDeck(workingDeck, fallbackComposition);
    cards.push(result.card);
    workingDeck = result.deck;
    if (result.reshuffled) reshuffleCount += 1;
  }

  return {
    cards,
    deck: workingDeck,
    reshuffleCount,
  };
};

export const countDeckByElement = (deck = []) => deck.reduce(
  (counts, tile) => {
    counts[tile] = (counts[tile] || 0) + 1;
    return counts;
  },
  { steel: 0, fire: 0, ice: 0, empty: 0 },
);

export const replaceRowSlotFromDeck = (row, index, deck, fallbackComposition = TUNING.deckComposition) => {
  const result = drawFromDeck(deck, fallbackComposition);
  const nextRow = [...row];
  nextRow[index] = result.card;
  return {
    row: nextRow,
    deck: result.deck,
    reshuffled: result.reshuffled,
  };
};

export const countTiles = (tiles = []) => tiles.reduce(
  (counts, tile) => {
    if (tile && tile !== 'empty') counts[tile] = (counts[tile] || 0) + 1;
    return counts;
  },
  { steel: 0, fire: 0, ice: 0 },
);

const comboMultiplier = (count) => TUNING.combos[Math.min(count, TUNING.hand.handSize)] || 0;

const round = (value) => Math.round(value);

const buildEmptyBucketResult = (action, tiles) => ({
  action,
  tiles,
  damage: 0,
  block: 0,
  burnStacks: 0,
  freezeStacks: 0,
  contactBurnStacks: 0,
  contactFreezeStacks: 0,
  counts: { steel: 0, fire: 0, ice: 0 },
  activeCounts: { steel: 0, fire: 0, ice: 0 },
  cancelledPairs: 0,
  segments: [],
});

export const computeActionBucket = (tiles = [], action = 'attack', targetFreezeStacks = 0) => {
  const realTiles = tiles.filter(Boolean);
  const counts = countTiles(realTiles);
  const result = buildEmptyBucketResult(action, realTiles);
  result.counts = counts;

  const cancelledPairs = Math.min(counts.fire, counts.ice);
  const survivingFire = counts.fire - cancelledPairs;
  const survivingIce = counts.ice - cancelledPairs;
  result.cancelledPairs = cancelledPairs;
  result.activeCounts = {
    steel: counts.steel,
    fire: survivingFire,
    ice: survivingIce,
  };

  if (cancelledPairs > 0) {
    const fireBase = action === 'shield' ? TUNING.elements.fire.shieldBase : TUNING.elements.fire.atkBase;
    const iceBase = action === 'shield' ? TUNING.elements.ice.shieldBase : TUNING.elements.ice.atkBase;
    const value = cancelledPairs * fireBase + cancelledPairs * iceBase;
    if (action === 'shield') result.block += value;
    else result.damage += value;
    result.segments.push({
      type: 'cancelled',
      fire: cancelledPairs,
      ice: cancelledPairs,
      value,
      action,
    });
  }

  if (counts.steel > 0) {
    const mult = comboMultiplier(counts.steel);
    if (action === 'shield') {
      const block = round(TUNING.elements.steel.shieldBase * counts.steel * mult);
      result.block += block;
      result.segments.push({ type: 'steel', count: counts.steel, mult, block });
    } else {
      const baseDamage = round(TUNING.elements.steel.atkBase * counts.steel * mult);
      const freezeMultiplier = 1 + targetFreezeStacks * TUNING.status.freezeMultPerStack;
      const damage = round(baseDamage * freezeMultiplier);
      result.damage += damage;
      result.segments.push({
        type: 'steel',
        count: counts.steel,
        mult,
        baseDamage,
        damage,
        freezeMultiplier,
      });
    }
  }

  if (survivingFire > 0) {
    const mult = comboMultiplier(survivingFire);
    if (action === 'shield') {
      const block = round(TUNING.elements.fire.shieldBase * survivingFire * mult);
      result.block += block;
      result.contactBurnStacks += survivingFire;
      result.segments.push({ type: 'fire', count: survivingFire, mult, block, contactBurnStacks: survivingFire });
    } else {
      const damage = round(TUNING.elements.fire.atkBase * survivingFire * mult);
      result.damage += damage;
      result.burnStacks += survivingFire;
      result.segments.push({ type: 'fire', count: survivingFire, mult, damage, burnStacks: survivingFire });
    }
  }

  if (survivingIce > 0) {
    const mult = comboMultiplier(survivingIce);
    if (action === 'shield') {
      const block = round(TUNING.elements.ice.shieldBase * survivingIce * mult);
      result.block += block;
      result.contactFreezeStacks += survivingIce;
      result.segments.push({ type: 'ice', count: survivingIce, mult, block, contactFreezeStacks: survivingIce });
    } else {
      const damage = round(TUNING.elements.ice.atkBase * survivingIce * mult);
      result.damage += damage;
      result.freezeStacks += survivingIce;
      result.segments.push({ type: 'ice', count: survivingIce, mult, damage, freezeStacks: survivingIce });
    }
  }

  return result;
};

export const applyStatus = (currentStatuses, incomingStacks, type) => {
  if (!incomingStacks || incomingStacks <= 0) return currentStatuses;

  if (type === 'burn') {
    const existingStacks = currentStatuses.burn?.stacks || 0;
    return {
      ...currentStatuses,
      burn: {
        stacks: Math.min(TUNING.status.burnMaxStacks, existingStacks + incomingStacks),
        turnsLeft: TUNING.status.burnDuration,
      },
    };
  }

  if (type === 'freeze') {
    const existingStacks = currentStatuses.freeze?.stacks || 0;
    return {
      ...currentStatuses,
      freeze: {
        stacks: Math.min(TUNING.status.freezeMaxStacks, existingStacks + incomingStacks),
      },
    };
  }

  return currentStatuses;
};

export const tickStatuses = (statuses) => {
  const burnStacks = statuses.burn?.stacks || 0;
  const burnDamage = burnStacks * TUNING.status.burnPerStack;
  const burnTurnsLeft = statuses.burn?.turnsLeft || 0;
  const nextBurnTurns = Math.max(0, burnTurnsLeft - 1);
  const nextBurn = burnStacks > 0 && nextBurnTurns > 0
    ? { stacks: burnStacks, turnsLeft: nextBurnTurns }
    : null;

  const freezeStacks = statuses.freeze?.stacks || 0;
  const nextFreezeStacks = Math.max(0, freezeStacks - 1);

  return {
    burnDamage,
    freezeLost: freezeStacks - nextFreezeStacks,
    statuses: {
      burn: nextBurn,
      freeze: { stacks: nextFreezeStacks },
    },
  };
};

export const applyDamageToShieldedTarget = (damage, shield, hp, options = {}) => {
  const absorbed = Math.min(shield, damage);
  const damagePastShield = damage - absorbed;
  const shieldAfter = shield - absorbed;
  const reduction = damagePastShield > 0 && options.reduceHpDamageBy
    ? Math.min(options.reduceHpDamageBy, damagePastShield)
    : 0;
  const hpDamage = Math.max(0, damagePastShield - reduction);

  return {
    shield: shieldAfter,
    hp: Math.max(0, hp - hpDamage),
    absorbed,
    hpDamage,
    reduction,
  };
};

export const computeEnemyShieldFromTiles = (shieldElement, shieldTiles = 0, options = {}) => {
  if (!shieldElement || shieldTiles <= 0) {
    return {
      block: 0,
      shieldElement: null,
      shieldTiles: 0,
      contactBurnStacks: 0,
      contactFreezeStacks: 0,
    };
  }

  const mult = TUNING.combos[Math.min(shieldTiles, TUNING.hand.handSize)] || 1;
  const baseBlock = TUNING.elements[shieldElement]?.shieldBase || 0;
  const unmodifiedBlock = Math.round(baseBlock * shieldTiles * mult);
  const block = options.wardMastery ? Math.round(unmodifiedBlock * 1.25) : unmodifiedBlock;
  const contactStacks = shieldElement === 'fire' || shieldElement === 'ice'
    ? Math.ceil(shieldTiles / 2)
    : 0;

  return {
    block,
    unmodifiedBlock,
    shieldElement,
    shieldTiles,
    contactBurnStacks: shieldElement === 'fire' ? contactStacks : 0,
    contactFreezeStacks: shieldElement === 'ice' ? contactStacks : 0,
  };
};

export const getIntentShieldInfo = (intent = {}, enemy = {}) => {
  if (intent.shieldTiles > 0) {
    return computeEnemyShieldFromTiles(
      intent.shieldElement || 'steel',
      intent.shieldTiles,
      { wardMastery: enemy.traits?.includes('ward_mastery') },
    );
  }

  if (intent.shield > 0) {
    return {
      block: intent.shield,
      unmodifiedBlock: intent.shield,
      shieldElement: intent.shieldElement || 'steel',
      shieldTiles: 0,
      contactBurnStacks: 0,
      contactFreezeStacks: 0,
    };
  }

  return computeEnemyShieldFromTiles(null, 0);
};

export const createShieldContact = ({
  contactBurnStacks = 0,
  contactFreezeStacks = 0,
  shieldTiles = 0,
  block = 0,
  unmodifiedBlock = 0,
} = {}) => ({
  contactBurnStacks,
  contactFreezeStacks,
  shieldTiles,
  block,
  unmodifiedBlock,
});

export const resolveAttackAgainstShield = (attackResult, shieldState) => {
  const {
    shield = 0,
    hp = 0,
    shieldElement = null,
    shieldContact = createShieldContact(),
    hpDamageReduction = 0,
  } = shieldState || {};

  const damage = applyDamageToShieldedTarget(
    attackResult.damage,
    shield,
    hp,
    { reduceHpDamageBy: shield > 0 ? hpDamageReduction : 0 },
  );
  const shieldContacted = damage.absorbed > 0;
  let contactBurnStacks = shieldContacted ? shieldContact.contactBurnStacks || 0 : 0;
  let contactFreezeStacks = shieldContacted ? shieldContact.contactFreezeStacks || 0 : 0;
  let attackBurnStacks = attackResult.burnStacks;
  let attackFreezeStacks = attackResult.freezeStacks;
  let cancelledByFire = 0;
  let cancelledByIce = 0;

  if (shieldContacted && shieldElement === 'fire' && contactBurnStacks > 0) {
    cancelledByIce = Math.min(attackResult.activeCounts?.ice || 0, contactBurnStacks);
    contactBurnStacks -= cancelledByIce;
    attackFreezeStacks = Math.max(0, attackFreezeStacks - cancelledByIce);
  }

  if (shieldContacted && shieldElement === 'ice' && contactFreezeStacks > 0) {
    cancelledByFire = Math.min(attackResult.activeCounts?.fire || 0, contactFreezeStacks);
    contactFreezeStacks -= cancelledByFire;
    attackBurnStacks = Math.max(0, attackBurnStacks - cancelledByFire);
  }

  return {
    ...damage,
    shieldContacted,
    shieldElement,
    attackBurnStacks,
    attackFreezeStacks,
    contactBurnStacks,
    contactFreezeStacks,
    cancelledByFire,
    cancelledByIce,
  };
};

export const getNextFoePlayerCarryover = ({ hp, mana }) => ({
  hp,
  mana,
  shield: 0,
});

export const elementLabel = (element) => ELEMENTS[element]?.label || element;

export const describeIntent = (intent) => {
  const shieldInfo = intent.shieldInfo || getIntentShieldInfo(intent);
  const shieldText = shieldInfo.block > 0
    ? ` + ${shieldInfo.block} ${elementLabel(shieldInfo.shieldElement)} shield`
    : '';
  return `${intent.dmg} ${elementLabel(intent.element)}${shieldText}`;
};

export const getEnemyIntent = (enemy, turn) => {
  const pattern = enemy.pattern || [];
  return pattern[(turn - 1) % pattern.length] || { dmg: 0, element: 'steel' };
};

export const getEnemyIntentQueue = (enemy, turn, size = 2) => (
  Array.from({ length: size }, (_, index) => {
    const intent = getEnemyIntent(enemy, turn + index);
    const shieldInfo = getIntentShieldInfo(intent, enemy);
    return {
      ...intent,
      shieldInfo,
      text: describeIntent({ ...intent, shieldInfo }),
    };
  })
);
