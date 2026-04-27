import assert from 'node:assert/strict';
import { TUNING } from '../src/constants.js';
import {
  applyDamageToShieldedTarget,
  applyStatus,
  buildShuffledDeck,
  computeEnemyShieldFromTiles,
  computeActionBucket,
  countDeckByElement,
  createShieldContact,
  createEmptyStatuses,
  drawManyFromDeck,
  getNextFoePlayerCarryover,
  replaceRowSlotFromDeck,
  resolveAttackAgainstShield,
  tickStatuses,
} from '../src/gameHelpers.js';

const attack = (tiles, freezeStacks = 0) => computeActionBucket(tiles, 'attack', freezeStacks);
const shield = (tiles) => computeActionBucket(tiles, 'shield');

{
  const result = attack(['steel', 'steel', 'steel', 'fire', 'fire']);
  assert.equal(result.damage, 71, '[3 Steel, 2 Fire] attack damage');
  assert.equal(result.burnStacks, 2, '[3 Steel, 2 Fire] burn stacks');
}

{
  const result = attack(['fire', 'fire', 'fire', 'steel', 'steel']);
  assert.equal(result.damage, 63, '[3 Fire, 2 Steel] attack damage');
  assert.equal(result.burnStacks, 3, '[3 Fire, 2 Steel] burn stacks');
}

{
  const result = attack(['fire', 'fire', 'fire', 'ice', 'ice']);
  assert.equal(result.damage, 31, '[3 Fire, 2 Ice] attack damage');
  assert.equal(result.burnStacks, 1, '[3 Fire, 2 Ice] burn stacks');
  assert.equal(result.freezeStacks, 0, '[3 Fire, 2 Ice] freeze stacks');
}

{
  const result = attack(['steel', 'steel', 'steel', 'steel'], 3);
  assert.equal(result.damage, 128, '[4 Steel] vs 3 Freeze damage');
}

{
  const result = shield(['fire', 'fire', 'fire']);
  assert.equal(result.block, 24, '[3 Fire] shield block');
  assert.equal(result.contactBurnStacks, 3, '[3 Fire] contact Burn stacks');
}

{
  const burned = applyStatus(createEmptyStatuses(), 2, 'burn');
  assert.deepEqual(burned.burn, { stacks: 2, turnsLeft: 2 }, 'Burn applies and refreshes duration');
  const firstTick = tickStatuses(burned);
  assert.equal(firstTick.burnDamage, 8, 'Burn ticks stacks x 4 damage');
  assert.deepEqual(firstTick.statuses.burn, { stacks: 2, turnsLeft: 1 }, 'Burn duration decrements');
  const secondTick = tickStatuses(firstTick.statuses);
  assert.equal(secondTick.burnDamage, 8, 'Burn ticks on second turn');
  assert.equal(secondTick.statuses.burn, null, 'Burn clears after duration expires');
}

{
  const frozen = applyStatus(createEmptyStatuses(), 7, 'freeze');
  assert.equal(frozen.freeze.stacks, 5, 'Freeze caps at 5 stacks');
  const tick = tickStatuses(frozen);
  assert.equal(tick.statuses.freeze.stacks, 4, 'Freeze decays by 1 stack');
}

{
  const deck = buildShuffledDeck(TUNING.deckComposition);
  const counts = countDeckByElement(deck);
  assert.equal(counts.steel, 12, 'Deck has 12 Steel cards');
  assert.equal(counts.fire, 10, 'Deck has 10 Fire cards');
  assert.equal(counts.ice, 10, 'Deck has 10 Ice cards');
  assert.equal(counts.empty, 8, 'Deck has 8 Empty cards');
  assert.equal(deck.length, 40, 'Deck has 40 total cards');
}

{
  const deck = buildShuffledDeck(TUNING.deckComposition);
  const draw = drawManyFromDeck(deck, TUNING.hand.rowSize, TUNING.deckComposition);
  assert.equal(draw.cards.length, 6, 'Initial row draw has 6 cards');
  assert.equal(draw.deck.length, 34, 'Initial row draw removes exactly 6 cards from hidden deck');
}

{
  const row = ['steel', 'fire', 'ice', 'empty', 'steel', 'fire'];
  const replaced = replaceRowSlotFromDeck(row, 2, ['empty'], TUNING.deckComposition);
  assert.deepEqual(replaced.row.slice(0, 2), row.slice(0, 2), 'Replacing a row slot preserves earlier row slots');
  assert.deepEqual(replaced.row.slice(3), row.slice(3), 'Replacing a row slot preserves later row slots');
  assert.equal(replaced.row[2], 'empty', 'Picked slot receives the next deck card');
  assert.equal(replaced.deck.length, 0, 'Replacement card is removed from hidden deck');
}

{
  const result = applyDamageToShieldedTarget(40, 15, 100);
  assert.equal(result.shield, 0, 'Enemy shield is consumed first');
  assert.equal(result.absorbed, 15, 'Enemy shield absorbs before HP');
  assert.equal(result.hpDamage, 25, 'Only overflow damage reaches HP');
  assert.equal(result.hp, 75, 'Enemy HP loses overflow damage only');
}

{
  const carryover = getNextFoePlayerCarryover({ hp: 137, mana: 42 });
  assert.deepEqual(carryover, { hp: 137, mana: 42, shield: 0 }, 'Next foe carries HP/MP and resets shield');
}

{
  const fireShield = computeEnemyShieldFromTiles('fire', 2);
  assert.equal(fireShield.block, 13, '2 Fire shield tiles create 13 block');
  assert.equal(fireShield.contactBurnStacks, 1, '2 Fire shield tiles create Burn 1 contact');

  const steelOnly = resolveAttackAgainstShield(attack(['steel', 'steel']), {
    shield: fireShield.block,
    hp: 100,
    shieldElement: 'fire',
    shieldContact: createShieldContact(fireShield),
  });
  assert.equal(steelOnly.contactBurnStacks, 1, 'Steel-only attack takes Fire shield Burn');
  assert.equal(steelOnly.hp, 84, 'Steel-only attack breaks Fire shield and deals overflow HP damage');

  const steelIce = resolveAttackAgainstShield(attack(['steel', 'steel', 'ice']), {
    shield: fireShield.block,
    hp: 100,
    shieldElement: 'fire',
    shieldContact: createShieldContact(fireShield),
  });
  assert.equal(steelIce.cancelledByIce, 1, 'Ice attack tile cancels Fire shield Burn');
  assert.equal(steelIce.contactBurnStacks, 0, 'Canceled Fire shield applies no Burn');
  assert.equal(steelIce.attackFreezeStacks, 0, 'Countering Ice tile spends its Freeze status');
}

{
  const iceShield = computeEnemyShieldFromTiles('ice', 2);
  const fireCounter = resolveAttackAgainstShield(attack(['steel', 'steel', 'fire']), {
    shield: iceShield.block,
    hp: 100,
    shieldElement: 'ice',
    shieldContact: createShieldContact(iceShield),
  });
  assert.equal(iceShield.block, 21, '2 Ice shield tiles create 21 block');
  assert.equal(iceShield.contactFreezeStacks, 1, '2 Ice shield tiles create Freeze 1 contact');
  assert.equal(fireCounter.cancelledByFire, 1, 'Fire attack tile cancels Ice shield Freeze');
  assert.equal(fireCounter.contactFreezeStacks, 0, 'Canceled Ice shield applies no Freeze');
  assert.equal(fireCounter.attackBurnStacks, 0, 'Countering Fire tile spends its Burn status');
}

console.log('Element math checks passed.');
